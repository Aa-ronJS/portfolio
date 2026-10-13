/* Clan Saga: the screens. Rules live in sim.js, scenes in art.js. */
(function () {
  'use strict';
  var Sim = window.Sim, Art = window.Art;
  var app = document.getElementById('app');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = null;
  var saved = null;
  var status = { mock: false };
  var ui = { phase: 'choose', choice: 'gather', idea: '', whoId: null, report: null, error: null, overlay: null, ages: null, attemptText: '' };

  var KIND_WORDS = { invent: 'New', try: 'Idea', work: 'Work', explore: 'Found', hurt: 'Hurt', death: 'Death', birth: 'Birth', danger: 'Danger', omen: 'Sign', hunger: 'Hunger', cold: 'Cold', sick: 'Sickness', split: 'Parting', lost: 'Forgotten', end: 'The end', chapter: 'Chapter' };
  var CALM = {
    Spring: 'The land is green again, and the young are restless.',
    Summer: 'Long days, and the land is generous.',
    Autumn: 'The days are shortening. Winter is on its way.',
    Winter: 'Winter. Little grows, and the nights are long.'
  };

  // ---------------- helpers ----------------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function h(html) { var t = document.createElement('template'); t.innerHTML = html; return t.content; }
  function $(sel) { return app.querySelector(sel); }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'The game server did not answer.'); return j; }); });
  }
  function save() { if (state) post('/api/save', state).catch(function () { /* the next save will catch up */ }); }
  function foodWords(f) {
    if (f < 0.5) return 'Almost none';
    if (f < 1) return 'Less than a season';
    var r = Math.round(f);
    return 'About ' + r + (r === 1 ? ' season' : ' seasons');
  }
  function paragraphs(text) { return String(text || '').split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join(''); }
  function scrollTo(el) { if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
  var HAND = '<svg class="hand" viewBox="0 0 64 64" aria-hidden="true"><g fill="oklch(0.68 0.13 48)"><rect x="27" y="4" width="9" height="30" rx="4.5"/><rect x="38" y="8" width="8.5" height="27" rx="4.25"/><rect x="16.5" y="8" width="8.5" height="27" rx="4.25"/><rect x="48" y="16" width="7.5" height="22" rx="3.75"/><rect x="5" y="28" width="8" height="22" rx="4" transform="rotate(-38 9 39)"/><path d="M15 30h41v12c0 11-8 18-19 18-9 0-15-5-19-12l-6-10z"/></g></svg>';

  // ---------------- title ----------------
  function renderTitle() {
    var html = '<main class="title-screen">' + HAND +
      '<h1>Clan Saga</h1>' +
      '<p class="lead">From the first apes to the first wheel. You guide one clan through seven ages, and you invent by saying how.</p>';
    if (saved && !saved.finished) {
      var ch = Sim.CHAPTERS[saved.chapter];
      html += '<section class="continue"><h2>The saga of ' + esc(saved.clanName) + '</h2><p class="lo">Chapter ' + (saved.chapter + 1) + ', ' + esc(ch.title) + '. ' + saved.members.length + ' people, ' + Sim.seasonName(saved).toLowerCase() + ' of year ' + Sim.yearOf(saved) + '.</p>' +
        '<div class="start-actions"><button class="btn primary" data-act="continue">Continue the saga</button></div></section>';
    }
    html += '<div class="how">' +
      '<p><b>Each season</b>, choose what the clan does: gather, hunt, explore or rest. The season’s news tells you which is wise.</p>' +
      '<p><b>Anyone can try an idea.</b> Describe it in plain words, the way you would explain it to a friend. Claude, playing the world, decides what really happens with what your clan really has.</p>' +
      '<p><b>Each chapter has one great challenge</b>, from using a twig to making a wheel. Meet it, the ages pass, and the storyteller tells what your clan did.</p>' +
      '<p><b>Knowledge lives in people.</b> If everyone who knows a thing dies before teaching it, it is forgotten.</p>' +
      '</div>' +
      '<form class="start-form" data-form="start">' +
      '<div class="field"><label class="label" for="clan-name">Your clan’s name</label><input id="clan-name" type="text" maxlength="40" value="The Fig Clan" autocomplete="off"></div>' +
      '<fieldset class="field"><legend class="label">How much help do you want?</legend><div class="modes">' +
      mode('teacher', 'Teacher', 'Plain advice each season, and clear hints when an idea goes wrong.', true) +
      mode('elder', 'Elder', 'Advice and hints come as the old ones’ sayings. You work out the rest.') +
      mode('nature', 'Nature', 'No advice, no hints. Only what happens. A “show me” is there if you are truly stuck.') +
      '</div></fieldset>' +
      '<div class="start-actions"><button class="btn ' + (saved && !saved.finished ? '' : 'primary') + '" type="submit">' + (saved && !saved.finished ? 'Begin a new saga instead' : 'Begin the saga') + '</button></div>' +
      '</form>' +
      (status.mock ? '<p class="status-note">Mock mode: Claude is not being called, so only the termite idea works.</p>' : '') +
      '</main>';
    app.replaceChildren(h(html));
    document.title = 'Clan Saga';
  }
  function mode(id, name, about, checked) {
    return '<label class="mode"><input type="radio" name="mode" value="' + id + '"' + (checked ? ' checked' : '') + '><span><b>' + name + '</b><span>' + about + '</span></span></label>';
  }

  // ---------------- game ----------------
  function startGame(s) {
    state = s;
    ui = { phase: 'choose', choice: 'gather', idea: '', whoId: null, report: null, error: null, overlay: null, ages: null, attemptText: '' };
    renderGame();
    window.scrollTo(0, 0);
  }

  function renderGame() {
    var ch = Sim.chapterOf(state);
    document.title = ch.title + ' · Clan Saga';
    var html = top() + '<div class="game"><main class="story">' + sceneBlock() + '<div class="pad">' + seasonBlock() + goalBlock() + phaseBlock() + '</div></main>' + side() + '</div>' + overlay();
    app.replaceChildren(h(html));
    var ta = $('#idea');
    if (ta) ta.value = ui.idea;
  }

  function top() {
    return '<header class="top"><div class="clan">' + esc(state.clanName) + '<small>' + esc(Sim.seasonName(state)) + ', year ' + Sim.yearOf(state) + ' of chapter ' + (state.chapter + 1) + '</small></div>' +
      '<div class="tally" aria-hidden="true">' + tally() + '</div>' +
      '<div class="tools"><button class="btn" data-act="book">The saga</button><button class="btn" data-act="menu">Menu</button></div></header>';
  }

  // The signature: a notched tally bone, one notch per season lived.
  function tally() {
    var total = state.seasonCount;
    var starts = {};
    state.log.forEach(function (l) { if (l.kind === 'chapter') starts[l.season] = l.chapter + 1; });
    var step = 8, w = Math.max(640, 40 + (total + 12) * step);
    var s = '<svg viewBox="0 0 ' + w + ' 40" preserveAspectRatio="xMinYMid meet"><path d="M10,14 a6,6 0 1 1 6,-6 L' + (w - 16) + ',8 a6,6 0 1 1 6,6 L' + (w - 10) + ',26 a6,6 0 1 1 -6,6 L16,32 a6,6 0 1 1 -6,-6 Z" fill="oklch(0.86 0.03 80)" opacity="0.92"/>';
    for (var i = 0; i <= total; i++) {
      var x = 24 + i * step;
      if (starts[i]) s += '<line x1="' + x + '" y1="6" x2="' + x + '" y2="34" stroke="oklch(0.3 0.03 50)" stroke-width="2.5"/>';
      else if (i < total) s += '<line x1="' + x + '" y1="13" x2="' + x + '" y2="27" stroke="oklch(0.4 0.03 50)" stroke-width="1.6"/>';
    }
    var cx = 24 + total * step + (starts[total] ? 0 : 0);
    s += '<line x1="' + cx + '" y1="9" x2="' + cx + '" y2="31" stroke="oklch(0.6 0.15 45)" stroke-width="3"/>';
    return s + '</svg>';
  }

  function sceneBlock() {
    var ch = Sim.chapterOf(state);
    return '<div class="scene">' + Art.scene(state, Sim) + '<div class="chapter-label"><div class="n">Chapter ' + (state.chapter + 1) + ' of 7</div><h1>' + esc(ch.title) + '</h1><div class="when">' + esc(ch.when) + ' · ' + esc(ch.species) + '</div></div></div>';
  }

  function seasonBlock() {
    var ch = Sim.chapterOf(state);
    var season = Sim.seasonName(state);
    var text;
    if (ui.phase === 'report') return '';
    if (state.chapterSeason === 0) text = ch.intro;
    else {
      text = Sim.conditionText(state) || CALM[season];
      if (state.opportunity && state.opportunity.kind === 'fire') text += ' Fire is still burning on the ridge after the storm.';
    }
    var down = state.members.filter(function (m) { return m.state !== 'well'; });
    if (down.length) text += ' ' + listNames(down.map(function (m) { return m.name; })) + (down.length === 1 ? ' is ' : ' are ') + (down.every(function (m) { return m.state === 'sick'; }) ? 'sick.' : down.every(function (m) { return m.state === 'hurt'; }) ? 'hurt.' : 'hurt or sick.');
    var adv = state.mode === 'nature' ? '' : '<p class="advice"><span class="who">' + (state.mode === 'elder' ? 'The old ones say: ' : 'Advice: ') + '</span>' + esc(Sim.advice(state)) + '</p>';
    return '<div class="season-head"><h2>' + season + ', year ' + Sim.yearOf(state) + '</h2></div><p class="situation">' + esc(text) + '</p>' + adv;
  }
  function listNames(a) { return a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

  function goalBlock() {
    var ch = Sim.chapterOf(state);
    if (ui.phase === 'report') return '';
    var hints = ch.hints[state.mode === 'elder' ? 'elder' : 'teacher'];
    var g = Sim.goalProgress(state);
    var shown = '';
    for (var i = 0; i < state.hintLevel; i++) shown += '<p><b>' + (i === 2 ? 'How: ' : 'Hint: ') + '</b>' + esc(hints[i]) + '</p>';
    var btn = '';
    if (state.hintLevel < 3 && !g.found) {
      var label = state.mode === 'nature' ? 'Show me how (gives it away)' : state.hintLevel === 0 ? (state.mode === 'elder' ? 'Ask the old ones' : 'Stuck? Get a hint') : state.hintLevel === 1 ? 'Another hint' : 'Show me how';
      btn = '<div><button class="link" data-act="hint">' + label + '</button></div>';
    }
    var already = Sim.goalMet(state) ? '<p class="advice">Enough of the clan know ' + esc(g.name) + '. End this season and the ages will pass.</p>'
      : g.found ? '<p class="advice">Found: ' + esc(g.name) + '. Now it must spread. ' + g.knowers + ' of ' + g.clan + ' know it; at least ' + g.need + ' must. It passes to more people each season, but if all who know it die, it is lost.</p>' : '';
    return '<section class="goal" aria-label="This chapter’s challenge"><span class="label">The great challenge</span><p class="text">' + esc(ch.goal.text) + '</p>' + (g.found ? '' : '<p class="small lo">Then pass it on until at least half the clan know it.</p>') + already + (shown ? '<div class="hints">' + shown + '</div>' : '') + btn + '</section>';
  }

  function phaseBlock() {
    if (ui.phase === 'thinking') return thinkingBlock();
    if (ui.phase === 'report') return reportBlock();
    return chooseBlock() + (ui.phase === 'error' ? errorBlock() : '');
  }

  function tipFor(id) {
    if (state.mode === 'nature') return '';
    var n = state.next;
    var good = function (t) { return '<span class="tip">' + t + '</span>'; };
    var bad = function (t) { return '<span class="tip warn">' + t + '</span>'; };
    if (n === 'herds' && id === 'hunt') return good('Good this season');
    if (n === 'lean' && id === 'gather') return bad('Poor this season');
    if (n === 'lean' && id === 'hunt') return good('Better this season');
    if (n === 'bounty' && id === 'gather') return good('Good this season');
    if (n === 'prowler' && id === 'rest') return good('Safest');
    if (n === 'prowler' && (id === 'hunt' || id === 'explore')) return bad('Dangerous');
    if (n === 'fever' && id === 'rest') return good('Stops the fever');
    if (id === 'rest' && state.members.some(function (m) { return m.state !== 'well'; })) return good('Mends the hurt');
    if (id === 'explore' && !Sim.unknownPlaces(state).length) return bad('Nothing left to find');
    return '';
  }

  function chooseBlock() {
    var ch = Sim.chapterOf(state);
    var acts = Sim.actions(state);
    var rows = acts.map(function (a, i) {
      return '<button class="choice" role="radio" aria-checked="' + (ui.choice === a.id) + '" data-choice="' + a.id + '"><span class="num">' + (i + 1) + '</span><span><b>' + esc(a.label) + '</b><span>' + esc(a.about) + '</span></span>' + tipFor(a.id) + '</button>';
    }).join('');
    var who = ui.whoId && Sim.findMember(state, ui.whoId) ? ui.whoId : (Sim.suggestedInventor(state) || {}).id;
    ui.whoId = who;
    var opts = state.members.slice().sort(function (a, b) { return b.age - a.age; }).map(function (m) {
      var notes = [];
      if (!Sim.isAdult(state, m)) notes.push('child');
      if (m.state !== 'well') notes.push(m.state);
      return '<option value="' + m.id + '"' + (m.id === who ? ' selected' : '') + '>' + esc(m.name) + ', ' + Math.floor(m.age) + (notes.length ? ' (' + notes.join(', ') + ')' : '') + '</option>';
    }).join('');
    var example = ch.examples[state.chapterSeason % ch.examples.length];
    var mic = (window.SpeechRecognition || window.webkitSpeechRecognition) ? '<button class="btn mic" type="button" data-act="mic" aria-pressed="false">Speak it</button>' : '';
    return '<h2 class="section-title" id="choose">What does the clan do this season?</h2>' +
      '<div class="choices" role="radiogroup" aria-label="What the clan does this season">' + rows + '</div>' +
      '<h2 class="section-title">Someone could try an idea</h2>' +
      '<div class="idea"><div class="row"><label class="label" for="who">Who tries it</label><select id="who">' + opts + '</select>' + mic + '</div>' +
      '<label class="sr" for="idea">Your idea</label><textarea id="idea" maxlength="1500" placeholder="For example: ' + esc(example) + '"></textarea>' +
      '<p class="help">Say how: what they use and what they do with it. The world judges it against what your clan really has (see Places). Leave it empty to just get on with the season.</p></div>' +
      '<div class="go"><button class="btn primary" data-act="end">' + (ui.idea.trim() ? 'Try the idea and end the season' : 'End the season') + ' <span class="key">Enter</span></button><span class="small faint">Number keys choose. Ctrl and Enter sends from the idea box.</span></div>';
  }

  function thinkingBlock() {
    var who = Sim.findMember(state, ui.whoId);
    return '<div class="thinking" role="status"><div class="notches"><i></i><i></i><i></i><i></i><i></i></div><p>' + esc(who ? who.name : 'Someone') + ' works at it through the afternoon…</p><p class="small lo">The world is deciding. This takes a few seconds.</p></div>';
  }

  function errorBlock() {
    return '<div class="error" role="alert"><b>The world could not answer.</b><p class="small lo">' + esc(ui.error) + '</p><p>Your idea is still in the box. Try again, or end the season without it.</p><div class="start-actions"><button class="btn primary" data-act="end">Try again</button><button class="btn" data-act="skip-idea">End the season without the idea</button></div></div>';
  }

  function reportBlock() {
    var r = ui.report, out = '<div class="report" id="report">';
    var ch = Sim.chapterOf(state);
    if (r.attempt) {
      var v = r.attempt.verdict;
      var words = { works: 'It works', partial: 'It half works', fails: 'It fails' }[v.outcome];
      out += '<section class="outcome" aria-label="What happened to the idea"><span class="stamp ' + v.outcome + '">' + words + '</span>' +
        '<p class="tried">' + esc(r.attempt.who) + ' tried: <q>' + esc(ui.attemptText) + '</q></p>' +
        '<p class="happens">' + esc(v.what_happens) + '</p>' +
        (v.why ? '<p class="why">' + esc(v.why) + '</p>' : '') +
        (v.hint && v.outcome !== 'works' ? '<p class="hint"><b>' + (state.mode === 'elder' ? 'The old ones say: ' : 'Hint: ') + '</b>' + esc(v.hint) + '</p>' : '') +
        (v.outcome === 'works' && v.learned ? '<p class="learned"><b>New knowledge:</b> ' + esc(v.learned) + '. ' + (v.epithet ? 'The clan call the one who found it ' + esc(v.epithet) + ' from now on.' : '') + '</p>' : '') +
        '</section>';
    }
    if (r.goalMet) {
      out += '<section class="met"><span class="label">The great challenge is met</span><h3>' + (state.finished === 'won' ? 'The wheel turns.' : 'The ages pass.') + '</h3><p class="lo">' + (state.finished === 'won' ? 'From the forest to the wheel. The storyteller is ready.' : 'Many lifetimes go by. The storyteller will tell what your clan did, and a new chapter begins.') + '</p><div><button class="btn primary" data-act="next">' + (state.finished === 'won' ? 'Hear the whole saga' : 'Let the ages pass') + ' <span class="key">Enter</span></button></div></section>';
    }
    var lines = r.lines.filter(function (l) { return !(r.attempt && (l.kind === 'invent' || l.kind === 'try')); });
    out += '<section class="events"><h3>The season</h3><ul>' + lines.map(function (l) { return '<li><span class="kind ' + l.kind + '">' + (KIND_WORDS[l.kind] || '') + '</span><span>' + esc(l.text) + '</span></li>'; }).join('') +
      '<li><span class="kind">Food</span><span>Was ' + foodWords(r.foodBefore / Math.max(0.1, eatersApprox(r))).toLowerCase() + ', now ' + foodWords(Sim.seasonsOfFood(state)).toLowerCase() + '.</span></li></ul></section>';
    if (state.finished === 'lost') out += '<section class="met"><span class="label">The saga ends</span><h3>The clan is gone.</h3><div><button class="btn primary" data-act="next">Hear their saga</button></div></section>';
    else if (!r.goalMet) out += '<div class="go"><button class="btn primary" data-act="next">Next season <span class="key">Enter</span></button><span class="small faint">' + esc(ch.goal.text) + '</span></div>';
    return out + '</div>';
  }
  function eatersApprox(r) { return r.eatersBefore || 1; }

  function side() {
    var ch = Sim.chapterOf(state);
    var f = Sim.seasonsOfFood(state);
    var cells = '';
    for (var i = 0; i < 8; i++) cells += '<i class="' + (i < Math.round(f) ? (f < 1.5 ? 'low' : 'on') : '') + '"></i>';
    var out = '<aside class="side" aria-label="Your clan"><section><h2>Food</h2><p class="big-figure">' + foodWords(f) + '</p><div class="meter" aria-hidden="true">' + cells + '</div><p class="small lo" style="margin-top:8px">Food spoils: a quarter rots each season unless stored well.</p></section>';
    if (ch.cold > 0) {
      var wm = Sim.warmth(state);
      out += '<section><h2>Warmth for winter</h2><p class="big-figure">' + (wm >= ch.cold ? 'Enough' : 'Not enough') + '</p><p class="small lo">' + wm + ' of ' + ch.cold + ' needed. ' + (wm >= ch.cold ? 'Winter will not make people sick from cold.' : 'Without more warmth, winter will make people sick. Fire, shelter and clothes all help.') + '</p></section>';
    }
    var known = state.knowledge.filter(function (k) { return !k.lost || k.chapter === state.chapter; });
    out += '<section class="know"><h2>What the clan knows</h2>' + (known.length ? '<ul>' + known.map(function (k) {
      var alive = state.members.filter(function (m) { return k.knowers.indexOf(m.id) >= 0; }).length;
      return '<li class="' + (k.lost ? 'lost' : '') + '"><b>' + esc(k.name) + '</b><small>' + (k.lost ? 'Forgotten: nobody who knew it is left.' : (k.inventor === 'the ages between' ? 'Learned in the ages between' : k.inventor ? 'Found by ' + esc(k.inventor) : 'Kept from older times') + ' · known by ' + alive + ' of ' + state.members.length) + '</small></li>';
    }).join('') + '</ul>' : '<p class="empty">Nothing yet beyond what any animal knows.</p>') + '</section>';
    var unk = Sim.unknownPlaces(state).length;
    out += '<section class="places"><h2>Places, and what they hold</h2><ul>' + Sim.knownPlaces(state).map(function (p) { return '<li><b>' + esc(p.name) + '</b><small>' + esc(p.mats.join(', ')) + '</small></li>'; }).join('') + '</ul><p class="small lo" style="margin-top:8px">' + (unk ? unk + (unk === 1 ? ' more place' : ' more places') + ' to find by exploring.' : 'Every place nearby is known.') + '</p></section>';
    var people = state.members.slice().sort(function (a, b) { return b.age - a.age; });
    out += '<section class="people"><h2>The clan, ' + people.length + '</h2><ul>' + people.map(function (m) {
      var st = m.state !== 'well' ? m.state : !Sim.isAdult(state, m) ? 'child' : m.age > ch.lifespan - 6 ? 'old' : '';
      return '<li><span class="nm">' + esc(m.name) + (m.formerName ? '<span class="former">once called ' + esc(m.formerName) + '</span>' : '') + '</span><span class="st ' + m.state + '">' + Math.floor(m.age) + (st ? ', ' + st : '') + '</span></li>';
    }).join('') + '</ul></section></aside>';
    return out;
  }

  // ---------------- overlays: the saga book and the passing of the ages ----------------
  function overlay() {
    if (ui.overlay === 'book') return '<div class="overlay" role="dialog" aria-modal="true" aria-label="The saga">' + bookPage(false) + '</div>';
    if (ui.overlay === 'ages') return '<div class="overlay" role="dialog" aria-modal="true" aria-label="The ages pass">' + agesPage() + '</div>';
    return '';
  }

  function tellings(except) {
    return state.sagas.filter(function (s) { return s.chapter !== except; }).map(function (s) {
      return '<p class="ch">CHAPTER ' + (s.chapter + 1) + ' · ' + esc(Sim.CHAPTERS[s.chapter].title.toUpperCase()) + '</p><h2>' + esc(s.title) + '</h2><div class="telling">' + paragraphs(s.telling) + '</div>';
    }).join('');
  }

  function bookPage(isEnd) {
    var current = state.log.filter(function (l) { return l.chapter === state.chapter && l.kind !== 'work' && l.kind !== 'chapter'; });
    var told = state.sagas.some(function (s) { return s.chapter === state.chapter; });
    return '<article class="book"><div class="book-top"><div><h1>The Saga of ' + esc(state.clanName) + '</h1><p class="lead">As it is told by the fire.</p></div>' + (isEnd ? '' : '<button class="btn" data-act="close">Close <span class="key">Esc</span></button>') + '</div>' +
      (state.sagas.length ? tellings() : '<p class="lead" style="margin-top:32px">Nothing is told yet. The first telling comes when the first chapter ends.</p>') +
      (!told && current.length ? '<p class="ch">BEING LIVED NOW · CHAPTER ' + (state.chapter + 1) + '</p><ul class="loglist">' + current.map(function (l) { return '<li>' + esc(l.text) + '</li>'; }).join('') + '</ul>' : '') +
      '</article>';
  }

  function agesPage() {
    var a = ui.ages, ch = Sim.CHAPTERS[a.chapter];
    var isEnd = !!state.finished;
    var out = '<article class="book"><p class="ch">CHAPTER ' + (a.chapter + 1) + ' · ' + esc(ch.title.toUpperCase()) + (isEnd ? '' : ' IS OVER') + '</p>';
    out += '<h1>' + (state.finished === 'won' ? 'The wheel turns' : state.finished === 'lost' ? 'The saga ends' : 'The ages pass') + '</h1>';
    if (a.loading) out += '<div class="waiting" role="status"><div class="notches"><i></i><i></i><i></i><i></i><i></i></div><p>The storyteller gathers the clan by the fire… (this can take half a minute)</p></div>';
    else if (a.error) out += '<div class="waiting" role="alert"><p>The storyteller could not find the words: ' + esc(a.error) + '</p><div class="actions" style="margin-top:8px"><button class="btn" data-act="retell">Ask again</button></div></div>';
    else if (a.saga) out += '<h2>' + esc(a.saga.title) + '</h2><div class="telling">' + paragraphs(a.saga.telling) + '</div>';
    if (isEnd) {
      var earlier = tellings(a.chapter);
      if (earlier) out += '<p class="ch" style="margin-top:64px">THE WHOLE SAGA, FROM THE BEGINNING</p>' + earlier;
      out += '<div class="actions"><button class="btn primary" data-act="newgame">Begin a new saga</button></div>';
    } else {
      var nx = Sim.CHAPTERS[a.chapter + 1];
      out += '<section class="next-ch"><p class="ch">NEXT · CHAPTER ' + (a.chapter + 2) + ' OF 7</p><h2>' + esc(nx.title) + '</h2><p><b>' + esc(nx.when) + '.</b> Your clan are now ' + esc(nx.species) + '. Everything they kept knowing comes with them.</p><p>' + esc(nx.intro) + '</p>' +
        '<div class="actions"><button class="btn primary" data-act="begin">Begin chapter ' + (a.chapter + 2) + '</button></div></section>';
    }
    return out + '</article>';
  }

  function requestSaga(chIndex) {
    ui.ages = { chapter: chIndex, loading: true, saga: null, error: null };
    var ch = Sim.CHAPTERS[chIndex];
    var events = state.log.filter(function (l) { return l.chapter === chIndex && l.kind !== 'work'; }).map(function (l) { return l.text; });
    var previous = state.sagas.slice(-3).map(function (s) { return s.title + ': ' + s.telling.slice(0, 400); }).join('\n');
    var heading = 'Chapter ' + (chIndex + 1) + ', ' + ch.title + ' (' + ch.when + '), when the clan were ' + ch.species + '.' + (state.finished === 'lost' ? ' This is how the clan ended.' : state.finished === 'won' ? ' This is the last chapter: the wheel.' : '');
    var want = ui.ages;
    post('/api/saga', { clanName: state.clanName, heading: heading, previous: previous, events: events.slice(-60) })
      .then(function (s) {
        state.sagas = state.sagas.filter(function (x) { return x.chapter !== chIndex; });
        state.sagas.push({ chapter: chIndex, title: s.title, telling: s.telling });
        state.sagas.sort(function (a, b) { return a.chapter - b.chapter; });
        save();
        if (ui.ages === want) { want.loading = false; want.saga = s; refreshOverlay(); }
      })
      .catch(function (e) {
        if (ui.ages === want) { want.loading = false; want.error = e.message; refreshOverlay(); }
      });
  }
  function refreshOverlay() {
    var o = app.querySelector('.overlay');
    if (!o) return;
    o.replaceChildren(h(ui.overlay === 'ages' ? agesPage() : bookPage(false)));
  }

  // ---------------- actions ----------------
  function endSeason(withIdea) {
    if (ui.phase === 'thinking') return;
    var ta = $('#idea');
    if (ta) ui.idea = ta.value;
    var sel = $('#who');
    if (sel) ui.whoId = Number(sel.value);
    var idea = withIdea === false ? '' : ui.idea.trim();
    if (!idea) return resolve(null);
    ui.phase = 'thinking';
    ui.error = null;
    renderGame();
    scrollTo($('.thinking'));
    post('/api/judge', { context: Sim.judgeContext(state, ui.whoId), idea: idea })
      .then(function (v) { ui.attemptText = idea; resolve(v); })
      .catch(function (e) { ui.phase = 'error'; ui.error = e.message; renderGame(); scrollTo($('.error')); });
  }

  function resolve(verdict) {
    var eatersBefore = Sim.seasonsOfFood(state) > 0 ? state.food / Sim.seasonsOfFood(state) : 1;
    var report = Sim.resolveSeason(state, ui.choice, verdict ? { whoId: ui.whoId, verdict: verdict } : null);
    report.eatersBefore = eatersBefore;
    if (verdict) ui.idea = '';
    ui.report = report;
    ui.phase = 'report';
    save();
    renderGame();
    scrollTo($('#report') || $('.story'));
  }

  function next() {
    var r = ui.report;
    if (state.finished || (r && r.goalMet)) {
      ui.overlay = 'ages';
      requestSaga(state.chapter);
      renderGame();
      return;
    }
    ui.phase = 'choose';
    ui.report = null;
    renderGame();
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  function beginNextChapter() {
    var a = ui.ages;
    if (a && a.loading) {
      // Let the telling land in the book when it arrives.
    } else if (a && !a.saga && !state.sagas.some(function (s) { return s.chapter === a.chapter; })) {
      var ch = Sim.CHAPTERS[a.chapter];
      state.sagas.push({ chapter: a.chapter, title: ch.title, telling: state.log.filter(function (l) { return l.chapter === a.chapter && l.kind !== 'work'; }).map(function (l) { return l.text; }).join(' ') });
    }
    Sim.advanceChapter(state);
    save();
    ui = { phase: 'choose', choice: 'gather', idea: '', whoId: null, report: null, error: null, overlay: null, ages: null, attemptText: '' };
    renderGame();
    window.scrollTo(0, 0);
  }

  // Speech: the idea can be said out loud (Edge and Chrome).
  var rec = null;
  function toggleMic(btn) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (rec) { rec.stop(); return; }
    var ta = $('#idea');
    var base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
    rec = new SR();
    rec.lang = 'en-GB'; rec.interimResults = true; rec.continuous = true;
    rec.onresult = function (e) {
      var said = '';
      for (var i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      ta.value = base + said;
      ui.idea = ta.value;
      updateEndLabel();
    };
    rec.onend = function () { rec = null; var b = $('.mic'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = 'Speak it'; } };
    rec.onerror = function () { rec && rec.stop(); };
    rec.start();
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = 'Listening. Click to stop';
  }

  function updateEndLabel() {
    var b = app.querySelector('[data-act=end]');
    if (b && ui.phase === 'choose') b.firstChild.nodeValue = (ui.idea.trim() ? 'Try the idea and end the season' : 'End the season') + ' ';
  }

  // ---------------- events ----------------
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act], [data-choice]');
    if (!t) return;
    if (t.dataset.choice) {
      ui.choice = t.dataset.choice;
      app.querySelectorAll('.choice').forEach(function (c) { c.setAttribute('aria-checked', String(c.dataset.choice === ui.choice)); });
      return;
    }
    var act = t.dataset.act;
    if (act === 'continue') return startGame(saved);
    if (act === 'end') return endSeason();
    if (act === 'skip-idea') return endSeason(false);
    if (act === 'next') return next();
    if (act === 'hint') {
      state.hintLevel = state.mode === 'nature' ? 3 : Math.min(3, state.hintLevel + 1);
      var ta = $('#idea'); if (ta) ui.idea = ta.value;
      save(); renderGame(); return;
    }
    if (act === 'book') { var ta2 = $('#idea'); if (ta2) ui.idea = ta2.value; ui.overlay = 'book'; renderGame(); var c = app.querySelector('[data-act=close]'); if (c) c.focus(); return; }
    if (act === 'close') { ui.overlay = null; renderGame(); return; }
    if (act === 'retell') { requestSaga(ui.ages.chapter); refreshOverlay(); return; }
    if (act === 'begin') return beginNextChapter();
    if (act === 'mic') return toggleMic(t);
    if (act === 'menu' || act === 'newgame') {
      saved = state; state = null; ui.overlay = null;
      if (act === 'newgame') saved = null;
      renderTitle(); window.scrollTo(0, 0); return;
    }
  });

  app.addEventListener('submit', function (e) {
    if (e.target.dataset.form !== 'start') return;
    e.preventDefault();
    var name = (document.getElementById('clan-name').value || '').trim() || 'The Fig Clan';
    var m = (app.querySelector('input[name=mode]:checked') || {}).value || 'teacher';
    startGame(Sim.newGame({ clanName: name, mode: m }));
    save();
  });

  app.addEventListener('input', function (e) {
    if (e.target.id === 'idea') { ui.idea = e.target.value; updateEndLabel(); }
    if (e.target.id === 'who') ui.whoId = Number(e.target.value);
  });
  app.addEventListener('change', function (e) { if (e.target.id === 'who') ui.whoId = Number(e.target.value); });

  document.addEventListener('keydown', function (e) {
    if (!state) return;
    if (ui.overlay) {
      if (e.key === 'Escape' && ui.overlay === 'book') { ui.overlay = null; renderGame(); }
      return;
    }
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'textarea' || tag === 'input' || tag === 'select';
    if (tag === 'textarea' && e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ui.phase === 'choose') { e.preventDefault(); endSeason(); return; }
    if (typing || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((ui.phase === 'choose') && /^[1-4]$/.test(e.key)) {
      var a = Sim.actions(state)[Number(e.key) - 1];
      ui.choice = a.id;
      app.querySelectorAll('.choice').forEach(function (c) { c.setAttribute('aria-checked', String(c.dataset.choice === ui.choice)); });
      return;
    }
    if (e.key === 'Enter' && tag !== 'button' && tag !== 'a') {
      if (ui.phase === 'choose') { e.preventDefault(); endSeason(); }
      else if (ui.phase === 'report') { e.preventDefault(); next(); }
    }
  });

  // ---------------- boot ----------------
  Promise.all([
    fetch('/api/status').then(function (r) { return r.json(); }).catch(function () { return {}; }),
    fetch('/api/load').then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (res) {
    status = res[0] || {};
    saved = res[1] && res[1].state;
    renderTitle();
  });
})();
