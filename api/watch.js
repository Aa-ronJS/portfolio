'use strict';
/* GET /api/watch?t=<token>            the permanent link from the email
   GET /api/watch?session_id=<stripe>  the redirect straight after paying

   The second form checks with Stripe that the session was paid, then sends the
   browser to the first form, so the address bar holds the link they can keep. */

const { missing } = require('./_lib/config');
const { verify, sign } = require('./_lib/token');
const { getSession } = require('./_lib/stripe');
const { title, lessons, checklists, starter } = require('./_lib/course');
const { page, esc } = require('./_lib/page');

function html(res, status, body) {
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(body);
}

function renderCourse(email) {
  const lessonHtml = lessons.map((l) => `
    <section class="lesson">
      <div class="n">${l.n}<small>${l.minutes} min</small></div>
      <div>
        <h2>${esc(l.title)}</h2>
        <div class="video">${l.embed
          ? `<iframe src="${esc(l.embed)}" title="${esc(l.title)}" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
          : `<p class="mute">Not recorded yet. This is the beta: the video lands here within seven days of your purchase, and you will get one email when it does.</p>`}</div>
        <p class="dim">${esc(l.summary)}</p>
        <p class="donow"><b>Do this now.</b> ${esc(l.doNow)}</p>
      </div>
    </section>`).join('');

  const checkHtml = checklists.map((c) => `
    <section class="check">
      <p class="tag">${esc(c.n)}</p>
      <h2>${esc(c.title)}</h2>
      <p class="dim" style="margin-top:16px;max-inline-size:50ch">${esc(c.intro)}</p>
      ${c.sections.map((s) => `<h3>${esc(s.h)}</h3><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
    </section>`).join('');

  return page(title, `
    <main class="wrap">
      <p class="tag">${esc(title)}</p>
      <h1>Twenty-two minutes. Then draw something badly.</h1>
      <p class="dim" style="margin-top:32px;max-inline-size:50ch">Three videos, the prompt cards, two checklists, in order. Have the template open in a drawing app on your phone and Claude Code open in the browser. Each video ends with something to draw, record or send before the next one.</p>
      <p class="mute" style="margin-top:24px">This link is yours: ${esc(email)}. It works forever and it is fine to forward to your team. Print this page and the checklists come out clean.</p>
      ${lessonHtml}
      <section class="lesson">
        <div class="n">Then</div>
        <div>
          <h2>Send me the episode.</h2>
          <p class="dim" style="margin-top:24px;max-inline-size:50ch">When your first episode renders, reply to the email this link came in with the file or the link to where you posted it. I watch every one, and I answer with the one thing I would change. If you want the pipeline extended for your show, a character rigged that will not behave, or the whole account set up, that reply is where to say so; there is no form and no call unless you want one.</p>
        </div>
      </section>
    </main>
    <div class="bone"><div class="wrap">
      <section class="kit">
        <p class="tag">The prompt cards</p>
        <h2>What you say to Claude, in order.</h2>
        <p class="dim" style="margin-top:16px;max-inline-size:50ch">Word for word. Copy each one into Claude Code on your phone with the file attached, and change the names. You never open a terminal; the pipeline is public in the same repository and Claude runs it for you.</p>
        ${starter.map((c) => `<h3>${esc(c.name)}</h3><pre>${esc(c.body)}</pre>`).join('')}
      </section>
      ${checkHtml}
    </div></div>`, { raw: true });
}

module.exports = async (req, res) => {
  if (missing(['courseSecret']).length) return html(res, 500, page('Not configured', '<p>The course secret is not set on this deploy.</p>'));

  const q = req.query || {};
  if (q.session_id) {
    if (missing(['stripeKey']).length) return html(res, 500, page('Not configured', '<p>Stripe is not set on this deploy.</p>'));
    try {
      const s = await getSession(String(q.session_id));
      const email = (s.customer_details && s.customer_details.email) || s.customer_email;
      if (s.payment_status !== 'paid' || !email) return html(res, 402, page('Not paid yet', '<p>Stripe has not confirmed this payment. If you were charged, the link is in your email within a minute or two.</p><p><a class="link" href="/course/">Back to the course page</a></p>'));
      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(302, `/api/watch?t=${sign(email)}`);
    } catch (err) {
      console.error('watch session', err.message);
      return html(res, 502, page('Could not check the payment', '<p>Stripe did not answer. Your link is also in your email, so nothing is lost.</p>'));
    }
  }

  const email = verify(q.t ? String(q.t) : '');
  if (!email) return html(res, 403, page('That link is not right', '<p>The link is missing or has been changed. Open the one from the email, or reply to it and I will send another.</p><p><a class="link" href="/course/">The course page</a></p>'));
  return html(res, 200, renderCourse(email));
};
