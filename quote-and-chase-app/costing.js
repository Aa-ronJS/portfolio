/* Quote & Chase: labour and paint behind each price. Set once; derives m² rates and shows a private cost/margin breakdown per quote. */
(function () {
  'use strict';
  // key: [hours per unit (prep + 2 coats), paint type, litres per unit, other $ per unit]
  var BASE = {
    p_walls: [0.21, 'walls', 0.143, 0], p_ceilings: [0.255, 'ceilings', 0.143, 0], p_skirting: [0.09, 'enamel', 0.03, 0], p_door: [1.0, 'enamel', 0.25, 0], p_door_one: [0.58, 'enamel', 0.13, 0],
    p_window: [0.7, 'enamel', 0.15, 0], p_wardrobe: [1.2, 'enamel', 0.4, 0], p_feature: [0.25, 'walls', 0.21, 0], p_wallpaper: [0.17, 'none', 0, 1.5], p_prep_mod: [0.75, 'none', 0, 0], p_prep_heavy: [0.9, 'none', 0, 3], p_sealer: [0.07, 'sealer', 0.08, 0],
    p_weatherboard: [0.39, 'exterior', 0.16, 0], p_render: [0.27, 'exterior', 0.2, 0], p_eaves: [0.17, 'exterior', 0.05, 0], p_gutters: [0.12, 'enamel', 0.04, 0], p_ext_door: [1.48, 'enamel', 0.35, 0], p_ext_window: [1.0, 'enamel', 0.25, 0],
    p_deck: [0.2, 'oil', 0.2, 0], p_fence: [0.15, 'exterior', 0.15, 0], p_pressure: [0.04, 'none', 0, 0.5], p_scaffold: [0, 'none', 0, 280]
  };
  var PAINT = { walls: 'Wall paint, low sheen', ceilings: 'Ceiling flat', enamel: 'Enamel, doors and trim', exterior: 'Exterior acrylic', sealer: 'Sealer / stain block', oil: 'Decking oil' };
  function defaults() { return { labour_rate: 65, margin_pct: 25, coats: 2, coverage_m2_per_l: 14, paint_price: { walls: 28, ceilings: 24, enamel: 45, exterior: 32, sealer: 22, oil: 30 }, hours_scale: 1 }; }
  function unitCost(key, c) {
    var b = BASE[key]; if (!b) return null; var hrs = b[0] * (parseFloat(c.hours_scale) || 1), litres = b[2], type = b[1];
    if (type === 'walls' || type === 'ceilings' || type === 'exterior' || type === 'sealer' || type === 'oil') { if (b[2] >= 0.1) litres = (parseFloat(c.coats) || 2) / (parseFloat(c.coverage_m2_per_l) || 14); }
    var paint$ = type === 'none' ? 0 : litres * (parseFloat((c.paint_price || {})[type]) || 0);
    var labour$ = hrs * (parseFloat(c.labour_rate) || 0), other$ = b[3];
    return { hours: hrs, litres: type === 'none' ? 0 : litres, paint_type: type, paint: paint$, labour: labour$, other: other$, cost: labour$ + paint$ + other$ };
  }
  function deriveRates(c) { var out = {}; Object.keys(BASE).forEach(function (k) { var u = unitCost(k, c); if (!u) return; var rate = u.cost * (1 + (parseFloat(c.margin_pct) || 0) / 100); out[k] = rate >= 20 ? Math.round(rate) : Math.round(rate * 2) / 2; }); return out; }
  // lines: priced quote lines with .key and .qty; returns hours, litres by type, $ labour, $ paint, $ other, cost, and margin against the quoted subtotal
  function breakdown(lines, c, subtotal) {
    var t = { hours: 0, labour: 0, paint: 0, other: 0, litres: {} };
    (lines || []).forEach(function (l) { if (!l.key) return; var u = unitCost(l.key, c); if (!u) return; var q = parseFloat(l.qty) || 0; t.hours += u.hours * q; t.labour += u.labour * q; t.paint += u.paint * q; t.other += u.other * q; if (u.litres) t.litres[u.paint_type] = (t.litres[u.paint_type] || 0) + u.litres * q; });
    t.cost = t.labour + t.paint + t.other; t.margin = (subtotal || 0) - t.cost; t.margin_pct = subtotal ? Math.round(100 * t.margin / subtotal) : 0; t.days = t.hours / 8;
    return t;
  }
  window.QCCosting = { BASE: BASE, PAINT: PAINT, defaults: defaults, unitCost: unitCost, deriveRates: deriveRates, breakdown: breakdown };
})();
