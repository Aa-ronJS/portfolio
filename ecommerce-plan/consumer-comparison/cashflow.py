# Illustrative 12-month cash flow, AUD 30k launch, single SKU then 3 SKUs
# Months: M0=Sep-26 ... M11=Aug-27
FX=0.65
price_inc=79.0; price_ex=price_inc/1.1
fact_usd=12.0; fact_aud=fact_usd/FX          # 18.46
freight_pu=2.5; landed=fact_aud+freight_pu+1.0  # +1 inspection/labels ~21.96
ship=8.0; pack=1.5; pay=0.0175*price_inc+0.30; ret=2.0
cm_pre_ads=price_ex-landed-ship-pack-pay-ret
CAC=35.0
units=[0,0,0,60,90,120,150,180,210,240,270,300]
repeat_share=[0,0,0,0,0.05,0.08,0.10,0.12,0.15,0.15,0.18,0.20]
fixed=470.0
prelaunch={0:800+1500, 1:2500, 2:600}  # samples+trademark/insurance; brand/site/photos; packaging design
# PO1: 1000 units, deposit M0, balance M1, freight+duty+GST M2
po1_val=1000*fact_aud; po1_freight=1000*freight_pu+800  # +port/clearing
po1_gst=0.10*(po1_val+1000*freight_pu)
# PO2 (M6): 1500 SKU1 + 500 SKU2 + 500 SKU3 = 2500 units
po2_val=1600*fact_aud; po2_freight=1600*freight_pu+900; po2_gst=0.10*(po2_val+1600*freight_pu)
cash=30000.0
print(f"landed={landed:.2f} price_ex={price_ex:.2f} multiple={price_ex/landed:.2f} cm_pre_ads={cm_pre_ads:.2f} ({cm_pre_ads/price_ex:.0%})")
rows=[]
inv=0
for m in range(12):
    u=units[m]; new=u*(1-repeat_share[m]); rep=u*repeat_share[m]
    rev=u*price_ex
    cogs_cash=0; gst_cash=0
    if m==0: cogs_cash+=0.3*po1_val
    if m==1: cogs_cash+=0.7*po1_val
    if m==2: cogs_cash+=po1_freight; gst_cash+=po1_gst
    if m==6: cogs_cash+=0.3*po2_val
    if m==7: cogs_cash+=0.7*po2_val
    if m==8: cogs_cash+=po2_freight; gst_cash+=po2_gst
    # import GST refunded via BAS next quarter (M5 for PO1, M11 for PO2)
    gst_refund = po1_gst if m==5 else (po2_gst if m==11 else 0)
    var=u*(ship+pack+pay+ret)
    ads=new*CAC
    fx=fixed+prelaunch.get(m,0)
    net=rev-cogs_cash-gst_cash+gst_refund-var-ads-fx
    cash+=net
    if m==2: inv+=1000
    if m==8: inv+=1600
    inv-=u
    rows.append((m,u,rev,cogs_cash+gst_cash-gst_refund,var,ads,fx,net,cash,inv))
names=["Sep-26","Oct-26","Nov-26","Dec-26","Jan-27","Feb-27","Mar-27","Apr-27","May-27","Jun-27","Jul-27","Aug-27"]
print("| Month | Units | Revenue ex-GST | Inventory & import cash out (net of GST refund) | Fulfilment/pay/returns | Ads | Fixed + one-off | Net cash | Closing cash | Units on hand |")
print("|---|---|---|---|---|---|---|---|---|---|")
for r in rows:
    m,u,rev,cogs,var,ads,fx,net,cash,inv=r
    print(f"| {names[m]} | {u} | {rev:,.0f} | {cogs:,.0f} | {var:,.0f} | {ads:,.0f} | {fx:,.0f} | {net:,.0f} | {cash:,.0f} | {inv:,} |")
tot_u=sum(units); tot_rev=tot_u*price_ex
print("total units",tot_u,"rev",round(tot_rev),"ads",round(sum(r[5] for r in rows)))
# accrual P&L for the 9 selling months
cogs_acc=tot_u*landed; var_acc=tot_u*(ship+pack+pay+ret); ads_acc=sum(r[5] for r in rows); fx_acc=12*fixed+sum(prelaunch.values())
print("accrual: rev",round(tot_rev),"cogs",round(cogs_acc),"var",round(var_acc),"ads",round(ads_acc),"fixed",round(fx_acc),"net",round(tot_rev-cogs_acc-var_acc-ads_acc-fx_acc))
print("inventory value on hand end Aug (at landed):",round(rows[-1][9]*landed))
