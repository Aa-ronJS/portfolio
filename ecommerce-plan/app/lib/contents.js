'use strict';
// Kit contents profiles. Quantities follow a Safe Work Australia Code of
// Practice aligned retail kit (First Aid Kits Australia "Safe Work Australia"
// kit, 80 pieces, low-risk workplace up to ~5 people) and a typical vehicle
// kit. The Code's Appendix E is an *example* list; a workplace's risk
// assessment decides the final contents. Adjust these to match whatever the
// wholesaler actually packs, then never edit a kit's items by hand again: the
// register seeds from here.
//
// `shelf` is the typical shelf life in months for items that carry an expiry
// date (sterile goods, saline, burn gel, wipes, gloves). null = no expiry.

const SITE = [
  ['CPR face shield / key-ring mask', 1, null],
  ['Nitrile gloves, pairs', 5, 36],
  ['Gauze swabs 7.5 x 7.5 cm, 3-pack', 5, 60],
  ['Saline 15 ml steri-tube', 10, 36],
  ['Alcohol wipes', 10, 36],
  ['Adhesive dressing strips, 50-pack', 1, 36],
  ['Splinter probes, 5-pack', 2, 60],
  ['Tweezers 125 mm', 1, null],
  ['Antiseptic spray 50 ml', 1, 36],
  ['Non-adherent dressing 5 x 5 cm', 6, 60],
  ['Non-adherent dressing 7.5 x 10 cm', 3, 60],
  ['Non-adherent dressing 10 x 10 cm', 1, 60],
  ['Conforming bandage 5 cm', 3, null],
  ['Conforming bandage 7.5 cm', 3, null],
  ['Crepe bandage 10 cm', 1, null],
  ['Scissors 125 mm sharp/blunt', 1, null],
  ['Hypoallergenic tape 2.5 cm', 1, 36],
  ['Safety pins, 12-pack', 1, null],
  ['Wound dressing No. 13', 1, 60],
  ['Wound dressing No. 14', 1, 60],
  ['Wound dressing No. 15', 1, 60],
  ['Combine dressing 10 x 20 cm', 1, 60],
  ['Disposal bags, 3-pack', 1, null],
  ['Triangular bandage 110 cm', 2, null],
  ['Thermal blanket', 1, null],
  ['Eye pad, sterile', 4, 60],
  ['Burn gel sachet 3.5 ml', 5, 36],
  ['Instant ice pack', 1, 36],
  ['Basic dressing pack', 1, 60],
  ['First aid notes / instruction card', 1, null],
  ['Notebook and pen', 1, null],
];

const VEHICLE = [
  ['CPR face shield / key-ring mask', 1, null],
  ['Nitrile gloves, pairs', 3, 36],
  ['Gauze swabs 7.5 x 7.5 cm, 3-pack', 2, 60],
  ['Saline 15 ml steri-tube', 4, 36],
  ['Alcohol wipes', 6, 36],
  ['Adhesive dressing strips, 50-pack', 1, 36],
  ['Antiseptic wipes', 6, 36],
  ['Non-adherent dressing 7.5 x 10 cm', 2, 60],
  ['Conforming bandage 5 cm', 1, null],
  ['Conforming bandage 7.5 cm', 1, null],
  ['Scissors 125 mm sharp/blunt', 1, null],
  ['Tweezers 125 mm', 1, null],
  ['Hypoallergenic tape 2.5 cm', 1, 36],
  ['Wound dressing No. 14', 1, 60],
  ['Combine dressing 10 x 20 cm', 1, 60],
  ['Triangular bandage 110 cm', 1, null],
  ['Thermal blanket', 1, null],
  ['Eye pad, sterile', 2, 60],
  ['Burn gel sachet 3.5 ml', 3, 36],
  ['Disposal bag', 1, null],
  ['First aid notes / instruction card', 1, null],
];

// Add-on modules that bolt onto either profile.
const MODULES = {
  burns: [
    ['Burn dressing 10 x 10 cm (hydrogel)', 2, 36],
    ['Burn gel sachet 3.5 ml', 6, 36],
    ['Clingfilm roll (burns)', 1, null],
  ],
  eye: [
    ['Saline 15 ml steri-tube', 10, 36],
    ['Eye pad, sterile', 4, 60],
    ['Eyewash 500 ml bottle', 1, 24],
  ],
  remote: [
    ['Snake bite indicator bandage 10 cm x 4.5 m', 2, null],
    ['Splint, SAM style', 1, null],
    ['Emergency blanket', 1, null],
    ['Wound dressing No. 15', 1, 60],
    ['Combine dressing 20 x 20 cm', 2, 60],
    ['Tourniquet', 1, null],
  ],
  outdoor: [
    ['Sunscreen SPF 50+ 50 ml (TGA-listed brand)', 1, 24],
    ['Hydralyte sachets', 4, 24],
    ['Insect sting relief wipes', 4, 36],
  ],
};

const PROFILES = {
  site: { label: 'Site kit (Code of Practice, low-risk workplace)', items: SITE },
  vehicle: { label: 'Vehicle kit', items: VEHICLE },
};

function itemsFor(profile, modules = []) {
  const base = (PROFILES[profile] || PROFILES.site).items.slice();
  for (const m of modules) {
    if (MODULES[m]) base.push(...MODULES[m]);
  }
  // merge duplicates (e.g. saline in base and in the eye module)
  const merged = new Map();
  for (const [name, qty, shelf] of base) {
    const cur = merged.get(name);
    if (cur) cur.qty += qty; else merged.set(name, { name, qty, shelf });
  }
  return [...merged.values()];
}

module.exports = { PROFILES, MODULES, itemsFor };
