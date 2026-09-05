#!/usr/bin/env python3
"""Generates /systems/: the system-pair pages ("ServiceM8 to Xero", "Halaxy
versus Cliniko"). Same shape as the answers pages plus a how-the-join-works
section and a traps section, because buyers type exactly these pairs into
Google and almost nobody serious writes for them."""
import html as html_mod
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from systems_a import PART_A
from systems_b import PART_B

PAGES = PART_A + PART_B
OUT = Path(__file__).resolve().parent.parent / "public" / "systems"

GROUPS = {
    "field": "Trades &amp; field service",
    "stores": "Stores &amp; the books",
    "health": "Health practices",
    "office": "CRM &amp; the office",
    "property": "Property",
    "rto": "Training providers",
}

DEFAULT_PROOF = """Anyone can claim integration experience; checking it is harder. Mine
        was built where they vet people properly: eleven years of systems and process work
        for BHP's critical infrastructure, SA Police and Services Australia, TOGAF certified,
        baseline cleared. And the workmanship is checkable today: two tools live on the
        internet with public source, and a full platform build you can compile yourself,
        52 checks passing. The method on this page is that method."""

FAVICON = """<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2312181f'/%3E%3Ctext x='50' y='74' font-size='68' font-family='Arial' font-weight='700' text-anchor='middle' fill='%23e0a232'%3EA%3C/text%3E%3C/svg%3E">"""

NAV = """<header class="top">
  <div class="wrap">
    <a class="brand" href="/">Aaron Steele<span>.</span></a>
    <nav class="nav" aria-label="Site">
      <a href="/">Home</a>
      <a href="/ai-development/">AI development</a>
      <a href="/wordpress/">WordPress</a>
      <a href="/website-rebuild/">Rebuilds</a>
      <a href="/full-stack-developer/">Custom software</a>
      <a href="/crm-automation/">CRM &amp; automation</a>
      <a href="/industries/">Industries</a>
      <a href="/answers/">Answers</a>
      <a href="/pricing/">Pricing</a>
      <a href="/project-rescue/">Rescues</a>
      <a href="/contact/">Work with me</a>
    </nav>
  </div>
</header>"""

SERVICES_LINE = """<p><a href="/ai-development/" style="color:inherit">AI development</a> &middot; <a href="/wordpress/" style="color:inherit">WordPress</a> &middot; <a href="/ecommerce/" style="color:inherit">E-commerce</a> &middot; <a href="/mobile-apps/" style="color:inherit">Mobile apps</a> &middot; <a href="/website-rebuild/" style="color:inherit">Website rebuilds</a> &middot; <a href="/full-stack-developer/" style="color:inherit">Custom software</a> &middot; <a href="/crm-automation/" style="color:inherit">CRM &amp; automation</a> &middot; <a href="/data-and-reporting/" style="color:inherit">Data &amp; reporting</a> &middot; <a href="/project-rescue/" style="color:inherit">Project rescues</a> &middot; <a href="/business-analysis/" style="color:inherit">Business analysis</a> &middot; <a href="/systems/" style="color:inherit">System guides</a> &middot; <a href="/diy/" style="color:inherit">DIY kits</a></p>"""

IND = [("trades","Trades"),("transport","Transport"),("mining","Mining"),("retail","Retail"),
       ("hospitality","Hospitality"),("professional-services","Professional services"),
       ("health","Health"),("nonprofits","Not-for-profits"),("real-estate","Real estate"),
       ("agriculture","Agriculture"),("government","Government"),("education","Education")]
INDUSTRIES_LINE = "<p>Industries: " + " &middot; ".join(
    f'<a href="/industries/{s}/" style="color:inherit">{n}</a>' for s, n in IND) + "</p>"

FOOTER = f"""<footer class="foot">
  <div class="wrap">
    <p class="tag">Room for the right project</p>
    <h2 class="measure">Tell me what's broken.</h2>
    <div class="links">
      <a class="link" href="/contact/">Work with me <span aria-hidden="true">&rarr;</span></a>
      <a class="link" href="https://aaronsteele.vercel.app">Portfolio <span aria-hidden="true">&rarr;</span></a>
      <a class="link" href="https://github.com/Aa-ronJS">GitHub <span aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="foot__meta">
      <p>Aaron Steele. Adelaide, South Australia. Remote Australia-wide. Analyst since 2015,
         building since 2016. TOGAF certified, baseline cleared.</p>
      {SERVICES_LINE}
      {INDUSTRIES_LINE}
      <p><a href="/privacy/" style="color:inherit">Privacy</a></p>
    </div>
  </div>
</footer>"""


def plain(text):
    return html_mod.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", text))).strip()


def head(title, desc, path, jsonld):
    return f"""<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://REPLACE-DOMAIN{path}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://REPLACE-DOMAIN/og/services.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://REPLACE-DOMAIN/og/services.png">
<meta name="theme-color" content="#f2efe4">
{FAVICON}
<link rel="preload" as="font" type="font/woff2" href="/fonts/satoshi-var.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/bricolage-var.woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>
"""


def render_page(entry):
    path = f"/systems/{entry['slug']}/"
    title_plain = plain(entry["title"])
    direct_plain = plain(entry["direct"])
    desc = direct_plain if len(direct_plain) <= 300 else direct_plain[:297].rsplit(" ", 1)[0] + "..."
    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": plain(q),
                 "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
                for q, a in entry["faq"]]},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://REPLACE-DOMAIN/"},
                {"@type": "ListItem", "position": 2, "name": "System guides", "item": "https://REPLACE-DOMAIN/systems/"},
                {"@type": "ListItem", "position": 3, "name": title_plain, "item": f"https://REPLACE-DOMAIN{path}"},
            ]},
        ],
    }, ensure_ascii=False, indent=2)

    how_rows = "\n".join(
        f"""        <div class="row">
          <h3>{h}</h3>
          <div>{b}</div>
        </div>""" for h, b in entry["how"])
    trap_rows = "\n".join(
        f"""        <div class="row">
          <h3>{h}</h3>
          <div>{b}</div>
        </div>""" for h, b in entry["traps"])
    faq_items = "\n".join(
        f"""        <details>
          <summary>{q}</summary>
          <div>{a}</div>
        </details>""" for q, a in entry["faq"])

    by_slug = {e["slug"]: e for e in PAGES}
    related = "\n".join(
        f'        <li><a href="/systems/{s}/" style="color:inherit"><b>{by_slug[s]["title"]}</b></a></li>'
        for s in entry["related"] if s in by_slug)
    pillar_links = "\n        ".join(
        f'<a class="link" href="{href}">{label} <span aria-hidden="true">&rarr;</span></a>'
        for label, href in entry["pillars"])
    proof = entry.get("proof", DEFAULT_PROOF)

    return head(entry["seo"] + " | Aaron Steele", desc, path, jsonld) + f"""
{NAV}

<main>
  <div class="hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li><a href="/systems/">System guides</a></li><li>{GROUPS[entry['group']]}</li></ol>
      <h1 class="measure-wide" style="max-inline-size:24ch">{entry['title']}</h1>
      <p class="lede">
        {entry['direct']}
      </p>
      <div class="cta-row">
        <a class="btn" href="/contact/">Describe your setup</a>
        <a class="btn btn--ghost" href="/pricing/">Get an estimate</a>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="wrap">
      <p class="tag">The join</p>
      <h2 class="measure">How it actually works.</h2>
      <div class="rows">
{how_rows}
      </div>
    </div>
  </section>

  <section class="section section--ink">
    <div class="wrap">
      <p class="tag">The traps</p>
      <h2 class="measure">Where it goes wrong.</h2>
      <div class="rows" style="margin-top:var(--s7)">
{trap_rows}
      </div>
      <p class="measure-wide dim" style="margin-top:var(--s7)">
        {proof}
      </p>
      <div class="cta-row" style="margin-top:var(--s6)">
        <a class="link" href="https://aaronsteele.vercel.app/#work">The proof, in public <span aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <p class="tag">Fair questions</p>
      <h2 class="measure">Before you ask.</h2>
      <div class="faq">
{faq_items}
      </div>
      <div class="cta-row" style="margin-top:var(--s7)">
        {pillar_links}
      </div>
    </div>
  </section>

  <section class="section section--ink">
    <div class="wrap">
      <p class="tag">Adjacent joins</p>
      <h2 class="measure">Related guides.</h2>
      <ul class="list" style="margin-top:var(--s7)">
{related}
      </ul>
    </div>
  </section>
</main>

{FOOTER}

</body>
</html>
"""


def render_index():
    path = "/systems/"
    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://REPLACE-DOMAIN/"},
            {"@type": "ListItem", "position": 2, "name": "System guides", "item": "https://REPLACE-DOMAIN/systems/"},
        ]}, indent=2)
    groups = []
    for key, label in GROUPS.items():
        items = "\n".join(
            f"""        <li><a href="/systems/{e['slug']}/" style="color:inherit"><b>{e['title']}</b></a><br>
            <span class="dim">{e['blurb']}</span></li>"""
            for e in PAGES if e["group"] == key)
        groups.append(f"""      <div class="row" id="{key}">
        <h3>{label}</h3>
        <ul class="list" style="margin:0">
{items}
        </ul>
      </div>""")
    groups_html = "\n".join(groups)
    n = len(PAGES)
    title = "System Guides | ServiceM8, Cliniko, simPRO, aXcelerate &amp; Xero Joins"
    desc = f"{n} plain-words guides to the joins Australian businesses actually search for: ServiceM8 and AroFlo to Xero, Shopify to MYOB, Cliniko reminders, PropertyMe reports, AVETMISS exports and more, by someone who does the work."
    return head(title, desc, path, jsonld) + f"""
{NAV}

<main>
  <div class="hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li>System guides</li></ol>
      <h1 class="measure">The systems you already run.</h1>
      <p class="lede">
        Businesses rarely search for "integration consultant"; they search for the two
        systems that are arguing. <b>These are guides to the joins I get asked about</b>:
        what the native integrations already do well, where the double entry and the
        drift actually live, and what is worth building. If your pair is not here, it
        is still a good opening line.
      </p>
      <div class="cta-row">
        <a class="btn" href="/contact/">Name your two systems</a>
        <a class="btn btn--ghost" href="/pricing/">Get an estimate</a>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="wrap">
      <p class="tag">By trade</p>
      <h2 class="measure">Twelve joins, honestly.</h2>
      <div class="rows">
{groups_html}
      </div>
    </div>
  </section>
</main>

{FOOTER}

</body>
</html>
"""


OUT.mkdir(exist_ok=True)
(OUT / "index.html").write_text(render_index())
for entry in PAGES:
    d = OUT / entry["slug"]
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(render_page(entry))
print(f"wrote {1 + len(PAGES)} pages ({len(PAGES)} system guides, {len(GROUPS)} groups)")
