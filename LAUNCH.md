# Zero to profit in one day, $100 of ads

The challenge as set: start from a portfolio that sells nothing, and end the day
with more money in than the ads cost. This is the plan, the arithmetic, and every
piece of copy needed to run it. Written before the day, so the day is execution.

**Profit, defined.** Cash received today, minus ad spend, minus Stripe's fee.
Labour is not counted, and that is stated rather than hidden: the product is a
front-end offer priced to be bought by a stranger, and the money in this business
is in the rebuild that half of these checks will lead to.

---

## 1. What is for sale

**HubSpot Data Health Check.** $490 AUD inc GST, paid once, delivered within
three business days of payment and access. Written report, prioritised fix list,
thirty minutes on a call. Nothing worth fixing, full refund in writing.

Why this and not something else:

- It is the first week of the job that is already the strongest story on the
  home page ($3.8 million, 37,729 donations, 1,019 organisations). Nothing on the
  sales page has to be invented.
- It is buyable by a stranger. A rebuild is a conversation; a fixed-price check
  with a refund promise is a button.
- It needs only read-only access and a spreadsheet, so it can be sold today and
  started tomorrow without a scoping call.
- One sale covers the whole ad budget four times over. The day does not need
  volume, it needs one.

The page is `/audit`. The thank-you page is `/audit/thanks`, and `?paid=1` on it
is the difference between a purchase and an enquiry.

## 2. The arithmetic, honestly

Estimates, not measurements. Australian search costs for HubSpot terms in
September 2026 are my guess from adjacent markets; the first hour of the campaign
replaces them with real numbers.

| Quantity | Estimate | Note |
|---|---|---|
| Google Search cost per click, AU, HubSpot problem terms | $6 to $15 | Take $10 |
| Clicks from $100 | 7 to 16 | Take 10 |
| Landing to enquiry | 5% to 10% | 0.5 to 1 enquiry |
| Landing to purchase, cold, $490 | 1% to 3% | 0.1 to 0.3 purchases |
| Stripe fee on $490 domestic card | about $8.60 | 1.7% plus 30 cents |
| Profit on one sale | about $381 | $490 less $100 less $8.60 |

So the ads alone are unlikely to produce the sale today. Expected value of the
$100 is a tenth to a third of a purchase and roughly one enquiry. That is not a
reason to skip them; it is a reason to know what they are for. They buy the one
searcher in Australia today who typed the problem into Google, and they buy real
click and conversion data for a hundred dollars.

**The sale comes from warm traffic sent to the same page.** Same day, same
offer, zero cost:

| Channel | Reach | Realistic yield today |
|---|---|---|
| Direct messages to 20 people who run or administer HubSpot and already know Aaron | 20 | 1 to 3 replies, 0 to 1 sale |
| One LinkedIn post, with the $3.8m story and the link | Own network | 1 to 3 enquiries |
| HubSpot Community and r/hubspot, answering a real question and linking once | Public | 0 to 1 enquiry |
| Google Ads | 10 clicks | 0 to 1 enquiry |

Combined, one sale in the day is a coin flip, not a certainty. Two would be a
good day. Zero is possible and the plan says what to do about it in section 7.

## 3. Before a dollar is spent: the setup (about 90 minutes)

Everything on the page falls back safely while these are placeholders, and an
amber ribbon on the page says so. Do them in this order.

1. **Stripe Payment Link.** Product "HubSpot Data Health Check", one-off, A$490,
   price includes tax. Collect email and billing address. Under confirmation
   page choose "redirect customers to your website" and set
   `https://aaronsteele.vercel.app/audit/thanks?paid=1`. Copy the
   `buy.stripe.com` URL into `CONFIG.stripeLink` in `public/audit/index.html`.
   The page appends `client_reference_id` from the visitor's UTM tags, so the
   Stripe dashboard shows which channel each payment came from.
2. **Form endpoint.** A Formspree form (free tier, 50 a month). Set its redirect
   to `https://aaronsteele.vercel.app/audit/thanks`. Copy the endpoint into
   `CONFIG.formEndpoint`. The hidden `source` field carries the UTMs, referrer
   and landing time.
3. **Vercel Web Analytics.** Toggle on in the project. The script tag is already
   on both pages; until the toggle is on it 404s harmlessly. This gives page
   views by UTM without adding Google Analytics.
4. **Google Ads.** Create the account, then two conversion actions under Goals:
   "Purchase" (value 490, once per click) and "Enquiry" (no value). Put the tag
   id in `CONFIG.gadsId` on the offer page and `GADS.id` plus the two labels on
   the thank-you page. Leave everything empty if you would rather judge the day
   from Stripe and the inbox; the page works either way.
5. **Deploy.** `npx vercel deploy --prod`. Open `/audit` on a phone. The ribbon
   must be gone. Click Pay, reach Stripe, back out. Submit the form with your own
   details, land on thanks. Only then build the campaign.

## 4. The Google Ads campaign

- **Type:** Search only. No Display, no Search Partners, no Performance Max. The
  budget is too small to learn anything from broad reach.
- **Location:** Australia, "presence" not "presence or interest".
- **Schedule:** 7am to 8pm Australian Central time, today only.
- **Budget:** daily budget **$50**. Google may spend up to twice the daily
  budget in one day, so $50 is what caps the day at $100. Pause the campaign at
  8pm regardless.
- **Bidding:** manual CPC, max bid $12, no enhancement. Automated bidding has
  nothing to learn from in one day and will spend the budget finding out.
- **One ad group, exact and phrase match only.**

Keywords:

```
[hubspot duplicate contacts]
[hubspot merge duplicates]
[hubspot data cleanup]
[hubspot data audit]
[hubspot audit]
"hubspot reports wrong"
"hubspot reports don't match"
"hubspot migration problems"
"hubspot salesforce migration"
"hubspot consultant australia"
"hubspot consultant adelaide"
"hubspot consultant melbourne"
"hubspot consultant sydney"
```

Negatives, added before launch:

```
free, jobs, job, salary, careers, login, sign in, pricing, cost of hubspot,
tutorial, certification, academy, course, training, template, vs, alternative,
review, reviews, api, developer, partner program, download
```

Responsive search ad. Every headline is 30 characters or under and every
description is 90 or under (checked by script, see the bottom of this file).

Headlines:

```
HubSpot Numbers Look Wrong?
Fixed Price Data Health Check
Report In 3 Business Days
Nothing To Fix, Nothing To Pay
$490 AUD, Paid Once
Reconciled To Your Accounts
Australian HubSpot Analyst
Find The Merge Mistake
Duplicates, Bad Merges, Gaps
Ten Years In CRM Data
```

Descriptions:

```
Fixed-price check of one HubSpot portal. Written report and fix list in three days.
I found $3.8m of donations filed against the wrong donors. What is hiding in yours?
Merged on the wrong key? Totals that do not match Xero? Read-only access is all it takes.
Nothing worth fixing means a full refund, in writing. Australian dollars, GST included.
```

Final URL for every ad:

```
https://aaronsteele.vercel.app/audit?utm_source=google&utm_medium=cpc&utm_campaign=hhc-search&utm_term={keyword}
```

Pin "HubSpot Numbers Look Wrong?" to headline position 1. Leave the rest to rotate.

## 5. The warm channels, word for word

Every link carries a UTM so the Stripe `client_reference_id` and the form's
`source` field say where the money came from.

**LinkedIn post** (`?utm_source=linkedin&utm_medium=post&utm_campaign=hhc`):

> A national charity's HubSpot was $3.8 million out against their own books and
> nobody had found it in a year.
>
> The cause was one decision made during migration: donors were merged on email
> address instead of the account number the old system used. Anyone who changed
> their email, or shared one with a partner, got merged into somebody else or
> lost.
>
> I found it in the first week. Then I rebuilt 37,729 donations against the
> right people and reconciled the lot.
>
> I am now selling that first week on its own. One HubSpot portal, fixed price,
> written report and fix list in three business days. If I find nothing worth
> fixing you pay nothing. Two spots this week.
>
> Link in the first comment.

Put the link in the first comment, not the post body. Reply to every comment
within the hour.

**Direct message** to the twenty people. Write the list before 9am: past
colleagues who now run HubSpot, anyone who has ever asked a CRM question, the
studio owner and the recruiter the home page was built for. Personalise the first
line, keep the rest:

> Quick one. I have started selling the first week of the HubSpot rebuild work
> as a fixed-price check: one portal, $490, report and fix list in three days,
> refund if there is nothing worth fixing. Do you know anyone whose HubSpot
> numbers do not add up, or is that you? Here is the page: [link with
> `?utm_source=dm&utm_medium=linkedin&utm_campaign=hhc`]

Ask for the referral, not the sale. People forward a referral request; they
rarely reply to a pitch.

**Community answers.** Search the HubSpot Community and r/hubspot for questions
from the last week containing "duplicate", "merge", "migration" or "reports
don't match". Answer three of them properly, with the actual method, no link.
Link once, in the one thread where the asker is clearly a business owner and
clearly stuck, with `?utm_source=community`. One link, not three: two of these
communities remove and ban for the second.

## 6. The day, hour by hour (ACST)

| Time | Do | Check |
|---|---|---|
| 7:00 | Section 3 setup, deploy, walk the page on a phone | Ribbon gone, Stripe reached, thank-you page reached |
| 8:30 | Build the campaign per section 4, launch | Ads approved. Disapproval on the refund claim is possible; if so, remove "Nothing To Fix, Nothing To Pay" and resubmit |
| 9:00 | Write the twenty names. Send the first ten messages | |
| 9:30 | Publish the LinkedIn post, link in first comment | |
| 10:00 | Community answers, section 5 | |
| 11:00 | **First read.** Ads: impressions, clicks, average CPC, search terms report | Any search term that is not a HubSpot data problem becomes a negative now |
| 12:00 | Send the second ten messages. Reply to every LinkedIn comment | |
| 13:00 | **Second read.** If CPC is above $15 lower the max bid to $9. If clicks are landing and nobody scrolls (Vercel Analytics), the hero is wrong, not the audience | |
| 14:00 | Reply to every enquiry within the hour. Send the payment link personally, not the page, to anyone who has asked a question | This is where the sale actually happens |
| 16:00 | **Third read.** Kill criteria, section 7 | |
| 18:00 | Last replies. Anyone still deciding gets one line: "I can start Monday, the link is good until then" | |
| 20:00 | Pause the campaign. Tally: Stripe balance, ad spend, enquiries by source | Write the numbers into section 8 |

## 7. Kill criteria and what "no sale" means

Stop the ads early if by 13:00 any of these is true:

- Fewer than 3 clicks and CPC above $20. The keywords are being bought by
  agencies with bigger budgets; the $100 is better spent tomorrow on LinkedIn.
- Clicks arriving but the search terms report is full of "login", "pricing",
  "free". The negatives were not enough; pause, add them, and relaunch only if
  there are two hours of daylight left.
- Ads disapproved for the guarantee wording and not fixable in one edit.

If the day ends with enquiries but no payment, the day is not a loss and the
plan is not wrong. A $490 purchase from a stranger normally takes two contacts.
Reply to every enquiry on day two before 9am. The ad spend is sunk; the leads are
not.

If the day ends with zero enquiries from all channels, the offer is the problem,
not the traffic. The next test is price, not copy: the same page at $290.

## 8. Results

Filled in at 20:00 on the day. Empty until then, on purpose.

| | |
|---|---|
| Ad spend | |
| Clicks, average CPC | |
| Enquiries, by source | |
| Payments, by source | |
| Stripe fees | |
| Profit | |

---

## Appendix: checking the ad copy lengths

```bash
python3 - <<'PY'
h = """HubSpot Numbers Look Wrong?
Fixed Price Data Health Check
Report In 3 Business Days
Nothing To Fix, Nothing To Pay
$490 AUD, Paid Once
Reconciled To Your Accounts
Australian HubSpot Analyst
Find The Merge Mistake
Duplicates, Bad Merges, Gaps
Ten Years In CRM Data""".split("\n")
d = """Fixed-price check of one HubSpot portal. Written report and fix list in three days.
I found $3.8m of donations filed against the wrong donors. What is hiding in yours?
Merged on the wrong key? Totals that do not match Xero? Read-only access is all it takes.
Nothing worth fixing means a full refund, in writing. Australian dollars, GST included.""".split("\n")
for s in h: print(len(s), "OK " if len(s) <= 30 else "TOO LONG", s)
for s in d: print(len(s), "OK " if len(s) <= 90 else "TOO LONG", s)
PY
```
