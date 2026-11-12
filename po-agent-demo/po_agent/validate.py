"""Check an extracted PO against ERP reference data and say what a rep must look at."""
from __future__ import annotations

import csv
import re
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path

from .models import Flag, PurchaseOrder, ResolvedLine, ResolvedOrder

UOM_ALIASES = {"EACH": "EA", "BOX": "BX", "CASE": "CS", "PACK": "PK", "ROLL": "RL", "PC": "EA", "PCS": "EA"}
DATE_FORMATS = ("%m/%d/%Y", "%m/%d/%y", "%Y-%m-%d", "%m-%d-%Y", "%B %d, %Y", "%B %d %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y")
PRICE_TOLERANCE = 0.01  # 1 percent


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", (text or "").lower()).strip()


def _similar(a: str, b: str) -> float:
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()


class Reference:
    """The customer, ship-to, item and price data the ERP exports."""

    def __init__(self, folder: Path):
        rows = lambda name: list(csv.DictReader((folder / name).read_text().splitlines()))
        self.customers = rows("customers.csv")
        self.shiptos = rows("shiptos.csv")
        self.items = {r["item_no"]: r for r in rows("items.csv")}
        self.legacy = {r["legacy_no"]: r["item_no"] for r in self.items.values() if r["legacy_no"]}
        self.customer_parts = {(r["customer_id"], r["customer_part"]): r["item_no"] for r in rows("customer_parts.csv")}
        self.prices = {(r["customer_id"], r["item_no"]): float(r["price"]) for r in rows("prices.csv")}

    def customer_names(self) -> list[str]:
        names = []
        for c in self.customers:
            names.append(c["name"])
            names += [a for a in c["aliases"].split("|") if a]
        return names

    def find_customer(self, printed: str | None) -> str | None:
        if not printed:
            return None
        best, score = None, 0.0
        for c in self.customers:
            for name in [c["name"]] + c["aliases"].split("|"):
                if not name:
                    continue
                s = 1.0 if _norm(name) in _norm(printed) else _similar(name, printed)
                if s > score:
                    best, score = c["customer_id"], s
        return best if score >= 0.82 else None

    def find_shipto(self, customer_id: str, printed: str | None) -> str | None:
        """Match on the words of the address, so extra text around it does not matter.

        The street number must be present, and most of the other words too.
        """
        if not printed:
            return None
        have = set(_norm(printed).split())
        best, score = None, 0.0
        for s in self.shiptos:
            if s["customer_id"] != customer_id:
                continue
            want = _norm(s["address"]).split()
            if want[0] not in have:
                continue
            ratio = sum(1 for w in want if w in have) / len(want)
            if ratio > score:
                best, score = s["shipto_id"], ratio
        return best if score >= 0.8 else None

    def resolve_item(self, customer_id: str, printed: str) -> tuple[str | None, str]:
        """Return (our item number, how it was matched)."""
        part = printed.strip().upper()
        if part in self.items:
            return part, "item"
        if (customer_id, part) in self.customer_parts:
            return self.customer_parts[(customer_id, part)], "customer_part"
        if part in self.legacy:
            return self.legacy[part], "legacy"
        return None, "unknown"


def parse_date(printed: str | None) -> str | None:
    if not printed:
        return None
    cleaned = printed.strip().replace(".", "")
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def validate(po: PurchaseOrder, ref: Reference) -> ResolvedOrder:
    order = ResolvedOrder(
        po_number=po.po_number or "",
        ship_via=po.ship_via or "",
        carrier_account=po.carrier_account or "",
        notes=po.notes or "",
    )
    flag = lambda code, message, blocking=True, line_no=None: order.flags.append(
        Flag(code=code, message=message, blocking=blocking, line_no=line_no)
    )

    if not po.po_number:
        flag("MISSING_PO_NUMBER", "No PO number found on the document.")

    order.customer_id = ref.find_customer(po.customer_name) or ref.find_customer(po.bill_to) or ""
    if not order.customer_id:
        flag("UNKNOWN_CUSTOMER", f"Customer not recognised: {po.customer_name or 'none printed'!r}.")

    if order.customer_id:
        order.shipto_id = ref.find_shipto(order.customer_id, po.ship_to) or ""
        if not order.shipto_id:
            flag("UNKNOWN_SHIPTO", f"Ship-to address is not on file for {order.customer_id}: {po.ship_to or 'none printed'!r}.")

    if po.requested_date:
        iso = parse_date(po.requested_date)
        if iso:
            order.requested_date = iso
        else:
            flag("DATE_UNREADABLE", f"Could not read requested date {po.requested_date!r}.")
    else:
        flag("NO_REQUESTED_DATE", "No requested date on the PO.", blocking=False)

    if not po.lines:
        flag("NO_LINES", "No line items could be read.")

    for line in po.lines:
        item_no, how = ref.resolve_item(order.customer_id, line.part_number)
        if not item_no:
            flag("UNKNOWN_ITEM", f"Part {line.part_number!r} matches no item, customer part or legacy number.", line_no=line.line_no)
            continue
        if how == "customer_part":
            flag("VIA_CUSTOMER_PART", f"{line.part_number} is the customer's part number for {item_no}.", blocking=False, line_no=line.line_no)
        if how == "legacy":
            flag("VIA_LEGACY_NUMBER", f"{line.part_number} is the legacy number for {item_no}.", blocking=False, line_no=line.line_no)

        uom = UOM_ALIASES.get(line.uom.upper(), line.uom.upper())
        expected_uom = ref.items[item_no]["uom"]
        if uom != expected_uom:
            flag("UOM_MISMATCH", f"PO says {line.uom} but {item_no} is sold by the {expected_uom}.", line_no=line.line_no)

        expected_price = ref.prices.get((order.customer_id, item_no))
        if line.unit_price is None:
            flag("NO_PRICE_ON_PO", f"No price printed for {item_no}; ERP price will apply.", blocking=False, line_no=line.line_no)
        elif expected_price is None:
            flag("NO_PRICE_ON_FILE", f"No agreed price on file for {item_no} and {order.customer_id}.", line_no=line.line_no)
        elif abs(line.unit_price - expected_price) > expected_price * PRICE_TOLERANCE:
            flag("PRICE_MISMATCH", f"PO price {line.unit_price:.2f} differs from price on file {expected_price:.2f} for {item_no}.", line_no=line.line_no)

        order.lines.append(
            ResolvedLine(
                line_no=line.line_no,
                item_no=item_no,
                quantity=line.quantity,
                uom=expected_uom if uom == expected_uom else uom,
                unit_price=line.unit_price,
                printed_part=line.part_number,
            )
        )

    for field in po.uncertain_fields:
        flag("LOW_CONFIDENCE", f"Extractor was unsure about {field}.")
    return order
