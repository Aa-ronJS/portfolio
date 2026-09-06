# Linehaul

A working reference build for a logistics platform, made to demonstrate one
specific stack end to end:

- **.NET 9 (C#) minimal APIs with Dapper** and raw T-SQL, no ORM (`api/`)
- **Next.js / React / TypeScript** front end, strict mode, App Router (`web/`)
- **Azure**: App Service, Functions, SQL, Blob Storage, as Bicep (`infra/`)
- **Plain T-SQL migrations** applied with sqlcmd, no migration framework (`db/`)
- A timer-triggered **Azure Function** that sweeps for overdue consignments
  (`functions/`)

The domain is a linehaul freight operator: consignments booked against
effective-dated rate cards, moved through a status lifecycle recorded as an
append-only event log, with proof-of-delivery photos going straight to Blob
Storage on short-lived SAS URLs.

The case study that walks through it: https://aaronsteele.vercel.app/linehaul

## Running it

```bash
# database: real SQL Server 2022 with migrations + demo seed applied
SA_PASSWORD='yourStrong(!)Password' docker compose up -d

# api on http://localhost:5000
ConnectionStrings__Linehaul="Server=localhost,14330;Database=linehaul;User Id=sa;Password=yourStrong(!)Password;TrustServerCertificate=True" \
  dotnet run --project api/Linehaul.Api

# web on http://localhost:3000 (omit LINEHAUL_API_URL for demo fixtures)
cd web && npm install
LINEHAUL_API_URL=http://localhost:5000 npm run dev
```

```bash
dotnet test   # 52 checks, including a T-SQL parse of every query in the codebase
```

## The decisions, briefly

**Dapper over Entity Framework, and SQL in the open.** The queries this kind
of product lives on (the dashboard aggregates, the paged listing, the lane
percentiles) are exactly the ones ORMs generate badly and hide while doing it.
Every statement is a `const string` next to its handler, or a numbered `.sql`
file. There is nothing to reverse-engineer at 2am.

**No ORM also means no ORM safety net**, so the test suite parses every SQL
file and every embedded query with `Microsoft.SqlServer.TransactSql.ScriptDom`,
the parser SQL Server's own tooling uses (18 parse checks). Malformed SQL
fails CI, not a request. Dynamic filtering is composed from a fixed whitelist
of predicates in `ConsignmentFilter`; user input only ever travels as
parameters, and the tests prove hostile input never reaches the SQL text.

**Status is a state machine enforced twice.** `StatusFlow` refuses illegal
transitions in C#, and the UPDATE is a compare-and-swap on the expected
status, so two operators racing each other produce one clean 409 instead of a
corrupt record. The event log is append-only; the dashboard's on-time figure
is derived from events, not from a column that can drift.

**Money and history behave like an audit is coming.** Rate cards are
effective-dated and never updated in place. Charges are computed once at
booking with the standard road-freight cubic conversion (250 kg/m³), rounded
to the cent, and stored. GST is 10% on top, and the totals reconcile by
construction (there is a test that says so).

**Files do not pass through the API.** A POD photo upload gets a 15-minute
SAS URL and goes straight from the driver's phone to the `pod` container; the
API records metadata only. App Service instances stay small and stateless.

**The front end is honest about its data.** Server components fetch from the
API when `LINEHAUL_API_URL` is set; without it the app serves deterministic
fixtures generated with the same rules as the SQL seed, and the layout shows a
"demo data" badge so nobody mistakes a fixture for an operation.

## What was verified, and what was not

Verified in this build: solution compiles with zero warnings
(`TreatWarningsAsErrors`), all 52 tests pass, `next build` passes with strict
TypeScript, and the screenshots in the case study are real renders of the
running app. Not done in this pass: a deployment to a live Azure
subscription, and load testing. The Bicep describes the intended topology and
is written to be deployed, but nobody should read "deployed and humming" into
a repository that does not show it.
