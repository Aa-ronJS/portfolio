"""Inbox in, one CSV per order out, plus a report of what needs a human."""
from __future__ import annotations

import csv
import email
import html
import re
import tempfile
from dataclasses import dataclass, field
from email import policy
from pathlib import Path

from .extract import NoTextLayer, looks_like_po
from .models import Flag, ResolvedOrder
from .validate import Reference, validate

CSV_COLUMNS = [
    "po_number", "customer_id", "shipto_id", "requested_date", "line_no", "item_no",
    "quantity", "uom", "unit_price", "ship_via", "carrier_account", "notes", "review_flags",
]


@dataclass
class Result:
    email_file: str
    subject: str
    attachment: str = ""
    status: str = ""          # imported | review | skipped
    reason: str = ""
    output: str = ""
    order: ResolvedOrder | None = None
    flags: list[Flag] = field(default_factory=list)


def write_csv(order: ResolvedOrder, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(CSV_COLUMNS)
        for line in order.lines:
            codes = sorted({fl.code for fl in order.flags if fl.blocking and fl.line_no in (None, line.line_no)})
            w.writerow([
                order.po_number, order.customer_id, order.shipto_id, order.requested_date, line.line_no,
                line.item_no, f"{line.quantity:g}", line.uom,
                "" if line.unit_price is None else f"{line.unit_price:.2f}",
                order.ship_via, order.carrier_account, order.notes, "|".join(codes),
            ])


def _safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "_", name) or "unnamed"


def process_inbox(inbox: Path, reference_dir: Path, out: Path, extractor, vision_extractor=None) -> list[Result]:
    """Process every .eml in the inbox.

    extractor reads the PDFs. vision_extractor, when given, takes over for PDFs
    the first extractor cannot read (scans, photos, handwriting).
    """
    ref = Reference(reference_dir)
    results: list[Result] = []
    for eml in sorted(inbox.glob("*.eml")):
        msg = email.message_from_bytes(eml.read_bytes(), policy=policy.default)
        subject = msg.get("subject", "")
        pdfs = [p for p in msg.iter_attachments() if (p.get_filename() or "").lower().endswith(".pdf")]
        if not pdfs:
            results.append(Result(eml.name, subject, status="skipped", reason="no PDF attachment"))
            continue
        for part in pdfs:
            res = Result(eml.name, subject, attachment=part.get_filename())
            results.append(res)
            with tempfile.TemporaryDirectory() as tmp:
                pdf = Path(tmp) / _safe(part.get_filename())
                pdf.write_bytes(part.get_payload(decode=True))
                is_po, why = looks_like_po(pdf)
                if not is_po:
                    res.status, res.reason = "skipped", why
                    continue
                try:
                    po = extractor.extract(pdf)
                except NoTextLayer:
                    if vision_extractor is None:
                        res.status = "review"
                        res.reason = "scanned or photographed PDF: needs the vision model (no API key in this run)"
                        res.flags = [Flag(code="NEEDS_VISION", message=res.reason)]
                        continue
                    po = vision_extractor.extract(pdf)
            order = validate(po, ref)
            res.order, res.flags = order, order.flags
            folder = "review" if order.needs_review else "import"
            name = _safe(order.po_number) if order.po_number else _safe(Path(res.attachment).stem) + "_NO_PO"
            target = out / folder / f"PO_{name}.csv"
            write_csv(order, target)
            res.status = "review" if order.needs_review else "imported"
            res.output = str(target.relative_to(out))
    write_report(results, out / "report.html")
    return results


def write_report(results: list[Result], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    colour = {"imported": "#1a7f37", "review": "#b35900", "skipped": "#57606a"}
    rows = []
    for r in results:
        flags = "".join(
            f"<li class='{'b' if f.blocking else 'i'}'><b>{html.escape(f.code)}</b>"
            f"{' (line %d)' % f.line_no if f.line_no else ''}: {html.escape(f.message)}</li>"
            for f in r.flags
        )
        po = r.order.po_number if r.order and r.order.po_number else ""
        rows.append(
            f"<tr><td>{html.escape(r.subject)}<br><small>{html.escape(r.attachment)}</small></td>"
            f"<td><span style='color:{colour[r.status]}'><b>{r.status.upper()}</b></span><br>"
            f"<small>{html.escape(r.reason)}</small></td>"
            f"<td>{html.escape(po)}</td><td>{html.escape(r.output)}</td><td><ul>{flags}</ul></td></tr>"
        )
    counts = {s: sum(1 for r in results if r.status == s) for s in colour}
    path.write_text(
        "<!doctype html><meta charset='utf-8'><title>PO agent run</title>"
        "<style>body{font:14px system-ui;margin:24px;color:#1f2328}table{border-collapse:collapse;width:100%}"
        "td,th{border:1px solid #d0d7de;padding:8px;vertical-align:top;text-align:left}th{background:#f6f8fa}"
        "ul{margin:0;padding-left:18px}li.b{color:#b35900}li.i{color:#57606a}small{color:#57606a}</style>"
        f"<h1>Purchase order run</h1><p>{counts['imported']} sent to ERP import, "
        f"{counts['review']} held for review, {counts['skipped']} skipped.</p>"
        "<table><tr><th>Email</th><th>Outcome</th><th>PO</th><th>File</th><th>What to check</th></tr>"
        + "".join(rows) + "</table>"
    )
