'use strict';
/* GET /api/pixel.js: the Meta Pixel bootstrap for the static sales page, with
   the id supplied from the environment so the page never carries it. With no
   id configured this is an empty script and the page is unaffected. */

const { cfg } = require('./_lib/config');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (!cfg.metaPixel || !/^\d{5,20}$/.test(cfg.metaPixel)) return res.status(200).end('/* no pixel configured */');
  res.status(200).end(
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');\n` +
    `fbq('init','${cfg.metaPixel}');fbq('track','PageView');\n` +
    `document.querySelectorAll('a[href="/api/checkout"]').forEach(function(a){a.addEventListener('click',function(){fbq('track','InitiateCheckout',{value:35,currency:'AUD'})})});\n`
  );
};
