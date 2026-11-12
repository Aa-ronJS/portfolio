"""Turn a PDF into a PurchaseOrder.

Two extractors share one interface:

* ClaudeExtractor sends the PDF itself (pages as images plus any text layer) to
  Claude and asks for the PurchaseOrder schema back. This is the production path:
  it reads scans, rotated pages, handwriting and layouts it has never seen.
* HeuristicExtractor reads the PDF text layer with label and pattern matching.
  It needs no API key, so the rest of the pipeline can be run and tested offline.
  It cannot read image-only PDFs and says so instead of guessing.
"""
from __future__ import annotations

import base64
import re
from pathlib import Path

import pdfplumber

from .models import POLine, PurchaseOrder


class NoTextLayer(Exception):
    """The PDF is a scan or photo; a vision model is needed to read it."""


def pdf_text(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\n".join((page.extract_text() or "") for page in pdf.pages)


# ---------------------------------------------------------------- Claude path

EXTRACTION_PROMPT = """This PDF arrived as an email attachment at a manufacturer's order desk.
Extract the purchase order into the schema.

Rules:
- Copy values exactly as printed. Do not correct, normalise or look anything up.
- The file may include fax cover sheets and terms pages. Ignore them.
- Pages may be rotated, upside down, scanned or handwritten. Read them anyway.
- If a field is absent, leave it null. Never invent a PO number, price or date.
- List in uncertain_fields every field you could not read with confidence
  (for a line item use the form "lines[3].quantity")."""


class ClaudeExtractor:
    name = "claude"

    def __init__(self, model: str = "claude-opus-5-5"):
        import anthropic  # imported here so the offline path has no dependency on it

        self.client = anthropic.Anthropic()
        self.model = model

    def extract(self, path: Path) -> PurchaseOrder:
        data = base64.standard_b64encode(path.read_bytes()).decode("ascii")
        response = self.client.messages.parse(
            model=self.model,
            max_tokens=16000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {"type": "base64", "media_type": "application/pdf", "data": data},
                        },
                        {"type": "text", "text": EXTRACTION_PROMPT},
                    ],
                }
            ],
            output_format=PurchaseOrder,
        )
        if response.stop_reason == "refusal" or response.parsed_output is None:
            raise RuntimeError(f"Claude returned no extraction (stop_reason={response.stop_reason})")
        return response.parsed_output


# ------------------------------------------------------------- offline path

UOMS = {"EA", "EACH", "BX", "BOX", "CS", "CASE", "PK", "PACK", "FT", "RL", "ROLL", "PC", "PCS"}
PART = re.compile(r"\b[A-Z]{2,4}-\d{3,5}\b|\b\d{2}-\d{4}\b")
MONEY = re.compile(r"\$?\s?(\d{1,6}\.\d{2})\b")
PO_NUMBER = re.compile(
    r"(?:P\.?\s?O\.?|Purchase\s+Order|Order)\s*(?:Number|No\.?|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{3,})", re.I
)
DATE_LABEL = re.compile(
    r"(?:Requested|Required|Need(?:ed)?\s+By|Deliver(?:y)?(?:\s+Date|\s+By)?|Ship\s+Date)\s*(?:Date)?\s*[:\-]?\s*"
    r"([0-9]{1,4}[/\-.][0-9]{1,2}[/\-.][0-9]{2,4}|[A-Z][a-z]+\.? \d{1,2},? \d{4}|\d{1,2} [A-Z][a-z]+ \d{4})",
    re.I,
)
CARRIER = re.compile(r"\b(UPS|FedEx|FEDEX|DHL|USPS|R\+L|XPO|Estes)\b[^\n]*?(?:Acct|Account)\.?\s*(?:No\.?|#)?\s*[:#]?\s*([A-Z0-9]{5,})", re.I)
SHIP_VIA = re.compile(r"Ship\s+Via\s*[:\-]?\s*([^\n]+)", re.I)
NOTES = re.compile(r"(?:Shipping\s+Notes?|Notes?|Special\s+Instructions?)\s*[:\-]\s*([^\n]+)", re.I)


def _block_after(label: str, text: str, max_lines: int = 3) -> str | None:
    """The lines that follow a label such as 'Ship To', joined into one string."""
    m = re.search(label + r"\s*[:\-]?\s*([^\n]*)\n?((?:[^\n]+\n?){0,%d})" % (max_lines - 1), text, re.I)
    if not m:
        return None
    lines = [m.group(1)] + m.group(2).splitlines()
    kept = []
    for line in lines:
        line = line.strip()
        if not line or re.match(r"(Bill|Ship|Sold)\s+To|Line\b|Item\b|Qty\b|P\.?O\.?\s*(No|Number|#)", line, re.I):
            if kept:
                break
            continue
        kept.append(line)
        if re.search(r"\b\d{5}\b", line):  # a postcode ends the address
            break
    return " ".join(kept) or None


def _parse_line(text: str, line_no: int) -> POLine | None:
    part = PART.search(text)
    if not part:
        return None
    tokens = text.replace(",", "").split()
    qty = uom = None
    for i, tok in enumerate(tokens):
        if tok.upper().rstrip(".") in UOMS:
            uom = tok.upper().rstrip(".")
            # quantity is the whole number next to the unit, on either side
            for j in (i - 1, i + 1):
                if 0 <= j < len(tokens) and re.fullmatch(r"\d+(\.0+)?", tokens[j]):
                    qty = float(tokens[j])
                    break
            if qty is not None:
                break
    if qty is None or uom is None:
        return None
    prices = [float(p) for p in MONEY.findall(text)]
    description = text[part.end():].strip()
    description = re.split(r"\s\d+\s|\$|@", description)[0].strip(" -,")
    return POLine(
        line_no=line_no,
        part_number=part.group(0),
        description=description,
        quantity=qty,
        uom=uom,
        unit_price=prices[0] if prices else None,
    )


class HeuristicExtractor:
    name = "heuristic"

    def __init__(self, known_customers: list[str] | None = None):
        self.known_customers = known_customers or []

    def extract(self, path: Path) -> PurchaseOrder:
        text = pdf_text(path)
        if len(text.strip()) < 40:
            raise NoTextLayer(path.name)

        po = PurchaseOrder()
        m = PO_NUMBER.search(text)
        po.po_number = m.group(1) if m else None
        lowered = text.lower()
        for name in sorted(self.known_customers, key=len, reverse=True):
            if name.lower() in lowered:
                po.customer_name = name
                break
        po.bill_to = _block_after(r"(?:Bill|Sold)\s+To", text)
        po.ship_to = _block_after(r"(?:Ship|Deliver)\s+To", text)
        if po.customer_name is None and po.bill_to:
            po.customer_name = po.bill_to
            po.uncertain_fields.append("customer_name")
        m = DATE_LABEL.search(text)
        po.requested_date = m.group(1) if m else None
        m = CARRIER.search(text)
        if m:
            po.ship_via, po.carrier_account = m.group(1), m.group(2)
        else:
            m = SHIP_VIA.search(text)
            po.ship_via = m.group(1).strip() if m else None
        m = NOTES.search(text)
        po.notes = m.group(1).strip() if m else None

        for raw in text.splitlines():
            line = _parse_line(raw, len(po.lines) + 1)
            if line:
                po.lines.append(line)
        if not po.lines:
            po.uncertain_fields.append("lines")
        return po


def looks_like_po(path: Path) -> tuple[bool, str]:
    """Cheap triage so remittances, invoices and statements never reach extraction."""
    text = pdf_text(path).lower()
    if len(text.strip()) < 40:
        return True, "image-only PDF, cannot rule it out"
    head = text[:600]
    for word in ("remittance", "invoice", "statement of account", "packing slip"):
        if word in head and "purchase order" not in head:
            return False, f"looks like a {word}"
    if "purchase order" in text or PO_NUMBER.search(text) or "ship to" in text:
        return True, "purchase order wording found"
    return False, "no purchase order wording"
