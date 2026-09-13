#!/usr/bin/env python3
"""
12-month model for the recommended business: workplace safety consumables on
auto-replenishment for small businesses (site kits, vehicle kits, AED
consumables), sold by subscription with a compliance record attached.

Every assumption is a named variable at the top. Run it, change a number, run
it again. Output is markdown tables so they paste straight into the plan.

    python3 ecommerce-plan/model.py            # base case + sensitivities
    python3 ecommerce-plan/model.py --csv      # monthly rows as CSV

Nothing here is a forecast. It is arithmetic on stated assumptions so the
shape of the business (cash need, break-even, what matters) is visible.
"""
import argparse
import sys

# ----------------------------------------------------------------------------
# ASSUMPTIONS (AUD, ex-GST unless stated). Sources and reasoning: 05-financials.md
# ----------------------------------------------------------------------------
A = dict(
    # --- offer & pricing -----------------------------------------------------
    # Kits are SOLD upfront (customers already buy kits; this funds CAC).
    # The plan is what recurs: scheduled refills, after-use refills, audit log,
    # expiry tracking, annual compliance certificate. Billed annually upfront
    # by default (monthly available at +15%).
    site_kit_price=119.0,        # upfront, per site kit (comparable retail 90-150)
    vehicle_kit_price=59.0,      # upfront, per vehicle kit
    site_plan_pm=12.0,           # per site kit per month equivalent
    vehicle_plan_pm=7.0,         # per vehicle kit per month equivalent
    site_kits_per_account=1.2,
    vehicle_kits_per_account=1.6,   # trades: utes; 0.8 for offices/clinics
    aed_share=0.20,              # accounts with an AED on expiry-managed supply
    aed_rev_pm=9.0,              # pads/battery replaced before expiry, averaged
    addon_share=0.35,            # accounts taking PPE/sunscreen/eyewash add-on
    addon_rev_pm=22.0,
    addon_margin=0.45,
    annual_billing_share=0.70,   # share of plan revenue collected upfront
    # --- cost of goods (wholesale from an ARTG-listed sponsor; QUOTE NEEDED) --
    site_kit_cogs=58.0,
    vehicle_kit_cogs=32.0,
    site_refill_cogs=11.0,       # scheduled refill pack, per site kit, 2x/yr
    vehicle_refill_cogs=7.0,     # 2x/yr
    after_use_py=1.5,            # after-use refills per site kit per year
    after_use_cogs=7.0,
    vehicle_after_use_py=1.0, vehicle_after_use_cogs=5.0,
    aed_cogs_share=0.60,
    parcels_per_account_py=3.5,  # ALL kits for an account ship in one parcel
    postage_per_parcel=9.40,     # MyPost Business Band 1-2, 500g-1kg blend
    packaging_per_parcel=1.90,
    payment_fee_pct=0.0175, payment_fee_fixed=0.30,   # Shopify Payments AU
    # --- acquisition ----------------------------------------------------------
    new_accounts=[6, 9, 12, 15, 18, 22, 26, 30, 34, 38, 42, 46],  # per month
    cac_per_account=95.0,        # Google Ads on intent terms, partner referral
                                 # fees, sample kits, founder travel. Founder
                                 # selling TIME is not costed (no salary).
    monthly_churn=0.025,         # B2B replenishment; 4-6%/mo is the bad case
    # --- fixed costs ----------------------------------------------------------
    fixed_pm=520.0,              # Shopify Basic 56 + hosting/Klaviyo/Xero/apps
                                 # ~200 + insurance ~110 + phone/misc ~150
    one_offs={0: 636 + 342 + 330 + 900 + 600,   # Pty Ltd, ASIC review reserve,
                                                # TM Headstart, insurance yr 1,
                                                # brand/domain/print
              1: 1200},                          # QR labels, sample kits, photos
    founder_draw_pm=0.0,         # set to e.g. 6000 to see the salary break-even
    # --- working capital ------------------------------------------------------
    opening_cash=15000.0,
)


def run(a, verbose=True):
    ks, kv = a["site_kits_per_account"], a["vehicle_kits_per_account"]
    plan_pm = ks * a["site_plan_pm"] + kv * a["vehicle_plan_pm"]
    aed_pm = a["aed_share"] * a["aed_rev_pm"]
    addon_pm = a["addon_share"] * a["addon_rev_pm"]
    arpa = plan_pm + aed_pm + addon_pm            # recurring revenue / account / month

    goods_py = (ks * (2 * a["site_refill_cogs"] + a["after_use_py"] * a["after_use_cogs"])
                + kv * (2 * a["vehicle_refill_cogs"] + a["vehicle_after_use_py"] * a["vehicle_after_use_cogs"]))
    post_py = a["parcels_per_account_py"] * (a["postage_per_parcel"] + a["packaging_per_parcel"])
    ongoing_pm = (goods_py + post_py) / 12 + aed_pm * a["aed_cogs_share"] \
                 + addon_pm * (1 - a["addon_margin"]) \
                 + arpa * a["payment_fee_pct"] + a["payment_fee_fixed"] / 3
    contrib_pm = arpa - ongoing_pm

    kit_rev = ks * a["site_kit_price"] + kv * a["vehicle_kit_price"]
    kit_cogs = ks * a["site_kit_cogs"] + kv * a["vehicle_kit_cogs"] \
               + a["postage_per_parcel"] + a["packaging_per_parcel"] \
               + kit_rev * a["payment_fee_pct"] + a["payment_fee_fixed"]
    kit_margin = kit_rev - kit_cogs
    net_upfront = kit_margin - a["cac_per_account"]   # what a new account costs (or pays) on day 1
    payback_m = (-net_upfront / contrib_pm) if net_upfront < 0 else 0.0

    rows = []
    active = 0.0
    cash = a["opening_cash"]
    cum_rev = cum_contrib = 0.0
    for m in range(12):
        new = a["new_accounts"][m]
        churned = active * a["monthly_churn"]
        active = active - churned + new
        rev_rec = active * arpa                     # earned recurring revenue
        rev_kits = new * kit_rev
        # cash: annual-billing share of new accounts pays 12 months of plan now
        cash_plan_upfront = new * plan_pm * 12 * a["annual_billing_share"]
        cash_plan_monthly = active * (arpa - plan_pm * a["annual_billing_share"])
        cogs_ongoing = active * ongoing_pm
        cac = new * a["cac_per_account"]
        fixed = a["fixed_pm"] + a["one_offs"].get(m, 0) + a["founder_draw_pm"]
        net_cash = (rev_kits + cash_plan_upfront + cash_plan_monthly
                    - new * kit_cogs - cogs_ongoing - cac - fixed)
        cash += net_cash
        accrual = rev_rec + rev_kits - new * kit_cogs - cogs_ongoing - cac - fixed
        cum_rev += rev_rec + rev_kits
        cum_contrib += rev_rec + rev_kits - new * kit_cogs - cogs_ongoing - cac
        rows.append(dict(m=m, new=new, active=active, rev_kits=rev_kits, rev_rec=rev_rec,
                         kit_cogs=new * kit_cogs, cogs_ongoing=cogs_ongoing, cac=cac,
                         fixed=fixed, accrual=accrual, net_cash=net_cash, cash=cash))

    summary = dict(arpa=arpa, contrib_pm=contrib_pm, contrib_pct=contrib_pm / arpa,
                   kit_rev=kit_rev, kit_margin=kit_margin, net_upfront=net_upfront,
                   payback_m=payback_m, active_end=active, mrr_end=active * arpa,
                   arr_end=active * arpa * 12, year_rev=cum_rev, year_contrib=cum_contrib,
                   min_cash=min(r["cash"] for r in rows), end_cash=rows[-1]["cash"],
                   year_accrual=sum(r["accrual"] for r in rows),
                   year_net_cash=sum(r["net_cash"] for r in rows))
    if verbose:
        print_summary(a, summary, rows)
    return summary, rows


MONTHS = ["Oct-26", "Nov-26", "Dec-26", "Jan-27", "Feb-27", "Mar-27",
          "Apr-27", "May-27", "Jun-27", "Jul-27", "Aug-27", "Sep-27"]


def print_summary(a, s, rows):
    print("### Unit economics per account\n")
    print("| Item | AUD |\n|---|---|")
    print(f"| Kits sold upfront (revenue / margin after goods, postage, fees) | {s['kit_rev']:.0f} / {s['kit_margin']:.0f} |")
    print(f"| CAC | {a['cac_per_account']:.0f} |")
    print(f"| Day-1 position per new account (kit margin minus CAC) | {s['net_upfront']:+.0f} |")
    print(f"| Recurring revenue per account per month (ARPA) | {s['arpa']:.2f} |")
    print(f"| Ongoing goods, postage, add-on and AED COGS, payment fees | {s['arpa'] - s['contrib_pm']:.2f} |")
    print(f"| **Recurring contribution per account per month** | **{s['contrib_pm']:.2f} ({s['contrib_pct']:.0%})** |")
    print(f"| Payback of any day-1 deficit | {s['payback_m']:.1f} months |")
    lifetime_m = 1 / a["monthly_churn"]
    ltv = s["contrib_pm"] * lifetime_m + s["kit_margin"]
    print(f"| Expected lifetime at {a['monthly_churn']:.1%} monthly churn | {lifetime_m:.0f} months |")
    print(f"| Lifetime contribution incl. kit margin | {ltv:.0f} |")
    print(f"| LTV : CAC | {ltv / a['cac_per_account']:.1f} : 1 |")
    print()
    print("### 12-month view (no founder salary unless set; cash includes annual plans billed upfront)\n")
    print("| Month | New | Active | Kit sales | Recurring rev (earned) | Kit COGS | Ongoing COGS | CAC | Fixed | Accrual P&L | Net cash | Closing cash |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        print(f"| {MONTHS[r['m']]} | {r['new']} | {r['active']:.0f} | {r['rev_kits']:,.0f} | {r['rev_rec']:,.0f} | "
              f"{r['kit_cogs']:,.0f} | {r['cogs_ongoing']:,.0f} | {r['cac']:,.0f} | {r['fixed']:,.0f} | "
              f"{r['accrual']:,.0f} | {r['net_cash']:,.0f} | {r['cash']:,.0f} |")
    print()
    print("| Year 1 totals | AUD |\n|---|---|")
    print(f"| Revenue (kits + earned recurring) | {s['year_rev']:,.0f} |")
    print(f"| Contribution after CAC | {s['year_contrib']:,.0f} |")
    print(f"| Accrual result (before founder pay) | {s['year_accrual']:,.0f} |")
    print(f"| Net cash movement | {s['year_net_cash']:,.0f} |")
    print(f"| Lowest cash balance | {s['min_cash']:,.0f} |")
    print(f"| Active accounts at month 12 | {s['active_end']:.0f} |")
    print(f"| MRR / ARR at month 12 | {s['mrr_end']:,.0f} / {s['arr_end']:,.0f} |")
    print()


def sensitivities(base):
    print("### Sensitivities (year-1 accrual result, lowest cash balance, month-12 ARR)\n")
    tests = [
        ("Monthly churn", "monthly_churn", [0.015, 0.025, 0.04, 0.06]),
        ("CAC per account", "cac_per_account", [60, 95, 140, 200]),
        ("Site plan price / month", "site_plan_pm", [9, 12, 15, 19]),
        ("Site kit wholesale cost", "site_kit_cogs", [45, 58, 75, 90]),
        ("Vehicle kits per account", "vehicle_kits_per_account", [0.8, 1.6, 2.5, 4.0]),
        ("New accounts / month (scale of list)", "new_accounts", [0.5, 1.0, 1.5, 2.0]),
    ]
    for label, key, vals in tests:
        cells = []
        for v in vals:
            a = dict(base)
            if key == "new_accounts":
                a[key] = [round(x * v) for x in base[key]]
                shown = f"x{v}"
            else:
                a[key] = v
                shown = f"{v:.1%}" if key == "monthly_churn" else f"{v}"
            s, _ = run(a, verbose=False)
            cells.append(f"{shown}: accrual {s['year_accrual']:+,.0f}, low cash {s['min_cash']:,.0f}, ARR {s['arr_end']:,.0f}")
        print(f"- **{label}** — " + "; ".join(cells))
    print()
    # founder salary break-even
    print("### Accounts needed to cover a founder draw (steady state)\n")
    s, _ = run(base, verbose=False)
    print("| Founder draw / month | Accounts needed (after fixed costs) |\n|---|---|")
    for draw in (3000, 5000, 7000, 9000):
        need = (draw + base["fixed_pm"]) / s["contrib_pm"]
        print(f"| {draw:,} | {need:.0f} |")
    print()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", action="store_true")
    args = p.parse_args()
    s, rows = run(A, verbose=not args.csv)
    if args.csv:
        import csv
        w = csv.DictWriter(sys.stdout, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow({k: (round(v, 2) if isinstance(v, float) else v) for k, v in r.items()})
        return
    sensitivities(A)


if __name__ == "__main__":
    main()
