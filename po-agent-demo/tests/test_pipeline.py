"""Run with: python -m unittest discover tests"""
import csv
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from po_agent.extract import HeuristicExtractor  # noqa: E402
from po_agent.models import POLine, PurchaseOrder  # noqa: E402
from po_agent.pipeline import process_inbox  # noqa: E402
from po_agent.validate import Reference, parse_date, validate  # noqa: E402

REF = Reference(ROOT / "reference")


def order(**kw):
    base = dict(po_number="P1", customer_name="Acme Industrial Supply",
                ship_to="4400 Foundry Road Dayton OH 45402", requested_date="11/24/2026",
                lines=[POLine(line_no=1, part_number="WID-1010", quantity=5, uom="EA", unit_price=4.20)])
    base.update(kw)
    return validate(PurchaseOrder(**base), REF)


def codes(o, blocking=None):
    return {f.code for f in o.flags if blocking is None or f.blocking == blocking}


class Validation(unittest.TestCase):
    def test_clean_order_has_nothing_blocking(self):
        o = order()
        self.assertFalse(o.needs_review)
        self.assertEqual((o.customer_id, o.shipto_id, o.requested_date), ("C1001", "S01", "2026-11-24"))

    def test_missing_po_number_blocks(self):
        self.assertIn("MISSING_PO_NUMBER", codes(order(po_number=None), True))

    def test_unknown_customer_blocks(self):
        self.assertIn("UNKNOWN_CUSTOMER", codes(order(customer_name="Zenith Tools"), True))

    def test_customer_alias_matches(self):
        self.assertEqual(order(customer_name="ACME IND").customer_id, "C1001")

    def test_unknown_shipto_blocks(self):
        self.assertIn("UNKNOWN_SHIPTO", codes(order(ship_to="1 Nowhere Street Reno NV 89501"), True))

    def test_shipto_survives_surrounding_text(self):
        o = order(ship_to="Acme Industrial Supply 4400 Foundry Road PO Box 220, Dayton OH 45401 Dayton OH 45402")
        self.assertEqual(o.shipto_id, "S01")

    def test_customer_part_resolves_and_only_informs(self):
        o = order(customer_name="Brightline Hardware", ship_to="88 Market Street Louisville KY 40202",
                  lines=[POLine(line_no=1, part_number="BL-7781", quantity=1, uom="EA", unit_price=4.35)])
        self.assertEqual(o.lines[0].item_no, "WID-1010")
        self.assertIn("VIA_CUSTOMER_PART", codes(o, False))
        self.assertFalse(o.needs_review)

    def test_legacy_number_resolves(self):
        o = order(lines=[POLine(line_no=1, part_number="10-2040", quantity=1, uom="EA", unit_price=6.75)])
        self.assertEqual(o.lines[0].item_no, "WID-2040")

    def test_unknown_item_blocks_and_is_left_out_of_lines(self):
        o = order(lines=[POLine(line_no=1, part_number="ZZT-9911", quantity=1, uom="EA", unit_price=1)])
        self.assertIn("UNKNOWN_ITEM", codes(o, True))
        self.assertEqual(o.lines, [])

    def test_price_within_one_percent_passes_and_beyond_blocks(self):
        ok = order(lines=[POLine(line_no=1, part_number="WID-1010", quantity=1, uom="EA", unit_price=4.22)])
        bad = order(lines=[POLine(line_no=1, part_number="WID-1010", quantity=1, uom="EA", unit_price=3.90)])
        self.assertNotIn("PRICE_MISMATCH", codes(ok))
        self.assertIn("PRICE_MISMATCH", codes(bad, True))

    def test_uom_mismatch_blocks_and_alias_passes(self):
        bad = order(lines=[POLine(line_no=1, part_number="FST-0825", quantity=1, uom="EA", unit_price=18.50)])
        ok = order(lines=[POLine(line_no=1, part_number="FST-0825", quantity=1, uom="BOX", unit_price=18.50)])
        self.assertIn("UOM_MISMATCH", codes(bad, True))
        self.assertNotIn("UOM_MISMATCH", codes(ok))

    def test_missing_price_only_informs(self):
        o = order(lines=[POLine(line_no=1, part_number="WID-1010", quantity=1, uom="EA", unit_price=None)])
        self.assertIn("NO_PRICE_ON_PO", codes(o, False))
        self.assertFalse(o.needs_review)

    def test_dates(self):
        for printed in ("11/24/2026", "2026-11-24", "November 24, 2026", "24 Nov 2026"):
            self.assertEqual(parse_date(printed), "2026-11-24")
        self.assertIsNone(parse_date("next Tuesday"))
        self.assertIn("DATE_UNREADABLE", codes(order(requested_date="next Tuesday"), True))

    def test_extractor_doubt_blocks(self):
        self.assertIn("LOW_CONFIDENCE", codes(order(uncertain_fields=["lines[1].quantity"]), True))


class EndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        subprocess.run([sys.executable, str(ROOT / "make_samples.py")], check=True, capture_output=True)
        cls.out = Path(cls.tmp.name)
        cls.results = {r.attachment: r for r in process_inbox(
            ROOT / "inbox", ROOT / "reference", cls.out, HeuristicExtractor(REF.customer_names()))}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_clean_po_goes_straight_to_import(self):
        r = self.results["acme_po_4500018823.pdf"]
        self.assertEqual(r.status, "imported")
        rows = list(csv.DictReader((self.out / r.output).read_text().splitlines()))
        self.assertEqual([(x["item_no"], x["quantity"], x["uom"], x["unit_price"]) for x in rows],
                         [("WID-1010", "500", "EA", "4.20"), ("BRK-0300", "250", "EA", "2.15"), ("FST-0825", "40", "BX", "18.50")])
        self.assertEqual({x["shipto_id"] for x in rows}, {"S01"})

    def test_customer_parts_carrier_account_and_price_mismatch(self):
        r = self.results["brightline_order.pdf"]
        self.assertEqual(r.status, "review")
        self.assertEqual(r.order.carrier_account, "8R4W21")
        self.assertEqual([l.item_no for l in r.order.lines], ["WID-1010", "BRK-0300", "FST-0825"])
        self.assertEqual({f.code for f in r.flags if f.blocking}, {"PRICE_MISMATCH"})

    def test_fax_cover_and_terms_pages_are_ignored(self):
        r = self.results["coastal_fax.pdf"]
        self.assertEqual(r.order.po_number, "CSG-20991")
        self.assertEqual(len(r.order.lines), 3)
        self.assertEqual({f.code for f in r.flags if f.blocking}, {"UNKNOWN_SHIPTO", "UOM_MISMATCH"})

    def test_missing_po_number_and_unknown_item_are_held(self):
        r = self.results["delta_request.pdf"]
        self.assertEqual(r.status, "review")
        self.assertEqual({f.code for f in r.flags if f.blocking}, {"MISSING_PO_NUMBER", "UNKNOWN_ITEM"})

    def test_scan_is_held_not_guessed(self):
        r = self.results["acme_scan.pdf"]
        self.assertEqual((r.status, r.output), ("review", ""))
        self.assertEqual([f.code for f in r.flags], ["NEEDS_VISION"])

    def test_remittance_is_skipped(self):
        self.assertEqual(self.results["remittance_88213.pdf"].status, "skipped")

    def test_nothing_flagged_lands_in_the_import_folder(self):
        imported = sorted(p.name for p in (self.out / "import").glob("*.csv"))
        self.assertEqual(imported, ["PO_4500018823.csv"])


if __name__ == "__main__":
    unittest.main()
