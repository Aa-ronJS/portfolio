#!/usr/bin/env python3
"""Turn one "already built" form submission into a personalised pack zip.

    python3 prebuild/build.py intake.json [--logo logo.png] [--out dist]

intake.json holds the fields from the landing page's build form (same
names). Missing fields fall back to the pack defaults. Output:
dist/quote-and-chase-<trading-name>.zip, which is the normal customer
zip with business/details.md, business/price-list.md and
business/quote-wording.md already filled in, and the logo in place.
Then email it. Nothing here needs a network connection.
"""
import argparse, json, pathlib, re, shutil, subprocess, sys, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
PACK = ROOT / "pack"

INTERIOR = [
    ("p_walls", "Walls, 2 coats, light prep", "m2", 22, "standard low-sheen acrylic"),
    ("p_ceilings", "Ceilings, 2 coats", "m2", 25, "flat ceiling white"),
    ("p_skirting", "Skirting boards and architraves, 2 coats", "lineal m", 9, "gloss or semi-gloss enamel"),
    ("p_door", "Door, both sides incl. frame", "each", 95, "flush door; add 30 for panelled"),
    ("p_window", "Window frame, interior", "each", 65, "standard size"),
    ("p_wardrobe", "Wardrobe doors, per pair", "each", 120, ""),
    ("p_feature", "Feature wall, colour change", "m2", 28, "extra coat allowed"),
    ("p_wallpaper", "Wallpaper removal", "m2", 16, "plus wall prep below if needed"),
    ("p_prep_mod", "Moderate prep (patching, sanding, filling)", "hour", 65, ""),
    ("p_prep_heavy", "Heavy prep (water damage, peeling, plaster repair)", "hour", 80, ""),
    ("p_sealer", "Stain block or sealer coat", "m2", 8, "over patched or stained areas"),
]
EXTERIOR = [
    ("p_weatherboard", "Weatherboards, 2 coats", "m2", 38, "includes wash down and light sand"),
    ("p_render", "Render or brick, 2 coats", "m2", 30, ""),
    ("p_eaves", "Eaves and fascia", "lineal m", 16, ""),
    ("p_gutters", "Gutters and downpipes", "lineal m", 12, ""),
    ("p_ext_door", "Exterior door, both sides", "each", 140, ""),
    ("p_ext_window", "Exterior window, frame and sill", "each", 95, ""),
    ("p_deck", "Deck oil, 2 coats", "m2", 24, "includes clean"),
    ("p_fence", "Fence, one side, 2 coats", "m2", 18, ""),
    ("p_pressure", "Pressure wash before painting", "m2", 4, ""),
    ("p_scaffold", "Scaffold or high-access allowance", "per day", 350, "two storey and above"),
]

def g(d, k, default=""):
    v = d.get(k, default)
    if v is None: return default
    v = str(v).strip()
    return v if v else default

def num(d, k, default):
    v = g(d, k, "")
    if v == "": return None if default is None else default
    try: return float(v)
    except ValueError: return default

def fmt(n):
    return str(int(n)) if float(n).is_integer() else f"{n:g}"

def lines(text):
    return [l.strip(" -*\t") for l in str(text or "").splitlines() if l.strip()]

def details_md(d):
    gst = "yes" if g(d, "gst_registered", "yes").lower().startswith("y") else "no"
    other = g(d, "other_payments", "bank transfer, cash")
    return f"""# Business details

Filled in from your build form. Change anything here any time; it appears on every quote and invoice.

- Trading name: {g(d,'trading_name','Your Painting Co')}
- Owner's name: {g(d,'owner_name','Your Name')}
- ABN: {g(d,'abn','')}
- Phone: {g(d,'phone','')}
- Email: {g(d,'email','')}
- Address (for invoices): {g(d,'address','')}
- Service area: {g(d,'service_area','')}
- Licence or registration number (if any): {g(d,'licence','')}
- Insurance: {g(d,'insurance','')}

# Payment details (appear on invoices)

- Account name: {g(d,'account_name', g(d,'trading_name',''))}
- BSB: {g(d,'bsb','')}
- Account number: {g(d,'account_number','')}
- Also accept: {other}

# Terms

- Deposit to book the job: {fmt(num(d,'deposit_pct',20))}% of quote total
- Balance due: {fmt(num(d,'balance_days',7))} days after completion
- Quote valid for: {fmt(num(d,'quote_valid_days',30))} days
- Registered for GST: {gst}

# Your voice (used for emails and texts)

- Voice: {g(d,'voice','Friendly and direct. First names. Short messages.')}
- Sign-off: {g(d,'sign_off','Cheers, ' + g(d,'owner_name','').split(' ')[0] if g(d,'owner_name','') else 'Cheers')}
"""

def price_table(rows, d):
    out = ["| Item | Unit | Rate | Notes |", "|---|---|---|---|"]
    for key, item, unit, default, note in rows:
        if key in d and str(d[key]).strip() == "":
            continue  # blank on the form = they never do this work
        v = num(d, key, None)
        if v is None:
            v = default  # not asked on this form version: keep the pack default
        out.append(f"| {item} | {unit} | {fmt(v)} | {note} |")
    return "\n".join(out)

def price_list_md(d):
    gst = "yes" if g(d, "gst_registered", "yes").lower().startswith("y") else "no"
    gst_line = "- GST: add 10% to the total." if gst == "yes" else "- GST: not registered. Do not add GST; show totals as GST-free."
    extras = lines(d.get("extra_prices"))
    extra_block = ""
    if extras:
        extra_block = "\n## Other things we charge for\n\n" + "\n".join(f"- {e}" for e in extras) + "\n"
    return f"""# Price list

Filled in from your build form. Claude uses ONLY this list when quoting.
All prices are ex GST, labour and materials included unless a line says
otherwise. AUD. Change any number any time.

## Interior

{price_table(INTERIOR, d)}

## Exterior

{price_table(EXTERIOR, d)}
{extra_block}
## Job rules

- Minimum job charge: {fmt(num(d,'minimum_job',450))}
- Travel: included within service area; {fmt(num(d,'travel_per_km',1.5))} per km beyond it
- Paint is included at the rates above (mid-range trade paint). Premium
  paint requested by the client: add {fmt(num(d,'premium_paint_pct',15))}% to the affected lines.
{gst_line}
- Deposit: {fmt(num(d,'deposit_pct',20))}% on acceptance.

## Measuring rules Claude uses when the notes do not say

- Real measurements first: `measurements.json` from the measure sheet
  or a LiDAR scan beats everything below. Notes beat photo estimates.
- Scale from a photo: a standard internal door is 2040 mm high and
  820 mm wide; a brick course is 76 mm plus a 10 mm joint; a light
  switch sits about 1200 to 1350 mm off the floor. Use one of these
  if visible and say which.
- Ceiling height: assume 2.4 m unless the photo clearly shows higher.
- Wall area of a room = perimeter x height, minus 1.7 m2 per door and
  1.5 m2 per standard window.
- If only a floor size is known, assume the room is roughly square.
- Skirting length = perimeter minus door widths (0.9 m each).
- Condition, from the notes first and the photos second:
  "good" = clean walls, or the notes say nothing about prep. Light
  prep is included in the rate.
  "fair" = scuffs, marks, small dents, a few holes to fill, or the
  notes say "some prep", "decent prep", "patching". Add 1 hour
  moderate prep per 20 m2.
  "poor" = peeling, flaking, water damage, cracks, large holes,
  previous wallpaper, or the notes say "heavy", "major", "rough",
  "bad". Add 1 hour heavy prep per 10 m2 plus a sealer coat.
  If the notes fit "fair" do not upgrade to "poor" on a hunch; say
  so in the assumptions instead.
- If a photo is too dark or partial to judge, say so and quote the
  room at "good" with the assumption written down.
"""

def wording_md(d):
    base = (PACK / "business" / "quote-wording.md").read_text()
    base = base.replace("- This quote is valid for 30 days from the date above.",
                        f"- This quote is valid for {fmt(num(d,'quote_valid_days',30))} days from the date above.")
    base = base.replace("- A 20% deposit confirms your booking. The balance is due within 7\n  days of completion.",
                        f"- A {fmt(num(d,'deposit_pct',20))}% deposit confirms your booking. The balance is due within {fmt(num(d,'balance_days',7))}\n  days of completion.")
    base = base.replace("- Workmanship is guaranteed for 5 years against peeling and flaking",
                        f"- Workmanship is guaranteed for {fmt(num(d,'warranty_years',5))} years against peeling and flaking")
    inc = lines(d.get("extra_inclusions")); exc = lines(d.get("extra_exclusions"))
    if inc:
        base = base.replace("- All labour, materials, ladders and equipment.",
                            "- All labour, materials, ladders and equipment.\n" + "\n".join(f"- {x}" for x in inc))
    if exc:
        base = base.replace("- Anything not written in this quote.",
                            "\n".join(f"- {x}" for x in exc) + "\n- Anything not written in this quote.")
    return base.replace("# Standard quote wording\n\nClaude puts these blocks on every quote. Edit them once to match how\nyou work.",
                        "# Standard quote wording\n\nFilled in from your build form. Claude puts these blocks on every quote.\nEdit them any time.")

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "painter"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("intake")
    ap.add_argument("--logo")
    ap.add_argument("--out", default=str(ROOT / "dist"))
    a = ap.parse_args()
    d = json.loads(pathlib.Path(a.intake).read_text())
    if isinstance(d, dict) and "data" in d and isinstance(d["data"], dict): d = d["data"]  # Formspree export shape

    name = g(d, "trading_name", "Your Painting Co")
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    build = out / f"build-{slug(name)}"
    if build.exists(): shutil.rmtree(build)
    top = build / "Quote and Chase for Painters"
    top.mkdir(parents=True)
    for f in ["READ ME FIRST.txt", "Install Quote and Chase (Windows).bat", "Install Quote and Chase (Mac).command"]:
        shutil.copy(ROOT / f, top / f)
    for dname in ["windows", "mac", "pack"]:
        shutil.copytree(ROOT / dname, top / dname, ignore=shutil.ignore_patterns(".gitkeep"))
    shutil.copytree(ROOT / "course", top / "lessons")
    biz = top / "pack" / "business"
    (biz / "details.md").write_text(details_md(d))
    (biz / "price-list.md").write_text(price_list_md(d))
    (biz / "quote-wording.md").write_text(wording_md(d))
    if a.logo:
        shutil.copy(a.logo, biz / ("logo" + pathlib.Path(a.logo).suffix.lower().replace(".jpeg", ".jpg")))
    (top / "pack" / "BUILT FOR YOU.txt").write_text(
        f"Built for {name} on {datetime.date.today():%d %B %Y}.\n\n"
        "Your business details, price list and quote wording are already filled\n"
        "in from your build form. Open the 'business' folder to check them,\n"
        "then follow 'START HERE - Quote and Chase.txt'. Skip its set-up step 1\n"
        "and 2; they are done. Your first real quote is the first thing to do.\n")
    for p in list(top.rglob("*.command")) + list(top.rglob("*.sh")):
        p.chmod(0o755)
    zpath = out / f"quote-and-chase-{slug(name)}.zip"
    if zpath.exists(): zpath.unlink()
    subprocess.run(["zip", "-qr", str(zpath), top.name], cwd=build, check=True)
    shutil.rmtree(build)
    print(f"wrote {zpath}")
    missing = [k for k in ["trading_name", "owner_name", "phone", "email", "bsb", "account_number"] if not g(d, k)]
    if missing: print("note: blank on the form:", ", ".join(missing))

if __name__ == "__main__":
    main()
