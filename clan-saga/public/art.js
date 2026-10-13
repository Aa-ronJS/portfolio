/*
  The living diorama: each chapter's landscape drawn as SVG, with the
  clan standing in it. One figure per person, children smaller, the hurt
  and sick sitting down, fire once the clan has it, and the light of the
  season. Nothing here is an image file.
*/
(function (root) {
  'use strict';
  var W = 1600, H = 560, GROUND = 470;

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function mix(a, b, t) {
    var pa = hex(a), pb = hex(b);
    return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(pa[i] + (pb[i] - pa[i]) * t).toString(16)).slice(-2); }).join('');
  }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }

  // Season light: sky top, sky bottom, land tint.
  var LIGHT = {
    Spring: { top: '#9fb7a6', low: '#e3d6b0', land: '#5d6b45', haze: 0.55 },
    Summer: { top: '#c9a86a', low: '#efd59a', land: '#6e6436', haze: 0.5 },
    Autumn: { top: '#b0785a', low: '#e7b27c', land: '#6c4a2c', haze: 0.5 },
    Winter: { top: '#8c97a3', low: '#d4d2c8', land: '#5b5a55', haze: 0.6 }
  };
  var CHAPTER_TINT = {
    forest: { land: '#3f5a36', far: '#6f8a6a' },
    open: { land: '#8a7340', far: '#a89a72' },
    fire: { land: '#5e5140', far: '#8a8174' },
    ice: { land: '#d8d9d2', far: '#b9bfc2' },
    village: { land: '#7b6a3e', far: '#a29673' },
    copper: { land: '#6d5a42', far: '#8f8370' },
    wheel: { land: '#9a8156', far: '#b9a57c' }
  };

  function ridge(r, y, amp, freq, rough) {
    var pts = [], phase = r() * 10, phase2 = r() * 10;
    for (var x = 0; x <= W; x += 20) {
      var v = Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase2) * amp * 0.35 + (r() - 0.5) * rough;
      pts.push(x + ',' + (y - v).toFixed(1));
    }
    return 'M0,' + H + ' L' + pts.join(' L') + ' L' + W + ',' + H + ' Z';
  }

  // ----- figures -----
  function human(x, h, c, sitting) {
    var y = GROUND;
    if (sitting) {
      return '<g fill="' + c + '"><circle cx="' + x + '" cy="' + (y - h * 0.62) + '" r="' + (h * 0.1) + '"/>' +
        '<path d="M' + (x - h * 0.13) + ',' + (y - h * 0.5) + ' Q' + x + ',' + (y - h * 0.58) + ' ' + (x + h * 0.13) + ',' + (y - h * 0.5) + ' L' + (x + h * 0.3) + ',' + y + ' L' + (x - h * 0.22) + ',' + y + ' Z"/></g>';
    }
    return '<g fill="' + c + '"><circle cx="' + x + '" cy="' + (y - h * 0.9) + '" r="' + (h * 0.09) + '"/>' +
      '<path d="M' + (x - h * 0.12) + ',' + (y - h * 0.76) + ' Q' + x + ',' + (y - h * 0.82) + ' ' + (x + h * 0.12) + ',' + (y - h * 0.76) + ' L' + (x + h * 0.1) + ',' + (y - h * 0.42) +
      ' L' + (x + h * 0.11) + ',' + y + ' L' + (x + h * 0.03) + ',' + y + ' L' + x + ',' + (y - h * 0.38) + ' L' + (x - h * 0.03) + ',' + y + ' L' + (x - h * 0.11) + ',' + y + ' L' + (x - h * 0.1) + ',' + (y - h * 0.42) + ' Z"/></g>';
  }
  function ape(x, h, c, sitting, flip) {
    var y = GROUND, d = flip ? -1 : 1;
    if (sitting) {
      return '<g fill="' + c + '"><ellipse cx="' + x + '" cy="' + (y - h * 0.3) + '" rx="' + (h * 0.26) + '" ry="' + (h * 0.32) + '"/><circle cx="' + (x + d * h * 0.08) + '" cy="' + (y - h * 0.66) + '" r="' + (h * 0.14) + '"/></g>';
    }
    return '<g fill="' + c + '"><path d="M' + (x - d * h * 0.4) + ',' + (y - h * 0.35) + ' Q' + x + ',' + (y - h * 0.82) + ' ' + (x + d * h * 0.35) + ',' + (y - h * 0.55) +
      ' L' + (x + d * h * 0.38) + ',' + y + ' L' + (x + d * h * 0.28) + ',' + y + ' L' + (x + d * h * 0.18) + ',' + (y - h * 0.3) + ' L' + (x - d * h * 0.25) + ',' + (y - h * 0.25) + ' L' + (x - d * h * 0.3) + ',' + y + ' L' + (x - d * h * 0.4) + ',' + y + ' Z"/>' +
      '<circle cx="' + (x + d * h * 0.42) + '" cy="' + (y - h * 0.6) + '" r="' + (h * 0.14) + '"/></g>';
  }

  // ----- props -----
  function figTree(x, c) {
    return '<g fill="' + c + '"><path d="M' + (x - 70) + ',' + GROUND + ' C' + (x - 40) + ',' + (GROUND - 60) + ' ' + (x - 30) + ',' + (GROUND - 160) + ' ' + (x - 24) + ',' + (GROUND - 300) + ' L' + (x + 24) + ',' + (GROUND - 300) + ' C' + (x + 30) + ',' + (GROUND - 160) + ' ' + (x + 50) + ',' + (GROUND - 60) + ' ' + (x + 90) + ',' + GROUND + ' Z"/>' +
      [[-160, -330, 150, 80], [0, -380, 190, 95], [150, -330, 150, 80], [-60, -300, 130, 60], [80, -290, 120, 60]].map(function (b) { return '<ellipse cx="' + (x + b[0]) + '" cy="' + (GROUND + b[1]) + '" rx="' + b[2] + '" ry="' + b[3] + '"/>'; }).join('') +
      '<path d="M' + (x - 120) + ',' + (GROUND - 290) + ' q6,80 -4,170 M' + (x + 110) + ',' + (GROUND - 300) + ' q-8,90 4,190" stroke="' + c + '" stroke-width="3" fill="none"/></g>';
  }
  function mound(x, c) { return '<path fill="' + c + '" d="M' + (x - 34) + ',' + GROUND + ' Q' + (x - 22) + ',' + (GROUND - 60) + ' ' + (x - 6) + ',' + (GROUND - 92) + ' Q' + x + ',' + (GROUND - 100) + ' ' + (x + 6) + ',' + (GROUND - 88) + ' Q' + (x + 22) + ',' + (GROUND - 56) + ' ' + (x + 36) + ',' + GROUND + ' Z"/>'; }
  function acacia(x, y, s, c) {
    return '<g fill="' + c + '"><path d="M' + (x - 4 * s) + ',' + y + ' L' + (x - 2 * s) + ',' + (y - 60 * s) + ' L' + (x - 30 * s) + ',' + (y - 90 * s) + ' L' + (x - 26 * s) + ',' + (y - 92 * s) + ' L' + x + ',' + (y - 68 * s) + ' L' + (x + 26 * s) + ',' + (y - 94 * s) + ' L' + (x + 30 * s) + ',' + (y - 91 * s) + ' L' + (x + 3 * s) + ',' + (y - 60 * s) + ' L' + (x + 5 * s) + ',' + y + ' Z"/>' +
      '<ellipse cx="' + x + '" cy="' + (y - 98 * s) + '" rx="' + (80 * s) + '" ry="' + (14 * s) + '"/></g>';
  }
  function pine(x, y, s, c) { return '<path fill="' + c + '" d="M' + x + ',' + (y - 120 * s) + ' L' + (x + 22 * s) + ',' + (y - 50 * s) + ' L' + (x + 12 * s) + ',' + (y - 50 * s) + ' L' + (x + 30 * s) + ',' + y + ' L' + (x - 30 * s) + ',' + y + ' L' + (x - 12 * s) + ',' + (y - 50 * s) + ' L' + (x - 22 * s) + ',' + (y - 50 * s) + ' Z"/>'; }
  function deadTree(x, y, c) { return '<path stroke="' + c + '" stroke-width="5" fill="none" stroke-linecap="round" d="M' + x + ',' + y + ' L' + x + ',' + (y - 80) + ' L' + (x - 22) + ',' + (y - 110) + ' M' + x + ',' + (y - 60) + ' L' + (x + 26) + ',' + (y - 92) + ' M' + (x + 14) + ',' + (y - 78) + ' L' + (x + 30) + ',' + (y - 76) + '"/>'; }
  function mammoth(x, y, s, c) {
    return '<g fill="' + c + '"><path d="M' + x + ',' + y + ' l0,-' + (24 * s) + ' q' + (2 * s) + ',-' + (26 * s) + ' ' + (26 * s) + ',-' + (30 * s) + ' q' + (30 * s) + ',-' + (2 * s) + ' ' + (40 * s) + ',' + (18 * s) + ' q' + (10 * s) + ',' + (10 * s) + ' ' + (6 * s) + ',' + (36 * s) + ' l-' + (8 * s) + ',0 l0,-' + (16 * s) + ' l-' + (40 * s) + ',0 l0,' + (16 * s) + ' Z"/>' +
      '<path d="M' + x + ',' + (y - 30 * s) + ' q-' + (8 * s) + ',' + (14 * s) + ' -' + (4 * s) + ',' + (30 * s) + '" stroke="' + c + '" stroke-width="' + (4 * s) + '" fill="none"/></g>';
  }
  function roundHouse(x, y, s, c, door) {
    return '<g><path fill="' + c + '" d="M' + (x - 50 * s) + ',' + y + ' L' + (x - 50 * s) + ',' + (y - 34 * s) + ' Q' + x + ',' + (y - 100 * s) + ' ' + (x + 50 * s) + ',' + (y - 34 * s) + ' L' + (x + 50 * s) + ',' + y + ' Z"/>' +
      '<path fill="' + door + '" d="M' + (x - 9 * s) + ',' + y + ' L' + (x - 9 * s) + ',' + (y - 22 * s) + ' Q' + x + ',' + (y - 30 * s) + ' ' + (x + 9 * s) + ',' + (y - 22 * s) + ' L' + (x + 9 * s) + ',' + y + ' Z"/></g>';
  }
  function furnace(x, y, c, glow) {
    return '<g><path fill="' + c + '" d="M' + (x - 34) + ',' + y + ' Q' + (x - 30) + ',' + (y - 80) + ' ' + x + ',' + (y - 86) + ' Q' + (x + 30) + ',' + (y - 80) + ' ' + (x + 34) + ',' + y + ' Z"/>' +
      '<ellipse cx="' + x + '" cy="' + (y - 14) + '" rx="12" ry="10" fill="' + glow + '"/></g>';
  }
  function temple(x, y, c) {
    return '<g fill="' + c + '"><rect x="' + (x - 140) + '" y="' + (y - 40) + '" width="280" height="40"/><rect x="' + (x - 100) + '" y="' + (y - 75) + '" width="200" height="36"/><rect x="' + (x - 60) + '" y="' + (y - 106) + '" width="120" height="32"/><rect x="' + (x - 26) + '" y="' + (y - 130) + '" width="52" height="26"/></g>';
  }
  function sledge(x, c, wheel) {
    var y = GROUND;
    var s = '<g fill="' + c + '"><rect x="' + (x - 60) + '" y="' + (y - 64) + '" width="80" height="44"/><rect x="' + (x - 76) + '" y="' + (y - 22) + '" width="118" height="8"/>';
    if (wheel) s += '<circle cx="' + (x - 50) + '" cy="' + (y - 14) + '" r="15"/><circle cx="' + (x + 18) + '" cy="' + (y - 14) + '" r="15"/>';
    else s += '<path d="M' + (x - 82) + ',' + (y - 14) + ' L' + (x + 48) + ',' + (y - 14) + ' L' + (x + 60) + ',' + (y - 4) + ' L' + (x - 82) + ',' + (y - 4) + ' Z"/>';
    return s + '<path d="M' + (x + 42) + ',' + (y - 18) + ' L' + (x + 140) + ',' + (y - 40) + '" stroke="' + c + '" stroke-width="3"/></g>';
  }
  function fire(x, ochre) {
    var y = GROUND;
    return '<g><ellipse cx="' + x + '" cy="' + (y - 6) + '" rx="90" ry="34" fill="url(#fireglow)"/>' +
      '<path fill="' + ochre + '" d="M' + (x - 14) + ',' + y + ' Q' + (x - 18) + ',' + (y - 20) + ' ' + (x - 4) + ',' + (y - 36) + ' Q' + (x - 2) + ',' + (y - 22) + ' ' + (x + 4) + ',' + (y - 20) + ' Q' + (x + 10) + ',' + (y - 34) + ' ' + (x + 6) + ',' + (y - 46) + ' Q' + (x + 22) + ',' + (y - 26) + ' ' + (x + 14) + ',' + y + ' Z"/>' +
      '<path fill="#f3d27a" d="M' + (x - 5) + ',' + y + ' Q' + (x - 6) + ',' + (y - 12) + ' ' + (x + 2) + ',' + (y - 20) + ' Q' + (x + 8) + ',' + (y - 10) + ' ' + (x + 5) + ',' + y + ' Z"/></g>';
  }

  function scene(state, Sim) {
    var ch = Sim.chapterOf(state);
    var season = Sim.seasonName(state);
    var light = LIGHT[season];
    var tint = CHAPTER_TINT[ch.id];
    var r = rng(state.seed + state.chapter * 977);
    var cold = ch.id === 'ice' || (season === 'Winter' && ch.cold > 0);
    var land = cold ? mix(tint.land, '#e8e8e2', ch.id === 'ice' ? 0.15 : 0.55) : mix(tint.land, light.land, 0.35);
    var far = mix(tint.far, light.low, light.haze);
    var mid = mix(land, far, 0.45);
    var dark = mix(land, '#1d1712', 0.72);
    var silhouette = '#20170f';
    var ochre = '#d0743c';
    var tags = Sim.activeTags(state);
    var out = [];

    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(sceneLabel(state, Sim)) + '">');
    out.push('<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + light.top + '"/><stop offset="1" stop-color="' + light.low + '"/></linearGradient>' +
      '<radialGradient id="fireglow"><stop offset="0" stop-color="#f0a050" stop-opacity="0.55"/><stop offset="1" stop-color="#f0a050" stop-opacity="0"/></radialGradient>' +
      '<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0 0.06  0 0 0 0.5 0"/></filter></defs>');
    out.push('<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>');
    if (season === 'Winter' || ch.id === 'ice') out.push('<circle cx="1260" cy="110" r="38" fill="#eeeae0" opacity="0.6"/>');
    else out.push('<circle cx="1260" cy="120" r="44" fill="#f6e3b0" opacity="0.75"/>');

    // Far and middle land.
    out.push('<path fill="' + far + '" d="' + ridge(r, ch.id === 'fire' || ch.id === 'copper' ? 300 : 340, ch.id === 'open' || ch.id === 'ice' || ch.id === 'wheel' ? 10 : 46, 0.004, 4) + '"/>');

    // Chapter set pieces, far to near.
    if (ch.id === 'forest') {
      for (var i = 0; i < 9; i++) out.push('<ellipse cx="' + (i * 190 + r() * 60) + '" cy="' + (330 + r() * 30) + '" rx="' + (110 + r() * 50) + '" ry="' + (70 + r() * 30) + '" fill="' + mix(far, mid, 0.5) + '"/>');
    }
    if (ch.id === 'open') {
      out.push('<rect x="0" y="360" width="' + W + '" height="16" fill="' + mix(far, '#c9d3c8', 0.5) + '" opacity="0.7"/>');
      [[260, 392, 0.8], [700, 386, 0.55], [1100, 395, 1.0], [1420, 388, 0.6]].forEach(function (a) { out.push(acacia(a[0], a[1], a[2], mix(mid, dark, 0.4))); });
    }
    if (ch.id === 'ice') {
      [[900, 380, 0.9], [990, 384, 1.1], [1060, 382, 0.8]].forEach(function (m) { out.push(mammoth(m[0], m[1], m[2], mix(far, dark, 0.55))); });
    }
    if (ch.id === 'wheel') out.push(temple(1200, 390, mix(far, dark, 0.35)));
    out.push('<path fill="' + mid + '" d="' + ridge(r, 400, ch.id === 'fire' || ch.id === 'copper' ? 40 : 14, 0.006, 3) + '"/>');
    if (ch.id === 'fire') {
      out.push('<path fill="' + mix(mid, dark, 0.5) + '" d="M980,470 L1040,300 L1160,250 L1290,320 L1360,470 Z"/><path fill="#140e09" d="M1110,470 Q1112,390 1160,380 Q1208,390 1210,470 Z"/>');
      out.push(deadTree(1180, 255, mix(mid, dark, 0.7)));
      if (state.opportunity && state.opportunity.kind === 'fire') out.push('<path fill="' + ochre + '" opacity="0.9" d="M1160,250 q-10,-30 8,-58 q4,22 12,24 q6,-20 0,-40 q30,34 10,74 Z"/>');
    }
    if (ch.id === 'copper') {
      out.push('<path fill="' + mix(mid, dark, 0.45) + '" d="M900,470 L980,330 L1120,300 L1250,360 L1300,470 Z"/><path stroke="#5f8f6a" stroke-width="5" opacity="0.8" fill="none" d="M1010,360 l40,20 M1060,330 l50,30 M1150,350 l40,18"/>');
      out.push(furnace(1420, GROUND, mix(land, dark, 0.6), tags.copper ? '#f0a050' : '#c9653a'));
    }
    if (ch.id === 'village') {
      out.push('<g opacity="0.85">' + [0, 1, 2, 3, 4].map(function (i) { return '<rect x="' + (60 + i * 120) + '" y="' + (420 + i % 2 * 8) + '" width="110" height="14" fill="' + mix(mid, '#c8a95a', 0.5) + '"/>'; }).join('') + '</g>');
      [[1250, 455, 0.9], [1350, 450, 1.0], [1450, 458, 0.8], [1545, 452, 0.9]].forEach(function (h) { out.push(roundHouse(h[0], h[1], h[2], mix(land, '#9a7350', 0.5), '#1d1510')); });
    }

    // Near ground.
    out.push('<path fill="' + land + '" d="M0,' + (GROUND - 6) + ' Q400,' + (GROUND - 14) + ' 800,' + (GROUND - 4) + ' T1600,' + (GROUND - 8) + ' L1600,560 L0,560 Z"/>');
    if (ch.id === 'forest') { out.push(figTree(1330, mix(dark, silhouette, 0.4))); out.push(mound(1480, mix(dark, '#5a3a22', 0.35))); }
    if (ch.id === 'ice' || ch.id === 'fire') { [[120, 0.9], [210, 1.2], [1500, 1.1]].forEach(function (p) { out.push(pine(p[0], GROUND, p[1], mix(dark, silhouette, 0.3))); }); }
    if (ch.id === 'open') out.push(acacia(1350, GROUND, 1.6, mix(dark, silhouette, 0.3)));
    if (ch.id === 'wheel') out.push(sledge(1330, mix(dark, silhouette, 0.35), !!tags.wheel));

    // The clan.
    var people = state.members.slice().sort(function (a, b) { return b.age - a.age; });
    var n = people.length;
    var span = Math.min(560, 60 + n * 46);
    var startX = 900 - span / 2;
    var isApe = ch.id === 'forest';
    var fireX = startX + span / 2 - 30;
    if (tags.fire) out.push(fire(fireX, ochre));
    people.forEach(function (m, i) {
      var x = startX + (n > 1 ? (span / (n - 1 || 1)) * i : span / 2);
      if (tags.fire && Math.abs(x - fireX) < 34) x += 54;
      var adult = Sim.isAdult(state, m);
      var h = adult ? 74 : Math.max(30, 28 + m.age * 4);
      var sitting = m.state !== 'well';
      out.push(isApe ? ape(x, h * 0.85, silhouette, sitting, i % 2 === 1) : human(x, h, silhouette, sitting));
    });

    out.push('<rect width="' + W + '" height="' + H + '" filter="url(#grain)" opacity="0.5"/>');
    out.push('</svg>');
    return out.join('');
  }

  function sceneLabel(state, Sim) {
    var ch = Sim.chapterOf(state);
    return ch.title + ' in ' + Sim.seasonName(state).toLowerCase() + ': the clan of ' + state.members.length + (Sim.knowsTag(state, 'fire') ? ', gathered by their fire.' : '.');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  root.Art = { scene: scene };
})(typeof self !== 'undefined' ? self : this);
