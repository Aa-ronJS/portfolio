# Purchase order agent: working sample

Emails with PDF purchase orders go in. One ERP-ready CSV per order comes out,
and anything a customer service rep should double-check is flagged with the reason.

This is a small, runnable sample of the pipeline, built on made-up data.

## What it does

1. **Reads the inbox.** Each `.eml` is opened and its PDF attachments pulled out.
   Remittances, invoices and statements are recognised and skipped.
2. **Extracts the order** exactly as printed: PO number, customer, bill-to,
   ship-to, lines, quantities, units, prices, requested date, shipping notes and
   third-party carrier account numbers.
3. **Checks it against ERP reference data** (`reference/`): customers and their
   aliases, ship-to addresses, item numbers including customer part numbers and
   legacy numbers, units of measure and agreed prices.
4. **Flags what it is unsure about.** Blocking flags hold the order for review;
   informational ones (for example "this was the customer's part number") do not.
5. **Writes one CSV per order.** Clean orders go to `out/import/`, the folder the
   ERP import watches. Flagged orders go to `out/review/` and never reach the ERP
   until someone has looked. `out/report.html` lists every email and its outcome.

## Run it

    pip install pdfplumber reportlab pillow pydantic
    python make_samples.py     # builds the six sample emails
    python run.py              # processes them
    python -m unittest discover tests

## The sample inbox

| Email | Layout | Outcome |
|---|---|---|
| Acme PO | Clean system PDF, ruled table, two address columns | Imported |
| Brightline order | Label and value text, customer's own part numbers, UPS collect account | Held: price differs from price on file |
| Coastal fax | Fax cover sheet, order written as sentences, terms page | Held: ship-to not on file, wrong unit of measure |
| Delta request | No PO number, one unknown part | Held |
| Acme scan | Image only, upside down | Held: needs the vision model |
| Remittance advice | Not an order | Skipped |

No per-customer templates are used anywhere.

## Two extractors, one interface

`po_agent/extract.py` has two extractors that return the same `PurchaseOrder` shape:

- **`ClaudeExtractor`** sends the PDF to Claude and gets the schema back as
  validated structured output. This is the production path: it is what reads
  scans, rotated pages, handwriting and layouts nobody has seen before. It also
  reports which fields it was unsure of, and those become review flags.
- **`HeuristicExtractor`** reads the PDF text layer with label and pattern
  matching. It needs no API key, so validation, flagging and CSV output can be
  run and tested anywhere.

**What has and has not been run:** everything in the table above was produced by
the offline extractor, and the 21 tests cover that path. The Claude extractor is
written but was not run for this sample, because no API key was available where
it was built. Use `python run.py --claude` (every PDF) or `--claude-scans`
(scans only) with `ANTHROPIC_API_KEY` set to exercise it.

## What a production build adds

- A Microsoft 365 or Front mailbox watcher in place of the folder of `.eml` files.
- Your real CSV layout and drop location.
- Your reference data, refreshed from the ERP on a schedule.
- A review screen so reps can correct a held order and release it.
- An accuracy log: every correction a rep makes becomes a test case.
- Deployment inside your own environment, with your own API key.
