// The running C. One drawing, three uses: the rounded icon, the full-bleed maskable icon, the small mark.
exports.art = function (fg) {
  return '<g fill="none" stroke="' + fg + '" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M351.4 138.6 A118 118 0 1 0 351.4 305.4" stroke-width="66"/>' +               // the C, open to the front
    '<path d="M282 352 L338 394 L316 452 L352 456" stroke-width="30"/>' +                   // front leg, reaching
    '<path d="M250 352 L208 400 L152 384" stroke-width="30"/>' +                            // back leg, kicked up
    '<path d="M56 176 H112 M30 226 H104 M62 276 H112" stroke-width="22" opacity=".75"/>' +  // speed
    '</g>';
};
exports.icon = function (o) {
  o = o || {}; var bg = o.bg || '#2468C8', fg = o.fg || '#fff', s = o.scale || 1, round = o.round == null ? 112 : o.round;
  // the C itself sits dead centre (its own box: x 117-384, y 71-373); the legs and speed lines hang off it
  var cx = 256, cy = 256, bx = 250.5, by = 222;
  var t = 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-bx) + ' ' + (-by) + ')';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' + (bg !== 'none' ? '<rect width="512" height="512" rx="' + round + '" fill="' + bg + '"/>' : '') + '<g transform="' + t + '">' + exports.art(fg) + '</g></svg>';
};
