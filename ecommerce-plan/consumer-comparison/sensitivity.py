FX=0.65
def year(price_inc=79.0, landed=21.96, cac=35.0, repeat=0.20, units=1620, ship=8.0, pack=1.5, ret=2.0, fixed=470*12+7500):
    pe=price_inc/1.1; pay=0.0175*price_inc+0.30
    cm=pe-landed-ship-pack-pay-ret
    new=units*(1-repeat)
    return units*cm - new*cac - fixed
base=year()
print("base net",round(base))
print("\nCAC sensitivity"); 
for c in [20,25,30,35,45,55,70]: print(c, round(year(cac=c)))
print("\nPrice (AOV) sensitivity, same landed cost");
for p in [59,69,79,89,99,119]: print(p, round(p/1.1/21.96,2),"x", round(year(price_inc=p)))
print("\nRepeat-share sensitivity (share of orders that are repeat, zero CAC)");
for r in [0.0,0.1,0.2,0.3,0.4]: print(r, round(year(repeat=r)))
print("\nLanded cost sensitivity");
for l in [16,19,22,25,28,32]: print(l, round(79/1.1/l,2),"x", round(year(landed=l)))
print("\nBreak-even monthly orders (fixed AUD 1,500/mo no salary; AUD 5,500/mo incl AUD 4k founder draw), 20% repeat, CAC 35, landed=price_ex/3.3")
for p in [49,79,129,199]:
    pe=p/1.1; landed=pe/3.3; pay=0.0175*p+0.30; ship=8 if p<100 else 12
    cm=pe-landed-ship-1.5-pay-2.0
    blended=cm-0.8*35
    for f in [1500,5500]:
        be = f/blended if blended>0 else float('inf')
        print(p, "cm/order",round(cm,1),"blended after CAC",round(blended,1),"fixed",f,"BE orders/mo",round(be) if be!=float('inf') else "never")
print("\nSame but landed = price_ex/4.5 (i.e. 4.5x rule)")
for p in [49,79,129,199]:
    pe=p/1.1; landed=pe/4.5; pay=0.0175*p+0.30; ship=8 if p<100 else 12
    cm=pe-landed-ship-1.5-pay-2.0
    blended=cm-0.8*35
    for f in [1500,5500]:
        be = f/blended if blended>0 else float('inf')
        print(p, "cm/order",round(cm,1),"blended after CAC",round(blended,1),"fixed",f,"BE orders/mo",round(be) if be!=float('inf') else "never")
