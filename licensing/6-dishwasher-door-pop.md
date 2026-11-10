# 6. Door-popper for older dishwashers

**One line:** "Your old dishwasher opens itself to dry, like the new ones do."

**Score: 12/14.** Pain 2, workaround 2, five-second 2, fits 1, protectable 1, tailwind 2, access 2.

This is the first idea found with the problem-first method. It has not
been designed in detail or built.

## The four questions

| Question | Answer |
|----------|--------|
| What changed? | Dishwashers stopped using heated drying on eco and quick cycles to save energy |
| What new weakness? | Plastics come out wet. Repair guides call it physics, not a fault ([Wilson Myers](https://wilsonmyers.co/expert-insights/dishwasher-not-drying/), [Home Depot](https://www.homedepot.com/c/ah/dishwasher-not-drying/9ba683603be9fa5395fab9093f5307c)) |
| Where is the evidence? | The makers' own fix is a door that opens itself at the end of the cycle: Bosch AutoAir, Samsung AutoRelease ([Samsung](https://www.samsung.com/ae/support/home-appliances/use-the-auto-door-open-function-on-your-samsung-dishwasher/)). And people already buy passive door props for about US$10 to hold the door ajar ([Amazon listing](https://www.amazon.com/Dishwasher-Opener-Keeps-Your-Open/dp/B08FXV4MQX)) |
| Who profits? | Kitchen-accessory companies, which get a product for every dishwasher already installed |

## Size of the opening

- About 68% of US households have a dishwasher
  ([EIA figure, via Hunker](https://www.hunker.com/1957861/dishwasher-appliance-still-useful-homes/)).
  That is roughly 88 million machines (my arithmetic, on about 130
  million households).
- Machines are kept for around 9 years or more, so most in use today
  have no self-opening door. I couldn't find the share that do.
- A Samsung with the feature built in is listed at US$1,399. Nobody
  replaces a working dishwasher for dry plastics.

## The product

A small unit that clips to the top front edge of the tub opening, where
the door closes against the frame.

- **Closing the door** pushes a plunger in and cocks a spring. A catch
  holds the spring, so there's no load on the door while it runs.
- **When the cycle ends** the catch releases. The plunger pushes the
  door past its latch and leaves it ajar by a few centimetres.
- **Target force:** the parts makers sell to dishwasher factories for
  this job give at least 65 N over a 12 mm stroke
  ([iSwell thermoactuator](https://www.waxmotor.com/products/dishwasher-automatic-door-opener-thermoactuator)).

The hard part is knowing the cycle has ended. Two ways:

| Version | How it knows | For | Against |
|---------|--------------|-----|---------|
| Electronic (lead version) | A vibration sensor notices the machine has run, then been still for a few minutes. A coin cell and a small release | Works on any programme | Battery; costs more to make (my guess: US$4 to US$6) |
| Thermal, no battery | A wax element arms on the heat of the final rinse and releases as it cools | Cheap, nothing to charge | Programmes vary. One maker's eco cycle washes at about 45°C and rinses at about 54°C, while a sanitise option washes at 54°C and rinses at 68°C ([Fisher & Paykel](https://www.fisherpaykel.com/on/demandware.static/-/Sites-fpa-master-catalog/default/dw2e7285ec/GeneralFiles-FisherPaykelUS/FP-WashProgramData-en-DD24D-DD24S-DishDrawer-0-592831B-US-CA.pdf), [Whirlpool](https://www.whirlpool.com/content/dam/global/documents/202108/cycle-guide-w11538005-reva.pdf)). No single trigger temperature suits both |

## Prior art found

| Reference | What it is | Why it doesn't block |
|-----------|------------|----------------------|
| Passive door props (IQ Labs and others) | A clip that stops the door closing fully, or holds it ajar | You still have to open the door yourself. Proves the demand |
| [US 9,084,526](https://patents.google.com/patent/US9084526) (Miele; listed as active to 2034) | A dishwasher with a motor-driven push bar and a spring the motor tensions | **Live. Design around it:** no motor-driven bar. Our spring is cocked by the user closing the door |
| [US 9,474,433](https://patents.google.com/patent/US9474433) (Arçelik) | A dishwasher whose opener also loosens the latch | Listed as expired for unpaid fees. Ours doesn't touch the latch |
| [US 4,951,693](https://patents.google.com/patent/US4951693A/en) (1990) | Solenoid releases the door at the end of the rinse | Expired. Shows the basic idea is old |
| [EP 2591712](https://patents.google.com/patent/EP2591712A1/en), [WO 2014/088910](https://patents.google.com/patent/WO2014088910A1/en), [EP 3457906](https://patents.google.com/patent/EP3457906A1/en) | Built-in spring pushers and motor openers | Not read in detail yet |

One product search and one patent search found no add-on opener for an
existing dishwasher. Every patent found claims a dishwasher with the
opener built in. An add-on fitted to a dishwasher could still be argued
to make up the patented combination, so an attorney must read the live
ones before filing.

## Draft description for a provisional

*An accessory for a dishwasher having a tub and a door held closed by a
latch that releases under force, the accessory comprising: a mounting
for attachment to the dishwasher without modification of it; a plunger
biased by a spring towards the door; a catch that holds the plunger
retracted against the spring, the catch being set by closing the door;
a sensor responsive to a condition indicating that a wash cycle has
ended; and a release that frees the catch in response to the sensor, so
that the plunger moves the door from closed to ajar.*

Variants to include:

- The sensor detects vibration followed by a period of stillness.
- The sensor is a thermally responsive element that arms at a first
  temperature and releases at a lower one.
- The sensor detects sound, humidity or the machine's end-of-cycle tone.
- Mounting on the tub flange, the upper rack or the underside of the
  worktop.
- A limiter so the door opens no more than a set distance.
- A user-set delay.

## Bench tests, in order

| # | Question | How | Pass |
|---|----------|-----|------|
| 1 | How hard must it push? | Hook a luggage scale to the inside top of the door and pull it open from closed. Three different dishwashers | Under about 65 N on all three |
| 2 | Does opening the door do the job? | Run two identical loads of plastic tubs. Open one by hand at the end. Weigh the water left on each load after 30 minutes | Clearly less water on the opened load |
| 3 | Can vibration tell when it's finished? | Tape a phone running a vibration logger to the door for a full cycle | A still period at the end that no pause mid-cycle matches |
| 4 | Does a cocked spring open it? | A spring plunger from a hardware shop held by a pin, pulled by hand at the end | Door moves to ajar every time, and stays there |

Tests 1 to 3 cost almost nothing and decide whether to go on.

**It fails if** the door needs far more force than 65 N, the door drops
fully open on machines without a spring hinge, or steam damages the
worktop edge above.

## Who to pitch

| Company | Why | Route | Verified? |
|---------|-----|-------|-----------|
| Lifetime Brands | Kitchen accessories; open portal, no patent needed | lifetimebrands.com idea form | Yes |
| OXO | Sink and dish accessories | oxo.com/inventor | Page exists |
| Allstar Innovations | Wet tub against dry tub is a TV demonstration | Online form | Third-party sources only |
| Reckitt (Finish) | Sells rinse aid on the promise of dry dishes | Direct approach | No |
| Whirlpool (Affresh), dishwasher makers' accessory ranges | A fix for their older machines | Direct approach | No |
| Joseph Joseph, Dreamfarm, Jokari | Kitchen problem-solvers | Direct approach | No |

It pairs with the mug tilt rail: same problem, same companies, one pitch.

## What a deal might pay

- **Modest:** 50,000 units a year at about US$12 wholesale and 5%:
  about A$45,000 a year.
- **Strong:** 500,000 units a year: about A$450,000.
- **My odds of a deal:** 6%. Expected worth about A$18,900.

All three figures are my estimates.

## Risks

- **It needs real engineering.** This is a mechanism with a sensor, not
  a moulding. A company will want to see it work.
- **The Miele patent is live** and others are unread.
- **Safety and damage:** a door that opens by itself near children, and
  steam on the worktop edge. Makers of built-in versions deal with both.
- **Makers are adding this to new machines,** so the opening shrinks
  over ten years or so as old ones are replaced.
