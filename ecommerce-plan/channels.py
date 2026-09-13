#!/usr/bin/env python3
"""
36-month view by acquisition channel, with what the founder actually earns.

Builds on model.py's unit economics (ARPA, contribution, kit margin) and adds:
  - accounts per month by source: founder direct, paid search, partners,
    referrals, SEO; each with its own acquisition cost
  - partner fees (share of first-year plan revenue) and referral rewards
  - fixed costs that step up; packing and customer-service hours beyond the
    founder's cap are hired at a loaded casual rate; storage above 400 accounts
  - founder hours, effective hourly rate, company tax, take-home

    python3 ecommerce-plan/channels.py            # tables
    python3 ecommerce-plan/channels.py --case low  # or high

Arithmetic on stated assumptions. Not a forecast.
"""
import argparse
import importlib.util
import os

spec = importlib.util.spec_from_file_location('model', os.path.join(os.path.dirname(__file__), 'model.py'))
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)
S, _ = model.run(model.A, verbose=False)
ARPA, CONTRIB_PM, KIT_REV, KIT_MARGIN = S['arpa'], S['contrib_pm'], S['kit_rev'], S['kit_margin']
KIT_COGS = KIT_REV - KIT_MARGIN
ONGOING_PM = ARPA - CONTRIB_PM
PLAN_PY = (model.A['site_kits_per_account'] * model.A['site_plan_pm'] + model.A['vehicle_kits_per_account'] * model.A['vehicle_plan_pm']) * 12

CASES = {
    'low': dict(direct=[4, 5, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8] + [6] * 12 + [4] * 12,
                paid=[0, 2, 3, 3, 3, 3, 3, 3, 3, 6, 6, 6] + [8] * 12 + [10] * 12,
                partner_per=0.75, partners=[0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 5, 5] + [7] * 12 + [10] * 12,
                referral_rate=0.010, seo=[0, 0, 0, 1, 1, 1, 2, 2, 3, 4, 4, 5] + [8] * 12 + [10] * 12,
                churn=0.061),   # flat-equivalent of retention.py low case
    'base': dict(direct=[5, 7, 9, 10, 11, 12, 12, 12, 12, 12, 12, 12] + [8] * 12 + [6] * 12,
                 paid=[0, 4, 6, 7, 7, 7, 7, 7, 7, 12, 14, 15] + [20] * 12 + [28] * 12,
                 partner_per=1.5, partners=[0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 8] + [15] * 12 + [25] * 12,
                 referral_rate=0.020, seo=[0, 0, 0, 1, 2, 3, 5, 7, 8, 12, 14, 15] + [20] * 12 + [25] * 12,
                 churn=0.033),   # flat-equivalent of retention.py base case
    # 'claude': base-case demand, run with a coding agent doing the build, content,
    # prospecting lists, outreach drafts, ops automation and retention flows.
    # Direct +25% (more conversations per selling hour from prepared lists and
    # drafted follow-ups), partner recruitment +50% (sequenced outreach),
    # SEO ramp pulled forward two quarters (pages exist from week 2, Google
    # still takes its time), referral +0.5pt (automated ask + reward), churn at
    # the "everything in your control done well" level from retention.py.
    'claude': dict(direct=[6, 9, 11, 13, 14, 15, 15, 15, 15, 15, 15, 15] + [10] * 12 + [8] * 12,
                   paid=[0, 4, 6, 7, 7, 7, 7, 7, 7, 12, 14, 15] + [20] * 12 + [28] * 12,
                   partner_per=1.5, partners=[0, 0, 1, 2, 3, 5, 6, 8, 9, 10, 12, 12] + [22] * 12 + [35] * 12,
                   referral_rate=0.025, seo=[0, 0, 1, 3, 5, 8, 12, 14, 15, 18, 20, 20] + [25] * 12 + [30] * 12,
                   churn=0.025, arpa_uplift=[0] * 6 + [2, 4, 6, 8, 9, 10] + [12] * 12 + [14] * 12,
                   cs_min=1.0, hours_build=[8] * 2 + [3] * 34, hours_content=[1] * 36),
    # 'site': NO founder selling. Everything through the site, national from
    # day one. Paid search is budget-driven (spend / self-serve CAC), partners
    # sign themselves up, SEO is the agent-assisted ramp, referrals come from
    # the record page. Self-serve accounts churn more (more monthly plans, no
    # relationship): flat-equivalent 4.0% base. Founder hours are ads, content
    # review, CRO and ops only.
    'site': dict(direct=[0] * 36,
                 paid_budget=[600, 900, 1200, 1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600] + [5500] * 12 + [7000] * 12,
                 paid_cac=110.0,
                 partner_per=1.2, partners=[0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8] + [14] * 12 + [22] * 12,
                 referral_rate=0.018, seo=[0, 0, 1, 3, 5, 8, 12, 14, 15, 18, 20, 20] + [25] * 12 + [30] * 12,
                 churn=0.040, arpa_uplift=[0] * 6 + [2, 4, 6, 8, 9, 10] + [12] * 12 + [14] * 12,
                 cs_min=1.0, hours_sales=[0] * 36, hours_build=[10] * 3 + [5] * 33, hours_content=[3] * 36),
    'site_low': dict(direct=[0] * 36,
                 paid_budget=[600, 900, 1200, 1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600] + [5500] * 12 + [7000] * 12,
                 paid_cac=185.0,
                 partner_per=0.75, partners=[0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4] + [7] * 12 + [10] * 12,
                 referral_rate=0.010, seo=[0, 0, 0, 1, 2, 3, 5, 7, 8, 10, 12, 12] + [15] * 12 + [18] * 12,
                 churn=0.065, arpa_uplift=[0] * 6 + [1, 2, 3, 4, 4, 5] + [6] * 12 + [7] * 12,
                 cs_min=1.5, hours_sales=[0] * 36, hours_build=[10] * 3 + [5] * 33, hours_content=[3] * 36),
    'site_high': dict(direct=[0] * 36,
                 paid_budget=[600, 900, 1200, 1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600] + [5500] * 12 + [7000] * 12,
                 paid_cac=80.0,
                 partner_per=1.5, partners=[0, 0, 1, 2, 3, 4, 6, 8, 9, 10, 12, 12] + [22] * 12 + [35] * 12,
                 referral_rate=0.025, seo=[0, 0, 1, 3, 5, 8, 12, 14, 15, 18, 20, 20] + [30] * 12 + [40] * 12,
                 churn=0.030, arpa_uplift=[0] * 6 + [2, 4, 6, 8, 9, 10] + [12] * 12 + [14] * 12,
                 cs_min=1.0, hours_sales=[0] * 36, hours_build=[10] * 3 + [5] * 33, hours_content=[3] * 36),
    # 'autopilot': the site case run with nobody in the loop. A 3PL packs every
    # parcel at a per-order fee instead of founder hours and casual labour;
    # customer service is triaged and mostly answered by the inbox agent
    # (0.3 min of founder time per account per month, the taps); the founder's
    # hours are the Monday review, a few approvals and content checking.
    # Same demand, CAC and churn as 'site'. Storage is at the 3PL (in its fee).
    'autopilot': dict(direct=[0] * 36,
                 paid_budget=[600, 900, 1200, 1500, 1800, 2200, 2600, 3000, 3400, 3800, 4200, 4600] + [5500] * 12 + [7000] * 12,
                 paid_cac=110.0,
                 partner_per=1.2, partners=[0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8] + [14] * 12 + [22] * 12,
                 referral_rate=0.018, seo=[0, 0, 1, 3, 5, 8, 12, 14, 15, 18, 20, 20] + [25] * 12 + [30] * 12,
                 churn=0.040, arpa_uplift=[0] * 6 + [2, 4, 6, 8, 9, 10] + [12] * 12 + [14] * 12,
                 cs_min=0.3, hours_sales=[0] * 36, hours_build=[12] * 3 + [2] * 33, hours_content=[1] * 36,
                 ops_cap=[0] * 36, parcel_fee=6.50, storage_pm=lambda active: 0, extra_fixed=[120] * 36),
    'high': dict(direct=[6, 9, 12, 14, 15, 16, 16, 16, 16, 16, 16, 16] + [10] * 12 + [8] * 12,
                 paid=[0, 6, 9, 12, 14, 16, 16, 16, 16, 24, 28, 30] + [40] * 12 + [55] * 12,
                 partner_per=3.0, partners=[0, 0, 1, 2, 3, 5, 6, 8, 10, 12, 14, 15] + [25] * 12 + [40] * 12,
                 referral_rate=0.035, seo=[0, 0, 0, 2, 3, 5, 8, 10, 12, 16, 18, 20] + [30] * 12 + [40] * 12,
                 churn=0.020),   # flat-equivalent of retention.py high case
}

# acquisition cost per account by source (goods, fees, travel; founder time is NOT costed here)
CAC = dict(direct=30.0,              # samples, fuel, offer sheets
           paid=86.0,                # base-case Google Search (see launch/09)
           partner=0.15 * PLAN_PY + 15.0,   # 15% of first-year plan revenue + a sample
           referral=22.0,            # a free refill pack + postage for the referrer
           seo=10.0)                 # hosting share, nothing else

FIXED = [520] * 12 + [750] * 12 + [1000] * 12        # tools, insurance, hosting, phone, accounting (grows with volume)
ONE_OFFS = {0: 2808, 1: 1200, 12: 1500, 24: 2000}     # setup; year-2 and year-3 refreshes (labels, insurance step-ups)
LABOUR_RATE = 40.0      # A$/hr loaded cost of casual help (packing, customer service)
CS_MIN_PER_ACCOUNT = 3  # minutes of customer service per active account per month
FOUNDER_OPS_CAP = [8] * 12 + [5] * 12 + [4] * 12   # hours/week of packing + CS the founder does before hiring help
STORAGE_PM = lambda active: 0 if active < 400 else (450 if active < 1200 else 1100)   # a storage unit, then a small unit with a bench

# founder hours per week: sales, ops per parcel, content/partners, build
HOURS_SALES = [16] * 12 + [10] * 12 + [8] * 12
HOURS_CONTENT = [3] * 36
HOURS_BUILD = [6] * 3 + [4] * 9 + [3] * 24
PARCEL_MIN = 8          # minutes to pack and label one parcel

def run(case):
    c = CASES[case]
    uplift = c.get('arpa_uplift', [0] * 36)          # A$/account/month from compliance modules (60% margin)
    cs_min = c.get('cs_min', CS_MIN_PER_ACCOUNT)
    h_build = c.get('hours_build', HOURS_BUILD)
    h_content = c.get('hours_content', HOURS_CONTENT)
    h_sales = c.get('hours_sales', HOURS_SALES)
    paid_cac = c.get('paid_cac', CAC['paid'])
    ops_cap = c.get('ops_cap', FOUNDER_OPS_CAP)
    parcel_fee = c.get('parcel_fee', 0.0)          # A$ per parcel paid to a 3PL instead of packing hours
    storage_fn = c.get('storage_pm', STORAGE_PM)
    extra_fixed = c.get('extra_fixed', [0] * 36)   # email, classifier, 3PL account minimums
    active = 0.0
    rows = []
    cum = dict(kit_rev=0, rec_rev=0, kit_cogs=0, ongoing=0, cac=0, fixed=0, hours=0)
    yearly = []
    for m in range(36):
        partners_new = c['partners'][m] * c['partner_per']
        referrals_new = active * c['referral_rate']
        paid_new = (c['paid_budget'][m] / paid_cac) if 'paid_budget' in c else c['paid'][m]
        new = dict(direct=c['direct'][m], paid=paid_new, partner=partners_new, referral=referrals_new, seo=c['seo'][m])
        n_new = sum(new.values())
        churned = active * c['churn']
        active = active - churned + n_new
        kit_rev = n_new * KIT_REV
        rec_rev = active * (ARPA + uplift[m])
        kit_cogs = n_new * KIT_COGS
        ongoing = active * (ONGOING_PM + uplift[m] * 0.4)
        cac = sum(new[k] * (paid_cac if k == 'paid' else CAC[k]) for k in new)
        parcels_wk = active * model.A['parcels_per_account_py'] / 52 + n_new / 4.33
        pack_hours = 0.0 if parcel_fee else parcels_wk * PARCEL_MIN / 60
        ops_needed = pack_hours + active * cs_min / 60 / 4.33 + (0.5 if parcel_fee else 1.0)
        founder_ops = min(ops_needed, ops_cap[m])
        hired_hours_wk = ops_needed - founder_ops
        labour = hired_hours_wk * LABOUR_RATE * 4.33 + (parcels_wk * 4.33 * parcel_fee if parcel_fee else 0.0)
        fixed = FIXED[m] + ONE_OFFS.get(m, 0) + labour + storage_fn(active) + extra_fixed[m]
        profit = kit_rev + rec_rev - kit_cogs - ongoing - cac - fixed
        hours_wk = h_sales[m] + h_content[m] + h_build[m] + founder_ops
        rows.append(dict(m=m, new=new, n_new=n_new, active=active, kit_rev=kit_rev, rec_rev=rec_rev, kit_cogs=kit_cogs,
                         ongoing=ongoing, cac=cac, fixed=fixed, labour=labour, hired_hours_wk=hired_hours_wk,
                         profit=profit, hours_wk=hours_wk, parcels_wk=parcels_wk))
    return rows

def tax_personal(income):
    # 2024-25 onward resident rates + 2% Medicare levy (approximation; no offsets)
    brackets = [(18200, 0.0), (45000, 0.16), (135000, 0.30), (190000, 0.37), (float('inf'), 0.45)]
    tax, prev = 0.0, 0.0
    for cap, rate in brackets:
        if income > prev:
            tax += (min(income, cap) - prev) * rate
        prev = cap
    return tax + 0.02 * income

def report(case):
    rows = run(case)
    print(f"## Case: {case}\n")
    print("### Accounts won per month by source (quarterly averages)\n")
    print("| Quarter | You (direct) | Paid search | Partners | Referrals | SEO | Total / month | Active at end | Blended CAC |")
    print("|---|---|---|---|---|---|---|---|---|")
    for q in range(12):
        seg = rows[q * 3:(q + 1) * 3]
        avg = lambda k: sum(r['new'][k] for r in seg) / 3
        tot = sum(r['n_new'] for r in seg) / 3
        cac = sum(r['cac'] for r in seg) / max(1e-9, sum(r['n_new'] for r in seg))
        print(f"| Y{q // 4 + 1} Q{q % 4 + 1} | {avg('direct'):.1f} | {avg('paid'):.1f} | {avg('partner'):.1f} | {avg('referral'):.1f} | {avg('seo'):.1f} | {tot:.1f} | {seg[-1]['active']:.0f} | A${cac:.0f} |")
    print()
    print("### Yearly P&L and what you earn\n")
    print("| | Year 1 | Year 2 | Year 3 |\n|---|---|---|---|")
    years = [rows[0:12], rows[12:24], rows[24:36]]
    def line(label, f, fmt='{:,.0f}'):
        print(f"| {label} | " + " | ".join(fmt.format(f(y)) for y in years) + " |")
    line('Accounts won', lambda y: sum(r['n_new'] for r in y))
    line('Active accounts at year end', lambda y: y[-1]['active'])
    line('Share of new accounts from you directly', lambda y: sum(r['new']['direct'] for r in y) / sum(r['n_new'] for r in y), '{:.0%}')
    line('Share from partners + referrals', lambda y: sum(r['new']['partner'] + r['new']['referral'] for r in y) / sum(r['n_new'] for r in y), '{:.0%}')
    line('Kit sales revenue', lambda y: sum(r['kit_rev'] for r in y))
    line('Recurring revenue (earned)', lambda y: sum(r['rec_rev'] for r in y))
    line('Total revenue', lambda y: sum(r['kit_rev'] + r['rec_rev'] for r in y))
    line('Goods and postage', lambda y: sum(r['kit_cogs'] + r['ongoing'] for r in y))
    line('Acquisition costs (fees, ads, rewards, samples)', lambda y: sum(r['cac'] for r in y))
    line('Fixed costs incl. hired packing/CS hours and storage', lambda y: sum(r['fixed'] for r in y))
    line('  of which hired labour or 3PL fees', lambda y: sum(r['labour'] for r in y))
    line('  hired hours per week at year end', lambda y: y[-1]['hired_hours_wk'], '{:.0f}')
    line('Parcels per week at year end', lambda y: y[-1]['parcels_wk'], '{:.0f}')
    line('**Profit before paying yourself**', lambda y: sum(r['profit'] for r in y), '**{:,.0f}**')
    line('Your hours per week (average)', lambda y: sum(r['hours_wk'] for r in y) / len(y), '{:.0f}')
    line('Your hours in the year', lambda y: sum(r['hours_wk'] for r in y) * 52 / 12)
    line('Profit per hour of your time', lambda y: sum(r['profit'] for r in y) / (sum(r['hours_wk'] for r in y) * 52 / 12))
    line('ARR at year end', lambda y: y[-1]['active'] * (ARPA + (CASES[case].get('arpa_uplift', [0]*36))[y[-1]['m']]) * 12)
    print()
    print("### Take-home if you pay yourself the whole profit as salary\n")
    print("| | Year 1 | Year 2 | Year 3 |\n|---|---|---|---|")
    line('Salary (company profit paid out, company tax nil)', lambda y: sum(r['profit'] for r in y))
    line('Personal tax + Medicare (no other income assumed)', lambda y: tax_personal(max(0, sum(r['profit'] for r in y))))
    line('**Take-home**', lambda y: sum(r['profit'] for r in y) - tax_personal(max(0, sum(r['profit'] for r in y))), '**{:,.0f}**')
    line('Take-home per week', lambda y: (sum(r['profit'] for r in y) - tax_personal(max(0, sum(r['profit'] for r in y)))) / 52)
    print()
    print("### Or left in the company (25% base-rate entity tax) as a growing asset\n")
    print("| | Year 1 | Year 2 | Year 3 |\n|---|---|---|---|")
    line('Profit after 25% company tax', lambda y: sum(r['profit'] for r in y) * 0.75)
    line('Indicative business value at 4x EBITDA (subscription, low churn)', lambda y: 4 * sum(r['profit'] for r in y))
    line('Indicative value at 2x (Flippa e-commerce average, if it reads as a store)', lambda y: 2 * sum(r['profit'] for r in y))
    print()
    return rows

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--case', default='base', choices=list(CASES))
    a = p.parse_args()
    report(a.case)
