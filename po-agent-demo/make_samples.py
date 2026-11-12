"""Build the sample inbox: six emails, each PDF laid out differently."""
import io
from email.message import EmailMessage
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle

INBOX = Path(__file__).parent / "inbox"
W, H = letter


def acme() -> bytes:
    """Clean system-generated PO with a ruled table."""
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=letter)
    c.setFont("Helvetica-Bold", 18); c.drawString(inch, H - inch, "ACME INDUSTRIAL SUPPLY")
    c.setFont("Helvetica", 11); c.drawRightString(W - inch, H - inch, "PURCHASE ORDER")
    c.drawRightString(W - inch, H - inch - 16, "PO Number: 4500018823")
    c.drawRightString(W - inch, H - inch - 32, "Required Date: 11/24/2026")
    c.drawString(inch, H - 1.7 * inch, "Bill To:"); c.drawString(inch, H - 1.7 * inch - 14, "Acme Industrial Supply")
    c.drawString(inch, H - 1.7 * inch - 28, "PO Box 220, Dayton OH 45401")
    c.drawString(4.2 * inch, H - 1.7 * inch, "Ship To:"); c.drawString(4.2 * inch, H - 1.7 * inch - 14, "4400 Foundry Road")
    c.drawString(4.2 * inch, H - 1.7 * inch - 28, "Dayton OH 45402")
    rows = [["Line", "Item", "Description", "Qty", "UOM", "Unit Price", "Ext"],
            ["1", "WID-1010", "Steel Widget 1in", "500", "EA", "4.20", "2100.00"],
            ["2", "BRK-0300", "Mounting Bracket Zinc", "250", "EA", "2.15", "537.50"],
            ["3", "FST-0825", "Hex Bolt 8x25", "40", "BX", "18.50", "740.00"]]
    t = Table(rows, colWidths=[40, 70, 170, 45, 45, 70, 70])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                           ("FONT", (0, 0), (-1, -1), "Helvetica", 10)]))
    t.wrapOn(c, W, H); t.drawOn(c, inch, H - 4.2 * inch)
    c.drawString(inch, H - 4.6 * inch, "Ship Via: Best Way")
    c.save(); return buf.getvalue()


def brightline() -> bytes:
    """Label and value layout, customer's own part numbers, third-party carrier."""
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=letter); y = H - inch
    def put(text, bold=False, dy=16):
        nonlocal y
        c.setFont("Courier-Bold" if bold else "Courier", 10); c.drawString(inch, y, text); y -= dy
    put("Brightline Hardware Co  -  Purchasing", True, 22)
    put("P.O. No: BL-PO-77120"); put("Need By: December 3, 2026"); put("Buyer: R. Okafor", dy=22)
    put("Deliver To: Brightline Hardware Co"); put("            88 Market Street"); put("            Louisville KY 40202", dy=22)
    put("Our Part    Description              Order Qty   Price", True)
    put("BL-7781     1 inch widget steel      300 EA      $4.35")
    put("BL-7790     zinc bracket             300 EA      $2.10")
    put("BL-8002     hex bolts 8x25           25 BX       $18.10", dy=22)
    put("Shipping Notes: Ship collect on UPS Acct# 8R4W21, no Saturday delivery")
    c.save(); return buf.getvalue()


def coastal() -> bytes:
    """Fax cover sheet, order written as sentences, then a terms page."""
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=letter)
    c.setFont("Helvetica-Bold", 28); c.drawString(inch, H - 2 * inch, "FAX")
    c.setFont("Helvetica", 12); c.drawString(inch, H - 2.6 * inch, "To: Order Desk    From: Coastal Supply Group    Pages: 3")
    c.drawString(inch, H - 3.0 * inch, "Please confirm receipt."); c.showPage()
    c.setFont("Times-Roman", 12); y = H - inch
    for text in ["Coastal Supply Group", "Purchase Order # CSG-20991", "Delivery Date: 2026-12-10", "",
                 "Ship To: 9 Dockside Avenue, Brunswick GA 31520", "",
                 "Please supply the following:", "  120 EA of 10-2040 two inch widgets @ $6.90",
                 "  60 EA of FST-0825 hex bolts @ $19.25", "  400 EA of GSK-0150 gaskets @ $1.80", "",
                 "Ship Via: customer truck, call before delivery"]:
        c.drawString(inch, y, text); y -= 18
    c.showPage(); c.setFont("Times-Roman", 9); y = H - inch
    c.drawString(inch, y, "STANDARD TERMS AND CONDITIONS OF PURCHASE"); y -= 14
    for i in range(1, 12):
        c.drawString(inch, y, f"{i}. Seller agrees to the terms set out in clause {i} of the master supply agreement."); y -= 12
    c.save(); return buf.getvalue()


def delta() -> bytes:
    """No PO number and one part the ERP has never seen."""
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=letter); c.setFont("Helvetica", 11); y = H - inch
    for text in ["Delta Fabrication LLC - Order Request", "Sold To: Delta Fabrication LLC", "",
                 "Ship To: 702 Mill Lane, Tulsa OK 74103", "Requested: 12/01/2026", "",
                 "TUB-0600 Aluminium tube 6ft   36 EA   22.00", "GSK-0150 Gasket 150mm   200 EA   1.85",
                 "ZZT-9911 Titanium spacer   12 EA   9.40"]:
        c.drawString(inch, y, text); y -= 18
    c.save(); return buf.getvalue()


def scan() -> bytes:
    """A page image with no text layer, fed in upside down."""
    img = Image.new("L", (1275, 1650), 245); d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 30)
    except OSError:
        font = ImageFont.load_default()
    y = 120
    for text in ["ACME INDUSTRIAL SUPPLY", "PURCHASE ORDER  No. 4500018901", "Ship To: 1200 Warehouse Way, Columbus OH 43215",
                 "Required: 12/15/2026", "", "1   WID-2040   Steel Widget 2in    200 EA   6.75", "2   BRK-0300   Mounting Bracket   100 EA   2.15"]:
        d.text((110, y), text, fill=20, font=font); y += 70
    img = img.rotate(180)
    png = io.BytesIO(); img.save(png, "PNG"); png.seek(0)
    from reportlab.lib.utils import ImageReader
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=letter)
    c.drawImage(ImageReader(png), 0, 0, width=W, height=H); c.save(); return buf.getvalue()


def remittance() -> bytes:
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=letter); c.setFont("Helvetica", 12)
    c.drawString(inch, H - inch, "REMITTANCE ADVICE"); c.drawString(inch, H - inch - 20, "Payment of $2,100.00 against invoice 88213")
    c.drawString(inch, H - inch - 40, "Paid by ACH on 11/10/2026 by Acme Industrial Supply"); c.save(); return buf.getvalue()


def eml(n, sender, subject, body, filename, pdf):
    m = EmailMessage(); m["From"] = sender; m["To"] = "orders@example-manufacturer.com"; m["Subject"] = subject
    m.set_content(body); m.add_attachment(pdf, maintype="application", subtype="pdf", filename=filename)
    (INBOX / f"{n:02d}_{filename[:-4]}.eml").write_bytes(bytes(m))


if __name__ == "__main__":
    INBOX.mkdir(exist_ok=True)
    eml(1, "ap@acme-industrial.example", "PO 4500018823", "PO attached.", "acme_po_4500018823.pdf", acme())
    eml(2, "r.okafor@brightline.example", "New order", "Hi, order attached, thanks.", "brightline_order.pdf", brightline())
    eml(3, "fax@coastal-supply.example", "Fax from 912-555-0144", "Incoming fax.", "coastal_fax.pdf", coastal())
    eml(4, "shop@delta-fab.example", "need these asap", "see attached", "delta_request.pdf", delta())
    eml(5, "scanner@acme-industrial.example", "Scanned document", "", "acme_scan.pdf", scan())
    eml(6, "ap@acme-industrial.example", "Remittance advice", "Payment sent.", "remittance_88213.pdf", remittance())
    print("wrote", len(list(INBOX.glob('*.eml'))), "emails to", INBOX)
