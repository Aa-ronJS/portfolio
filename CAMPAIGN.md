# Selling information products: the test

Four candidates, one built and live, and a plan for spending $1,000 that does
not spread it so thin that nothing can be read.

---

## The shortlist, and why this order

| # | Product | Buyer | Price to test | State |
|---|---|---|---|---|
| 1 | **Chargeback Response Builder** | Shopify and Stripe merchants mid dispute | $59 kit | **Free tool live** |
| 2 | Airbnb Damage Claim Evidence Kit | Hosts with guest damage | $49 kit | Not built. Same engine as #1 |
| 3 | Renovation Quote Comparison Kit | Homeowners holding 2 to 4 builder quotes | $39 kit | Not built. Different engine |
| 4 | NDIS 90 Day Cliff Check | Australian NDIS providers | $79 playbook | Free tool live, from the earlier round |

The thing all four have in common is the only thing that matters for paid
search: the buyer is holding a mess of evidence, they have one shot at getting
it right, and they are searching while the deadline runs.

**Why #1 goes first.** Business buyer, money at immediate risk, a deadline
counted in days rather than months, and search intent so specific that people
type the reason code itself. It also has the least competition at the code
level, where nobody is bidding.

**Why #3 runs alongside it.** Not because it is next best, but as insurance and
as a control. It carries no trademark exposure at all (see below), so if the
Shopify ads get held up it is not two dead weeks. It is also the only consumer
one of the three, which separates "this offer works" from "this kind of buyer
works".

**Why #4 stays.** It is built, it cost nothing to keep, and the 1 December
deadline gives it a natural run in October and November. It is not competing
for this thousand dollars.

---

## The constraint that is not in the plan yet

Two of the three top picks name somebody else's trademark, and Google does not
treat that as neutral.

Only the brand holder, its resellers, and **informational sites** may use a
trademark in ad text. The informational site exception applies where the primary
purpose of the landing page is to provide informative detail about the product
or service the trademark refers to. Google retired the old third party
authorisation form and now applies these exceptions directly, so there is nobody
to ask in advance. Ads that invoke the trademark for competitive purposes, or
where it is unclear which exception you are relying on, are not allowed.

Three consequences, and they change the build rather than just the ads.

1. **The free tool is what makes the ad legal.** A landing page whose primary
   purpose is a free explanation of how the dispute process works sits squarely
   inside the informational exception. A page whose primary purpose is a $59
   checkout does not. Leading with the tool was the honest structure and it
   happens to be the compliant one as well. Do not reverse them later without
   re reading this.
2. **Bidding on the brand term is not restricted, only saying it is.** Worst
   case, the keywords stay and the ad text loses the word Shopify. Write those
   headlines now so a disapproval costs an hour rather than a week. Both sets
   are below.
3. **#3 has none of this**, which is a real point in its favour for a first
   test and the reason it is not last.

None of this is legal advice, and Shopify or Airbnb can complain about their
mark regardless of what Google's policy allows. Keep the disclaimers on the
pages, keep the pages genuinely informational, and do not use anyone's logo or
brand colours.

---

## What #2 and #3 actually cost to build

Worth knowing before allocating money, because it is not three products.

**#1 and #2 are the same engine.** Both are: pick which allegation is being
made, see what that allegation is decided on, say what you hold, get back the
gaps and an assembled submission. Swap the six card network allegations for the
damage incident types, swap the network evidence rules for what the platform
asks a host to provide, and re-skin. The scoring, the checklist, the assembly
and the whole design system carry over. Days, not weeks.

**#3 is a different engine.** Comparison and normalisation rather than evidence
assembly: several quotes in, one apples to apples table out, with the omissions
and the exclusions surfaced. It shares the design system and nothing else. It is
the biggest build of the three and the reason it runs on a smaller budget first.

Both reuse `public/tools.css`, which is why that was pulled out of the first
page rather than left inline.

---

## Spending the $1,000

Not three ways. Three hundred dollars buys roughly seventy clicks, which is not
a signal, it is a rumour.

### Wave one, two weeks, $500

| | Budget | Why |
|---|---|---|
| Chargeback Response Builder | $350 | The real test. B2B, highest intent, already built |
| Renovation Quote Comparison | $150 | Control and insurance. Only runs once the tool exists |

### Wave two, two weeks, $500

Decided by wave one, not before. If the chargeback tool converts, wave two is
Airbnb at $500 and the engine gets its second skin. If it does not but the
renovation control does, the problem was the buyer and not the offer, and wave
two goes to the consumer side. If neither moves, that is a $500 answer and
worth having.

Run Microsoft Ads alongside at $10 a day on the same copy. Clicks are usually
cheaper and merchant admin work happens on Windows.

---

## Campaign one: the chargeback builder

### Ad groups

**A. Reason codes.** Tiny volume, almost nobody bidding, and the person typing
this has the dispute open in another tab. Protect this group if money gets
tight.

```
[chargeback reason code 10.4]
[visa 13.1 chargeback]
[mastercard 4855 chargeback]
[chargeback reason code 4837]
[chargeback reason codes explained]
"what does chargeback code mean"
```

**B. Shopify branded.** Higher volume, and the group the trademark note applies
to.

```
[shopify chargeback]
[shopify dispute evidence]
[how to fight a shopify chargeback]
[shopify chargeback response]
"shopify dispute deadline"
```

**C. Generic merchant.** Broadest, most competed, run last.

```
[how to fight a chargeback]
[chargeback evidence template]
[chargeback rebuttal letter]
"how to win a chargeback"
```

### Negatives

The mirror image of the participant problem in the NDIS campaign: most
chargeback search volume is cardholders trying to *file* one, and they are worth
nothing here.

```
-"how do i dispute" -"dispute a charge" -"file a chargeback" -"get my money back"
-"chargeback my" -"how to chargeback" -refund -"charged twice by"
-jobs -salary -course -certification -lawyer -attorney -"class action"
-bank -"credit card offers" -crypto
```

### Ad copy

Headlines, 30 characters. The first block avoids the trademark entirely and is
the default; use the second only while approvals hold.

```
Chargeback Response Builder
One Submission, No Appeal
Match Evidence To The Code
Reason Code 10.4? 13.1?
Free Chargeback Evidence Tool
Runs In Your Browser
No Signup. No Sales Call.
Built By A Business Analyst
```
```
Shopify Chargeback Response
Fighting A Shopify Dispute?
```

Descriptions, 90 characters.

```
Six allegations sit behind every reason code. Each needs different evidence. Free.
Tell it what you hold. It builds the response and names what is missing. Free tool.
Evidence answering the wrong allegation counts as none. Build the right packet.
Nothing is uploaded. No signup. The whole thing runs in your own browser.
```

Never write an ad that implies a win rate, a recovery figure, or a guarantee.
Not because Google will catch it, though it might, but because nobody can know
it and the page says so out loud.

## Campaign two: renovation quote comparison

Only once the tool exists. No trademark exposure, cheaper clicks, colder buyer.

```
[compare renovation quotes]
[how to compare builder quotes]
[renovation quote comparison]
[is my renovation quote too high]
"what should a renovation quote include"
"builder quote exclusions"
```

Negatives, because most of this volume is builders wanting to *write* quotes,
not homeowners comparing them:

```
-template -software -app -"quoting software" -jobs -course -"how to quote"
-estimator -takeoff -xero -invoice
```

---

## What counts as a pass

Set now, so it cannot be argued into one later.

| Measure | Fail | Pass |
|---|---|---|
| Click through rate | under 2% | over 4% |
| Started the tool, of clicks | under 20% | over 40% |
| Reached a built response | under 50% | over 70% |
| Email signup, of those who finished | under 10% | over 25% |
| Cost per signup | over $50 | under $20 |

**What $500 can tell you.** Whether a page engages the people who click it,
whether the code level group beats the branded group, and whether a business
buyer beats a consumer. All three change where the next dollar goes.

**What it cannot.** Whether anyone pays $59. Fifteen signups is not a market.
The gate for writing the kit is 40, and reaching it inside one wave is unlikely.
Expect to run wave one, learn where the traffic is cheapest, and run again.

**The most useful failure.** If group A converts and group B does not, the
buyer is the person who already knows their reason code, the product is a
reference rather than a kit, and the price is lower than $59. If B converts and
A does not, the buyer is earlier and more confused, the product is hand holding,
and the price is higher.

---

## Before a single click is bought

1. **Set the form endpoint** on both live pages. `data-endpoint` on `#signup`.
   Until it is set the form refuses to submit and says so, which is honest and
   collects nothing, and signups are what the whole test measures.
2. **Install analytics and a consent notice.** There is none. Both pages already
   push events to `window.dataLayer`: `cb_allegation_picked`, `cb_result_shown`,
   `cb_signup` on the chargeback page, and `ndis_*` equivalents on the other.
   With no tag installed the money is unmeasurable and therefore wasted.
3. **Click every source link on both pages.** They were right when written. Some
   would not respond to an automated fetch and were taken from search results,
   so confirm them before a stranger does.
4. **Decide whether 15 October is real** for the kit. It is printed on the page.
5. **Read the ad text against the trademark note above** and have the non brand
   headline set loaded and paused, ready to swap.
6. **Try the builder as somebody who has actually lost a dispute** would, on a
   phone, and see whether the language matches what Shopify told them.

---

## Where the facts came from

- Shopify, [Resolving a chargeback or inquiry](https://help.shopify.com/en/manual/payments/chargebacks/resolve-chargeback)
- Shopify, [Managing chargebacks in the admin](https://help.shopify.com/en/manual/payments/shopify-payments/managing-chargebacks/chargebacks-shopify-admin)
- Shopify, [ShopifyPaymentsDisputeEvidence](https://shopify.dev/docs/api/admin-graphql/latest/objects/ShopifyPaymentsDisputeEvidence), the authoritative list of evidence form fields
- Shopify, [Dispute file upload](https://shopify.dev/docs/api/admin-rest/latest/resources/dispute-file-upload), the file type, size and page limits
- Redo, [Chargeback reason codes and the evidence that answers each](https://redo.com/resources/articles/chargebacks/chargeback-reason-codes), vendor material, used to cross check the six way grouping and the Visa and Mastercard numbering
- Chargeflow, [Shopify disputes and chargebacks](https://www.chargeflow.io/chargebacks-101/shopify-dispute), vendor material from a company selling dispute automation
- Google, [Trademarks in Google Ads](https://support.google.com/adspolicy/answer/6118), the reseller and informational site exceptions

The card networks' full rulebooks are not public. Nobody writing about reason
codes, including me and including every vendor above, is reading the primary
source end to end, and the page says so rather than implying otherwise.

---

## Appendix: the NDIS campaign, still standing

From the earlier round, kept because the tool is live and the deadline gives it
a natural run through October and November. Not funded out of the $1,000.

The hook: from 1 December 2026 the window to claim an NDIS support drops from
two years to 90 days, under legislation that passed Parliament on 19 August
2026. Free tool at `/ndis-claim-check/`.

Two ad groups. The deadline, and the error codes.

```
[ndis 90 day claim rule]        [ndis error code v27]
[ndis claim window change]      [ndis error code v11]
[ndis 90 days to claim]         [ndis payment request error codes]
"ndis claim time limit"         "why was my ndis claim rejected"
"ndis funding periods claiming" "ndis insufficient funds in funding period"
```

Negatives, because most NDIS search volume is participants and families:

```
-participant -"my plan" -"my child" -"plan manager near me" -"support worker"
-jobs -salary -course -certificate -"become a provider" -"how to register"
-"worker screening" -sil -vacancy -"price guide pdf" -"ndis login"
```

Sources: NDIS [Securing the NDIS for future generations](https://www.ndis.gov.au/ndis-laws/securing-ndis-future-generations),
Health [About the changes](https://www.health.gov.au/our-work/ndis-legislation-changes/amendments/ndis-amendment-securing-the-ndis-for-future-generations-bill-2026/about-the-changes-to-the-ndis),
NDIS [Claims and payments troubleshooting](https://www.ndis.gov.au/providers/working-provider/getting-paid/claims-and-payments-troubleshooting),
NDIS [Bulk Payment Request template](https://www.ndis.gov.au/media/2707/download?attachment=).
