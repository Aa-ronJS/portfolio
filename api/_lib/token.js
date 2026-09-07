'use strict';
/* Access links. A buyer's link is their email, signed. It never expires and it
   is the same every time, so the link in the receipt email is the link in the
   success redirect is the link they forward to a colleague. That last one is
   deliberate: the sales page says buy it once and show your team. */

const crypto = require('crypto');
const { cfg } = require('./config');

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url').toString('utf8');

function sign(email) {
  const e = email.trim().toLowerCase();
  const mac = crypto.createHmac('sha256', cfg.courseSecret).update(e).digest('base64url').slice(0, 32);
  return `${b64(e)}.${mac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  let email;
  try { email = unb64(token.slice(0, dot)); } catch { return null; }
  const expected = sign(email);
  const a = Buffer.from(token), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return email;
}

function accessUrl(email) {
  return `${cfg.siteUrl}/api/watch?t=${sign(email)}`;
}

module.exports = { sign, verify, accessUrl };
