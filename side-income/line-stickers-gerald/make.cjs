// Draws the "Gerald the runaway gnome" LINE sticker pack as SVG and renders
// PNGs at LINE Creators Market sizes (stickers 370x320 max, main 240x240, tab 96x74).
const { chromium } = require('playwright');
const fs = require('fs');
const S = 'stroke="#2b2b2b" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
function gnome({ x = 185, y = 170, s = 1, rot = 0, eyes = 'dot', mouth = 'none', hat = '#d6322b', extra = '' }) {
  const E = {
    dot: '<circle cx="-9" cy="2" r="3.5" fill="#2b2b2b"/><circle cx="9" cy="2" r="3.5" fill="#2b2b2b"/>',
    angry: `<path d="M-15 -6 L-4 0 M15 -6 L4 0" ${S} fill="none"/><circle cx="-8" cy="4" r="3" fill="#2b2b2b"/><circle cx="8" cy="4" r="3" fill="#2b2b2b"/>`,
    closed: `<path d="M-14 2 Q-9 7 -4 2 M4 2 Q9 7 14 2" ${S} fill="none"/>`,
    wide: '<circle cx="-9" cy="1" r="7" fill="#fff" stroke="#2b2b2b" stroke-width="4"/><circle cx="9" cy="1" r="7" fill="#fff" stroke="#2b2b2b" stroke-width="4"/><circle cx="-9" cy="2" r="2.5" fill="#2b2b2b"/><circle cx="9" cy="2" r="2.5" fill="#2b2b2b"/>',
    shades: `<rect x="-20" y="-4" width="17" height="10" rx="3" fill="#2b2b2b"/><rect x="3" y="-4" width="17" height="10" rx="3" fill="#2b2b2b"/><path d="M-3 0 L3 0" ${S}/>`,
  }[eyes];
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <rect x="-24" y="38" width="48" height="40" rx="10" fill="#2e5fa8" ${S}/>
    <path d="M-22 10 Q0 75 22 10 Q0 22 -22 10Z" fill="#fff" ${S}/>
    <circle cx="0" cy="0" r="22" fill="#f6c9a4" ${S}/>
    ${E}
    <path d="M0 -95 L-34 -14 L34 -14Z" fill="${hat}" ${S}/>
    ${extra}
  </g>`;
}
function label(t, size = 44, y = 300) {
  return `<text x="185" y="${y}" text-anchor="middle" font-family="Caveat" font-weight="700" font-size="${size}"
    fill="#2b2b2b" stroke="#fff" stroke-width="9" paint-order="stroke">${t}</text>`;
}
const stickers = [
  ['i-have-left', gnome({ rot: -4, eyes: 'closed' }) + `<path d="M255 70 l40 -10 l-6 30 z" fill="#fff" ${S}/><path d="M257 80 L218 215" ${S}/>` + label('I have left.')],
  ['do-not-look', gnome({ eyes: 'angry' }) + label('Do not look for me', 40)],
  ['justice', gnome({ eyes: 'shades', rot: 6 }) + label('I rode for JUSTICE', 40)],
  ['kevin', gnome({ x: 130, eyes: 'angry' }) + `<g transform="translate(270 150)" ${S} fill="#a0673a"><path d="M20 90 Q70 110 85 70" fill="none" stroke-width="10"/><path d="M20 90 Q70 110 85 70" fill="none" stroke="#a0673a" stroke-width="4"/><ellipse cx="5" cy="50" rx="30" ry="48"/><path d="M-20 90 L-45 100 L-10 100Z M10 92 L-5 104 L30 104Z"/><path d="M-15 -42 L-22 -95 L-2 -45Z M2 -40 L8 -92 L16 -40Z"/><ellipse cx="-10" cy="-22" rx="20" ry="24"/><ellipse cx="-30" cy="-12" rx="10" ry="8"/><circle cx="-14" cy="-26" r="3" fill="#2b2b2b"/><path d="M-20 40 L-40 25" fill="none"/></g>` + label('KEVIN.', 52)],
  ['water-the-ferns', gnome({ x: 140, eyes: 'dot' }) + `<g transform="translate(275 150)" ${S}><path d="M-25 30 L25 30 L18 70 L-18 70Z" fill="#c9733b"/><path d="M0 30 Q-30 -10 -40 -30 M0 30 Q0 -20 5 -45 M0 30 Q30 -5 40 -25" fill="none" stroke="#3d8b3d"/></g>` + label('Water the ferns', 44)],
  ['ooh-la-la', gnome({ eyes: 'closed', hat: '#2b2b2b' }) + `<rect x="200" y="140" width="110" height="18" rx="9" fill="#e3b46b" ${S} transform="rotate(-25 200 140)"/>` + label('ooh la la', 50)],
  ['home', gnome({ eyes: 'wide' }) + `<path d="M60 110 l20 -20 M300 110 l-20 -20 M70 60 l10 10 M300 60 l-10 10" ${S}/>` + label("I'm home. Don't ask.", 38)],
  ['it-was-the-birdbath', gnome({ x: 130, eyes: 'angry' }) + `<g transform="translate(275 210)" ${S} fill="#cfd8dc"><path d="M-45 -10 Q0 25 45 -10Z"/><rect x="-10" y="5" width="20" height="55"/><rect x="-28" y="58" width="56" height="12"/></g>` + label('It was the birdbath', 40)],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  const font = '<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap" rel="stylesheet"><style>body{margin:0;background:transparent}</style>';
  async function shot(svg, w, h, file) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`${font}<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 370 320">${svg}</svg>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }
  for (const [i, [name, svg]] of stickers.entries()) await shot(svg, 370, 320, `out/${String(i + 1).padStart(2, '0')}.png`);
  await shot(stickers[0][1], 240, 208, 'out/main-raw.png');
  await shot(gnome({ eyes: 'closed' }), 96, 83, 'out/tab-raw.png');
  // contact sheet for review
  await p.setViewportSize({ width: 1500, height: 680 });
  await p.setContent(`${font}<body style="background:#e9e4d8;display:flex;flex-wrap:wrap;gap:4px;padding:4px">` +
    stickers.map(([, s]) => `<svg width="370" height="320" viewBox="0 0 370 320" style="background:#fff">${s}</svg>`).join('') + '</body>');
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: 'sheet.png' });
  await b.close();
})();
