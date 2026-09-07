'use strict';
/* The HTML shell for anything the functions render: the course itself and the
   two failure pages. Same fonts, palette and radius as the rest of the site,
   inlined, because a function has no stylesheet to lean on. */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const css = `
@font-face{font-family:'Clash';src:url('/fonts/clash-display-var.woff2') format('woff2-variations');font-weight:200 700;font-display:swap}
@font-face{font-family:'Satoshi';src:url('/fonts/satoshi-var.woff2') format('woff2-variations');font-weight:300 900;font-display:swap}
@font-face{font-family:'Mono';src:url('/fonts/ibm-plex-mono-400.woff2') format('woff2');font-weight:400;font-display:swap}
:root{--ink:oklch(0.158 0.019 252);--ink-line:oklch(0.330 0.020 252);--bone:oklch(0.958 0.008 84);--bone-line:oklch(0.855 0.014 84);
--amber:oklch(0.760 0.155 58);--amber-deep:oklch(0.590 0.140 46);--fg:oklch(0.968 0.006 84);--fg-dim:oklch(0.800 0.012 84);--fg-mute:oklch(0.645 0.014 252);
--on-bone:oklch(0.205 0.018 252);--on-bone-dim:oklch(0.420 0.016 252);--on-bone-mute:oklch(0.545 0.014 252);
--display:'Clash','Segoe UI Semibold','Helvetica Neue',Arial,sans-serif;--body:'Satoshi','Segoe UI','Helvetica Neue',Arial,sans-serif;--mono:'Mono',ui-monospace,Consolas,monospace;
--gut:clamp(20px,5vw,80px)}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--fg);font-family:var(--body);font-size:clamp(1.06rem,1rem + .3vw,1.25rem);line-height:1.55;-webkit-font-smoothing:antialiased}
.wrap{max-width:1100px;margin-inline:auto;padding:clamp(64px,10vh,128px) var(--gut)}
h1,h2,h3{font-family:var(--display);font-weight:600;margin:0;line-height:.94;letter-spacing:-.026em;text-wrap:balance}
h1{font-size:clamp(2.4rem,1.6rem + 4vw,5.5rem)}h2{font-size:clamp(1.6rem,1.3rem + 1.3vw,2.75rem);line-height:.98}h3{font-size:clamp(1.2rem,1.1rem + .5vw,1.6rem);line-height:1.1;font-weight:500}
p{margin:0 0 1em;text-wrap:pretty}p:last-child{margin-bottom:0}
.tag{font-family:var(--mono);font-size:.6875rem;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin:0 0 16px}
.dim{color:var(--fg-dim)}.mute{color:var(--fg-mute);font-family:var(--mono);font-size:.85rem}
.link{color:var(--fg);text-decoration:none;font-family:var(--mono);font-size:.875rem;box-shadow:inset 0 -1px 0 0 var(--amber)}
.lesson{display:grid;gap:16px 48px;padding-block:48px;border-top:1px solid var(--ink-line)}
@media(min-width:56rem){.lesson{grid-template-columns:5rem minmax(0,1fr)}}
.lesson .n{font-family:var(--mono);font-size:.875rem;color:var(--amber);letter-spacing:.1em;padding-top:.4em}
.lesson .n small{display:block;color:var(--fg-mute);margin-top:8px;letter-spacing:.06em}
.video{aspect-ratio:16/9;background:oklch(0.205 0.021 252);border:1px solid var(--ink-line);margin:24px 0;display:grid;place-items:center;text-align:center;padding:24px}
.video iframe{width:100%;height:100%;border:0;display:block}
.donow{border-left:1px solid var(--amber);padding-left:20px;margin-top:24px;color:var(--fg-dim)}
.donow b{color:var(--fg)}
.bone{background:var(--bone);color:var(--on-bone)}
.bone .tag{color:var(--amber-deep)}.bone .dim{color:var(--on-bone-dim)}.bone .mute{color:var(--on-bone-mute)}
.check{margin-top:48px;border-top:1px solid var(--bone-line);padding-top:32px}
.check h3{margin:32px 0 12px}
.check ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.check li{position:relative;padding-left:32px;color:var(--on-bone-dim);line-height:1.55}
.check li::before{content:'';position:absolute;left:0;top:.62em;width:14px;height:1px;background:var(--amber-deep)}
@media print{.bone{background:#fff}.video,.nav{display:none}}
`;

function page(title, body, opts = {}) {
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>${css}</style></head><body>${opts.raw ? body : `<main class="wrap"><p class="tag">Brief the Machine</p><h1>${esc(title)}</h1><div class="dim" style="margin-top:32px;max-inline-size:50ch">${body}</div></main>`}</body></html>`;
}

module.exports = { page, esc };
