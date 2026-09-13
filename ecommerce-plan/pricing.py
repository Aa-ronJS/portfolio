#!/usr/bin/env python3
"""
Pricing: structures, elasticity, annual vs monthly, renewal increases, and
the compliance modules that raise revenue per account.

    python3 ecommerce-plan/pricing.py

Arithmetic on stated assumptions. Anchors are cited in launch/13.
"""

GOODS = dict(site_kit=58.0, vehicle_kit=32.0, site_refill=11.0, vehicle_refill=7.0,
             after_use=7.0, vehicle_after_use=5.0, postage=9.40, packaging=1.90, pay_pct=0.0175, pay_fixed=0.30)

# Typical account shapes (site kits, vehicle kits, parcels a year)
SHAPES = {
    'Sole trader, one ute': (0, 1, 3.0),
    'Trade, workshop + 3 utes': (1, 3, 3.5),
    'Clinic, 2 rooms': (2, 0, 3.0),
    'Childcare group, 4 centres': (4, 0, 4.0),
    'Landscaper, yard + 5 utes': (1, 5, 4.0),
}

def ongoing_cost_py(site, veh, parcels):
    goods = site * (2 * GOODS['site_refill'] + 1.5 * GOODS['after_use']) + veh * (2 * GOODS['vehicle_refill'] + 1.0 * GOODS['vehicle_after_use'])
    post = parcels * (GOODS['postage'] + GOODS['packaging'])
    return goods + post

def kit_margin(site, veh):
    rev = site * 119 + veh * 59
    cost = site * GOODS['site_kit'] + veh * GOODS['vehicle_kit'] + GOODS['postage'] + GOODS['packaging'] + rev * GOODS['pay_pct'] + GOODS['pay_fixed']
    return rev, rev - cost

# ---- structures: plan revenue per year for a shape --------------------------
def structure_A(site, veh):            # per kit (launch structure)
    return site * 144 + veh * 84
def structure_B(site, veh):            # per business tiers
    kits = site + veh
    if site == 0 and veh == 1: return 15 * 12          # Solo
    if site <= 1 and veh <= 3: return 29 * 12          # Trade
    if site <= 3 and veh <= 6: return 59 * 12          # Site
    return 59 * 12 + (kits - 9) * 6 * 12               # Multi: Site + $6/extra kit
def structure_C(site, veh):            # per business + per kit
    return 19 * 12 + (site + veh) * 5 * 12
def structure_D(site, veh):            # kits included, no upfront (rejected)
    return site * 19 * 12 + veh * 11 * 12

STRUCTURES = {'A per kit ($12 site / $7 vehicle a month)': structure_A,
              'B per business tiers ($15 / $29 / $59)': structure_B,
              'C per business + per kit ($19 + $5 a kit)': structure_C,
              'D kits included, no upfront ($19 / $11 a kit)': structure_D}

def print_structures():
    print("### Plan revenue and year-one contribution by account shape\n")
    print("| Account shape | Goods and postage a year | " + " | ".join(f"{k}: plan / yr-1 contribution" for k in STRUCTURES) + " |")
    print("|---|---|" + "---|" * len(STRUCTURES))
    for name, (site, veh, parcels) in SHAPES.items():
        cost = ongoing_cost_py(site, veh, parcels)
        cells = []
        for k, f in STRUCTURES.items():
            plan = f(site, veh)
            fees = plan * GOODS['pay_pct'] + 12 * GOODS['pay_fixed'] / 3
            if k.startswith('D'):
                kits_cost = site * GOODS['site_kit'] + veh * GOODS['vehicle_kit']
                contrib = plan - cost - fees - kits_cost          # no upfront kit revenue
            else:
                kr, km = kit_margin(site, veh)
                contrib = plan - cost - fees + km
            cells.append(f"A${plan:,.0f} / A${contrib:,.0f}")
        print(f"| {name} | A${cost:,.0f} | " + " | ".join(cells) + " |")
    print()

# ---- elasticity on the site-kit plan price --------------------------------
def elasticity():
    print("### Elasticity: site-kit plan price vs conversion (assumed), contribution per 100 prospects\n")
    # conversion index relative to A$12 (assumption, to be replaced by the first 100 conversations)
    conv = {9: 1.15, 12: 1.00, 15: 0.90, 19: 0.75, 24: 0.55}
    base_conv = 0.125      # 1 in 8 walk-ins buys at A$12
    site, veh, parcels = SHAPES['Trade, workshop + 3 utes']
    cost = ongoing_cost_py(site, veh, parcels)
    kr, km = kit_margin(site, veh)
    print("| Site plan / month | Vehicle plan / month | Conversion (of 100) | Plan revenue / account / yr | Yr-1 contribution / account | Contribution per 100 prospects | 3-yr contribution per 100 (3.3% churn) |")
    print("|---|---|---|---|---|---|---|")
    for p, idx in conv.items():
        vp = round(p * 7 / 12)
        plan = site * p * 12 + veh * vp * 12
        fees = plan * GOODS['pay_pct'] + 4 * GOODS['pay_fixed']
        c1 = plan - cost - fees + km
        n = 100 * base_conv * idx
        life = sum((1 - 0.033) ** m for m in range(36)) / 12       # years of expected life over 3 yrs
        c3 = n * (km + (plan - cost - fees) * life)
        print(f"| A${p} | A${vp} | {n:.1f} | A${plan:,.0f} | A${c1:,.0f} | A${n * c1:,.0f} | A${c3:,.0f} |")
    print()

# ---- annual vs monthly, renewal increases ---------------------------------
def billing():
    print("### Annual versus monthly on a Trade account (1 site + 3 utes)\n")
    plan = structure_A(1, 3)
    print("| | Annual upfront | Monthly (+15%) |\n|---|---|---|")
    print(f"| Plan revenue a year | A${plan:,.0f} | A${plan * 1.15:,.0f} |")
    print(f"| Cash on day one | A${plan + 296:,.0f} (plan + kits) | A${plan * 1.15 / 12 + 296:,.0f} (first month + kits) |")
    print("| Decisions to leave per year | 1 | 12 |")
    print("| Card-failure exposure | 1 charge | 12 charges |")
    print("| Flat-equivalent churn (retention.py) | 3.0% at 85% annual share | 3.8% at 40% annual share |")
    print()
    print("### Renewal price increases (annual plans, 30 days' notice)\n")
    print("| Policy | Year 2 plan revenue on 1,000 accounts | Expected extra churn | Net |\n|---|---|---|---|")
    base = 1000 * structure_A(1.2, 1.6)
    for label, pct, churn_pts in [('No increase', 0.0, 0.0), ('CPI, ~3%', 0.03, 0.5), ('5%', 0.05, 1.5), ('10%', 0.10, 4.0)]:
        gain = base * pct
        lost = base * (1 + pct) * (churn_pts / 100)
        print(f"| {label} | +A${gain:,.0f} | {churn_pts:.1f} pts of renewal | A${gain - lost:+,.0f} |")
    print()

# ---- compliance modules ----------------------------------------------------
MODULES = [
    # name, what the customer pays today, price/mo, cogs share, build days, take low/base/high
    ('Compliance calendar (test-and-tag, fire equipment, first-aid checks, AED, emergency plan review: dates, reminders, record, certificate line)',
     'Test-and-tag A$3-9.50/item + A$100-250 call-out; fire 6-monthly A$15-50/unit or A$120 for 5; most small businesses track nothing', 14, 0.10, 3, (0.20, 0.35, 0.50)),
    ('Calendar Plus (adds induction and SWMS register, chemical register with SDS links, contractor licence expiry)',
     'WHS software A$49/mo flat (HazardCo) to A$175/mo (Safety Champion) or A$37/user; mostly spreadsheets', 29, 0.12, 6, (0.05, 0.15, 0.25)),
    ('PPE and sun pack (gloves, TGA-listed SPF50+, earplugs, eyewash, shipped with refills)',
     'Bought ad hoc at Bunnings or a safety store', 22, 0.55, 1, (0.20, 0.35, 0.45)),
    ('Emergency plan and evacuation diagram (one-off A$149, then annual review reminder)',
     'A$150-400 from a consultant, or nothing', 149 / 12, 0.20, 2, (0.15, 0.30, 0.40)),
    ('Test-and-tag and fire service booking via a partner (10% referral on the service, we keep the register)',
     'Same providers, no register', 3, 0.0, 1, (0.15, 0.30, 0.40)),
]

def modules():
    print("### Compliance modules: what they add per account\n")
    print("| Module | What the customer pays today | Price / mo | COGS | Build days | Take-rate low / base / high | ARPA uplift base | Contribution uplift base |")
    print("|---|---|---|---|---|---|---|---|")
    tot = {'low': [0, 0], 'base': [0, 0], 'high': [0, 0]}
    for name, today, price, cogs, days, (lo, ba, hi) in MODULES:
        for k, t in zip(('low', 'base', 'high'), (lo, ba, hi)):
            tot[k][0] += price * t; tot[k][1] += price * t * (1 - cogs)
        print(f"| {name} | {today} | A${price:.0f} | {cogs:.0%} | {days} | {lo:.0%} / {ba:.0%} / {hi:.0%} | A${price * ba:.2f} | A${price * ba * (1 - cogs):.2f} |")
    print(f"| **All modules** | | | | **{sum(m[4] for m in MODULES)}** | | **low A${tot['low'][0]:.2f} / base A${tot['base'][0]:.2f} / high A${tot['high'][0]:.2f}** | **low A${tot['low'][1]:.2f} / base A${tot['base'][1]:.2f} / high A${tot['high'][1]:.2f}** |")
    print()
    print("Base blended COGS on module revenue: {:.0%}. The channel model's agent-assisted case uses an ARPA uplift ramping to A$14 at 40% COGS; the module table supports about A${:.0f} at {:.0%} COGS in the base case, which is the same contribution within a dollar. (PPE was already in the base ARPA at 35% take; it is shown here for completeness and excluded from the uplift below.)".format(
        1 - tot['base'][1] / tot['base'][0], tot['base'][0] - 22 * 0.35, 1 - tot['base'][1] / tot['base'][0]))
    print()

if __name__ == '__main__':
    print_structures(); elasticity(); billing(); modules()
