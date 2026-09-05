#!/usr/bin/env python3
"""Generates the /answers/ hub: HubSpot-style topic clusters. One page per
question, direct answer first, cluster interlinks, pillar links back to the
service pages."""
import html as html_mod
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from answers_a import PART_A
from answers_b import PART_B

QA = PART_A + PART_B
OUT = Path(__file__).resolve().parent.parent / "public" / "answers"

CLUSTERS = {
    "websites": dict(name="Websites &amp; WordPress", pillars=[("Website rebuilds", "/website-rebuild/"), ("WordPress", "/wordpress/")]),
    "apps": dict(name="Apps", pillars=[("Mobile apps", "/mobile-apps/")]),
    "ai": dict(name="AI, honestly", pillars=[("AI development", "/ai-development/")]),
    "crm": dict(name="CRM &amp; automation", pillars=[("CRM &amp; automation", "/crm-automation/")]),
    "data": dict(name="Data &amp; reporting", pillars=[("Data &amp; reporting", "/data-and-reporting/")]),
    "ecommerce": dict(name="E-commerce", pillars=[("E-commerce", "/ecommerce/")]),
    "rescues": dict(name="Rescues &amp; ownership", pillars=[("Project rescues", "/project-rescue/")]),
    "hiring": dict(name="Hiring &amp; costs", pillars=[("Custom software", "/full-stack-developer/"), ("Business analysis", "/business-analysis/")]),
}

for _c in CLUSTERS.values():
    _c["pillars"] = _c["pillars"] + [("Pricing calculator", "/pricing/")]

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
      <a href="/answers/"{current}>Answers</a>
      <a href="/pricing/">Pricing</a>
      <a href="/project-rescue/">Rescues</a>
      <a href="/contact/">Work with me</a>
    </nav>
  </div>
</header>"""

SERVICES_LINE = """<p><a href="/ai-development/" style="color:inherit">AI development</a> &middot; <a href="/wordpress/" style="color:inherit">WordPress</a> &middot; <a href="/ecommerce/" style="color:inherit">E-commerce</a> &middot; <a href="/mobile-apps/" style="color:inherit">Mobile apps</a> &middot; <a href="/website-rebuild/" style="color:inherit">Website rebuilds</a> &middot; <a href="/full-stack-developer/" style="color:inherit">Custom software</a> &middot; <a href="/crm-automation/" style="color:inherit">CRM &amp; automation</a> &middot; <a href="/data-and-reporting/" style="color:inherit">Data &amp; reporting</a> &middot; <a href="/project-rescue/" style="color:inherit">Project rescues</a> &middot; <a href="/business-analysis/" style="color:inherit">Business analysis</a> &middot; <a href="/systems/" style="color:inherit">System guides</a></p>"""

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
<meta property="og:image" content="https://REPLACE-DOMAIN/og/answers.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://REPLACE-DOMAIN/og/answers.png">
<meta name="theme-color" content="#12181f">
{FAVICON}
<link rel="preload" as="font" type="font/woff2" href="/fonts/clash-display-var.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/satoshi-var.woff2" crossorigin>
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>
"""


def render_qa(entry):
    path = f"/answers/{entry['slug']}/"
    q_plain = plain(entry["q"])
    direct_plain = plain(entry["direct"])
    desc = direct_plain if len(direct_plain) <= 300 else direct_plain[:297].rsplit(" ", 1)[0] + "..."
    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "FAQPage", "mainEntity": [{
                "@type": "Question", "name": q_plain,
                "acceptedAnswer": {"@type": "Answer",
                    "text": direct_plain + " " + " ".join(plain(b) for _, b in entry["body"])}}]},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://REPLACE-DOMAIN/"},
                {"@type": "ListItem", "position": 2, "name": "Answers", "item": "https://REPLACE-DOMAIN/answers/"},
                {"@type": "ListItem", "position": 3, "name": q_plain, "item": f"https://REPLACE-DOMAIN{path}"},
            ]},
        ],
    }, ensure_ascii=False, indent=2)

    rows = "\n".join(
        f"""        <div class="row">
          <h3>{h}</h3>
          <div>{b}</div>
        </div>""" for h, b in entry["body"])

    cluster = CLUSTERS[entry["cluster"]]
    siblings = [e for e in QA if e["cluster"] == entry["cluster"] and e["slug"] != entry["slug"]]
    related = "\n".join(
        f'        <li><a href="/answers/{s["slug"]}/" style="color:inherit"><b>{s["q"]}</b></a></li>'
        for s in siblings)
    pillar_links = "\n        ".join(
        f'<a class="link" href="{href}">{label} <span aria-hidden="true">&rarr;</span></a>'
        for label, href in cluster["pillars"])

    title = f"{entry['q']} | Aaron Steele"
    return head(title, desc, path, jsonld) + f"""
{NAV.format(current="")}

<main>
  <div class="hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li><a href="/answers/">Answers</a></li><li>{cluster['name']}</li></ol>
      <h1 class="measure-wide" style="max-inline-size:24ch">{entry['q']}</h1>
      <p class="lede">
        {entry['direct']}
      </p>
      <div class="cta-row">
        <a class="btn" href="/contact/">Ask about yours</a>
        <a class="btn btn--ghost" href="/answers/">All the answers</a>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="wrap">
      <p class="tag">The longer answer</p>
      <h2 class="measure">In practice.</h2>
      <div class="rows">
{rows}
      </div>
      <div class="cta-row" style="margin-top:var(--s7)">
        {pillar_links}
      </div>
    </div>
  </section>

  <section class="section section--ink">
    <div class="wrap">
      <p class="tag">Same rabbit hole</p>
      <h2 class="measure">Related questions.</h2>
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
    path = "/answers/"
    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://REPLACE-DOMAIN/"},
            {"@type": "ListItem", "position": 2, "name": "Answers", "item": "https://REPLACE-DOMAIN/answers/"},
        ]}, indent=2)
    groups = []
    for key, cluster in CLUSTERS.items():
        items = "\n".join(
            f'        <li><a href="/answers/{e["slug"]}/" style="color:inherit"><b>{e["q"]}</b></a></li>'
            for e in QA if e["cluster"] == key)
        pillars = " &middot; ".join(f'<a href="{href}" style="color:inherit">{label}</a>' for label, href in cluster["pillars"])
        groups.append(f"""      <div class="row" id="{key}">
        <h3>{cluster['name']}<small style="display:block; font-family:var(--mono); font-size:0.6875rem; font-weight:500; letter-spacing:0.1em; text-transform:uppercase; color:var(--fg-mute); margin-top:var(--s2)">Goes with: {pillars}</small></h3>
        <ul class="list" style="margin:0">
{items}
        </ul>
      </div>""")
    groups_html = "\n".join(groups)
    n = len(QA)
    title = "Plain Answers | Websites, Apps, AI, CRM &amp; Data Questions"
    desc = f"{n} questions business owners actually ask about websites, apps, AI, CRMs, data and hiring developers, answered in plain words by someone who does the work. No jargon, no invented prices, straight recommendations."
    return head(title, desc, path, jsonld) + f"""
{NAV.format(current=' aria-current="page"')}

<main>
  <div class="hero">
    <div class="wrap">
      <ol class="crumbs"><li><a href="/">Home</a></li><li>Answers</li></ol>
      <h1 class="measure">Plain answers.</h1>
      <p class="lede">
        The {n} questions I actually get asked, answered the way I answer them on a call:
        directly, in plain words, with the honest version of cost and the occasional
        recommendation to spend nothing. <b>If your question is not here, it is still a good
        opening line.</b>
      </p>
      <div class="cta-row">
        <a class="btn" href="/contact/">Ask yours</a>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="wrap">
      <p class="tag">By topic</p>
      <h2 class="measure">Eight rabbit holes.</h2>
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
for entry in QA:
    d = OUT / entry["slug"]
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(render_qa(entry))
print(f"wrote {1 + len(QA)} pages ({len(QA)} questions, {len(CLUSTERS)} clusters)")
