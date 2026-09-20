/* Quote & Chase measuring component. Mount with QCMeasure.mount(rootElement, { onSave: fn(wallRecord), count: fn, ceilingM: fn })
 *
 * How it measures without anything printed:
 *  1. Four taps on the wall's corners give the perspective of the wall plane (a homography from a unit square).
 *  2. The camera's focal length pins down the wall's real shape (width to height ratio). It comes from the
 *     photo's EXIF when present, otherwise from the wall's own corners (the two plane directions must be
 *     perpendicular, which solves for f), otherwise a 26 mm equivalent default. In a near-frontal shot the
 *     shape barely depends on f anyway.
 *  3. One known length sets the scale: the ceiling height (typed once per room), a door in the shot (2040 mm),
 *     a power point plate (116 mm), or anything measured with a tape. Doors and windows follow from two taps.
 *  A printed measure sheet, if one happens to be in the shot, is still recognised and used automatically.
 */
(function(){
  'use strict';
  var TEMPLATE =
    '<div class="qm">' +
    '<div data-part="intro">' +
      '<p class="muted">Stand back so the whole wall is in the shot, corner to corner. Lights on. You will tap the corners next.</p>' +
      '<div class="row"><label class="btn tape">Take the photo<input type="file" data-part="photo" accept="image/*" capture="environment"></label>' +
      '<label class="btn ghost">Choose from photos<input type="file" data-part="photolib" accept="image/*"></label></div>' +
    '</div>' +
    '<div data-part="work" hidden>' +
      '<div class="row" style="justify-content:space-between"><input type="text" data-part="wallname" placeholder="Wall, e.g. window wall" style="flex:1 1 10em">' +
      '<label class="btn ghost sm">New photo<input type="file" data-part="photo2" accept="image/*" capture="environment"></label>' +
      '<label class="btn ghost sm">From photos<input type="file" data-part="photo2lib" accept="image/*"></label></div>' +
      '<div class="stage" data-part="stage"><canvas data-part="view"></canvas><div class="loupe" data-part="loupe"><canvas data-part="loupecv" width="140" height="140"></canvas></div></div>' +
      '<p class="status" data-part="status">Loading photo…</p>' +
      '<div class="row"><button class="btn sm" data-mode="wall">Wall</button><button class="btn sm" data-mode="door">Door</button><button class="btn sm" data-mode="window">Window</button>' +
      '<button class="btn ghost sm" data-mode="wall2">Can\'t see all corners</button><button class="btn ghost sm" data-part="undo">Undo tap</button></div>' +
      '<p class="hint" data-part="modehint"></p>' +
      '<div class="row" data-part="rescalerow" hidden><button class="btn tape sm" data-part="rescale">Size the wall from this door instead</button><span class="hint">Doors are 2.04 m; ceilings vary.</span></div>' +
      '<div class="scalebox" data-part="scalebox" hidden>' +
        '<b data-part="scaletitle">Sized from an assumed ceiling. Better: use a door.</b>' +
        '<div class="row"><button class="btn tape" data-scale="door">Tap a door top and bottom (2.04 m)</button><button class="btn ghost sm" data-scale="gpo">A power point, 116 mm</button><button class="btn ghost sm" data-scale="tape">Something you measured</button></div>' +
        '<div class="row" data-part="scaleval" hidden><label class="f">Length, mm<input type="number" step="1" min="20" data-part="refmm" style="width:8em"></label><span class="hint" data-part="scalehint"></span></div>' +
        '<details><summary class="hint">No door in the shot? Use the ceiling height</summary>' +
        '<div class="row" style="margin-top:8px"><label class="f" style="flex:1 1 7em">Ceiling height, m<span>floor to ceiling, measured with a tape</span><input type="number" step="0.01" min="1.8" max="6" data-part="ceiling"></label>' +
        '<label class="f" style="flex:1 1 10em">Where you tapped<select data-part="tapsat"><option value="0">ceiling line and floor</option><option value="180">below the cornice, above the skirting</option></select></label>' +
        '<button class="btn sm" data-scale="ceiling">Use ceiling height</button></div></details>' +
      '</div>' +
      '<div class="scalebox" data-part="refbox" hidden>' +
        '<b>Tap the four corners of something we know the size of.</b>' +
        '<div class="row"><button class="btn sm" data-ref="door">Door leaf 820 × 2040</button><button class="btn sm" data-ref="gpo">Power point 116 × 76</button><button class="btn sm" data-ref="a4">A4 paper 210 × 297</button><button class="btn sm" data-ref="card">Bank card 86 × 54</button></div>' +
        '<div class="row"><label class="f">Width mm<input type="number" data-part="refw" style="width:7em"></label><label class="f">Height mm<input type="number" data-part="refh" style="width:7em"></label><span class="hint">Edit if yours is different. Then tap top-left, top-right, bottom-right, bottom-left.</span></div>' +
      '</div>' +
      '<table data-part="items"><thead><tr><th>Item</th><th class="n">Width</th><th class="n">Height</th><th class="n">Area</th><th></th></tr></thead><tbody></tbody></table>' +
      '<div class="row" style="justify-content:space-between"><span class="hint" data-part="confidence"></span><button class="btn sm" data-part="savewall">Save this wall</button></div>' +
    '</div></div>';

  // Optional printed sheet (kept for anyone who has one). Units mm, origin top-left of A4.
  var SHEET = { dictionary: 'ARUCO_MIP_36h12', markerMm: 68, insetMm: 8.5, markers: { 0: {x: 15, y: 15}, 1: {x: 110, y: 15}, 2: {x: 15, y: 197}, 3: {x: 110, y: 197} } };
  var REFS = { door: { w: 820, h: 2040, label: 'door leaf' }, gpo: { w: 116, h: 76, label: 'power point plate' }, a4: { w: 210, h: 297, label: 'A4 sheet' }, card: { w: 85.6, h: 53.98, label: 'bank card' } };
  var SCALES = { door: { mm: 2040, label: 'door height', hint: 'Tap the top edge of the door leaf, then the bottom edge, at the same spot across.', err: 3 },
                 gpo: { mm: 116, label: 'power point width', hint: 'Tap the left edge of the plate, then the right edge. Zoom in with the loupe.', err: 3.5 },
                 tape: { mm: 1000, label: 'tape length', hint: 'Tap one end, then the other, of the thing you measured. Type its length.', err: 1.5 },
                 ceiling: { label: 'ceiling height', err: 2 }, inherited: { label: 'height from an earlier wall in this room', err: 2.5 }, assumed: { label: 'assumed ceiling height', err: 6 } };

  // ---------- Linear algebra
  function solve(A, b){
    var n = A.length, i, j, k;
    for (i = 0; i < n; i++) {
      var p = i; for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
      var t = A[i]; A[i] = A[p]; A[p] = t; var tb = b[i]; b[i] = b[p]; b[p] = tb;
      if (Math.abs(A[i][i]) < 1e-12) return null;
      for (k = i + 1; k < n; k++) { var f = A[k][i] / A[i][i]; for (j = i; j < n; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
    return x;
  }
  function normaliser(pts){
    var n = pts.length, cx = 0, cy = 0, i; for (i = 0; i < n; i++) { cx += pts[i].x; cy += pts[i].y; } cx /= n; cy /= n;
    var d = 0; for (i = 0; i < n; i++) d += Math.hypot(pts[i].x - cx, pts[i].y - cy); d /= n; var s = Math.SQRT2 / (d || 1);
    return { T: [[s, 0, -s * cx], [0, s, -s * cy], [0, 0, 1]], apply: function(p){ return { x: s * (p.x - cx), y: s * (p.y - cy) }; } };
  }
  function mul3(A, B){ var C = [[0,0,0],[0,0,0],[0,0,0]]; for (var i=0;i<3;i++) for (var j=0;j<3;j++) for (var k=0;k<3;k++) C[i][j] += A[i][k]*B[k][j]; return C; }
  function inv3(m){
    var a=m[0][0],b=m[0][1],c=m[0][2],d=m[1][0],e=m[1][1],f=m[1][2],g=m[2][0],h=m[2][1],i=m[2][2];
    var A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C; if (Math.abs(det)<1e-14) return null;
    return [[A/det,-(b*i-c*h)/det,(b*f-c*e)/det],[B/det,(a*i-c*g)/det,-(a*f-c*d)/det],[C/det,-(a*h-b*g)/det,(a*e-b*d)/det]];
  }
  function homography(src, dst){ // src plane pts -> dst image pts, n >= 4, least squares with normalisation
    var Ns = normaliser(src), Nd = normaliser(dst), n = src.length, i;
    var AtA = [], Atb = []; for (i = 0; i < 8; i++) { AtA.push([0,0,0,0,0,0,0,0]); Atb.push(0); }
    function acc(row, rhs){ for (var r = 0; r < 8; r++) { Atb[r] += row[r] * rhs; for (var c = 0; c < 8; c++) AtA[r][c] += row[r] * row[c]; } }
    for (i = 0; i < n; i++) { var s = Ns.apply(src[i]), d = Nd.apply(dst[i]); acc([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y], d.x); acc([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y], d.y); }
    var h = solve(AtA, Atb); if (!h) return null;
    var Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]], TdInv = inv3(Nd.T); if (!TdInv) return null;
    return mul3(mul3(TdInv, Hn), Ns.T);
  }
  function apply(H, p){ var w = H[2][0]*p.x + H[2][1]*p.y + H[2][2]; return { x: (H[0][0]*p.x + H[0][1]*p.y + H[0][2]) / w, y: (H[1][0]*p.x + H[1][1]*p.y + H[1][2]) / w }; }

  // ---------- Camera geometry. H maps the unit square (u right, v down) onto the image. With K = [f 0 cx; 0 f cy; 0 0 1],
  // K^-1 h1 and K^-1 h2 are the plane's two axes scaled by the rectangle's real width and height, so their length
  // ratio is the height:width ratio, and their perpendicularity solves for f.
  function gvec(H, col, f, cx, cy){ var h = [H[0][col], H[1][col], H[2][col]]; return [(h[0] - cx * h[2]) / f, (h[1] - cy * h[2]) / f, h[2]]; }
  function aspectFromH(H, f, cx, cy){ var g1 = gvec(H, 0, f, cx, cy), g2 = gvec(H, 1, f, cx, cy); return Math.hypot(g2[0], g2[1], g2[2]) / Math.hypot(g1[0], g1[1], g1[2]); }
  function focalFromH(H, cx, cy){
    var h1 = [H[0][0], H[1][0], H[2][0]], h2 = [H[0][1], H[1][1], H[2][1]];
    var a1 = h1[0] - cx * h1[2], a2 = h2[0] - cx * h2[2], b1 = h1[1] - cy * h1[2], b2 = h2[1] - cy * h2[2], den = h1[2] * h2[2], num = -(a1 * a2 + b1 * b2);
    if (Math.abs(den) < 1e-18 || num / den <= 0) return null; return Math.sqrt(num / den);
  }
  function f35ToPx(f35, w, h){ return f35 * Math.hypot(w, h) / 43.27; }

  // ---------- EXIF: FocalLengthIn35mmFilm from a JPEG, nothing else
  function exifFocal35(buf){
    try {
      var d = new DataView(buf), n = d.byteLength; if (n < 4 || d.getUint16(0) !== 0xFFD8) return null;
      var p = 2;
      while (p + 4 < n) {
        if (d.getUint8(p) !== 0xFF) return null; var marker = d.getUint8(p + 1), len = d.getUint16(p + 2);
        if (marker === 0xE1 && p + 10 < n && d.getUint32(p + 4) === 0x45786966) { // "Exif"
          var t = p + 10, le = d.getUint16(t) === 0x4949, u16 = function(o){ return d.getUint16(o, le); }, u32 = function(o){ return d.getUint32(o, le); };
          if (u16(t + 2) !== 42) return null;
          var ifd0 = t + u32(t + 4), cnt = u16(ifd0), i, exifIfd = 0, f35 = null, fmm = null;
          for (i = 0; i < cnt; i++) { var e = ifd0 + 2 + i * 12; if (u16(e) === 0x8769) exifIfd = t + u32(e + 8); }
          if (exifIfd) { cnt = u16(exifIfd); for (i = 0; i < cnt; i++) { var e2 = exifIfd + 2 + i * 12, tag = u16(e2), typ = u16(e2 + 2); if (tag === 0xA405) f35 = typ === 3 ? u16(e2 + 8) : u32(e2 + 8); if (tag === 0x920A && typ === 5) { var o = t + u32(e2 + 8); fmm = u32(o) / (u32(o + 4) || 1); } } }
          return f35 && f35 > 5 && f35 < 400 ? { f35: f35, fmm: fmm } : null;
        }
        if (marker === 0xDA) return null; p += 2 + len;
      }
    } catch (e) {} return null;
  }

  function mount(root, opts){
    opts = opts || {}; root.innerHTML = TEMPLATE;
    var q = function(part){ return root.querySelector('[data-part="' + part + '"]'); };
    var view = q('view'), ctx = view.getContext('2d'), stage = q('stage'), loupe = q('loupe'), loupecv = q('loupecv'), lctx = loupecv.getContext('2d'), status = q('status');
    var S = { img: null, w: 0, h: 0, gray: null, exif: null, f: null, fSource: '', markers: [], H: null, Hinv: null, planeSrc: '', mode: 'wall', pending: null, taps: [], rect: null, scale: null, ref: null, items: [], photoName: '' };
    function say(msg, cls){ status.textContent = msg; status.className = 'status ' + (cls || ''); }
    function fmt(mm){ return (mm / 1000).toFixed(2); }

    // ---------- Photo
    function loadFile(file){
      if (!file) return; S.photoName = file.name || 'photo'; say('Reading the photo…');
      var fr = new FileReader(); fr.onload = function(){ S.exif = exifFocal35(fr.result); }; fr.onerror = function(){ S.exif = null; }; fr.readAsArrayBuffer(file.slice(0, 1 << 19));
      var p = (window.createImageBitmap ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function(){ return createImageBitmap(file); }) : Promise.reject());
      p.catch(function(){ return new Promise(function(res, rej){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = rej; im.src = URL.createObjectURL(file); }); })
       .then(function(bmp){ setImage(bmp); }).catch(function(){ say('Could not read that photo. Try a JPG or PNG.', 'bad'); });
    }
    function setImage(bmp){
      var maxDim = 3200, w = bmp.width, h = bmp.height, sc = Math.min(1, maxDim / Math.max(w, h)); w = Math.round(w * sc); h = Math.round(h * sc);
      var off = document.createElement('canvas'); off.width = w; off.height = h; var oc = off.getContext('2d'); oc.drawImage(bmp, 0, 0, w, h);
      S.img = off; S.w = w; S.h = h;
      var d = oc.getImageData(0, 0, w, h).data, g = new Float32Array(w * h); for (var i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299*d[j] + 0.587*d[j+1] + 0.114*d[j+2];
      S.gray = g; S.items = []; S.pending = null; S.taps = []; S.rect = null; S.scale = null; S.ref = null; S.H = null; S.Hinv = null; S.planeSrc = ''; S.markers = [];
      view.width = w; view.height = h; q('intro').hidden = true; q('work').hidden = false; q('scalebox').hidden = true; q('refbox').hidden = true;
      draw(); renderItems(); setMode('wall'); detectSheet();
    }

    // ---------- Sub-pixel corner refinement on the full-resolution grey image
    function gray(x, y){ // bilinear
      if (x < 0 || y < 0 || x >= S.w - 1 || y >= S.h - 1) return 128;
      var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, g = S.gray, w = S.w;
      var a = g[y0*w + x0], b = g[y0*w + x0 + 1], c = g[(y0+1)*w + x0], d = g[(y0+1)*w + x0 + 1];
      return a*(1-fx)*(1-fy) + b*fx*(1-fy) + c*(1-fx)*fy + d*fx*fy;
    }
    function fitLine(pts){ // total least squares
      var n = pts.length, cx = 0, cy = 0, i; for (i = 0; i < n; i++) { cx += pts[i].x; cy += pts[i].y; } cx /= n; cy /= n;
      var sxx = 0, sxy = 0, syy = 0; for (i = 0; i < n; i++) { var dx = pts[i].x - cx, dy = pts[i].y - cy; sxx += dx*dx; sxy += dx*dy; syy += dy*dy; }
      var theta = 0.5 * Math.atan2(2 * sxy, sxx - syy); return { x: cx, y: cy, dx: Math.cos(theta), dy: Math.sin(theta) };
    }
    function intersect(l1, l2){
      var den = l1.dx * l2.dy - l1.dy * l2.dx; if (Math.abs(den) < 1e-9) return null;
      var t = ((l2.x - l1.x) * l2.dy - (l2.y - l1.y) * l2.dx) / den; return { x: l1.x + t * l1.dx, y: l1.y + t * l1.dy };
    }
    function refineQuad(q){
      var cx = 0, cy = 0, i; for (i = 0; i < 4; i++) { cx += q[i].x; cy += q[i].y; } cx /= 4; cy /= 4;
      var lines = [];
      for (i = 0; i < 4; i++) {
        var a = q[i], b = q[(i+1)%4], len = Math.hypot(b.x-a.x, b.y-a.y); if (len < 12) return q;
        var ux = (b.x-a.x)/len, uy = (b.y-a.y)/len, nx = -uy, ny = ux;
        var mx = (a.x+b.x)/2, my = (a.y+b.y)/2; if ((mx-cx)*nx + (my-cy)*ny < 0) { nx = -nx; ny = -ny; } // outward normal
        var R = Math.max(3, Math.min(12, len * 0.04)), pts = [], k;
        for (k = 0; k < 16; k++) {
          var t = 0.12 + 0.76 * k / 15, px = a.x + ux*len*t, py = a.y + uy*len*t, best = -1, bs = 0, s, grads = [];
          for (s = -R; s <= R; s += 1) { var g1 = gray(px + (s-1)*nx, py + (s-1)*ny), g2 = gray(px + (s+1)*nx, py + (s+1)*ny); var gr = Math.abs(g2 - g1); grads.push(gr); if (gr > best) { best = gr; bs = s; } }
          if (best < 8) continue;
          var idx = bs + R, sub = 0; if (idx > 0 && idx < grads.length - 1) { var gm = grads[idx-1], g0 = grads[idx], gp = grads[idx+1], den = gm - 2*g0 + gp; if (Math.abs(den) > 1e-6) sub = 0.5 * (gm - gp) / den; }
          pts.push({ x: px + (bs+sub)*nx, y: py + (bs+sub)*ny });
        }
        if (pts.length < 6) return q;
        lines.push(fitLine(pts));
      }
      var out = [];
      for (i = 0; i < 4; i++) { var p = intersect(lines[(i+3)%4], lines[i]); if (!p || Math.hypot(p.x - q[i].x, p.y - q[i].y) > 6) return q; out.push(p); }
      return out;
    }

    // ---------- Optional sheet detection (a bonus, never required)
    function detectAt(maxDet){
      if (!window.AR || !AR.Detector) return [];
      var sc = Math.min(1, maxDet / Math.max(S.w, S.h)), dw = Math.round(S.w * sc), dh = Math.round(S.h * sc);
      var c = document.createElement('canvas'); c.width = dw; c.height = dh; var cc = c.getContext('2d'); cc.drawImage(S.img, 0, 0, dw, dh);
      var det = new AR.Detector({ dictionaryName: SHEET.dictionary, maxHammingDistance: 2 }), found = det.detect(cc.getImageData(0, 0, dw, dh)), ms = [], seen = {};
      found.forEach(function(m){ if (!(m.id in SHEET.markers) || seen[m.id]) return; seen[m.id] = true; ms.push({ id: m.id, corners: refineQuad(m.corners.map(function(p){ return { x: p.x / sc, y: p.y / sc }; })) }); });
      return ms;
    }
    function detectSheet(){
      setTimeout(function(){
        var ms = []; try { ms = detectAt(1600); if (ms.length && ms.length < 4) { var ms2 = detectAt(3200); if (ms2.length > ms.length) ms = ms2; } } catch (e) { ms = []; }
        S.markers = ms; if (!ms.length) return;
        var M = SHEET.markerMm, best = null;
        for (var rot = 0; rot < 4; rot++) {
          var src = [], dst = [];
          ms.forEach(function(m){ var o = SHEET.markers[m.id], ox = o.x + SHEET.insetMm, oy = o.y + SHEET.insetMm, plane = [{x: ox, y: oy}, {x: ox + M, y: oy}, {x: ox + M, y: oy + M}, {x: ox, y: oy + M}]; for (var i = 0; i < 4; i++) { src.push(plane[i]); dst.push(m.corners[(i + rot) % 4]); } });
          var Hc = homography(src, dst); if (!Hc) continue; var e = 0; for (var i2 = 0; i2 < src.length; i2++) { var pp = apply(Hc, src[i2]); e += Math.hypot(pp.x - dst[i2].x, pp.y - dst[i2].y); } e /= src.length;
          if (!best || e < best.e) best = { H: Hc, e: e, rot: rot };
        }
        if (best && best.e < 4) { S.sheet = best; S.rotation = best.rot; draw(); say('Measure sheet spotted, it will set the scale. Tap the top-left corner of the wall.', 'ok'); }
      }, 30);
    }

    // ---------- Drawing
    function draw(){
      ctx.clearRect(0, 0, S.w, S.h); if (S.img) ctx.drawImage(S.img, 0, 0);
      var lw = Math.max(2, S.w / 500);
      S.markers.forEach(function(m){ ctx.strokeStyle = '#37d67a'; ctx.lineWidth = lw; ctx.beginPath(); m.corners.forEach(function(p, i){ i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke(); });
      if (S.ref) { ctx.strokeStyle = '#37d67a'; ctx.lineWidth = lw; ctx.beginPath(); S.ref.px.forEach(function(p, i){ i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke(); }
      if (S.scale && S.scale.px) { ctx.strokeStyle = '#37d67a'; ctx.lineWidth = lw * 1.5; ctx.beginPath(); ctx.moveTo(S.scale.px[0].x, S.scale.px[0].y); ctx.lineTo(S.scale.px[1].x, S.scale.px[1].y); ctx.stroke(); }
      if (S.rect && !S.items.some(function(i){ return i.type === 'wall'; })) { ctx.strokeStyle = '#2B7BD6'; ctx.setLineDash([lw * 3, lw * 3]); ctx.lineWidth = lw; ctx.beginPath(); S.rect.px.forEach(function(p, i){ i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); }
      S.items.forEach(function(it){ drawRect(it, lw); });
      ctx.fillStyle = '#ff5a36';
      if (S.pending) { ctx.beginPath(); ctx.arc(S.pending.img.x, S.pending.img.y, lw * 3, 0, 7); ctx.fill(); }
      S.taps.forEach(function(t){ ctx.beginPath(); ctx.arc(t.x, t.y, lw * 3, 0, 7); ctx.fill(); });
    }
    function frameH(it){ return it.frame === 'wall' ? (S.rect && S.rect.Hw) : S.H; }
    function drawRect(it, lw){
      var Hf = frameH(it); if (!Hf) return;
      var col = it.type === 'wall' ? '#2B7BD6' : it.type === 'door' ? '#F2A33C' : '#B36CE6';
      var c = [{x: it.x1, y: it.y1}, {x: it.x2, y: it.y1}, {x: it.x2, y: it.y2}, {x: it.x1, y: it.y2}].map(function(p){ return apply(Hf, p); });
      ctx.strokeStyle = col; ctx.lineWidth = lw * 1.5; ctx.beginPath(); c.forEach(function(p, i){ i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold ' + Math.round(S.w / 60) + 'px system-ui, sans-serif';
      var mid = apply(Hf, { x: (it.x1 + it.x2) / 2, y: it.y1 }); ctx.fillText(fmt(it.w) + ' × ' + fmt(it.h) + ' m', mid.x - S.w / 30, mid.y - lw * 4);
    }

    // ---------- Taps with a loupe
    function toImg(ev){ var r = view.getBoundingClientRect(); return { x: (ev.clientX - r.left) * S.w / r.width, y: (ev.clientY - r.top) * S.h / r.height }; }
    var down = null;
    stage.addEventListener('pointerdown', function(ev){ if (!S.img) return; ev.preventDefault(); down = toImg(ev); showLoupe(ev, down); });
    stage.addEventListener('pointermove', function(ev){ if (!down) return; ev.preventDefault(); down = toImg(ev); showLoupe(ev, down); });
    stage.addEventListener('pointerup', function(ev){ if (!down) return; ev.preventDefault(); var p = down; down = null; loupe.style.display = 'none'; placePoint(p); });
    stage.addEventListener('pointercancel', function(){ down = null; loupe.style.display = 'none'; });
    function showLoupe(ev, p){
      var r = view.getBoundingClientRect(), zoom = 2.5, sz = 140 / zoom;
      lctx.fillStyle = '#000'; lctx.fillRect(0, 0, 140, 140); lctx.drawImage(S.img, p.x - sz / 2, p.y - sz / 2, sz, sz, 0, 0, 140, 140);
      var lx = ev.clientX - r.left - 70, ly = ev.clientY - r.top - 170; if (ly < 0) ly = ev.clientY - r.top + 30;
      loupe.style.left = Math.max(0, Math.min(r.width - 140, lx)) + 'px'; loupe.style.top = ly + 'px'; loupe.style.display = 'block';
    }

    // ---------- The wall frame from four corners
    var ORDER = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
    function chooseFocal(Hw){
      var cx = S.w / 2, cy = S.h / 2, f26 = f35ToPx(26, S.w, S.h), out = { f: f26, source: 'default 26 mm' };
      if (S.exif && S.exif.f35) out = { f: f35ToPx(S.exif.f35, S.w, S.h), source: 'photo data, ' + S.exif.f35 + ' mm equivalent' };
      // self-calibration from the wall itself, trusted when it is stable against tap noise
      var fe = focalFromH(Hw, cx, cy);
      if (fe && fe > 0.4 * f26 && fe < 2.6 * f26) {
        var lo = fe, hi = fe, d = Math.max(2, S.w / 1500), pats = [[d,0,0,0],[0,d,0,0],[0,0,d,0],[0,0,0,d],[-d,0,0,-d],[0,-d,-d,0],[d,-d,d,-d],[-d,d,-d,d]];
        pats.forEach(function(pt){ var pts = S.rect.px.map(function(p, i){ return { x: p.x + pt[i], y: p.y - pt[(i + 1) % 4] }; }); var H2 = homography([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}], pts), f2 = H2 && focalFromH(H2, cx, cy); if (f2) { lo = Math.min(lo, f2); hi = Math.max(hi, f2); } });
        if (hi / lo < 1.35) {
          var fx = S.exif && S.exif.f35 ? f35ToPx(S.exif.f35, S.w, S.h) : 0;
          if (fx && Math.abs(fe / fx - 1) < 0.15) out = { f: fx, source: 'photo data, ' + S.exif.f35 + ' mm equivalent, confirmed by the wall corners' };
          else out = { f: fe, source: 'worked out from the wall corners' + (fx ? ' (the photo data disagreed, so it looks cropped or zoomed)' : '') };
        }
      }
      return out;
    }
    function setWallFrame(taps){
      var Hw = homography([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}], taps), HwInv = Hw && inv3(Hw); if (!Hw || !HwInv) return false;
      // sanity: the quad should be convex and in order
      var area = 0; for (var i = 0; i < 4; i++) { var a = taps[i], b = taps[(i + 1) % 4]; area += a.x * b.y - b.x * a.y; } if (area <= 0) return false;
      S.rect = { Hw: Hw, HwInv: HwInv, px: taps.slice(), aspect: 1, W: 0, H: 0 };
      var fc = chooseFocal(Hw); S.f = fc.f; S.fSource = fc.source;
      S.rect.aspect = aspectFromH(Hw, S.f, S.w / 2, S.h / 2);
      if (!(S.rect.aspect > 0.1 && S.rect.aspect < 3)) { S.rect = null; return false; }
      return true;
    }
    function finishWall(W, Hh, scale){
      S.rect.W = W; S.rect.H = Hh; S.scale = scale;
      S.items = S.items.filter(function(x){ return x.type !== 'wall'; });
      S.items.push({ type: 'wall', x1: 0, y1: 0, x2: 1, y2: 1, w: W, h: Hh, area: W * Hh / 1e6, frame: 'wall' });
      // re-size any openings already placed in this frame
      S.items.forEach(function(it){ if (it.type !== 'wall' && it.frame === 'wall') { var sz = sizeOf(it); it.w = sz.w; it.h = sz.h; it.area = sz.w * sz.h / 1e6; } });
      q('scalebox').hidden = !scale.assumed; q('rescalerow').hidden = true; draw(); renderItems();
      if (scale.assumed) say('Wall about ' + fmt(W) + ' × ' + fmt(Hh) + ' m if the ceiling is ' + fmt(scale.ref_mm) + ' m. Ceilings vary, so tap a door top and bottom to size it properly, or tap the door as an opening and it will check itself.', 'warn');
      else if (scale.method === 'inherited') say('Wall: ' + fmt(W) + ' × ' + fmt(Hh) + ' m, using the ' + fmt(Hh) + ' m wall height already measured in this room. Tap doors and windows, or save this wall.', 'ok');
      else say('Wall: ' + fmt(W) + ' × ' + fmt(Hh) + ' m, scaled from the ' + scale.label + '. Now tap doors and windows (two corners each), or save this wall.', 'ok');
      setMode('door');
    }
    function scaleFromSheet(){ // affine fit of the wall's unit frame to sheet millimetres over the marker corners
      if (!S.sheet || !S.markers.length || !S.rect) return null;
      var M = SHEET.markerMm, U = [], P = [];
      S.markers.forEach(function(m){ var o = SHEET.markers[m.id], ox = o.x + SHEET.insetMm, oy = o.y + SHEET.insetMm, plane = [{x: ox, y: oy}, {x: ox + M, y: oy}, {x: ox + M, y: oy + M}, {x: ox, y: oy + M}]; for (var i = 0; i < 4; i++) { U.push(apply(S.rect.HwInv, m.corners[(i + (S.rotation || 0)) % 4])); P.push(plane[i]); } });
      var AtA = [[0,0,0],[0,0,0],[0,0,0]], bx = [0,0,0], by = [0,0,0];
      U.forEach(function(u, i){ var r = [u.x, u.y, 1]; for (var a = 0; a < 3; a++) { bx[a] += r[a] * P[i].x; by[a] += r[a] * P[i].y; for (var b = 0; b < 3; b++) AtA[a][b] += r[a] * r[b]; } });
      var X = solve(AtA.map(function(r){ return r.slice(); }), bx.slice()), Y = solve(AtA.map(function(r){ return r.slice(); }), by.slice()); if (!X || !Y) return null;
      var W = Math.hypot(X[0], Y[0]), Hh = Math.hypot(X[1], Y[1]); if (!(W > 300 && W < 30000 && Hh > 300 && Hh < 10000)) return null;
      return { W: W, H: Hh };
    }
    function applyScale(kind, valueMm, px, assumed, inherited){ // px: the two tapped image points for length references
      if (!S.rect) return false;
      var W, Hh, a = S.rect.aspect;
      if (kind === 'ceiling') { var allow = (assumed || inherited) ? 0 : (parseFloat(q('tapsat').value) || 0); Hh = valueMm - allow; W = Hh / a; }
      else {
        var p1 = apply(S.rect.HwInv, px[0]), p2 = apply(S.rect.HwInv, px[1]), du = p2.x - p1.x, dv = p2.y - p1.y, unitLen = Math.hypot(du, a * dv); if (unitLen < 1e-6) return false;
        W = valueMm / unitLen; Hh = a * W;
      }
      if (!(W > 300 && W < 30000 && Hh > 1200 && Hh < 8000)) { say('That gives a wall ' + fmt(W) + ' × ' + fmt(Hh) + ' m, which cannot be right. Check the length, or tap again.', 'warn'); return false; }
      var sk = assumed ? 'assumed' : inherited ? 'inherited' : kind;
      finishWall(W, Hh, { method: sk, ref_mm: valueMm, label: SCALES[sk].label, err: SCALES[sk].err, px: px || null, assumed: !!assumed });
      if (!assumed && !inherited && opts.onHeight) opts.onHeight(Hh / 1000, SCALES[sk].label); // the room's wall height is now known for the other walls
      return true;
    }
    function placePoint(img){
      if (S.mode === 'wall') {
        S.taps.push(img); draw();
        if (S.taps.length < 4) { say('Now tap the ' + ORDER[S.taps.length] + ' corner of the wall.'); return; }
        var taps = S.taps; S.taps = [];
        if (!setWallFrame(taps)) { say('Those four corners did not make a sensible wall. Tap them again: top-left, top-right, bottom-right, bottom-left.', 'warn'); draw(); return; }
        var sh = scaleFromSheet();
        if (sh) { finishWall(sh.W, sh.H, { method: 'sheet', label: 'measure sheet', err: 1 }); return; }
        draw(); q('scaleval').hidden = true;
        var c = opts.ceiling ? opts.ceiling() : { m: 2.4, assumed: true }; q('ceiling').value = c.m;
        if (!applyScale('ceiling', c.m * 1000, null, c.assumed, !c.assumed)) { q('scalebox').hidden = false; say('Wall shape done. Tap a door top and bottom to set the size.', 'ok'); S.mode = 'scale-wait'; }
        if (c.assumed) q('scalebox').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }
      if (S.mode === 'scale') { // two taps on a known length
        if (!S.pending) { S.pending = { img: img }; draw(); say('Now tap the other end.'); return; }
        var p0 = S.pending.img; S.pending = null;
        var mm = parseFloat(q('refmm').value); if (!(mm > 10)) { say('Type the length in millimetres first.', 'warn'); draw(); return; }
        if (!applyScale(S.scaleKind, mm, [p0, img])) draw();
        return;
      }
      if (S.mode === 'ref') { // four corners of a known rectangle -> plane homography in mm
        S.taps.push(img); draw();
        if (S.taps.length < 4) { say('Now tap the ' + ORDER[S.taps.length] + ' corner of the ' + S.refKind.label + '.'); return; }
        var rw = parseFloat(q('refw').value), rh = parseFloat(q('refh').value), rt = S.taps; S.taps = [];
        if (!(rw > 10 && rh > 10)) { say('Type the width and height in millimetres first.', 'warn'); return; }
        var Hr = homography([{x:0,y:0},{x:rw,y:0},{x:rw,y:rh},{x:0,y:rh}], rt), Hri = Hr && inv3(Hr);
        if (!Hr || !Hri) { say('Those corners did not make a rectangle. Tap them again.', 'warn'); draw(); return; }
        S.H = Hr; S.Hinv = Hri; S.planeSrc = S.refKind.label; S.ref = { px: rt, w: rw, h: rh, label: S.refKind.label }; S.rect = null; S.items = [];
        q('refbox').hidden = true; draw(); renderItems();
        say(S.refKind.label + ' set (' + rw + ' × ' + rh + ' mm). Now tap the top-left corner of the wall, then the bottom-right.', 'ok'); S.mode = 'wall2'; q('modehint').textContent = 'Tap the top-left corner of the wall, then the bottom-right. Corners outside the photo can be tapped where they would be.';
        return;
      }
      if (S.mode === 'wall2') {
        if (!S.H) { needRef(); return; }
        var pl2 = apply(S.Hinv, img);
        if (!S.pending) { S.pending = { img: img, plane: pl2 }; draw(); say('Now tap the bottom-right corner of the wall.'); return; }
        var a2 = S.pending.plane; S.pending = null; S.rect = null;
        addItem({ type: 'wall', x1: Math.min(a2.x, pl2.x), y1: Math.min(a2.y, pl2.y), x2: Math.max(a2.x, pl2.x), y2: Math.max(a2.y, pl2.y), frame: 'plane' });
        return;
      }
      if (S.mode === 'door' || S.mode === 'window') {
        var inv = S.rect ? S.rect.HwInv : S.Hinv; if (!inv) { say('Tap the wall corners first.', 'warn'); return; }
        var pl = apply(inv, img);
        if (!S.pending) { S.pending = { img: img, plane: pl }; draw(); say('Now tap the bottom-right corner of the ' + S.mode + '.'); return; }
        var a = S.pending.plane; S.pending = null;
        addItem({ type: S.mode, x1: Math.min(a.x, pl.x), y1: Math.min(a.y, pl.y), x2: Math.max(a.x, pl.x), y2: Math.max(a.y, pl.y), frame: S.rect ? 'wall' : 'plane' });
      }
    }
    function sizeOf(it){
      if (it.frame === 'wall' && S.rect) return { w: S.rect.W * (it.x2 - it.x1), h: S.rect.H * (it.y2 - it.y1) };
      return { w: it.x2 - it.x1, h: it.y2 - it.y1 };
    }
    function addItem(it){
      if (it.frame === 'wall' && !(S.rect && S.rect.W)) { say('Set the scale first (ceiling height, door or power point).', 'warn'); return; }
      var sz = sizeOf(it); it.w = sz.w; it.h = sz.h; it.area = it.w * it.h / 1e6;
      if (it.w < 50 || it.h < 50) { say('That is too small to be a ' + it.type + '. Tap the two opposite corners.', 'warn'); draw(); return; }
      if (it.type === 'wall') S.items = S.items.filter(function(x){ return x.type !== 'wall'; });
      S.items.push(it); draw(); renderItems();
      var msg = it.type === 'wall' ? 'Wall done. Now tap doors and windows, or save this wall.' : (it.type + ' added: ' + fmt(it.w) + ' × ' + fmt(it.h) + ' m. Next one, or save this wall.');
      var cls = 'ok';
      if (it.type === 'door' && S.scale && (S.scale.method === 'ceiling' || S.scale.method === 'assumed' || S.scale.method === 'inherited')) { // the door is a free check on the ceiling height
        var dh = it.h, off = Math.abs(dh / 2040 - 1);
        S.lastDoor = it;
        if (off < 0.03 && !S.scale.assumed) msg += ' That door comes out at ' + fmt(dh) + ' m against a standard 2.04, so the ceiling height checks out.';
        else { msg += ' That door comes out at ' + fmt(dh) + ' m; standard doors are 2.04 m' + (S.scale.assumed ? ', so the assumed ceiling is ' + Math.round(off * 100) + '% off.' : '.') + ' Tap the button below to size the wall from the door.'; cls = 'warn'; q('rescalerow').hidden = false; }
      }
      say(msg, cls); if (it.type === 'wall') setMode('door');
    }
    function needRef(){ q('refbox').hidden = false; q('refbox').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); say('Pick something in the photo we know the size of, then tap its four corners.'); }
    function setMode(m){
      S.mode = m; S.pending = null; S.taps = []; draw();
      root.querySelectorAll('[data-mode]').forEach(function(b){ var on = b.dataset.mode === m; b.classList.toggle('active', on); b.classList.toggle('tape', on); if (b.dataset.mode === 'wall2') b.classList.toggle('ghost', !on); });
      q('modehint').textContent = m === 'wall' ? 'Tap the four corners of the wall: top-left, top-right, bottom-right, bottom-left. Where the paint starts and stops: below the cornice, above the skirting.' : m === 'wall2' ? 'For when a corner is out of shot. Something of known size sets the scale instead.' : 'Tap the top-left corner of the ' + m + ', then the bottom-right.';
      if (m === 'wall') { q('refbox').hidden = true; say('Tap the top-left corner of the wall.'); }
      if (m === 'wall2') { q('scalebox').hidden = true; if (!S.H) needRef(); else say('Tap the top-left corner of the wall, then the bottom-right.'); }
    }
    root.querySelectorAll('[data-mode]').forEach(function(b){ b.addEventListener('click', function(){ setMode(b.dataset.mode); }); });
    root.querySelectorAll('[data-scale]').forEach(function(b){ b.addEventListener('click', function(){
      var k = b.dataset.scale; if (!S.rect) { say('Tap the four wall corners first.', 'warn'); return; }
      if (k === 'ceiling') { var m = parseFloat(q('ceiling').value); if (!(m > 1.8 && m < 6)) { say('Type the ceiling height in metres, e.g. 2.4.', 'warn'); q('ceiling').focus(); return; } applyScale('ceiling', m * 1000, null); return; }
      S.scaleKind = k; S.mode = 'scale'; S.pending = null; q('scaleval').hidden = false; q('refmm').value = SCALES[k].mm; q('scalehint').textContent = SCALES[k].hint; say(SCALES[k].hint); q('modehint').textContent = SCALES[k].hint;
      root.querySelectorAll('[data-scale]').forEach(function(x){ x.classList.toggle('active', x === b); });
    }); });
    root.querySelectorAll('[data-ref]').forEach(function(b){ b.addEventListener('click', function(){
      var r = REFS[b.dataset.ref]; S.refKind = r; q('refw').value = r.w; q('refh').value = r.h; S.mode = 'ref'; S.taps = []; S.pending = null; draw();
      root.querySelectorAll('[data-ref]').forEach(function(x){ x.classList.toggle('active', x === b); });
      say('Tap the top-left corner of the ' + r.label + '.'); q('modehint').textContent = 'Four corners of the ' + r.label + ': top-left, top-right, bottom-right, bottom-left. Use the loupe, it is small.';
    }); });
    q('rescale').addEventListener('click', function(){
      var d = S.lastDoor || S.items.filter(function(i){ return i.type === 'door' && i.frame === 'wall'; }).pop(); if (!d || !S.rect) return;
      var xm = (d.x1 + d.x2) / 2, top = apply(S.rect.Hw, { x: xm, y: d.y1 }), bot = apply(S.rect.Hw, { x: xm, y: d.y2 });
      S.scaleKind = 'door'; if (applyScale('door', 2040, [top, bot])) { S.items = S.items.filter(function(i){ return i !== d; }); var sz = sizeOf(d); d.w = sz.w; d.h = sz.h; d.area = sz.w * sz.h / 1e6; S.items.push(d); draw(); renderItems(); say('Wall sized from the door: ' + fmt(S.rect.W) + ' × ' + fmt(S.rect.H) + ' m. Now the windows and any other doors, or save this wall.', 'ok'); }
    });
    q('undo').addEventListener('click', function(){ if (S.taps.length) { S.taps.pop(); } else if (S.pending) { S.pending = null; } else if (S.items.length) { S.items.pop(); } draw(); renderItems(); say('Undone.'); });

    function confidence(){
      var wall = S.items.filter(function(i){ return i.type === 'wall'; })[0]; if (!wall) return null;
      var pct;
      if (wall.frame === 'wall') { pct = S.scale ? S.scale.err : 3; if (/default/.test(S.fSource)) pct += 1.5; if (S.scale && S.scale.assumed) pct = Math.max(pct, 6); }
      else { pct = S.ref ? (S.ref.w * S.ref.h > 500000 ? 4 : 6) : 2; }
      return Math.round(Math.min(15, pct) * 2) / 2;
    }
    function renderItems(){
      var tb = q('items').querySelector('tbody'); tb.innerHTML = '';
      S.items.forEach(function(it, i){ var tr = document.createElement('tr'); tr.innerHTML = '<td>' + it.type.charAt(0).toUpperCase() + it.type.slice(1) + '</td><td class="n">' + fmt(it.w) + ' m</td><td class="n">' + fmt(it.h) + ' m</td><td class="n">' + it.area.toFixed(2) + ' m²</td><td class="n"><button class="btn ghost sm" data-del="' + i + '">remove</button></td>'; tb.appendChild(tr); });
      tb.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ S.items.splice(+b.dataset.del, 1); draw(); renderItems(); }); });
      var c = confidence(); q('confidence').textContent = c ? ('Expected accuracy about ±' + c + '%.') : '';
    }

    // ---------- Saving a wall hands it to the app
    q('savewall').addEventListener('click', function(){
      var wall = S.items.filter(function(i){ return i.type === 'wall'; })[0];
      if (!wall) { say('Tap the corners of the wall first.', 'warn'); return; }
      if (S.scale && S.scale.assumed && !S.assumedOk) { S.assumedOk = true; say('This wall is sized from an assumed ' + fmt(S.scale.ref_mm) + ' m ceiling, so it could be 10% out. Tap a door to size it properly, or press Save again to keep it as an estimate.', 'warn'); q('scalebox').hidden = false; return; }
      S.assumedOk = false;
      var openings = S.items.filter(function(i){ return i.type !== 'wall'; }).map(function(o){ return { type: o.type, width_mm: Math.round(o.w), height_mm: Math.round(o.h), area_m2: +o.area.toFixed(3) }; });
      var openArea = openings.reduce(function(s, o){ return s + o.area_m2; }, 0);
      var rec = { wall: (q('wallname').value || ('Wall ' + (opts.count ? opts.count() + 1 : 1))).trim(),
        width_mm: Math.round(wall.w), height_mm: Math.round(wall.h), gross_area_m2: +wall.area.toFixed(3), openings: openings, paint_area_m2: +(wall.area - openArea).toFixed(3),
        method: wall.frame === 'wall' ? 'photo-corners' : 'photo-reference', scale: wall.frame === 'wall' ? (S.scale && S.scale.method) : (S.ref ? S.ref.label : 'sheet'), scale_assumed: !!(S.scale && S.scale.assumed),
        focal: S.fSource || '', expected_error_pct: confidence(), photo: S.photoName, measured_at: new Date().toISOString() };
      if (opts.onSave) opts.onSave(rec);
      say('Saved ' + rec.wall + '. Take the next wall, or go back to the room.', 'ok');
      q('wallname').value = ''; S.items = []; S.rect = null; S.scale = null; draw(); renderItems();
    });
    q('photo').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
    q('photolib').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
    q('photo2').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
    q('photo2lib').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
    setMode('wall');
    // Test hooks (used by the automated check; harmless in normal use)
    return { state: S, loadFile: loadFile, apply: apply, homography: homography, place: placePoint, setMode: setMode,
      wall4: function(pts){ S.mode = 'wall'; S.taps = []; pts.forEach(function(p){ placePoint(p); }); return S.rect; },
      scale: function(kind, mm, px){ if (kind === 'ceiling') return applyScale('ceiling', mm, null); S.scaleKind = kind; return applyScale(kind, mm, px); },
      refRect: function(kind, pts){ var r = REFS[kind]; S.refKind = r; q('refw').value = r.w; q('refh').value = r.h; S.mode = 'ref'; S.taps = []; pts.forEach(function(p){ placePoint(p); }); return S.H; },
      measure: function(p1, p2){ var inv = S.rect ? S.rect.HwInv : S.Hinv, a = apply(inv, p1), b = apply(inv, p2); var it = { x1: Math.min(a.x,b.x), y1: Math.min(a.y,b.y), x2: Math.max(a.x,b.x), y2: Math.max(a.y,b.y), frame: S.rect ? 'wall' : 'plane' }; return sizeOf(it); },
      rescale: function(){ q('rescale').click(); }, wall: function(){ return S.items.filter(function(i){ return i.type === 'wall'; })[0]; } };
  }
  window.QCMeasure = { mount: mount, exifFocal35: exifFocal35 };
})();
