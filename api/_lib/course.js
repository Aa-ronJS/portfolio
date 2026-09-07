'use strict';
/* The course, as data. The watch page renders this. Video URLs are empty until
   each one is recorded; the page says so honestly rather than embedding
   nothing. Paste the unlisted YouTube or Loom embed URL into `embed` and
   redeploy; buyers' links do not change. */

const title = 'Make It Move';

const lessons = [
  {
    n: '01', minutes: 8,
    title: 'The plate.',
    embed: '',
    summary: 'A full-bleed photograph that scrolls at a different rate to the type over it, so the page has depth. Built with a scroll-driven CSS animation that runs off the main thread, so it cannot make the page stutter, and wrapped so that where the browser cannot do it, or the reader has turned motion off, it is a still photograph, which is the composition anyway.',
    doNow: 'Put one plate on your own page. One. Pick a photograph that is dark enough to carry type, add the veil, and scroll it at 360 wide and 1400 wide before you do anything else.',
  },
  {
    n: '02', minutes: 8,
    title: 'Arrival.',
    embed: '',
    summary: 'Things that arrive rather than simply being there: sections that rise into place as you reach them, staggered by a custom property, an amber hairline that draws itself across the page, and a number that counts up to a real figure held in the markup. One IntersectionObserver, about twenty lines.',
    doNow: 'Add the rise class to every section heading on your page and one hairline. Then put a real number in a data-count attribute. If you do not have a real number, do not fake one; use a different effect.',
  },
  {
    n: '03', minutes: 6,
    title: 'Depth, and switching it off.',
    embed: '',
    summary: 'The card that tilts toward the pointer, capped at six degrees and flat on touch. The marquee that pauses when you hover it. Then the rule that makes the whole thing acceptable: every moving part has a branch for people who prefer reduced motion, and three defects I only found by looking at the rendered page rather than the code.',
    doNow: 'Turn on reduce motion in your operating system and load your page. Everything must still be visible and everything must still make sense. Then run checklist two, slowly, once.',
  },
];

const checklists = [
  {
    n: 'Checklist 01',
    title: 'Before anything moves',
    intro: 'Answer these before you add a single animation. An effect added without them is decoration; an effect added with them is a design decision.',
    sections: [
      { h: 'What is the one move', items: [
        'Name the one effect the page is about. Everything else supports it or is cut.',
        'Name the reference: one real site, one move taken from it, not the whole site.',
        'What is the degraded tier? Describe the page with every animation off. It must still be the same composition.',
      ]},
      { h: 'The rules that keep it from looking generated', items: [
        'One accent hue, and it is the colour of every moving thing: hairlines, numbers, the button.',
        'One radius value on the whole page.',
        'No state change longer than 640 milliseconds. Reveals may take longer; hovers may not.',
        'Tilt never more than 6 degrees. Past that it reads as a gimmick.',
        'Nothing moves on its own except the marquee, and the marquee pauses on hover.',
      ]},
      { h: 'The photography', items: [
        'One colour grade across every image. A plate from a different grade looks like a stock photo, because it is.',
        'Dark enough under the veil to carry white type at the smallest width.',
        'No text in the image. The type is the type.',
        'Never the same photograph twice on one screen. Once as a plate and once as a card reads as a mistake.',
      ]},
      { h: 'What must stay true', items: [
        'Every number that counts up is a real number, and the final value lives in the markup, not the script.',
        'The hero animates on load, not on scroll, because it is already on screen.',
        'Every effect has a reduced-motion branch that resolves to its final state, not to nothing.',
        'The page works with JavaScript off: visible, readable, static.',
      ]},
    ],
  },
  {
    n: 'Checklist 02',
    title: 'Look at the render, not the code',
    intro: 'Run this in a browser, at 360, 414, 834 and 1424 wide, before you call it finished. Every defect I have shipped was invisible in the markup and obvious on the screen.',
    sections: [
      { h: 'Does everything arrive', items: [
        'Scroll the whole page slowly. Is anything still at opacity zero? A revealed element whose observer never fires is the most common defect there is.',
        'Reload at the top. Does the hero call to action appear without scrolling?',
        'Jump straight to the bottom with the End key. Did the middle sections reveal, or did you skip past their trigger?',
      ]},
      { h: 'Does the page hold', items: [
        'No horizontal scrollbar at any width. Check the marquee and the plates especially; both are wider than the viewport by design.',
        'Every image the shape you meant. A height attribute plus an aspect ratio without height auto renders portrait.',
        'No link or button under 24 pixels tall. Hairline links need padding.',
        'The display face at hero size: do any letter pairs collide? Tracking that is right at 24 pixels is wrong at 160.',
      ]},
      { h: 'Does it switch off', items: [
        'Reduce motion on: everything visible, nothing moving except what the reader started, counters at their final numbers.',
        'Touch device or emulation: the tilt card is flat and the hover states are not stuck on.',
        'A browser without scroll-driven animation support: the plate is a still photograph and the page is otherwise identical.',
        'JavaScript off: the page reads top to bottom with nothing missing.',
      ]},
      { h: 'Does it cost anything', items: [
        'Open the performance panel and scroll. The plate animation should not appear on the main thread at all.',
        'Fonts preloaded, metric-matched fallbacks set, so the swap moves nothing.',
        'Images sized in the markup so nothing jumps when they load.',
        'Total page under a few hundred kilobytes without the photographs. There is no library to blame.',
      ]},
    ],
  },
];

/* The starter file: only the motion, generalised, from the page the course is
   taught on. Buyers paste this into any site. The full page it came from is
   public under MIT; this is the part that is only the moving bits. */
const starter = {
  css: `/* motion.css: five effects, no library. Pair with motion.js. */

/* 1. Parallax plate. A full-bleed photograph behind a section, scrolling at a
   different rate to the content. Off the main thread. Static where unsupported. */
.plate{position:relative; overflow:clip; isolation:isolate}
.plate__media{position:absolute; inset:-14% 0; z-index:-2}
.plate__media img{width:100%; height:100%; object-fit:cover}
.plate__veil{position:absolute; inset:0; z-index:-1;
  background:linear-gradient(to right, rgb(18 24 31 / .96), rgb(18 24 31 / .55)),
             linear-gradient(to bottom, rgb(18 24 31 / .9), transparent 26%, transparent 66%, rgb(18 24 31 / .94))}
@supports (animation-timeline: view()){
  @media (prefers-reduced-motion: no-preference){
    .plate__media{animation:drift linear both; animation-timeline:view(); animation-range:cover 0% cover 100%}
    @keyframes drift{from{transform:translate3d(0,-7%,0) scale(1.05)} to{transform:translate3d(0,7%,0) scale(1.05)}}
  }
}

/* 2. Arrival. Add .rise to anything that should arrive; --d staggers it.
   .wipe is the hairline that draws itself; .wipe-y the vertical one. */
@media (prefers-reduced-motion: no-preference){
  .rise{opacity:0; transform:translate3d(0,28px,0)}
  .rise.in{opacity:1; transform:none; transition:opacity 640ms cubic-bezier(.16,1,.3,1) var(--d,0ms), transform 640ms cubic-bezier(.16,1,.3,1) var(--d,0ms)}
  .wipe{transform:scaleX(0); transform-origin:left}
  .wipe.in{transform:scaleX(1); transition:transform 900ms cubic-bezier(.16,1,.3,1) var(--d,0ms)}
  .wipe-y{transform:scaleY(0); transform-origin:top}
  .wipe-y.in{transform:scaleY(1); transition:transform 1000ms cubic-bezier(.16,1,.3,1) var(--d,0ms)}
}
.rule{height:1px; background:var(--accent, currentColor); border:0; margin:0}

/* 3. Count-up. The real number lives in data-count; the script only animates
   toward it. Tabular figures so the width does not jitter. */
[data-count]{font-variant-numeric:tabular-nums}

/* 4. Tilt. Capped at 6 degrees by the script. Flat on touch and reduced motion. */
.tilt{transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition:transform 480ms cubic-bezier(.22,1,.36,1)}
@media (hover:hover) and (pointer:fine) and (prefers-reduced-motion: no-preference){.tilt{transition:transform 200ms cubic-bezier(.22,1,.36,1)}}
@media (hover:none),(pointer:coarse),(prefers-reduced-motion: reduce){.tilt{transform:none !important}}

/* 5. Marquee. Duplicate the row's contents once in the markup; the animation
   travels exactly half. Pauses on hover. */
.marq{overflow:hidden; --gap:48px}
.marq__row{display:flex; gap:var(--gap); width:max-content}
@media (prefers-reduced-motion: no-preference){
  .marq__row{animation:slide 52s linear infinite}
  .marq:hover .marq__row{animation-play-state:paused}
  @keyframes slide{to{transform:translateX(calc(-50% - (var(--gap) / 2)))}}
}

/* The rule that makes all of it acceptable. */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:1ms !important; animation-iteration-count:1 !important; transition-duration:1ms !important}
}`,
  js: `/* motion.js: reveal, count-up, tilt. No dependencies. */
(function () {
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal. Anything already on screen (the hero) animates on load; the rest
     waits for a scroll. Put the hero inside <header>. */
  var hero = document.querySelectorAll('header .rise, header .wipe, header .wipe-y');
  var rest = document.querySelectorAll('section .rise, section .wipe, section .wipe-y, footer .rise, footer .wipe');
  requestAnimationFrame(function () { hero.forEach(function (el) { el.classList.add('in'); }); });
  if (reduced || !('IntersectionObserver' in window)) {
    rest.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    rest.forEach(function (el) { io.observe(el); });
  }

  /* Count-up. Real numbers only; the final value lives in the markup. */
  var counters = document.querySelectorAll('[data-count]');
  function land(el) { el.textContent = Number(el.dataset.count).toLocaleString(); }
  if (reduced || !('IntersectionObserver' in window)) {
    counters.forEach(land);
  } else {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, target = Number(el.dataset.count), t0 = performance.now();
        (function step(now) {
          var p = Math.min(1, (now - t0) / 1100);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString();
          if (p < 1) requestAnimationFrame(step); else land(el);
        })(t0);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* Tilt. Pointer only, one frame at a time, six degrees at most. */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced) {
    document.querySelectorAll('.tilt').forEach(function (card) {
      var frame = null, max = Number(card.dataset.tilt || 6);
      card.addEventListener('pointermove', function (ev) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = null;
          var r = card.getBoundingClientRect();
          var x = (ev.clientX - r.left) / r.width - 0.5;
          var y = (ev.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--ry', (x * max).toFixed(2) + 'deg');
          card.style.setProperty('--rx', (-y * max).toFixed(2) + 'deg');
        });
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }
})();`,
};

module.exports = { title, lessons, checklists, starter };
