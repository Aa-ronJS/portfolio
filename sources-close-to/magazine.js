/* Renders an issue document into six A4 pages. Pure function of (doc). */
(function (global) {
  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function photo(doc, i, cls) {
    const p = doc.photos[i]; if (!p) return '';
    const cap = (doc.magazine.photo_captions || [])[i] || p.caption || '';
    return `<figure class="photo ${cls || ''}"><img src="${esc(p.url)}" alt=""><figcaption>${esc(cap)}</figcaption></figure>`;
  }
  function folio(doc, n, total) {
    return `<div class="folio"><span>Sources Close To ${esc(doc.subject.name)}</span><span>Page ${n} of ${total}</span><span>${esc(doc.magazine.issue_line)}</span></div>`;
  }
  function render(doc) {
    const m = doc.magazine, s = doc.subject, total = 6;
    const cover = doc.photos[0];
    const pages = [];

    pages.push(`<section class="pg pg--cover">
      <div class="ears"><span>${esc(m.issue_line)}</span><span class="price">$4.20</span><span>Not for resale. Not for believing.</span></div>
      <h1 class="mast">Sources Close To<br>${esc(s.name)}<small>${esc(m.masthead_tagline)}</small></h1>
      <div class="cover-photo">${cover ? `<img src="${esc(cover.url)}" alt="">` : '<span class="nophoto">Photo withheld on legal advice</span>'}
        <div class="splash"><span class="k">${esc(m.cover.kicker)}</span><h1>${esc(m.cover.headline)}</h1><p class="stand">${esc(m.cover.standfirst)}</p><p class="cap">${esc(m.cover.caption)}</p></div>
      </div>
      <div class="teasers">${m.cover.teasers.slice(0, 4).map(t => `<div>${esc(t)}</div>`).join('')}</div>
    </section>`);

    pages.push(`<section class="pg">
      <span class="tag tag--red">Exclusive</span>
      <h2 class="hd hd--xl" style="margin-top:2mm">${esc(m.lead.headline)}</h2>
      <p class="byline">${esc(m.lead.byline)}</p>
      <div class="grid-3">
        <div class="body cols-2">${m.lead.paragraphs.slice(0, 3).map(p => `<p>${esc(p)}</p>`).join('')}<div class="pull">${esc(m.lead.pull_quote)}</div>${m.lead.paragraphs.slice(3).map(p => `<p>${esc(p)}</p>`).join('')}</div>
        <div>${photo(doc, 1) || photo(doc, 0)}<div class="stars"><h3 class="hd hd--m">Your stars: ${esc(m.horoscope.sign)}</h3><p style="margin:2mm 0 0">${esc(m.horoscope.reading)}</p><p class="lucky">${esc(m.horoscope.lucky)}</p></div></div>
      </div>
      ${folio(doc, 2, total)}
    </section>`);

    pages.push(`<section class="pg">
      <span class="tag">The Big Interview</span>
      <h2 class="hd hd--l" style="margin-top:2mm">${esc(m.interview.headline)}</h2>
      <div class="grid-2" style="margin-top:3mm">
        <div><p class="body" style="font-weight:700">${esc(m.interview.intro)}</p><dl class="qa">${m.interview.qa.map(x => `<dt>${esc(x.q)}</dt><dd>${esc(x.a)}</dd>`).join('')}</dl></div>
        <div>${photo(doc, 2)}<div class="box"><h3 class="hd hd--m">${esc(m.spotted.headline)}</h3><ul class="spotted">${m.spotted.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
          <div class="numbers"><h3 class="hd hd--s">By the numbers</h3><div class="numbers__grid">${m.numbers.map(x => `<div><b>${esc(x.figure)}</b><span>${esc(x.label)}</span></div>`).join('')}</div></div></div>
      </div>
      ${folio(doc, 3, total)}
    </section>`);

    pages.push(`<section class="pg">
      <span class="tag tag--red">Ranked</span>
      <h2 class="hd hd--l" style="margin-top:2mm">${esc(m.listicle.headline)}</h2>
      <div class="grid-2" style="margin-top:3mm">
        <ol class="list">${m.listicle.items.map(i => `<li><div><b>${esc(i.title)}</b><span>${esc(i.blurb)}</span></div></li>`).join('')}</ol>
        <div>${photo(doc, 3)}${photo(doc, 4)}<div class="box box--yellow"><h3 class="hd hd--m">${esc(m.agony.headline)}</h3><p class="body" style="margin-top:2mm"><i>${esc(m.agony.letter)}</i></p><p class="byline" style="margin:1mm 0 2mm">${esc(m.agony.signoff)}</p><p class="body">${esc(m.agony.reply)}</p></div>
          <div class="poll"><h3 class="hd hd--s">Readers' poll</h3><p class="poll__q">${esc(m.poll.question)}</p>${m.poll.results.map(r => `<div class="poll__row"><span>${esc(r.option)}</span><i style="--w:${Math.max(2, Math.min(100, Number(r.pct) || 0))}%"></i><b>${Math.round(Number(r.pct) || 0)}%</b></div>`).join('')}</div></div>
      </div>
      ${folio(doc, 4, total)}
    </section>`);

    pages.push(`<section class="pg">
      <span class="tag">Classifieds</span>
      <h2 class="hd hd--l" style="margin-top:2mm">Small ads. Big implications.</h2>
      <div class="classifieds" style="margin-top:4mm">${m.classifieds.map(c => `<div><b>${esc(c.heading)}</b>${esc(c.body)}</div>`).join('')}</div>
      ${doc.photos.length > 5 ? `<div class="grid-2" style="flex:0">${photo(doc, 5)}${photo(doc, 6)}</div>` : ''}
      <div class="grid-2" style="flex:1; margin-top:4mm; align-items:start">
        <div class="note" style="margin:0"><h3 class="hd hd--m">From the editor</h3><p>${esc(m.editors_note)}</p></div>
        <div class="next"><h3 class="hd hd--m">Coming next issue</h3><ul>${m.next_issue.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="small" style="font-size:8pt; margin-top:3mm; color:#555">Subscriptions not available. Tips always are.</p></div>
      </div>
      ${folio(doc, 5, total)}
    </section>`);

    pages.push(`<section class="pg">
      <div class="ad"><div class="tag" style="margin-bottom:6mm">Advertisement</div><div class="brand">${esc(m.ad.brand)}</div><div class="slogan">${esc(m.ad.slogan)}</div><p class="fine">${esc(m.ad.fine_print)}</p></div>
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:5mm">
        <div class="small" style="font-size:7.5pt; max-width:110mm; color:#555">Sources Close To is a one-issue newspaper made by the people who love ${esc(s.name)}, from tips they sent in anonymously. Any resemblance to the truth is their fault. Made at sourcescloseto.com.</div>
        <div class="barcode" aria-hidden="true"></div>
      </div>
      ${folio(doc, 6, total)}
    </section>`);

    return `<div class="mag">${pages.join('')}</div>`;
  }
  global.Magazine = { render, esc };
})(window);
