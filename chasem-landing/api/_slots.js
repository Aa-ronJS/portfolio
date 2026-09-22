// Which days a customer may pick.
//
// The painter never tells us his calendar directly. His app already knows his jobs, his days off and his
// state's public holidays, so it sends the dates he cannot start on and the server just avoids them. That
// keeps one holiday calendar in the product instead of two that drift.
//
// "Not awkward" is the rest of it: whole-day starts on his working days, far enough ahead that he is not
// ambushed tomorrow, never a day he is already on something, and spread out rather than three days in one
// week so the choice is real.

export const DEFAULT_RULES = {
  days: [1, 2, 3, 4, 5],   // 0 = Sunday. Mondays to Fridays.
  hour: 8,                 // he starts at 8
  notice_days: 3,          // working days of warning, so nobody books him for tomorrow
  offer: 6,                // how many to put in front of the customer
  window_days: 28,         // how far ahead to look
};

export function rulesFor(painter) {
  const r = (painter && painter.rules) || {};
  const out = { ...DEFAULT_RULES };
  if (Array.isArray(r.days) && r.days.length) out.days = r.days.map(Number).filter((n) => n >= 0 && n <= 6);
  for (const k of ["hour", "notice_days", "offer", "window_days"]) if (Number.isFinite(Number(r[k]))) out[k] = Number(r[k]);
  out.hour = Math.max(5, Math.min(18, out.hour));
  out.offer = Math.max(1, Math.min(12, out.offer));
  out.window_days = Math.max(7, Math.min(120, out.window_days));
  out.notice_days = Math.max(0, Math.min(30, out.notice_days));
  return out;
}

const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; };

// A three-day job needs three clear days ON THE TOOLS, which may be Friday, Monday and Tuesday. A weekend in
// the middle is not a problem -- every painter works across one -- so it is stepped over rather than counted.
// A working day he is already on something, though, breaks the run.
function runClear(start, needed, working, busy) {
  let counted = 0;
  for (let i = 0; counted < needed; i++) {
    if (i > 180) return false;
    const d = addDays(start, i);
    if (!working.has(d.getUTCDay())) continue;       // weekend: not worked, not in the way
    if (busy.has(ymd(d))) return false;
    counted++;
  }
  return true;
}

/**
 * @param {object} opts
 *  rules      from rulesFor()
 *  busy       Set of 'YYYY-MM-DD' he cannot start on (his jobs, his days off, public holidays, other bookings)
 *  estDays    how long this job takes
 *  today      'YYYY-MM-DD' (the painter's today, not UTC's)
 * @returns ['YYYY-MM-DD', ...] spread across the window
 */
export function offerDays({ rules, busy, estDays = 1, today }) {
  const r = rules || DEFAULT_RULES;
  const working = new Set(r.days);
  const skip = busy instanceof Set ? busy : new Set(busy || []);
  const need = Math.max(1, Math.min(30, estDays || 1));

  // notice is counted in working days: three days' warning over a weekend still means three days on the tools
  let cursor = new Date(today + "T00:00:00Z");
  let left = r.notice_days;
  while (left > 0) { cursor = addDays(cursor, 1); if (working.has(cursor.getUTCDay())) left--; }
  if (r.notice_days === 0) cursor = addDays(cursor, 1); // never today

  const candidates = [];
  for (let i = 0; i <= r.window_days && candidates.length < 60; i++) {
    const d = addDays(cursor, i);
    if (!working.has(d.getUTCDay())) continue;
    if (skip.has(ymd(d))) continue;
    if (!runClear(d, need, working, skip)) continue;
    candidates.push(ymd(d));
  }
  if (candidates.length <= r.offer) return candidates;

  // Spread the choice out. Six consecutive days in one week is not a choice; six across a month is.
  const step = (candidates.length - 1) / (r.offer - 1);
  const picked = [];
  for (let i = 0; i < r.offer; i++) {
    const v = candidates[Math.round(i * step)];
    if (v && picked[picked.length - 1] !== v) picked.push(v);
  }
  return picked;
}

export function prettyDay(isoDay, tz = "Australia/Adelaide") {
  try {
    return new Date(isoDay + "T12:00:00Z").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
  } catch { return isoDay; }
}
