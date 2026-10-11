'use strict';
// The owner's app: sign in, every business, the review period, and the platform queue. Renders from the server's
// view documents (api/business.js) and posts actions back; the page holds no rules of its own.
const FEE = 20, FEE_PCT = 0.2, SEAT_COST = Math.round(FEE * (1 + FEE_PCT));
const STATES = ['draft', 'funded', 'recruiting', 'open', 'rating', 'settlement', 'closed'];
const STATE_LABEL = { draft: 'Draft', funded: 'Funded', recruiting: 'Recruiting', open: 'Open', rating: 'Peer rating', settlement: 'Settlement', closed: 'Closed' };
const FLAG_REASONS = ['untruthful', 'unfairly positive', 'unfairly negative', 'not about this product', 'abusive', 'pasted from elsewhere'];
const PLACES = [['Neighbourhood Facebook groups', 'Say it is paid and private'], ['Local subreddit or forum', 'Message a mod first'], ['Your waitlist and past enquiries', 'Best strangers you have'], ['Building and strata noticeboards', 'Ask the manager'], ['Cafe pinboards', 'Poster with a QR code']];
const QUESTIONS = [['kind', 'Who buys it?', 'Business-to-business reviewers also give their business name and role.'], ['product', 'What is it, in one sentence?'], ['audience', 'Who is it for, and who is it not for?'], ['job', 'What will a reviewer do, how long does it take, and what do they get free?'], ['wants', 'The three things you most want to know', 'One per line. Each becomes a section of the review form.'], ['known', 'What you already know is weak', 'One per line. Reviewers are not paid to repeat these.'], ['wontChange', 'What you will not change', 'Feedback on it is marked off-brief.'], ['eligibility', 'What must a reviewer have or be?']];

const A = { auth: null, biz: [], id: null, d: null, page: 'overview', side: false, drawer: null, wizard: null, busy: null, seats: 5, meta: {}, leads: null };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Number(n)).toFixed(0);
const fmt = (ms) => ms ? new Date(ms).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '';
const fmtT = (ms) => ms ? new Date(ms).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
const btn = (act, label, extra = '', cls = 'btn') => `<button class="${cls}" data-act="${act}" ${extra}>${label}</button>`;
const chip = (label, kind = '', plain = false) => `<span class="chip ${kind}${plain ? ' plain' : ''}">${esc(label)}</span>`;
function toast(msg, bad) { const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), bad ? 4200 : 2600); }
const store = { get: (k) => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } };

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && path !== '/api/auth') { A.auth = { ...(A.auth || {}), loggedIn: false }; render(); throw new Error('Sign in'); }
  if (!j.ok) throw new Error(j.error || ('Request failed (' + r.status + ')'));
  return j;
}
async function act(body, okMsg) {
  try { const j = await api('/api/business', { id: A.id, ...body }); A.d = j; if (okMsg) toast(typeof okMsg === 'function' ? okMsg(j) : okMsg); render(); return j; }
  catch (e) { toast(e.message, true); render(); return null; }
}
async function loadList() { const j = await api('/api/business?list=1'); A.biz = j.businesses; A.meta = j.meta || {}; api('/api/lead').then((l) => { A.leads = l.leads; render(); }).catch(() => {}); }
async function loadBiz(id) { const j = await api('/api/business?id=' + encodeURIComponent(id)); A.id = id; A.d = j; store.set('candid-biz', id); }
async function boot() {
  try { A.auth = await api('/api/auth'); } catch (e) { A.auth = { loggedIn: false, configured: false }; }
  if (A.auth.loggedIn) {
    await loadList();
    const want = store.get('candid-biz'); const first = A.biz.find((b) => b.id === want) || A.biz[0];
    if (first) await loadBiz(first.id);
  }
  render();
}

// ---------- shell ----------
const bv = () => A.d && A.d.business, av = () => A.d && A.d.admin;
function navFor() {
  const b = bv(), a = av(); if (!b) return [];
  const ready = b.bugs.filter((x) => x.scores && x.tier && !x.unlocked).length;
  return [['overview', 'Overview'], ['period', 'Review period'], ['reviews', 'Reviews', b.reviews.length], ['issues', 'Issues', ready], ['credits', 'Credits'], ['brief', 'Brief'], ['activity', 'Activity'],
    ['_', 'Platform'], ['queue', 'Queue', a.flags.filter((f) => f.state === 'queued').length], ['payouts', 'Payouts', a.payouts.filter((p) => p.state === 'released').length], ['reviewers', 'Reviewers'], ['leads', 'Leads', A.leads ? A.leads.length : 0], ['plog', 'Everything']];
}
function render() {
  const app = $('#app');
  if (!A.auth || !A.auth.loggedIn) { app.className = 'login'; app.innerHTML = loginView(); renderDrawer(); return; }
  app.className = 'app';
  const nav = navFor(); if (nav.length && !nav.some((n) => n[0] === A.page)) A.page = 'overview';
  const titles = { overview: 'Overview', period: 'Review period', reviews: 'Reviews', issues: 'Issues', credits: 'Credits', brief: 'Brief', activity: 'Activity', queue: 'Queue', payouts: 'Payouts', reviewers: 'Reviewers', leads: 'Leads', plog: 'Everything' };
  app.innerHTML = `<aside class="side${A.side ? ' open' : ''}" id="side"><div class="brand"><span class="mark">C</span>Candid</div>
    <div class="ws"><select id="wsel" data-act="switch" aria-label="Business">${A.biz.map((b) => `<option value="${b.id}" ${b.id === A.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}<option value="__new">+ New business</option></select></div>
    <nav class="nav">${nav.map(([k, l, c]) => k === '_' ? `<div class="grp">${l}</div>` : `<button data-act="page" data-v="${k}" aria-current="${A.page === k ? 'page' : 'false'}">${l}${c ? `<span class="count">${c}</span>` : ''}</button>`).join('')}</nav>
    <div class="foot xs faint">${A.meta.ai ? 'AI · Claude' : 'AI · built-in'}${bv() ? ` · period ${bv().periodNo || '—'}` : ''}<br>${btn('logout', 'Sign out', '', 'btn ghost sm')}</div></aside>
    ${A.side ? '<div class="scrim" data-act="side"></div>' : ''}
    <div class="main"><div class="topbar"><div class="title">${btn('side', '☰', 'aria-label="Menu"', 'btn menu-btn')}<h1>${bv() ? titles[A.page] : 'Candid'}</h1>${bv() && bv().period && !['brief', 'queue', 'payouts', 'reviewers', 'leads', 'plog'].includes(A.page) ? stateChip() : ''}</div><div class="row">${bv() ? `<span class="sm muted">${esc(bv().name)}</span>` : ''}</div></div>
    <div class="content">${A.busy ? `<div class="empty"><span class="spin"></span>&nbsp; ${esc(A.busy)}</div>` : page()}</div></div>`;
  renderDrawer();
}
function loginView() {
  if (A.auth && A.auth.configured === false) return `<div class="panel"><div class="body stack"><h2>Candid is not set up yet</h2><p class="sm muted">Set <span class="code">OWNER_PASSCODE</span>, <span class="code">SESSION_SECRET</span> and <span class="code">DATABASE_URL</span> in Vercel, then redeploy.</p></div></div>`;
  return `<div class="panel"><div class="body stack"><div class="brand" style="padding:0 0 6px"><span class="mark">C</span>Candid</div><div class="field"><label for="pass">Passcode</label><input type="password" id="pass" autocomplete="current-password"></div><div>${btn('login', 'Sign in', '', 'btn primary')}</div><p id="loginerr" class="sm" style="color:var(--bad)"></p></div></div>`;
}
const stateChip = () => { const p = bv().period; return chip(STATE_LABEL[p.state], { open: 'accent', rating: 'warn', settlement: 'warn', closed: 'good' }[p.state] || 'info'); };
const stepper = () => { const p = bv().period; const i = p ? STATES.indexOf(p.state) : -1; return `<div class="steps">${STATES.map((s, j) => `<div class="step ${j < i ? 'done' : j === i ? 'now' : ''}">${STATE_LABEL[s]}</div>`).join('')}</div>`; };
const payoutChip = (r) => !r.payout ? chip('—', '', true) : chip({ released: 'Released', paid: 'Paid', held: 'Held', forfeited: 'Forfeited', pending: 'Pending' }[r.payout], r.payout === 'paid' ? 'good' : r.payout === 'released' ? 'accent' : r.payout === 'forfeited' ? 'bad' : 'warn');
const seatChip = (r) => ({ invited: chip('Invited', 'info'), accepted: chip('In progress', 'warn'), submitted: chip('Submitted', 'accent'), rated: chip('Complete', 'good'), released: chip('Released', '', true) })[r.seat] || chip(r.seat, '', true);
const scoreCell = (s) => s ? `<span class="score"><span class="bar"><i style="width:${s.usefulness}%"></i></span>${s.usefulness}</span>` : `<span class="faint sm">pending</span>`;
const flagChip = (f) => chip(f.state === 'decided' ? (f.decision === 'breach' ? 'Breach' : f.decision === 'clear' ? 'Cleared' : 'Low quality') : f.state === 'cleared' ? 'Cleared' : 'Flag open', f.state === 'decided' && f.decision === 'breach' ? 'bad' : f.state === 'queued' || f.state === 'triage' ? 'warn' : 'good');
const who = (r, big) => `<span class="row" style="gap:10px;flex-wrap:nowrap">${r.photo && A.id ? `<img class="face${big ? ' big' : ''}" src="/api/photo?b=${encodeURIComponent(A.id)}&r=${encodeURIComponent(r.id)}" alt="">` : `<span class="face${big ? ' big' : ''} blank">${esc((r.pseudonym || '?')[0])}</span>`}<span><span class="strong">${esc(r.pseudonym)}</span>${r.state || r.company ? `<div class="xs muted">${[r.company, r.state].filter(Boolean).map(esc).join(' · ')}${r.role ? ' · ' + esc(r.role) : ''}</div>` : ''}</span></span>`;
const statusBtns = (kind, id, cur) => ['will use', 'will not use', 'already doing'].map((s) => btn('status', s, `data-kind="${kind}" data-target="${id}" data-v="${s}"`, 'btn sm' + (cur === s ? ' on' : ''))).join('');
const DISCLOSURE = 'Received the product free and was paid $20 for this review through Candid.';
const quoteText = (r, text) => `\u201c${text}\u201d \u2014 ${[r.pseudonym, r.company, r.state].filter(Boolean).join(', ')}. ${DISCLOSURE}`;
const logRows = (rows) => rows.length ? rows.map((e) => `<div class="lgrow"><span class="d">${fmt(e.at)}</span><span><span class="e">${esc(e.event)}</span> <span class="t">${esc(e.detail)}</span></span></div>`).join('') : '<div class="empty">Nothing yet</div>';

function page() {
  if (!bv()) return `<div class="panel"><div class="hero"><h1>Add your first business</h1><div class="field" style="width:min(360px,100%)"><input type="text" id="newname" placeholder="Business name"></div>${btn('create', 'Create', '', 'btn primary')}</div></div>`;
  return ({ overview, period, reviews, issues, credits, brief: briefPage, activity, queue, payouts, reviewers, leads, plog })[A.page]();
}

// ---------- business pages ----------
function overview() {
  const b = bv(), p = b.period; const subs = b.reviewers.filter((r) => r.seat === 'submitted' || r.seat === 'rated').length;
  const ready = b.bugs.filter((x) => x.scores && x.tier && !x.unlocked), unmarked = b.reviews.filter((r) => r.scores && !r.status).length, queued = av().flags.filter((f) => f.state === 'queued').length, due = av().payouts.filter((x) => x.state === 'released').length;
  const todo = [];
  if (!b.briefs.length) todo.push(['brief', 'Write the brief', 'Seven questions']);
  else if (!p || p.state === 'closed') todo.push(['period', p ? 'Start the next period' : 'Start a period', `brief v${b.briefs[b.briefs.length - 1].v}`]);
  if (p && p.state === 'draft') todo.push(['period', 'Fund the period', `${money(SEAT_COST)} a seat`]);
  if (p && p.state === 'funded') todo.push(['period', 'Open recruiting', `${p.seats} invite links`]);
  if (p && p.state === 'recruiting') todo.push(['period', 'Send the invite links', 'Recruitment kit is ready']);
  if (ready.length) todo.push(['issues', `${ready.length} issue${ready.length > 1 ? 's' : ''} ready to unlock`, `from ${money(Math.min(...ready.map((x) => x.tier.price)))}`]);
  if (unmarked) todo.push(['reviews', `${unmarked} review${unmarked > 1 ? 's' : ''} to mark`, 'will use · will not use · already doing']);
  if (queued) todo.push(['queue', `${queued} flag${queued > 1 ? 's' : ''} waiting on you`, 'AI triaged, a person decides']);
  if (due) todo.push(['payouts', `${due} payout${due > 1 ? 's' : ''} to send`, 'PayID, then mark paid']);
  return `<div class="tiles">
      <div class="tile"><div class="k">Period ${p ? p.no : '—'}</div><div class="v">${p ? STATE_LABEL[p.state] : 'None'}</div><div class="s">${p && p.at.opened ? 'opened ' + fmt(p.at.opened) : p ? 'created ' + fmt(p.at.created) : ''}</div></div>
      <div class="tile"><div class="k">Reviews</div><div class="v">${subs}<span class="muted" style="font-size:15px">/${p ? p.seats : 0}</span></div><div class="s">${b.reviews.filter((r) => r.scores).length} scored</div></div>
      <div class="tile"><div class="k">Issues</div><div class="v">${b.bugs.length}</div><div class="s">${ready.length} to unlock · ${b.bugs.filter((x) => x.unlocked).length} unlocked</div></div>
      <div class="tile"><div class="k">Credits</div><div class="v">${money(b.credits.balance)}</div><div class="s">${money(b.credits.locked)} locked</div></div></div>
    ${p ? `<div class="panel"><div class="body">${stepper()}</div></div>` : ''}
    <div class="grid"><div class="panel"><div class="head"><h2>Needs you</h2></div><div class="body tight">${todo.length ? `<div class="list">${todo.map(([pg, t, s]) => `<div><div><div class="strong">${esc(t)}</div><div class="sm muted">${esc(s)}</div></div>${btn('page', 'Open', `data-v="${pg}"`, 'btn sm')}</div>`).join('')}</div>` : '<div class="empty">Nothing waiting on you</div>'}</div></div>
      <div class="panel"><div class="head"><h2>Recent activity</h2>${btn('page', 'All', 'data-v="activity"', 'btn ghost sm')}</div><div class="body tight">${logRows(b.log.slice(-6).reverse())}</div></div></div>`;
}
function period() {
  const b = bv(), p = b.period, latest = b.briefs[b.briefs.length - 1];
  let action = '';
  if (!p || p.state === 'closed') action = latest ? `<div class="row between"><div class="sm muted">${p ? 'Closed ' + fmt(p.at.closed) : 'No period yet'}</div>${btn('newPeriod', p ? 'Start next period' : 'Start a period', '', 'btn primary')}</div>` : `<div class="callout info">Write the brief first. ${btn('page', 'Brief', 'data-v="brief"', 'btn sm')}</div>`;
  else if (p.state === 'draft') action = `<div class="row between"><div class="row"><div class="field"><label for="seats">Seats</label><input type="number" id="seats" min="3" max="50" value="${A.seats}" style="width:90px"></div><div class="sm muted">${money(FEE)} a review + ${FEE_PCT * 100}% fee = ${money(SEAT_COST)} a seat, locked until close. Unused seats refund.</div></div>${btn('fund', 'Fund period', '', 'btn primary')}</div>${b.credits.balance < A.seats * SEAT_COST ? `<div class="callout">Balance ${money(b.credits.balance)}, needs ${money(A.seats * SEAT_COST)}. ${btn('page', 'Add credits', 'data-v="credits"', 'btn sm')}</div>` : ''}`;
  else if (p.state === 'funded') action = `<div class="row between"><div><div class="strong">${money(p.cost)} locked</div><div class="sm muted">Opening issues ${p.seats} single-use invite links</div></div>${btn('recruit', 'Open recruiting', '', 'btn primary')}</div>`;
  else if (p.state === 'recruiting' || p.state === 'open') action = `<div class="row between"><div class="sm muted">Each reviewer has 14 days from accepting. Invites expire 14 days after the first acceptance.</div>${btn('endOpen', p.state === 'open' ? 'End open stage' : 'Cancel recruiting')}</div>`;
  else if (p.state === 'rating') action = `<div class="sm muted">Peer rating closes when all ratings are in, or 7 days after ${fmt(p.at.rating)}.</div>`;
  else if (p.state === 'settlement') action = `<div class="sm muted">Payouts release as flags resolve. An undecided flag releases after 7 days.</div>`;
  const knew = b.reviewers.filter((r) => r.knew === 'yes').length, declared = b.reviewers.filter((r) => r.knew).length;
  const recruiting = p && ['recruiting', 'open'].includes(p.state) && latest;
  return `<div class="panel"><div class="body stack">${p ? stepper() : ''}${action}</div></div>
    ${declared && knew > declared / 2 ? `<div class="callout">${knew} of ${declared} reviewers knew you before the invite. Kind reviews score low. Recruit from the kit below.</div>` : ''}
    ${p ? `<div class="panel"><div class="head"><h2>Seats</h2><span class="sm muted">${declared ? `${knew} of ${declared} knew you` : `brief v${p.briefV}`}</span></div><div class="body tight scroll"><table><thead><tr><th>Reviewer</th><th>Status</th><th class="r">Rep</th><th>Payout</th><th>Invite link</th></tr></thead><tbody>
      ${b.reviewers.map((r) => `<tr><td>${who(r)}</td><td>${seatChip(r)}</td><td class="r num">${r.rep}</td><td>${payoutChip(r)}</td><td>${r.link ? `<span class="row"><span class="code">${esc(r.link)}</span>${btn('copy', 'Copy', `data-text="${esc(r.link)}"`, 'btn sm')}</span>` : '<span class="faint">—</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Seats appear when recruiting opens</td></tr>'}</tbody></table></div></div>` : ''}
    ${recruiting ? `<div class="panel"><div class="head"><h2>Recruitment kit</h2>${btn('copy', 'Copy post', `data-text="${esc(post(latest, p))}"`, 'btn sm')}</div><div class="body stack"><p id="post">${esc(post(latest, p))}</p>
      <div class="scroll"><table><thead><tr><th>Where to post</th><th>Note</th></tr></thead><tbody>${PLACES.map(([a, n]) => `<tr><td>${esc(a)}</td><td class="muted">${esc(n)}</td></tr>`).join('')}</tbody></table></div></div></div>` : ''}`;
}
const post = (b, p) => `Paid, private feedback. ${b.product} Looking for ${p.seats} people who ${b.eligibility.replace(/\.$/, '').toLowerCase()}. ${b.job} ${money(FEE)} for an honest written review with your name on it, read by us and quoted only if you say so. Reply and I will send you a personal link.`;
function reviews() {
  const rows = bv().reviews.slice().sort((a, b) => ((b.scores || {}).usefulness || 0) - ((a.scores || {}).usefulness || 0));
  const p = bv().period;
  if (!rows.length && p && ['recruiting', 'open'].includes(p.state)) return `<div class="panel"><div class="empty">${bv().reviewCount} of ${p.seats} submitted. Reviews are revealed together when the open stage ends.</div></div>`;
  if (!rows.length) return `<div class="panel"><div class="empty">No reviews in this period</div></div>`;
  const by = Object.fromEntries(bv().reviewers.map((r) => [r.id, r]));
  return `<div class="panel"><div class="body tight scroll"><table><thead><tr><th>Reviewer</th><th class="r">Rep</th><th>Usefulness</th><th>On brief</th><th>Quality</th><th>Flags</th><th>Status</th></tr></thead><tbody>
    ${rows.map((rv) => { const r = by[rv.reviewerId] || {}; return `<tr class="click" data-act="open" data-kind="review" data-target="${rv.id}"><td>${who(r)}${r.knew === 'yes' ? ' <span class="chip warn plain" style="margin-left:6px">knew you</span>' : ''}${rv.consent ? ' <span class="chip accent plain" style="margin-left:6px">quotable</span>' : ''}</td><td class="r num">${r.rep}</td><td>${scoreCell(rv.scores)}</td><td class="num">${rv.scores ? rv.scores.onBrief : '—'}</td><td class="num">${rv.scores ? rv.scores.quality : '—'}</td><td>${rv.flags.length ? rv.flags.map(flagChip).join(' ') : '<span class="faint">—</span>'}</td><td>${rv.status ? chip(rv.status, 'accent', true) : '<span class="faint">—</span>'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function issues() {
  const bugs = bv().bugs.slice().sort((a, b) => ((b.scores || {}).usefulness ?? b.provisional ?? 0) - ((a.scores || {}).usefulness ?? a.provisional ?? 0));
  if (!bugs.length) return `<div class="panel"><div class="empty">Issues appear here as reviewers report them</div></div>`;
  const ready = bugs.filter((x) => x.scores && x.tier && !x.unlocked), total = ready.reduce((s, x) => s + x.tier.price, 0);
  return `<div class="row between"><span class="sm muted">Unlock spends credit before the text is shown. Price follows the peer score.</span>${ready.length > 1 ? btn('unlockAll', `Unlock all · ${money(total)}`, bv().credits.balance < total ? 'disabled' : '', 'btn sm') : ''}</div>
    <div class="panel"><div class="body tight scroll"><table style="min-width:560px"><thead><tr><th>Category</th><th>Issue</th><th>Usefulness</th><th class="r">Price</th><th></th></tr></thead><tbody>
    ${bugs.map((b) => { const final = !!b.scores; const price = b.unlocked ? chip('Unlocked', 'good') : !final ? '<span class="faint sm">pending</span>' : b.tier ? `<span class="num">${money(b.tier.price)}</span>` : '<span class="faint sm">not listed</span>';
      return `<tr class="${b.unlocked ? 'click' : ''}" ${b.unlocked ? `data-act="open" data-kind="bug" data-target="${b.id}"` : ''}><td>${chip(b.unlocked ? b.ai.category : (b.category || '…'), 'info', true)}</td><td>${b.unlocked ? `<span class="strong">${esc(b.title)}</span>` : `<span class="muted">${esc(b.teaser || 'Categorising…')}</span>`}${b.confirmations ? ` <span class="xs faint">+${b.confirmations} confirmed</span>` : ''}${b.status ? ' ' + chip(b.status, 'accent', true) : ''}</td><td>${final ? scoreCell(b.scores) : `<span class="faint sm">provisional ${b.provisional ?? '—'}</span>`}</td><td class="r">${price}</td><td class="r">${!b.unlocked && final && b.tier ? btn('unlock', 'Unlock', `data-target="${b.id}" ${bv().credits.balance < b.tier.price ? 'disabled' : ''}`, 'btn sm primary') : ''}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function credits() {
  const c = bv().credits;
  return `<div class="tiles"><div class="tile"><div class="k">Available</div><div class="v">${money(c.balance)}</div></div><div class="tile"><div class="k">Locked in period</div><div class="v">${money(c.locked)}</div></div></div>
    <div class="panel"><div class="head"><h2>Add credits</h2></div><div class="body"><div class="row"><div class="field"><label for="camt">Amount</label><input type="number" id="camt" min="1" value="200" style="width:120px"></div><div class="field" style="flex:1;min-width:160px"><label for="cnote">Note</label><input type="text" id="cnote" placeholder="e.g. bank transfer 12 Oct"></div><div class="field"><label>&nbsp;</label>${btn('credits', 'Add', '', 'btn primary')}</div></div><p class="help">Card payments are not connected in this build. Record what has been prepaid.</p></div></div>
    <div class="panel"><div class="head"><h2>Ledger</h2></div><div class="body tight scroll"><table><thead><tr><th>When</th><th>Entry</th><th class="r">Amount</th></tr></thead><tbody>${c.ledger.slice().reverse().map((l) => `<tr><td class="num faint">${fmt(l.at)}</td><td>${esc(l.what)}</td><td class="r num">${money(l.amt)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">No entries</td></tr>'}</tbody></table></div></div>`;
}
function briefPage() {
  const b = bv(), latest = b.briefs[b.briefs.length - 1], p = b.period;
  if (A.wizard) {
    const w = A.wizard, [key, q, help] = QUESTIONS[w.step], val = w.answers[key];
    return `<div class="panel wizard"><div class="body stack"><div class="row between"><span class="sm muted">${w.step + 1} of ${QUESTIONS.length}</span><div class="dots">${QUESTIONS.map((_, i) => `<i class="${i <= w.step ? 'on' : ''}"></i>`).join('')}</div></div><h2>${esc(q)}</h2>
      <div class="field">${key === 'kind' ? `<select id="wz" aria-label="Answer"><option value="b2c" ${val !== 'b2b' ? 'selected' : ''}>People (consumers)</option><option value="b2b" ${val === 'b2b' ? 'selected' : ''}>Businesses</option></select>` : `<textarea id="wz" aria-label="Answer">${esc(Array.isArray(val) ? val.join('\n') : val)}</textarea>`}${help ? `<div class="help">${esc(help)}</div>` : ''}</div>
      <div class="row between"><div>${w.step > 0 ? btn('wz-back', 'Back') : ''}</div><div class="row">${btn('wz-cancel', 'Cancel', '', 'btn ghost')}${btn('wz-next', w.step === QUESTIONS.length - 1 ? 'Save brief' : 'Continue', '', 'btn primary')}</div></div></div></div>`;
  }
  if (!latest) return `<div class="panel"><div class="hero"><h1>Write your brief</h1><p class="muted">Seven questions. They become the review form, the eligibility check and the scoring rubric.</p>${btn('wz-start', 'Start', '', 'btn primary')}</div></div>`;
  const active = p && !['draft', 'closed'].includes(p.state), inUse = p && p.briefV;
  return `<div class="panel"><div class="head"><div class="row"><h2>Brief</h2>${chip(`v${latest.v}`, 'accent')}${active && inUse !== latest.v ? chip(`period uses v${inUse}`, 'warn') : ''}</div>${btn('wz-start', 'Edit')}</div><div class="body">${active ? `<div class="callout info" style="margin-bottom:14px">Period ${p.no} is scored against v${inUse}. Edits create a new version for the next period.</div>` : ''}
    <dl class="kv"><dt>Sold to</dt><dd>${latest.kind === 'b2b' ? 'Businesses' : 'People'}</dd><dt>Product</dt><dd>${esc(latest.product)}</dd><dt>Audience</dt><dd>${esc(latest.audience) || '—'}</dd><dt>The job</dt><dd>${esc(latest.job)}</dd><dt>Wants to know</dt><dd>${latest.wants.map((w, i) => `${i + 1}. ${esc(w)}`).join('<br>')}</dd><dt>Known issues</dt><dd>${latest.known.map(esc).join('<br>') || '—'}</dd><dt>Will not change</dt><dd>${esc(latest.wontChange) || '—'}</dd><dt>Eligibility</dt><dd>${esc(latest.eligibility)}</dd></dl></div></div>
    ${b.briefs.length > 1 ? `<div class="panel"><div class="head"><h2>Versions</h2></div><div class="body tight"><div class="list">${b.briefs.slice().reverse().map((x) => `<div><span>v${x.v} <span class="muted sm">· ${fmt(x.at)}</span></span>${x.v === inUse ? chip('in use', 'accent') : ''}</div>`).join('')}</div></div></div>` : ''}`;
}
const activity = () => `<div class="panel"><div class="body tight">${logRows(bv().log.slice().reverse())}</div></div>`;

// ---------- platform pages ----------
function queue() {
  const a = av(); const open = a.flags.filter((f) => f.state === 'queued'), done = a.flags.filter((f) => f.state !== 'queued' && f.state !== 'triage');
  const card = (f) => `<div class="panel"><div class="head"><div class="row"><h2>${esc(f.reason)}</h2>${chip(f.reviewer.pseudonym, '', true)}${chip(`by ${f.source === 'ai' ? 'AI' : f.source === 'business' ? 'business' : 'peer'}`, '', true)}${f.reviewer.knew === 'yes' ? chip('knew business', 'warn') : ''}${f.reviewer.strikes ? chip(`${f.reviewer.strikes} strike`, 'bad') : ''}</div>${f.state === 'queued' ? `<span class="sm muted">auto-release ${fmt(f.at + 7 * 86400000)}</span>` : flagChip(f)}</div>
    <div class="body stack"><div class="qa"><div class="a sm">${esc(f.text)}</div></div>
    ${f.ai ? `<div class="callout ${f.ai.verdict === 'breach' ? 'bad' : f.ai.verdict === 'clear' ? 'good' : 'info'}">AI${f.ai.by === 'heuristic' ? ' (built-in)' : ''} · ${esc(f.ai.verdict)} · ${Math.round(f.ai.confidence * 100)}% · ${esc(f.ai.reasoning)}</div>` : ''}
    ${f.reply ? `<p class="sm">Reviewer: “${esc(f.reply)}”</p>` : ''}
    ${f.state === 'queued' ? `<div class="row">${btn('decide', 'Clear', `data-target="${f.id}" data-v="clear"`)}${btn('decide', 'Low quality', `data-target="${f.id}" data-v="low quality"`)}${btn('decide', 'Breach', `data-target="${f.id}" data-v="breach"`, 'btn danger')}</div>` : `<span class="sm muted">${esc(f.decidedBy || '')} · ${fmt(f.decidedAt)}</span>`}</div></div>`;
  return `${open.length ? open.map(card).join('') : `<div class="panel"><div class="empty">Queue is empty</div></div>`}${done.length ? `<h2 class="muted" style="margin-top:8px">Decided</h2>${done.slice().reverse().map(card).join('')}` : ''}`;
}
function payouts() {
  const rows = av().payouts.slice().sort((a, b) => (a.state === 'released' ? 0 : 1) - (b.state === 'released' ? 0 : 1) || b.at - a.at);
  if (!rows.length) return `<div class="panel"><div class="empty">Payouts appear here as fees release</div></div>`;
  return `<p class="sm muted">Pay by PayID from your bank, then mark it paid. The reviewer sees the change.</p><div class="panel"><div class="body tight scroll"><table><thead><tr><th>Reviewer</th><th>For</th><th>PayID</th><th class="r">Amount</th><th>State</th><th></th></tr></thead><tbody>
    ${rows.map((p) => `<tr><td class="strong">${esc(p.pseudonym)}</td><td>${p.kind === 'review' ? 'Review fee' : 'Issue · ' + esc(p.title)}<div class="xs faint">period ${p.periodNo} · ${fmt(p.at)}</div></td><td><span class="row"><span class="code">${esc(p.payid || '')}</span>${p.payid ? btn('copy', 'Copy', `data-text="${esc(p.payid)}"`, 'btn sm') : ''}</span></td><td class="r num">${money(p.amount)}</td><td>${chip(p.state === 'paid' ? 'Paid' : 'Released', p.state === 'paid' ? 'good' : 'accent')}</td><td class="r">${p.state === 'released' ? btn('markPaid', 'Mark paid', `data-kind="${p.kind}" data-target="${p.id}"`, 'btn sm primary') : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function reviewers() {
  return `<div class="panel"><div class="body tight scroll"><table><thead><tr><th>Pseudonym</th><th>Email</th><th class="r">Rep</th><th class="r">Scored</th><th>Account</th><th>Seat</th><th>Payout</th><th>Link</th></tr></thead><tbody>${av().reviewers.slice().reverse().map((r) => `<tr><td>${who(r)}</td><td class="sm">${esc(r.email || '—')}</td><td class="r num">${r.rep}</td><td class="r num">${r.scored}</td><td>${chip(r.status, r.status === 'active' ? 'good' : r.status === 'warned' ? 'warn' : 'bad')}</td><td>${seatChip(r)}</td><td>${payoutChip(r)}</td><td>${r.link ? btn('copy', 'Copy link', `data-text="${esc(r.link)}"`, 'btn sm') : '<span class="faint">—</span>'}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No reviewers yet</td></tr>'}</tbody></table></div></div>
    <p class="xs faint">Reputation = (60 × 5 + Σ usefulness) ÷ (5 + n). Emails, PayIDs and links are visible here only. Copy a link to resend it to someone who lost theirs.</p>`;
}
const plog = () => `<div class="panel"><div class="body tight">${logRows(av().log.slice().reverse())}</div></div>`;
function leads() {
  const rows = A.leads || [];
  const src = { invite: 'Invite page', submitted: 'After submitting', paid: 'After payout', ad: 'Landing page' };
  return `<p class="sm muted">People who asked for an account on the landing page. "Via" is the business whose reviewer flow brought them.</p><div class="panel"><div class="body tight scroll"><table><thead><tr><th>When</th><th>Email</th><th>What they make</th><th>Came from</th><th>Via</th></tr></thead><tbody>${rows.map((l) => `<tr><td class="num faint">${fmt(l.at)}</td><td class="strong">${esc(l.email)}</td><td>${esc(l.note) || '<span class="faint">—</span>'}</td><td>${chip(src[l.source] || 'Landing page', l.source && l.source !== 'ad' ? 'accent' : '', true)}</td><td class="sm">${esc(l.viaName) || '<span class="faint">—</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No leads yet</td></tr>'}</tbody></table></div></div>`;
}

// ---------- drawer ----------
function renderDrawer() {
  const d = A.drawer, el = $('#drawer'); el.className = 'drawer-wrap' + (d && bv() ? ' open' : ''); if (!d || !bv()) { el.innerHTML = ''; return; }
  const by = Object.fromEntries(bv().reviewers.map((r) => [r.id, r]));
  let head = '', body = '', foot = '';
  if (d.kind === 'review') {
    const rv = bv().reviews.find((x) => x.id === d.id); if (!rv) { A.drawer = null; return renderDrawer(); }
    const r = by[rv.reviewerId] || {}, b = bv().briefs.find((x) => x.v === rv.briefV);
    head = `<div>${who(r, true)}<div class="sm muted" style="margin-top:6px">Reputation ${r.rep} · knew you: ${esc(r.knew)} · brief v${rv.briefV} · ${fmt(rv.at)}${rv.consent ? ' · may be quoted with name, state and photo' : ' · private, not to be quoted'}</div></div>`;
    body = `${rv.scores ? `<div class="tiles"><div class="tile"><div class="k">Usefulness</div><div class="v">${rv.scores.usefulness}</div></div><div class="tile"><div class="k">On brief</div><div class="v">${rv.scores.onBrief}</div></div><div class="tile"><div class="k">Quality</div><div class="v">${rv.scores.quality}</div><div class="s">peers ${rv.scores.peer ?? '—'}</div></div></div>` : `<div class="callout info">Scores arrive when peer rating ends</div>`}
      ${rv.flags.map((f) => `<div class="callout ${f.state === 'decided' && f.decision === 'breach' ? 'bad' : f.state === 'queued' || f.state === 'triage' ? '' : 'good'}">${esc(f.reason)} · ${f.source === 'business' ? 'you' : f.source === 'ai' ? 'AI' : 'peer'} · ${esc(f.state === 'decided' ? f.decision : f.state)}</div>`).join('')}
      <div class="qa">${b.wants.map((q, i) => `<div><div class="q row between">${esc(q)}${rv.consent ? btn('quote', 'Copy as quote', `data-text="${esc(quoteText(r, rv.sections[i]))}"`, 'btn sm ghost') : ''}</div><div class="a">${esc(rv.sections[i])}</div></div>`).join('')}<div><div class="q">Tried to do · stopped at · would pay</div><div class="a">${rv.closing.map(esc).join('\n')}</div></div></div>`;
    foot = `<div class="grp">${statusBtns('review', rv.id, rv.status)}</div>${!rv.flags.some((f) => f.source === 'business') ? `<div class="grp"><select id="flag-${rv.id}" aria-label="Flag reason" style="width:auto;padding:5px 8px;font-size:12.5px"><option value="">Flag…</option>${FLAG_REASONS.map((x) => `<option>${x}</option>`).join('')}</select>${btn('flag', 'Flag', `data-target="${rv.id}"`, 'btn sm')}</div>` : ''}`;
  } else {
    const bg = bv().bugs.find((x) => x.id === d.id); if (!bg || !bg.unlocked) { A.drawer = null; return renderDrawer(); }
    const r = by[bg.reviewerId] || {};
    head = `<div><h2>${esc(bg.title)}</h2><div class="sm muted">${esc(bg.ai.category)} · ${esc(r.pseudonym)} · unlocked ${fmt(bg.unlockedAt)} · ${money(bg.tier.price)}</div></div>`;
    body = `<div class="tiles"><div class="tile"><div class="k">Usefulness</div><div class="v">${bg.scores.usefulness}</div></div><div class="tile"><div class="k">On brief</div><div class="v">${bg.scores.onBrief}</div></div><div class="tile"><div class="k">Confirmed by</div><div class="v">${bg.confirmations}</div></div></div>
      <div class="qa"><div><div class="q">Where</div><div class="a">${esc(bg.where) || '—'}</div></div><div><div class="q">What happened</div><div class="a">${esc(bg.happened)}</div></div><div><div class="q">Should happen instead</div><div class="a">${esc(bg.instead) || '—'}</div></div></div>`;
    foot = `<div class="grp">${statusBtns('bug', bg.id, bg.status)}</div>`;
  }
  el.innerHTML = `<div class="scrim2" data-act="close"></div><div class="drawer" role="dialog" aria-modal="true"><div class="dhead">${head}<button class="x" data-act="close" aria-label="Close">✕</button></div><div class="dbody">${body}</div><div class="dfoot">${foot}</div></div>`;
}

// ---------- events ----------
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el || el.tagName === 'SELECT') return;
  const act = el.dataset.act, target = el.dataset.target, v = el.dataset.v;
  const rerender = () => render();
  if (act === 'login') { try { await api('/api/auth', { action: 'login', passcode: $('#pass').value }); await boot(); } catch (e) { $('#loginerr').textContent = e.message; } return; }
  if (act === 'logout') { await api('/api/auth', { action: 'logout' }).catch(() => {}); A.auth = { loggedIn: false, configured: true }; A.d = null; A.id = null; return rerender(); }
  if (act === 'create') { const name = ($('#newname') || {}).value || prompt('Business name'); if (!name) return; try { const j = await api('/api/business', { action: 'create', name }); await loadList(); await loadBiz(j.id); A.page = 'brief'; toast('Created'); } catch (e) { toast(e.message, true); } return rerender(); }
  if (act === 'page') { A.page = v; A.side = false; A.drawer = null; return rerender(); }
  if (act === 'side') { A.side = !A.side; return rerender(); }
  if (act === 'open') { A.drawer = { kind: el.dataset.kind, id: target }; return rerender(); }
  if (act === 'close') { A.drawer = null; return rerender(); }
  if (act === 'copy' || act === 'quote') { const t = el.dataset.text; try { await navigator.clipboard.writeText(t); toast(act === 'quote' ? 'Quote copied, with the paid-review line' : 'Copied'); } catch (e) { toast('Select and copy it by hand', true); } return; }
  if (act === 'newPeriod') return act_({ action: 'newPeriod' }, 'Period created');
  if (act === 'fund') { A.seats = Math.max(3, Math.min(50, Number(($('#seats') || {}).value) || 5)); return act_({ action: 'fund', seats: A.seats }, (j) => `${money(j.business.period.cost)} locked`); }
  if (act === 'recruit') return act_({ action: 'recruit' }, 'Invite links ready');
  if (act === 'endOpen') return act_({ action: 'endOpen' }, 'Open stage ended');
  if (act === 'credits') return act_({ action: 'credits', amount: Number(($('#camt') || {}).value), note: ($('#cnote') || {}).value }, 'Credits added');
  if (act === 'unlock') return act_({ action: 'unlock', target }, (j) => { A.drawer = { kind: 'bug', id: target }; return 'Unlocked'; });
  if (act === 'unlockAll') return act_({ action: 'unlockAll' }, (j) => `${j.result} unlocked`);
  if (act === 'status') return act_({ action: 'status', kind: el.dataset.kind, target, status: v });
  if (act === 'flag') { const sel = $('#flag-' + target); if (!sel || !sel.value) return; return act_({ action: 'flag', target, reason: sel.value }, 'Flagged · triage started'); }
  if (act === 'decide') return act_({ action: 'decide', target, outcome: v }, v === 'breach' ? 'Breach recorded' : 'Flag closed');
  if (act === 'markPaid') return act_({ action: 'markPaid', kind: el.dataset.kind, target }, 'Marked paid');
  if (act === 'wz-start') { const last = bv().briefs[bv().briefs.length - 1]; A.wizard = { step: 0, answers: last ? { kind: last.kind || 'b2c', product: last.product, audience: last.audience, job: last.job, wants: [...last.wants], known: [...last.known], wontChange: last.wontChange, eligibility: last.eligibility } : { kind: 'b2c', product: '', audience: '', job: '', wants: [], known: [], wontChange: '', eligibility: '' } }; return rerender(); }
  if (act === 'wz-cancel') { A.wizard = null; return rerender(); }
  if (act === 'wz-back' || act === 'wz-next') {
    const w = A.wizard, key = QUESTIONS[w.step][0], raw = $('#wz').value;
    w.answers[key] = Array.isArray(w.answers[key]) ? raw.split('\n').map((s) => s.trim()).filter(Boolean) : raw.trim();
    if (act === 'wz-back') { w.step--; return rerender(); }
    if (w.step === QUESTIONS.length - 1) { const j = await act_({ action: 'brief', ...w.answers }, (x) => `Brief v${x.business.briefs.length} saved`); if (j) { A.wizard = null; render(); } return; }
    w.step++; return rerender();
  }
});
async function act_(body, msg) { A.busy = 'Saving'; render(); const j = await act(body, msg); A.busy = null; render(); return j; }
document.addEventListener('change', async (ev) => {
  const el = ev.target; if (el.dataset.act !== 'switch') return;
  if (el.value === '__new') { const name = prompt('Business name'); if (name) { try { const j = await api('/api/business', { action: 'create', name }); await loadList(); await loadBiz(j.id); A.page = 'brief'; } catch (e) { toast(e.message, true); } } return render(); }
  try { await loadBiz(el.value); A.page = 'overview'; } catch (e) { toast(e.message, true); } render();
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && (A.drawer || A.side)) { A.drawer = null; A.side = false; render(); } if (ev.key === 'Enter' && ev.target.id === 'pass') $('[data-act="login"]').click(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && A.id && !A.wizard) loadBiz(A.id).then(render).catch(() => {}); });
boot();
