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

> Three places, and most people only chase the first one.
>
> The first is time. Invoice matching, quoting, order intake, ticket triage, the
> monthly compliance pack. A $50M business is usually carrying eight to twelve
> million in ops, finance and support overhead, and a first pass takes twenty or
> thirty per cent of the time out of two or three of those functions. That is
> real money, but it turns up as people you do not have to hire, not as a line
> that disappears off the P&L, and you should hear that from me before you sign
> something rather than after.
>
> The second is the money already going out the door, and almost nobody has it
> measured. Rework, credit notes, supplier rebates nobody claimed, pricing that
> is wrong across a whole segment, invoices that never went out. A charity I
> worked for had $3.8 million of donation history sitting against the wrong
> donors, because an earlier migration had merged records on email address
> instead of the account number their old system used. It had been like that for
> a year and nobody could say why the numbers were wrong. That is not a saving,
> it is money that was already gone. At $50 million, one per cent is half a
> million a year, and one per cent is optimistic for a business that grew fast on
> spreadsheets.
>
> The third is speed. Quotes out the same day. Every sales call scored the day it
> happens instead of a sample at month end. Cash in a week earlier. Hardest to
> attribute, compounds the fastest.
>
> How I would go about it. Two weeks in the business before I build anything,
> sitting with accounts payable, sales admin, and whoever handles the exceptions,
> because the process nobody has written down is usually where the cost is. Then
> rank what is left on volume, unit cost, and how rule-shaped it is, and measure
> the baseline before touching it, because you cannot claim a saving you never
> measured. Then build one thing all the way through: the intake, the rules, the
> system it lands in, the exceptions, and the reporting somebody actually reads.
> And check it against something I do not control, the ledger or the supplier's
> own portal or the original data, because an agent telling you it is finished is
> a claim, not a fact. I have caught one describing a test pipeline that did not
> exist, and another writing a performance report that was incapable of failing.
>
> What I would not do is run a pilot that never leaves the pilot, or put an agent
> on top of a process that is already broken, which only makes the wrong answer
> arrive faster. And if forty per cent of the volume needs a person anyway, the
> automation is a rounding error. You should hear that from me before you pay for
> it, not six months in.

*(~430 words. If the box is tight, cut the third paragraph and the last one. The
first two and the method carry it.)*

---

## "Briefly describe your most relevant experience or project"

> The one I would point at first. A national charity's move onto HubSpot had
> stalled, their donation history was coming out wrong, and nobody could say why.
> I came in as technical lead. The earlier migration had merged donors on email
> address instead of the account number their old system used, so anyone who had
> changed their email, or shared one with a partner, ended up merged into
> somebody else or lost. Against the charity's own books it was out by around
> $3.8 million. I rebuilt it on the right key, 37,729 donations back against the
> right donors across four organisations, reconciled it to their accounts, and
> connected their donation platforms and accounting system so it stays right
> without anyone retyping it. Four rounds of testing with the charity before it
> went live.
>
> Closest to this role. I was asked whether a live shopping platform, most of it
> written by AI, was safe to put customers on. Rather than read the code and give
> an opinion, I used the gaps. A new secure login had been added and it covered
> one way in, but the old way in was still sitting there, so I signed in as a
> retailer who was live on air and shut their broadcast down. Nobody had to argue
> about whether it was real, and it was closed that week. Four of the six are
> properly closed now. Two are not, and I said so. I also told them one of the
> reported problems was not a problem at all, because chasing a phantom costs a
> team a week.
>
> On agents specifically, two small tools I built end to end and gave away, both
> live and both open source. One tells a trades business whether Thursday's
> concrete pour will survive the weather. The other reads a company's own website
> before a salesperson rings them and files what it finds into HubSpot. Both
> carry a script whose only job is to check the answer against something I do not
> control.
>
> All of it, with the numbers running live: https://aaronsteele.vercel.app

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
