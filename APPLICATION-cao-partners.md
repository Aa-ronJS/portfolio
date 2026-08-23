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

> There are really three places the money is, and most people only ever go after
> the first one.
>
> The obvious one is labour on repetitive work. Invoice matching, quoting, order
> intake, ticket triage, the monthly reporting pack. A business doing $50M is
> usually carrying somewhere between $8M and $12M in ops, finance and support
> overhead, and a sensible first pass will take maybe 20-30% of the time out of
> two or three of those functions. That's genuine money, but it shows up as
> capacity you don't have to hire rather than a line coming off the P&L, and I'd
> rather say that up front than have an awkward conversation about it six months
> in.
>
> The bigger number, and the one almost nobody has measured, is what's already
> leaking. Rework, credit notes, supplier rebates that never got claimed, pricing
> that's been wrong across a segment for a year, invoices that never actually
> went out. I did a migration for a national charity whose donation history was
> out by about $3.8M against their own books, because an earlier migration had
> merged donor records on email address instead of the account number the old
> system keyed on. It had been sitting like that for ages and nobody could work
> out why the numbers were wrong. That's not a labour saving, that's money that
> was already gone. On $50M, even 1% leakage is $500k a year, and 1% is probably
> generous for a company that grew quickly on spreadsheets.
>
> The third is speed: quotes going out the same day, every sales call scored the
> day it happens rather than a QA sample at month end, cash collected a week
> earlier. Hardest to put a number on, but it compounds.
>
> As for how I'd actually approach it, I'd spend the first couple of weeks in the
> business before building anything, sitting with AP, sales admin and whoever
> handles the exceptions, because the process nobody has written down is usually
> where the cost lives. Then rank the candidates on volume, unit cost and how
> rule-shaped the work is, and baseline them properly before touching anything,
> since you can't claim a saving you never measured. From there I'd build one
> thing end to end (intake, rules, the system it lands in, the exceptions, and
> reporting somebody will actually read) and verify it against something outside
> my control, whether that's the ledger, the supplier's portal or the original
> data. I've had agents tell me they were finished when they weren't, including
> one that wrote up a test pipeline that didn't exist, so I treat "done" as
> something to check rather than something to take on faith.
>
> The other half of the job is knowing what not to do: pilots that never leave
> the pilot stage, or automating a process that's already broken, which just gets
> you the wrong answer faster. And if it turns out 40% of the volume needs a
> human anyway, the honest advice is that the automation isn't worth much, and
> the client should hear that before they've paid for it.

*(~470 words. If the box is tight, drop the speed paragraph and the last one.)*

---

## "Briefly describe your most relevant experience or project"

> The most relevant one is probably the charity migration. A national charity's
> move onto HubSpot had stalled because their donation history was coming out
> wrong and nobody could say why, and I came in as technical lead. It turned out
> the earlier migration had merged donors on email address instead of the account
> number their old system used, so anyone who'd changed their email, or shared
> one with a partner, had been merged into someone else or lost entirely.
> Against the charity's own books it was out by roughly $3.8M. I rebuilt the
> migration on the correct key, which meant re-matching 37,729 donations to the
> right donors across four related organisations, reconciled the result back to
> their accounts, and then connected their donation platforms and accounting
> system so it stays accurate without anyone re-keying data. We ran four rounds
> of testing with the charity before it went live.
>
> Closer to this role specifically: I was asked to review a live shopping
> platform, most of which had been written by AI, and say whether it was safe to
> put customers on. Rather than just read the code and give an opinion, I tested
> the gaps directly. A new secure login had been added but the old login path was
> still active, so I used it to sign into the account of a retailer who was live
> on air and shut down their broadcast, which settled the question of whether the
> risk was real. It was fixed that week. Of the six issues I found, four are now
> properly closed and two aren't, and I've said so. I also cleared one finding
> that an automated scanner had flagged as a leaked key, because the code
> stripped it server-side and chasing it would have cost the team a week.
>
> On the agent side, I've built two small tools end to end and open-sourced
> them, both currently live. One tells a trades business whether a job like
> Thursday's concrete pour will get through the weather; the other researches a
> company from its own website before a salesperson calls and files the results
> into HubSpot. Both include a verification script that checks their output
> against a source I don't control.
>
> All of this is on https://aaronsteele.vercel.app with the numbers running
> live, and the code for both tools is public.

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
