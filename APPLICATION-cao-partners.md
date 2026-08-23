# CAO Partners — "Become a Chief Agent Officer" application

Drafted answers for the application form, written from the work on the portfolio
page (`public/index.html`). Everything here is checkable against that page or the
public repos; nothing is invented.

---

## Short fields

| Field | Answer |
|---|---|
| Current or most recent job title | Senior Business Analyst & Solution Architect, BHP |
| Years of experience in tech / AI / operations | 10+ (analyst since 2015, building automation since 2016) |
| State | South Australia |
| Built or deployed AI agents / automation workflows? | Yes |
| Current situation | **Your call.** The portfolio says "Available now"; the CV says still at BHP. Pick "Actively looking" only if that is true — they will ask about notice period in the first call. |
| LinkedIn URL | *(fill in)* |
| CV | Attach. Also paste the portfolio URL in the experience box — it is the stronger artefact. |

---

## "How would AI agents save a $50M revenue company money?"

> Three places, in ascending order of value. Most people only chase the first one.
>
> **1. Time on rule-shaped work.** Invoice matching, quoting, order intake, ticket
> triage, compliance reporting. A $50M business is usually carrying $8–12M of
> ops, finance and support overhead. A realistic first pass takes 20–30% of the
> time out of two or three of those functions. That is real, but it shows up as
> capacity you don't have to hire, not as a line item that disappears from the
> P&L — and I would say that before the engagement, not after.
>
> **2. Error and leakage. This is the bigger number and almost nobody has it
> measured.** Rework, credit notes, missed supplier rebates, wrong pricing,
> invoices that never went out, records merged on the wrong key. I have seen
> $3.8M of donation history sitting against the wrong donors because a migration
> merged records on email address instead of the account number the old system
> keyed on. Nobody had noticed. That is not a labour saving, it is money that was
> already gone. At $50M, 1% leakage is $500k a year, and 1% is optimistic for a
> business that grew fast on spreadsheets.
>
> **3. Decisions made sooner.** Quotes out the same day. Every sales call scored
> the day it happens instead of a QA sample at month end. Cash collected a week
> earlier. Harder to attribute, compounds fastest.
>
> **How I would approach it.** Two weeks in the business before building
> anything, sitting with AP, sales admin, and whoever handles the exceptions —
> the process nobody has written down is where the cost usually is. Rank the
> candidates on volume × unit cost × how rule-shaped they are, and instrument the
> baseline *before* touching anything, because you cannot claim a saving you
> never measured. Then build one thing end to end — intake, rules, the system it
> lands in, the exceptions, and the reporting somebody actually reads — and prove
> it against a source I don't control: the ledger, the vendor's own portal, the
> original data. An agent saying "done" is a claim, not a fact. I have caught one
> documenting a test pipeline that did not exist and another writing a
> performance report that was structurally incapable of failing.
>
> **What I would not do.** Run a pilot that never leaves the pilot. Put an agent
> on top of a broken process, which only makes wrong answers faster. Or stay
> quiet about the exception rate — if 40% of the volume needs a human anyway, the
> automation is a rounding error, and you should hear that from me before you pay
> for it, not six months in.

*(~380 words. If the box is tight, cut point 3 and the last paragraph — points 1,
2 and "how I would approach it" carry the argument.)*

---

## "Briefly describe your most relevant experience or project"

> **National charity, HubSpot migration — technical lead.** Their donation history
> was coming out wrong and nobody could say why. The earlier migration had merged
> donor records on email address instead of the account number their old system
> used, so anyone who had changed their email, or shared one with a partner, was
> merged into somebody else or lost. Against the charity's own books it was out
> by around $3.8M. I rebuilt it on the correct key — 37,729 donations re-matched
> to the right donors across 4 organisations — reconciled it to their accounts,
> and connected their donation platforms and accounting system so it stays right
> without anyone retyping it. Four rounds of testing with the charity before go-live.
>
> **Closest to this role:** I was asked whether an AI-built live shopping platform
> was safe to put customers on. Rather than read the code and give an opinion, I
> used the gaps — the old login path was still open, so I signed in as a retailer
> who was live on air and shut their broadcast down. Nobody had to argue about
> whether the risk was real; it was closed that week. Four of six findings are
> properly closed now, two are not, and I said so. I also told them one reported
> finding was not a real problem, because chasing a phantom costs a team a week.
>
> **Agents specifically:** two tools I built end to end and gave away, both live
> and both open source — one tells a trades business whether Thursday's concrete
> pour will survive the weather; the other reads a company's own website before a
> salesperson calls them and files what it finds into HubSpot. Both carry a script
> whose only job is to check the result against something I do not control.
>
> Everything above, with the numbers running live: **https://aaronsteele.vercel.app**

---

## Notes before you hit submit

- **Aim at Tier 1/Tier 2, not Tier 3.** Eleven years as an analyst, TOGAF,
  baseline clearance and a critical-infrastructure architect role at BHP is not a
  $70–120k "hands-on implementer" profile. Their Tier 2 ("translates business
  objectives into implementation priorities and ships them") is exactly the job
  you already do; Tier 1 is arguable. Let the answers make the case rather than
  claiming a tier.
- **Your differentiator is the half they are not screening for.** Their vetting is
  built by an ops director for technical depth and action bias. Half their pool
  can wire up n8n. Very few can sit with a leadership team, work out what the
  business actually needs, and then build it — that is the whole pitch, and both
  answers above lead with it.
- **Don't argue with the "100x" framing on the form.** You disagree with it — the
  measured-baseline paragraph makes that point on its own, politely, and it will
  read as rigour rather than as pushback. Save the rest for the interview.
- **Two things to ask them:** they are Brisbane-based placing into Australian
  enterprise, and you are in South Australia — remote or relocation? And these are
  permanent employee roles, not contract, so the salary band is the whole
  conversation.
- **Diligence, for what it's worth.** Two genuinely credible founders (NGU Real
  Estate; Culture Kings' $600M exit), a real Brisbane address and ABN, but a young
  firm — two named testimonials, "insights" dated this year, and claims like "#1
  AI recruitment firm in AU" and "100x" that are marketing rather than measured.
  Worth applying; worth asking how many placements they have actually made, and
  who the employer of record is.
