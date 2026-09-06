# Database

Plain T-SQL, no ORM migrations. Forward-only numbered scripts under
`migrations/`, applied in filename order; each script consults
`dbo.SchemaMigration` and skips itself if already applied, so re-running the
folder is always safe, locally or from CI.

```bash
for f in migrations/*.sql; do
  sqlcmd -S "$SQL_SERVER" -d linehaul -G -i "$f" -b
done
```

(`-G` is Entra ID auth for Azure SQL; use `-U/-P` against a local container.
`-b` makes sqlcmd exit non-zero on error so CI stops at the first failure.)

`seed/` holds demo data for local development and the demo environment. It
refuses to run if consignments already exist and is never applied to
production.

Every script here, plus every query embedded in the API and the Function, is
parsed by `Microsoft.SqlServer.TransactSql.ScriptDom` in the test suite
(`SqlSurfaceTests`), so malformed SQL fails the build rather than a request.

## Conventions

- Status codes are shared with the API enum and documented in `001_schema.sql`.
  Never renumber.
- Rate cards are effective-dated and never updated in place; a price change is
  a new row, so historical charges stay explainable.
- `dbo.ConsignmentEvent` is append-only. The dashboard derives delivery times
  from events, not from denormalised columns, so reporting cannot drift from
  the record of what happened.
- Money is `decimal`, dates are UTC `datetime2(0)`; the display timezone is the
  client's problem.
