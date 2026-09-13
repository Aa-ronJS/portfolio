#!/usr/bin/env python3
"""
Churn and retention, modelled structurally instead of as one flat rate.

An account leaves for one of four reasons, each with its own shape:
  1. Annual plans decide once a year, at renewal (voluntary).
  2. Monthly plans can leave any month, and leave most in the first 90 days.
  3. Cards fail (involuntary). Dunning recovers most of it, or none of it.
  4. The business closes. ABS exit rates put a floor under everything.

Outputs: a 36-month survival curve per case, the equivalent flat monthly
churn (so channels.py can use it), lifetime value, and what each lever is
worth in year-3 profit when plugged into channels.py.

    python3 ecommerce-plan/retention.py
"""
import importlib.util
import os

HERE = os.path.dirname(__file__)
def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + '.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m
model = load('model')
channels = load('channels')
S, _ = model.run(model.A, verbose=False)
CONTRIB_PM, KIT_MARGIN, ARPA = S['contrib_pm'], S['kit_margin'], S['arpa']

CASES = {
    #                annual  renewal  early  steady  fail   dunning  closure/yr
    'low':     dict(annual_share=0.50, annual_renewal=0.70, monthly_early=0.06, monthly_steady=0.040, fail_rate=0.035, dunning=0.00, closure_py=0.12),
    'base':    dict(annual_share=0.70, annual_renewal=0.80, monthly_early=0.04, monthly_steady=0.025, fail_rate=0.030, dunning=0.60, closure_py=0.09),
    'high':    dict(annual_share=0.80, annual_renewal=0.88, monthly_early=0.025, monthly_steady=0.015, fail_rate=0.025, dunning=0.70, closure_py=0.07),
}
# Benchmarks behind them (see launch/11): SMB B2B annual churn 15-25%; SMB
# self-serve monthly 3-7%; 44% of subscription cancellations in the first 90
# days; involuntary churn 20-40% of total; smart retries recover ~35%, a
# full dunning stack 55-65%; ABS business exit rate 13.9% (2024-25), employing
# businesses 61% three-year survival (~15%/yr including young businesses;
# established employing businesses lower).

def survival(c, months=36):
    """Fraction of a starting cohort still active at the end of each month."""
    closure_pm = 1 - (1 - c['closure_py']) ** (1 / 12)
    ann = c['annual_share']; mon = 1 - ann
    curve = []
    for m in range(1, months + 1):
        # annual: only leave at renewal months (12, 24, 36) or when the business closes,
        # plus a failed renewal payment not recovered
        if m % 12 == 0:
            renew = c['annual_renewal']
            fail_lost = c['fail_rate'] * 2 * (1 - c['dunning'])   # renewal card failure ~2x a monthly attempt, then recovery
            ann *= renew * (1 - fail_lost)
        ann *= (1 - closure_pm)
        # monthly: voluntary churn (early cliff then steady), involuntary net of dunning, closure
        vol = c['monthly_early'] if m <= 3 else c['monthly_steady']
        invol = c['fail_rate'] * (1 - c['dunning'])
        mon *= (1 - vol) * (1 - invol) * (1 - closure_pm)
        curve.append(ann + mon)
    return curve

def flat_equivalent(curve, horizon=24):
    """The flat monthly churn that gives the same survivors at the horizon."""
    return 1 - curve[horizon - 1] ** (1 / horizon)

def ltv(curve):
    """Contribution over 36 months plus kit margin (no discounting)."""
    return KIT_MARGIN + sum(CONTRIB_PM * s for s in curve)

def year3_profit_with_churn(churn):
    c = dict(channels.CASES['base']); c['churn'] = churn
    channels.CASES['_tmp'] = c
    rows = channels.run('_tmp')
    del channels.CASES['_tmp']
    years = [rows[0:12], rows[12:24], rows[24:36]]
    return [sum(r['profit'] for r in y) for y in years], rows[-1]['active']

def main():
    print("### Survival of a cohort of 100 accounts\n")
    print("| Case | Month 3 | Month 6 | Month 12 | Month 13 (after first renewal) | Month 24 | Month 36 | Flat-equivalent monthly churn (24 mo) | LTV per account |")
    print("|---|---|---|---|---|---|---|---|---|")
    flats = {}
    for k, c in CASES.items():
        s = survival(c)
        flats[k] = flat_equivalent(s)
        print(f"| {k} | {s[2]*100:.0f} | {s[5]*100:.0f} | {s[11]*100:.0f} | {s[12]*100:.0f} | {s[23]*100:.0f} | {s[35]*100:.0f} | {flats[k]:.2%} | A${ltv(s):,.0f} |")
    print()
    print("### Where the churn comes from (base case, share of accounts lost over 24 months)\n")
    b = CASES['base']
    closure_pm = 1 - (1 - b['closure_py']) ** (1 / 12)
    # decompose by running the model with one cause at a time switched on
    def only(**kw):
        c = dict(b); c.update(kw); return 1 - survival(c)[23]
    none = dict(annual_renewal=1.0, monthly_early=0.0, monthly_steady=0.0, fail_rate=0.0, closure_py=0.0)
    parts = {
        'Business closed': only(**{**none, 'closure_py': b['closure_py']}),
        'Annual plan not renewed': only(**{**none, 'annual_renewal': b['annual_renewal']}),
        'Monthly plan cancelled': only(**{**none, 'monthly_early': b['monthly_early'], 'monthly_steady': b['monthly_steady']}),
        'Card failed, not recovered (with dunning)': only(**{**none, 'fail_rate': b['fail_rate']}),
    }
    total = 1 - survival(b)[23]
    print("| Cause | Accounts lost in 24 months (of 100) | Share |\n|---|---|---|")
    for k, v in parts.items():
        print(f"| {k} | {v*100:.1f} | {v/sum(parts.values()):.0%} |")
    print(f"| **All causes together** | **{total*100:.1f}** | |")
    print()
    print("### What each lever is worth (base case, plugged into channels.py)\n")
    print("| Change | Flat-equivalent churn | Active accounts at month 36 | Profit Y1 | Profit Y2 | Profit Y3 | Year-3 difference |")
    print("|---|---|---|---|---|---|---|")
    base_flat = flats['base']
    base_p, base_active = year3_profit_with_churn(base_flat)
    def row(label, **kw):
        c = dict(CASES['base']); c.update(kw)
        f = flat_equivalent(survival(c))
        p, a = year3_profit_with_churn(f)
        print(f"| {label} | {f:.2%} | {a:,.0f} | {p[0]:,.0f} | {p[1]:,.0f} | {p[2]:,.0f} | {p[2]-base_p[2]:+,.0f} |")
    row('Base case')
    row('No dunning at all (cards fail, nobody chases)', dunning=0.0)
    row('Full dunning stack (65% recovered)', dunning=0.65)
    row('Annual renewal 80% -> 85% (renewal notice, certificate, a call)', annual_renewal=0.85)
    row('Annual renewal 80% -> 70% (silent renewals, no contact)', annual_renewal=0.70)
    row('Annual share 70% -> 85% (push annual harder)', annual_share=0.85)
    row('Annual share 70% -> 40% (monthly becomes the default)', annual_share=0.40)
    row('First-90-day monthly churn 4% -> 2% (activation: first scan inside 30 days)', monthly_early=0.02)
    row('Closure floor 9% -> 12% a year (recession, more trades folding)', closure_py=0.12)
    row('Everything that is in your control done well', dunning=0.65, annual_renewal=0.85, annual_share=0.85, monthly_early=0.02)
    print()
    print("### Survival curves (share of cohort remaining), for the chart\n")
    print("| Month | " + " | ".join(CASES) + " |\n|---|---|---|---|")
    curves = {k: survival(c) for k, c in CASES.items()}
    for m in [1, 3, 6, 9, 12, 13, 18, 24, 25, 30, 36]:
        print(f"| {m} | " + " | ".join(f"{curves[k][m-1]*100:.0f}%" for k in CASES) + " |")

if __name__ == '__main__':
    main()
