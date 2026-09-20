/* Quote & Chase measuring component. Mount with QCMeasure.mount(rootElement, { onSave: fn(wallRecord), count: fn }) */
(function(){
  'use strict';
  var TEMPLATE = "\n<div class=\"qm\">\n  <div class=\"qm-intro\" data-part=\"intro\">\n    <p class=\"muted\">Tape the printed measure sheet flat on the wall. Photograph the whole wall straight on, lights on, main camera. Then tap the corners here.</p>\n    <div class=\"row\">\n      <label class=\"btn tape\" data-part=\"pick\">Take the photo<input type=\"file\" data-part=\"photo\" accept=\"image/*\" capture=\"environment\"></label>\n      <label class=\"btn ghost\">Choose from photos<input type=\"file\" data-part=\"photolib\" accept=\"image/*\"></label>\n      <label class=\"hint\">Bar measured <input type=\"number\" data-part=\"printscale\" value=\"100\" min=\"80\" max=\"120\" step=\"0.5\" style=\"width:5.5em\"> mm</label>\n    </div>\n  </div>\n  <div data-part=\"work\" hidden>\n    <div class=\"row\" style=\"justify-content:space-between\">\n      <input type=\"text\" data-part=\"wallname\" placeholder=\"Wall, e.g. window wall\" style=\"flex:1 1 10em\">\n      <label class=\"btn ghost sm\">New photo<input type=\"file\" data-part=\"photo2\" accept=\"image/*\" capture=\"environment\"></label>\n      <label class=\"btn ghost sm\">From photos<input type=\"file\" data-part=\"photo2lib\" accept=\"image/*\"></label>\n    </div>\n    <div class=\"stage\" data-part=\"stage\"><canvas data-part=\"view\"></canvas><div class=\"loupe\" data-part=\"loupe\"><canvas data-part=\"loupecv\" width=\"140\" height=\"140\"></canvas></div></div>\n    <p class=\"status\" data-part=\"status\">Loading photo\u2026</p>\n    <div class=\"row\">\n      <button class=\"btn tape sm\" data-mode=\"wall\">Wall</button>\n      <button class=\"btn sm\" data-mode=\"door\">Door</button>\n      <button class=\"btn sm\" data-mode=\"window\">Window</button>\n      <button class=\"btn ghost sm\" data-mode=\"wall2\">Can't see all corners</button>\n      <button class=\"btn ghost sm\" data-part=\"undo\">Undo tap</button>\n    </div>\n    <p class=\"hint\" data-part=\"modehint\"></p>\n    <table data-part=\"items\"><thead><tr><th>Item</th><th class=\"n\">Width</th><th class=\"n\">Height</th><th class=\"n\">Area</th><th></th></tr></thead><tbody></tbody></table>\n    <div class=\"row\" style=\"justify-content:space-between\"><span class=\"hint\" data-part=\"confidence\"></span><button class=\"btn sm\" data-part=\"savewall\">Save this wall</button></div>\n  </div>\n</div>";
  function mount(root, opts){
    opts = opts || {}; root.innerHTML = TEMPLATE;

  // ---------- The sheet. Must match measure-sheet.html exactly. Units: mm, origin top-left of the A4 sheet.
  // Each printed marker is an 85 mm box: a 1-cell white quiet zone around an 8-cell black-bordered code
  // (10 cells of 8.5 mm). The detector returns the corners of the BLACK square: 68 mm, inset 8.5 mm.
  var SHEET = { version: 1, dictionary: 'ARUCO_MIP_36h12', boxMm: 85, markerMm: 68, insetMm: 8.5,
    markers: { 0: {x: 15, y: 15}, 1: {x: 110, y: 15}, 2: {x: 15, y: 197}, 3: {x: 110, y: 197} } };

  var q = function(part){ return root.querySelector('[data-part="' + part + '"]'); };
  var view = q('view'), ctx = view.getContext('2d'), stage = q('stage');
  var loupe = q('loupe'), loupecv = q('loupecv'), lctx = loupecv.getContext('2d');
  var status = q('status');

  var S = { img: null, w: 0, h: 0, gray: null, markers: [], H: null, Hinv: null, mode: 'wall', pending: null, taps: [], rect: null,
            items: [], saved: [], scale: 1, photoName: '' };
  

  function say(msg, cls){ status.textContent = msg; status.className = 'status ' + (cls || ''); }

  // ---------- Linear algebra: least-squares homography (plane mm -> image px) with normalisation
  function solve(A, b){ // Gaussian elimination with partial pivoting, A n x n
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
  function homography(src, dst){ // src plane pts -> dst image pts, n >= 4, least squares
    var Ns = normaliser(src), Nd = normaliser(dst), n = src.length, i;
    var AtA = [], Atb = []; for (i = 0; i < 8; i++) { AtA.push([0,0,0,0,0,0,0,0]); Atb.push(0); }
    function acc(row, rhs){ for (var r = 0; r < 8; r++) { Atb[r] += row[r] * rhs; for (var c = 0; c < 8; c++) AtA[r][c] += row[r] * row[c]; } }
    for (i = 0; i < n; i++) {
      var s = Ns.apply(src[i]), d = Nd.apply(dst[i]);
      acc([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y], d.x);
      acc([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y], d.y);
    }
    var h = solve(AtA, Atb); if (!h) return null;
    var Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
    var TdInv = inv3(Nd.T); if (!TdInv) return null;
    return mul3(mul3(TdInv, Hn), Ns.T);
  }
  function apply(H, p){ var w = H[2][0]*p.x + H[2][1]*p.y + H[2][2]; return { x: (H[0][0]*p.x + H[0][1]*p.y + H[0][2]) / w, y: (H[1][0]*p.x + H[1][1]*p.y + H[1][2]) / w }; }

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

  // ---------- Photo loading and marker detection
  function loadFile(file){
    if (!file) return;
    S.photoName = file.name || 'photo';
    say('Reading the photo…');
    var opts = { imageOrientation: 'from-image' };
    var p = (window.createImageBitmap ? createImageBitmap(file, opts).catch(function(){ return createImageBitmap(file); }) : Promise.reject());
    p.catch(function(){ return new Promise(function(res, rej){ var im = new Image(); im.onload = function(){ res(im); }; im.onerror = rej; im.src = URL.createObjectURL(file); }); })
     .then(function(bmp){ setImage(bmp); }).catch(function(){ say('Could not read that photo. Try a JPG or PNG.', 'bad'); });
  }
  function setImage(bmp){
    var maxDim = 3200, w = bmp.width, h = bmp.height, sc = Math.min(1, maxDim / Math.max(w, h));
    w = Math.round(w * sc); h = Math.round(h * sc);
    var off = document.createElement('canvas'); off.width = w; off.height = h; var oc = off.getContext('2d'); oc.drawImage(bmp, 0, 0, w, h);
    S.img = off; S.w = w; S.h = h;
    var d = oc.getImageData(0, 0, w, h).data, g = new Float32Array(w * h); for (var i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299*d[j] + 0.587*d[j+1] + 0.114*d[j+2];
    S.gray = g; S.items = []; S.pending = null; S.taps = []; S.rect = null; S.H = null; S.markers = [];
    view.width = w; view.height = h;
    q('intro').hidden = true; q('work').hidden = false;
    draw(); detect();
  }
  function detectAt(maxDet){
    var sc = Math.min(1, maxDet / Math.max(S.w, S.h)), dw = Math.round(S.w * sc), dh = Math.round(S.h * sc);
    var c = document.createElement('canvas'); c.width = dw; c.height = dh; var cc = c.getContext('2d'); cc.drawImage(S.img, 0, 0, dw, dh);
    var id = cc.getImageData(0, 0, dw, dh);
    var det = new AR.Detector({ dictionaryName: SHEET.dictionary, maxHammingDistance: 3 });
    var found = det.detect(id), ms = [], seen = {};
    found.forEach(function(m){
      if (!(m.id in SHEET.markers) || seen[m.id]) return; seen[m.id] = true;
      var q = m.corners.map(function(p){ return { x: p.x / sc, y: p.y / sc }; });
      ms.push({ id: m.id, corners: refineQuad(q) });
    });
    return ms;
  }
  function detect(){
    say('Looking for the sheet…');
    setTimeout(function(){
      var ms = detectAt(1600);
      if (ms.length < 4) { var ms2 = detectAt(3200); if (ms2.length > ms.length) ms = ms2; }
      S.markers = ms;
      if (!ms.length) { S.H = null; draw(); say('No sheet found. Make sure the whole sheet is in the photo, flat on the wall, not in shadow, and try again.', 'bad'); return; }
      var k = parseFloat(q('printscale').value) || 100, ps = k / 100, M = SHEET.markerMm * ps;
      // The detector's corner order is consistent between markers but its starting corner is a library
      // convention; try all four rotations and keep the one the geometry agrees with.
      var best = null;
      for (var rot = 0; rot < 4; rot++) {
        var src = [], dst = [];
        ms.forEach(function(m){
          var o = SHEET.markers[m.id], ox = (o.x + SHEET.insetMm) * ps, oy = (o.y + SHEET.insetMm) * ps;
          var plane = [{x: ox, y: oy}, {x: ox + M, y: oy}, {x: ox + M, y: oy + M}, {x: ox, y: oy + M}];
          for (var i = 0; i < 4; i++) { src.push(plane[i]); dst.push(m.corners[(i + rot) % 4]); }
        });
        var Hc = homography(src, dst); if (!Hc) continue;
        var e = 0; for (var i2 = 0; i2 < src.length; i2++) { var pp = apply(Hc, src[i2]); e += Math.hypot(pp.x - dst[i2].x, pp.y - dst[i2].y); } e /= src.length;
        if (!best || e < best.e) best = { H: Hc, e: e, rot: rot };
      }
      if (best) { S.H = best.H; S.Hinv = inv3(S.H); S.reproj = best.e; S.rotation = best.rot; } else { S.H = null; }
      if (!S.H) { say('Sheet found but the geometry did not solve. Take the photo again, more straight on.', 'bad'); draw(); return; }
      draw();
      say('Sheet found: ' + ms.length + ' of 4 markers' + (ms.length < 3 ? ' (fewer markers means less accuracy; get the whole sheet in the shot next time)' : '') + '. Now tap the top-left corner of the wall.', ms.length >= 3 ? 'ok' : 'warn');
      setMode('wall');
    }, 30);
  }

  // ---------- Drawing
  function draw(){
    ctx.clearRect(0, 0, S.w, S.h); if (S.img) ctx.drawImage(S.img, 0, 0);
    var lw = Math.max(2, S.w / 500);
    S.markers.forEach(function(m){ ctx.strokeStyle = '#37d67a'; ctx.lineWidth = lw; ctx.beginPath(); m.corners.forEach(function(p, i){ i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke(); });
    S.items.forEach(function(it){ drawRect(it, lw); });
    ctx.fillStyle = '#ff5a36';
    if (S.pending) { ctx.beginPath(); ctx.arc(S.pending.img.x, S.pending.img.y, lw * 3, 0, 7); ctx.fill(); }
    S.taps.forEach(function(t){ ctx.beginPath(); ctx.arc(t.x, t.y, lw * 3, 0, 7); ctx.fill(); });
  }
  function drawRect(it, lw){
    var Hf = it.frame === 'wall' && S.rect ? S.rect.Hw : S.H; if (!Hf) return;
    var col = it.type === 'wall' ? '#2B7BD6' : it.type === 'door' ? '#F2A33C' : '#B36CE6';
    var c = [{x: it.x1, y: it.y1}, {x: it.x2, y: it.y1}, {x: it.x2, y: it.y2}, {x: it.x1, y: it.y2}].map(function(p){ return apply(Hf, p); });
    ctx.strokeStyle = col; ctx.lineWidth = lw * 1.5; ctx.beginPath(); c.forEach(function(p, i){ i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = 'bold ' + Math.round(S.w / 60) + 'px system-ui, sans-serif';
    var mid = apply(Hf, { x: (it.x1 + it.x2) / 2, y: it.y1 }); ctx.fillText(fmt(it.w) + ' × ' + fmt(it.h) + ' m', mid.x - S.w / 30, mid.y - lw * 4);
  }
  function fmt(mm){ return (mm / 1000).toFixed(2); }

  // ---------- Tapping with a loupe
  function toImg(ev){ var r = view.getBoundingClientRect(); return { x: (ev.clientX - r.left) * S.w / r.width, y: (ev.clientY - r.top) * S.h / r.height }; }
  var down = null;
  stage.addEventListener('pointerdown', function(ev){ if (!S.H) return; ev.preventDefault(); down = toImg(ev); showLoupe(ev, down); });
  stage.addEventListener('pointermove', function(ev){ if (!down) return; ev.preventDefault(); down = toImg(ev); showLoupe(ev, down); });
  stage.addEventListener('pointerup', function(ev){ if (!down) return; ev.preventDefault(); var p = down; down = null; loupe.style.display = 'none'; placePoint(p); });
  stage.addEventListener('pointercancel', function(){ down = null; loupe.style.display = 'none'; });
  function showLoupe(ev, p){
    var r = view.getBoundingClientRect(), zoom = 2.5, sz = 140 / zoom;
    lctx.fillStyle = '#000'; lctx.fillRect(0, 0, 140, 140);
    lctx.drawImage(S.img, p.x - sz / 2, p.y - sz / 2, sz, sz, 0, 0, 140, 140);
    var lx = ev.clientX - r.left - 70, ly = ev.clientY - r.top - 170; if (ly < 0) ly = ev.clientY - r.top + 30;
    loupe.style.left = Math.max(0, Math.min(r.width - 140, lx)) + 'px'; loupe.style.top = ly + 'px'; loupe.style.display = 'block';
  }
  // Wall = four taps (top-left, top-right, bottom-right, bottom-left). The wall's own corners pin down the
  // perspective far better than the small sheet can; the sheet then supplies the scale. Doors and windows
  // are two taps inside that frame. If the wall corners are not all visible, "wall2" uses the sheet alone.
  var ORDER = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  function placePoint(img){
    if (S.mode === 'wall') {
      S.taps.push(img); draw();
      if (S.taps.length < 4) { say('Now tap the ' + ORDER[S.taps.length] + ' corner of the wall.'); return; }
      var taps = S.taps; S.taps = [];
      var Hw = homography([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}], taps), HwInv = Hw && inv3(Hw);
      var A = Hw && fitScale(HwInv);
      if (!Hw || !A) { say('Those four corners did not make a sensible wall. Tap them again: top-left, top-right, bottom-right, bottom-left.', 'warn'); return; }
      S.rect = { Hw: Hw, HwInv: HwInv, A: A };
      S.items = S.items.filter(function(x){ return x.type !== 'wall'; });
      var W = Math.hypot(A[0][0], A[1][0]), Hh = Math.hypot(A[0][1], A[1][1]);
      S.items.push({ type: 'wall', x1: 0, y1: 0, x2: 1, y2: 1, w: W, h: Hh, area: W * Hh / 1e6, frame: 'wall' });
      draw(); renderItems(); say('Wall done: ' + fmt(W) + ' × ' + fmt(Hh) + ' m. Now tap doors and windows (two corners each), or save this wall.', 'ok'); setMode('door');
      return;
    }
    if (S.mode === 'wall2') {
      var pl2 = apply(S.Hinv, img);
      if (!S.pending) { S.pending = { img: img, plane: pl2 }; draw(); say('Now tap the bottom-right corner of the wall.'); return; }
      var a2 = S.pending.plane; S.pending = null; S.rect = null;
      addItem({ type: 'wall', x1: Math.min(a2.x, pl2.x), y1: Math.min(a2.y, pl2.y), x2: Math.max(a2.x, pl2.x), y2: Math.max(a2.y, pl2.y), frame: 'sheet' });
      return;
    }
    // door / window
    var inv = S.rect ? S.rect.HwInv : S.Hinv, pl = apply(inv, img);
    if (!S.pending) { S.pending = { img: img, plane: pl }; draw(); say('Now tap the bottom-right corner of the ' + S.mode + '.'); return; }
    var a = S.pending.plane; S.pending = null;
    addItem({ type: S.mode, x1: Math.min(a.x, pl.x), y1: Math.min(a.y, pl.y), x2: Math.max(a.x, pl.x), y2: Math.max(a.y, pl.y), frame: S.rect ? 'wall' : 'sheet' });
  }
  function fitScale(HwInv){ // affine map from the wall's unit frame to sheet millimetres, least squares over marker corners
    var ps = (parseFloat(q('printscale').value) || 100) / 100, M = SHEET.markerMm * ps, U = [], P = [];
    S.markers.forEach(function(m){
      var o = SHEET.markers[m.id], ox = (o.x + SHEET.insetMm) * ps, oy = (o.y + SHEET.insetMm) * ps;
      var plane = [{x: ox, y: oy}, {x: ox + M, y: oy}, {x: ox + M, y: oy + M}, {x: ox, y: oy + M}];
      for (var i = 0; i < 4; i++) { U.push(apply(HwInv, m.corners[(i + (S.rotation || 0)) % 4])); P.push(plane[i]); }
    });
    if (U.length < 4) return null;
    // solve [a b c; d e f] from U -> P
    var AtA = [[0,0,0],[0,0,0],[0,0,0]], bx = [0,0,0], by = [0,0,0];
    U.forEach(function(u, i){ var r = [u.x, u.y, 1]; for (var a = 0; a < 3; a++) { bx[a] += r[a] * P[i].x; by[a] += r[a] * P[i].y; for (var b = 0; b < 3; b++) AtA[a][b] += r[a] * r[b]; } });
    var X = solve(AtA.map(function(r){ return r.slice(); }), bx.slice()), Y = solve(AtA.map(function(r){ return r.slice(); }), by.slice());
    if (!X || !Y) return null;
    var A = [[X[0], X[1]], [Y[0], Y[1]]];
    var W = Math.hypot(A[0][0], A[1][0]), Hh = Math.hypot(A[0][1], A[1][1]);
    if (!(W > 300 && W < 30000 && Hh > 300 && Hh < 10000)) return null;
    return A;
  }
  function sizeOf(it){ // mm width/height of a rectangle in its frame
    if (it.frame === 'wall' && S.rect) { var A = S.rect.A; return { w: Math.hypot(A[0][0], A[1][0]) * (it.x2 - it.x1), h: Math.hypot(A[0][1], A[1][1]) * (it.y2 - it.y1) }; }
    return { w: it.x2 - it.x1, h: it.y2 - it.y1 };
  }
  function addItem(it){
    var sz = sizeOf(it); it.w = sz.w; it.h = sz.h; it.area = it.w * it.h / 1e6;
    if (it.w < 50 || it.h < 50) { say('That is too small to be a ' + it.type + '. Tap the two opposite corners.', 'warn'); draw(); return; }
    if (it.type === 'wall') S.items = S.items.filter(function(x){ return x.type !== 'wall'; });
    S.items.push(it); draw(); renderItems();
    say(it.type === 'wall' ? 'Wall done. Now tap doors and windows, or save this wall.' : (it.type + ' added: ' + fmt(it.w) + ' × ' + fmt(it.h) + ' m. Next one, or save this wall.'), 'ok');
    if (it.type === 'wall') setMode('door');
  }
  function setMode(m){ S.mode = m; S.pending = null; S.taps = []; draw(); root.querySelectorAll('[data-mode]').forEach(function(b){ var on = b.dataset.mode === m; b.classList.toggle('active', on); b.classList.toggle('tape', on); if (b.dataset.mode === 'wall2') b.classList.toggle('ghost', !on); });
    q('modehint').textContent = m === 'wall' ? 'Tap the four corners of the wall: top-left, top-right, bottom-right, bottom-left.' : m === 'wall2' ? 'Tap the top-left corner of the wall, then the bottom-right. Less accurate than four corners.' : 'Tap the top-left corner of the ' + m + ', then the bottom-right.';
    if (m === 'wall') say('Tap the top-left corner of the wall.'); }
  root.querySelectorAll('[data-mode]').forEach(function(b){ b.addEventListener('click', function(){ setMode(b.dataset.mode); }); });
  q('undo').addEventListener('click', function(){ if (S.taps.length) { S.taps.pop(); } else if (S.pending) { S.pending = null; } else { S.items.pop(); } draw(); renderItems(); say('Undone.'); });

  function confidence(){
    if (!S.H || !S.markers.length) return null;
    var wall = S.items.filter(function(i){ return i.type === 'wall'; })[0];
    var pct = wall && wall.frame === 'wall' ? 1 : 2;
    if (S.markers.length < 4) pct += 1; if (S.markers.length < 2) pct += 2;
    var mpx = 0; S.markers.forEach(function(m){ mpx += Math.hypot(m.corners[1].x - m.corners[0].x, m.corners[1].y - m.corners[0].y); }); mpx /= S.markers.length;
    if (mpx < 40) pct += 3; else if (mpx < 70) pct += 1;
    if (S.reproj > 1) pct += 1; if (S.reproj > 2.5) pct += 2;
    if (wall && wall.frame === 'sheet') { var far = Math.max(Math.abs(wall.x1 - 105), Math.abs(wall.x2 - 105), Math.abs(wall.y1 - 148), Math.abs(wall.y2 - 148)); pct += Math.max(0, (far / 1000 - 1)) * 1.5; }
    return Math.round(Math.min(15, pct) * 2) / 2;
  }
  function renderItems(){
    var tb = q('items').querySelector('tbody'); tb.innerHTML = '';
    S.items.forEach(function(it, i){
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + it.type.charAt(0).toUpperCase() + it.type.slice(1) + '</td><td class="n">' + fmt(it.w) + ' m</td><td class="n">' + fmt(it.h) + ' m</td><td class="n">' + it.area.toFixed(2) + ' m²</td><td class="n"><button class="btn ghost sm" data-del="' + i + '">remove</button></td>';
      tb.appendChild(tr);
    });
    tb.querySelectorAll('[data-del]').forEach(function(b){ b.addEventListener('click', function(){ S.items.splice(+b.dataset.del, 1); draw(); renderItems(); }); });
    var c = confidence(); q('confidence').textContent = c ? ('Expected accuracy about ±' + c + '% on these numbers.') : '';
  }

  // ---------- Saving a wall hands it to the app
  q('savewall').addEventListener('click', function(){
    var wall = S.items.filter(function(i){ return i.type === 'wall'; })[0];
    if (!wall) { say('Tap the corners of the wall first.', 'warn'); return; }
    var openings = S.items.filter(function(i){ return i.type !== 'wall'; }).map(function(o){ return { type: o.type, width_mm: Math.round(o.w), height_mm: Math.round(o.h), area_m2: +o.area.toFixed(3) }; });
    var openArea = openings.reduce(function(s, o){ return s + o.area_m2; }, 0);
    var rec = { wall: (q('wallname').value || ('Wall ' + (opts.count ? opts.count() + 1 : 1))).trim(),
      width_mm: Math.round(wall.w), height_mm: Math.round(wall.h), gross_area_m2: +wall.area.toFixed(3), openings: openings,
      paint_area_m2: +(wall.area - openArea).toFixed(3), method: 'measure-sheet', markers_found: S.markers.length,
      expected_error_pct: confidence(), photo: S.photoName, measured_at: new Date().toISOString() };
    if (opts.onSave) opts.onSave(rec);
    say('Saved ' + rec.wall + '. Take the next wall, or go back to the room.', 'ok');
    q('wallname').value = ''; S.items = []; draw(); renderItems();
  });
  q('photo').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
  q('photo2').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
  q('photolib').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
  q('photo2lib').addEventListener('change', function(){ loadFile(this.files[0]); this.value = ''; });
  q('printscale').addEventListener('change', function(){ if (S.img) detect(); });
  setMode('wall');
  // Test hooks (used by the automated check; harmless in normal use)
  return { state: S, sheet: SHEET, loadFile: loadFile, apply: apply, homography: homography,
    measure: function(p1, p2){ var inv = S.rect ? S.rect.HwInv : S.Hinv, a = apply(inv, p1), b = apply(inv, p2); var it = { x1: Math.min(a.x,b.x), y1: Math.min(a.y,b.y), x2: Math.max(a.x,b.x), y2: Math.max(a.y,b.y), frame: S.rect ? 'wall' : 'sheet' }; var sz = sizeOf(it); return { w: sz.w, h: sz.h }; },
    wall4: function(pts){ S.mode = 'wall'; S.taps = []; pts.forEach(function(p){ placePoint(p); }); return S.items.filter(function(i){ return i.type === 'wall'; })[0]; },
    place: placePoint, setMode: setMode };
  }
  window.QCMeasure = { mount: mount };
})();
