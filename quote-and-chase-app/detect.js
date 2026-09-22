/* Chasem: automatic detection of a plain A4 page, the wall, and door/window openings in a photo.
 * Pure functions over a grayscale Float32Array; no dependencies. Everything returns image-pixel coordinates.
 */
(function(){
  'use strict';

  // ---------- small helpers
  function downscale(gray, w, h, maxW){
    var sc = Math.min(1, maxW / w), dw = Math.round(w * sc), dh = Math.round(h * sc), out = new Float32Array(dw * dh);
    if (sc === 1) { out.set(gray); return { g: out, w: dw, h: dh, s: 1 }; }
    var inv = 1 / sc;
    for (var y = 0; y < dh; y++) { var y0 = Math.floor(y * inv), y1 = Math.min(h, Math.floor((y + 1) * inv)) || y0 + 1;
      for (var x = 0; x < dw; x++) { var x0 = Math.floor(x * inv), x1 = Math.min(w, Math.floor((x + 1) * inv)) || x0 + 1, s = 0, n = 0;
        for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) { s += gray[yy * w + xx]; n++; }
        out[y * dw + x] = s / n; } }
    return { g: out, w: dw, h: dh, s: sc };
  }
  function integral(g, w, h){ var I = new Float64Array((w + 1) * (h + 1)); for (var y = 1; y <= h; y++) { var row = 0; for (var x = 1; x <= w; x++) { row += g[(y - 1) * w + (x - 1)]; I[y * (w + 1) + x] = I[(y - 1) * (w + 1) + x] + row; } } return I; }
  function boxMean(I, w, h, x, y, r){ var x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(w, x + r + 1), y1 = Math.min(h, y + r + 1), W1 = w + 1; return (I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0]) / ((x1 - x0) * (y1 - y0)); }
  function sobel(g, w, h){ var gx = new Float32Array(w * h), gy = new Float32Array(w * h), mag = new Float32Array(w * h);
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) { var i = y * w + x;
      var dx = (g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - 1] + g[i + w - 1]);
      var dy = (g[i + w - 1] + 2 * g[i + w] + g[i + w + 1]) - (g[i - w - 1] + 2 * g[i - w] + g[i - w + 1]);
      gx[i] = dx; gy[i] = dy; mag[i] = Math.hypot(dx, dy); }
    return { gx: gx, gy: gy, mag: mag }; }
  function percentile(arr, p){ var n = arr.length, step = Math.max(1, Math.floor(n / 20000)), s = []; for (var i = 0; i < n; i += step) s.push(arr[i]); s.sort(function(a, b){ return a - b; }); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
  function solve(A, b){ var n = A.length, i, j, k; for (i = 0; i < n; i++) { var p = i; for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k; var t = A[i]; A[i] = A[p]; A[p] = t; var tb = b[i]; b[i] = b[p]; b[p] = tb; if (Math.abs(A[i][i]) < 1e-12) return null; for (k = i + 1; k < n; k++) { var f = A[k][i] / A[i][i]; for (j = i; j < n; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; } } var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
  function homography(src, dst){ var A = [], b = []; for (var i = 0; i < 8; i++) { A.push([0,0,0,0,0,0,0,0]); b.push(0); }
    function acc(row, rhs){ for (var r = 0; r < 8; r++) { b[r] += row[r] * rhs; for (var c = 0; c < 8; c++) A[r][c] += row[r] * row[c]; } }
    for (var k = 0; k < src.length; k++) { var s = src[k], d = dst[k]; acc([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y], d.x); acc([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y], d.y); }
    var hv = solve(A, b); if (!hv) return null; return [[hv[0], hv[1], hv[2]], [hv[3], hv[4], hv[5]], [hv[6], hv[7], 1]]; }
  function apply(H, p){ var w = H[2][0] * p.x + H[2][1] * p.y + H[2][2]; return { x: (H[0][0] * p.x + H[0][1] * p.y + H[0][2]) / w, y: (H[1][0] * p.x + H[1][1] * p.y + H[1][2]) / w }; }
  function inv3(m){ var a=m[0][0],b=m[0][1],c=m[0][2],d=m[1][0],e=m[1][1],f=m[1][2],g=m[2][0],h=m[2][1],i=m[2][2]; var A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C; if (Math.abs(det)<1e-14) return null; return [[A/det,-(b*i-c*h)/det,(b*f-c*e)/det],[B/det,(a*i-c*g)/det,-(a*f-c*d)/det],[C/det,-(a*h-b*g)/det,(a*e-b*d)/det]]; }
  function aspectFromH(H, f, cx, cy){ function gv(col){ var h = [H[0][col], H[1][col], H[2][col]]; return Math.hypot((h[0] - cx * h[2]) / f, (h[1] - cy * h[2]) / f, h[2]); } return gv(1) / gv(0); }
  var UNIT = [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
  function quadArea(q){ var a = 0; for (var i = 0; i < 4; i++) { var p = q[i], n = q[(i + 1) % 4]; a += p.x * n.y - n.x * p.y; } return a / 2; }
  function isConvex(q){ var sgn = 0; for (var i = 0; i < 4; i++) { var a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4], z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x); if (Math.abs(z) < 1e-9) continue; if (sgn === 0) sgn = z > 0 ? 1 : -1; else if ((z > 0 ? 1 : -1) !== sgn) return false; } return true; }
  function pointInQuad(q, p){ var s = 0; for (var i = 0; i < 4; i++) { var a = q[i], b = q[(i + 1) % 4], z = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); if (Math.abs(z) < 1e-9) continue; var sg = z > 0 ? 1 : -1; if (s === 0) s = sg; else if (s !== sg) return false; } return true; }

  // ---------- sub-pixel refinement of a quad's corners on the full-resolution gray image (edge fitting along each side)
  function makeRefiner(gray, w, h){
    function at(x, y){ if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return 128; var x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0; var a = gray[y0 * w + x0], b = gray[y0 * w + x0 + 1], c = gray[(y0 + 1) * w + x0], d = gray[(y0 + 1) * w + x0 + 1]; return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy; }
    function fitLine(pts){ var n = pts.length, cx = 0, cy = 0, i; for (i = 0; i < n; i++) { cx += pts[i].x; cy += pts[i].y; } cx /= n; cy /= n; var sxx = 0, sxy = 0, syy = 0; for (i = 0; i < n; i++) { var dx = pts[i].x - cx, dy = pts[i].y - cy; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; } var th = 0.5 * Math.atan2(2 * sxy, sxx - syy); return { x: cx, y: cy, dx: Math.cos(th), dy: Math.sin(th) }; }
    function intersect(l1, l2){ var den = l1.dx * l2.dy - l1.dy * l2.dx; if (Math.abs(den) < 1e-9) return null; var t = ((l2.x - l1.x) * l2.dy - (l2.y - l1.y) * l2.dx) / den; return { x: l1.x + t * l1.dx, y: l1.y + t * l1.dy }; }
    function refineOnce(q, maxShift, sign){
      maxShift = maxShift || 6; sign = sign || 0; var cx = 0, cy = 0, i; for (i = 0; i < 4; i++) { cx += q[i].x; cy += q[i].y; } cx /= 4; cy /= 4; var lines = [];
      for (i = 0; i < 4; i++) {
        var a = q[i], b = q[(i + 1) % 4], len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 12) return q;
        var ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = -uy, ny = ux, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        var R = Math.max(3, Math.min(maxShift * 2, len * 0.06)), pts = [], k, N = Math.max(12, Math.min(40, Math.round(len / 8)));
        for (k = 0; k < N; k++) { var t = 0.1 + 0.8 * k / (N - 1), px = a.x + ux * len * t, py = a.y + uy * len * t, best = -1, bs = 0, s, grads = [];
          for (s = -R; s <= R; s += 1) { var g1 = 0, g2 = 0; for (var tk = -2; tk <= 2; tk++) { var ox = ux * tk * 1.2, oy = uy * tk * 1.2; g1 += at(px + (s - 1) * nx + ox, py + (s - 1) * ny + oy); g2 += at(px + (s + 1) * nx + ox, py + (s + 1) * ny + oy); } var d12 = (g2 - g1) / 5, gr = sign ? (d12 * sign > 0 ? Math.abs(d12) : 0) : Math.abs(d12); grads.push(gr); if (gr > best) { best = gr; bs = s; } }
          if (best < 3.5) continue; var idx = bs + R, sub = 0; if (idx > 0 && idx < grads.length - 1) { var gm = grads[idx - 1], g0 = grads[idx], gp = grads[idx + 1], den = gm - 2 * g0 + gp; if (Math.abs(den) > 1e-6) sub = Math.max(-1, Math.min(1, 0.5 * (gm - gp) / den)); }
          pts.push({ x: px + (bs + sub) * nx, y: py + (bs + sub) * ny }); }
        if (pts.length < 5) return q;
        // drop outliers once
        var l0 = fitLine(pts), res = pts.map(function(p){ return Math.abs((p.x - l0.x) * -l0.dy + (p.y - l0.y) * l0.dx); }), med = res.slice().sort(function(a, b){ return a - b; })[res.length >> 1];
        var keep = pts.filter(function(p, j){ return res[j] <= Math.max(1.5, med * 3); }); if (keep.length < 5) return q;
        var l1 = fitLine(keep), res2 = keep.map(function(p){ return Math.abs((p.x - l1.x) * -l1.dy + (p.y - l1.y) * l1.dx); }), med2 = res2.slice().sort(function(a, b){ return a - b; })[res2.length >> 1];
        var keep2 = keep.filter(function(p, j){ return res2[j] <= Math.max(1.0, med2 * 2.5); }); if (keep2.length >= 5) keep = keep2;
        lines.push(fitLine(keep)); if (QCDetect._refineDebug) QCDetect._refineDebug.push({ side: i, pts: pts.map(function(pp){ return [+pp.x.toFixed(1), +pp.y.toFixed(1)]; }), kept: keep.length });
      }
      var out = []; for (i = 0; i < 4; i++) { var p = intersect(lines[(i + 3) % 4], lines[i]); if (!p || Math.hypot(p.x - q[i].x, p.y - q[i].y) > maxShift * 3) return q; out.push(p); }
      return out;
    }
    return function refine(q, maxShift, sign){ var q1 = refineOnce(q, maxShift, sign); return refineOnce(q1, Math.min(4, maxShift || 6), sign); }; // coarse pass to land on the edge, fine pass to settle on it
  }

  // ---------- Page detection: bright, blank, roughly rectangular blob whose 3D shape (given f) is an A4 sheet
  function findPage(gray, w, h, f){
    // a printed page is mostly white with thin dark strokes; a small grey-level max filter turns it back into a white blob before the search
    var gm = maxFilter(gray, w, h, Math.max(1, Math.round(Math.max(w, h) / 1500)));
    var D = downscale(gray, w, h, 1400), g = D.g, dw = D.w, dh = D.h, I = integral(g, dw, dh), refine = makeRefiner(gray, w, h), gW = downscale(gm, w, h, 1400).g;
    var cx = w / 2, cy = h / 2, cands = [], seenKeys = {};
    [Math.round(dw / 8), Math.round(dw / 16)].forEach(function(r){
      [3, 5, 9, 14].forEach(function(T){
        var mask = new Uint8Array(dw * dh);
        for (var y = 0; y < dh; y++) for (var x = 0; x < dw; x++) { var i = y * dw + x; if (g[i] - boxMean(I, dw, dh, x, y, r) > T) mask[i] = 1; }
        components(mask, dw, dh, function(comp){
          var area = comp.n, bw = comp.x1 - comp.x0 + 1, bh = comp.y1 - comp.y0 + 1;
          if (area < 0.00015 * dw * dh || area > 0.06 * dw * dh || bw < 8 || bh < 8) return;
          if (area / (bw * bh) < 0.45) return;
          var q = comp.quad.map(function(p){ return { x: (p.x + 0.5) / D.s, y: (p.y + 0.5) / D.s }; });
          if (!isConvex(q) || quadArea(q) <= 0) return;
          var key = Math.round(q[0].x / 6) + ':' + Math.round(q[0].y / 6) + ':' + Math.round(q[2].x / 6) + ':' + Math.round(q[2].y / 6); if (seenKeys[key]) return; seenKeys[key] = 1;
          cands.push({ q: q, comp: comp });
        });
      });
    });
    // third source: near-white blobs. Paper is about the brightest thing in a room photo; walls are rarely as white. Printed pages
    // come through as a white margin ring around the text, so enclosed holes are filled before taking the blob's corners.
    var brightW = percentile(gW, 0.995), nw = new Uint8Array(dw * dh);
    for (var wi = 0; wi < nw.length; wi++) nw[wi] = gW[wi] >= brightW - 10 ? 1 : 0;
    fillSmallHoles(nw, dw, dh, 0.06 * dw * dh); // no closing here: it would bridge the page to a bright frame a few pixels away
    components(nw, dw, dh, function(comp){
      var area = comp.n, bw = comp.x1 - comp.x0 + 1, bh = comp.y1 - comp.y0 + 1;
      if (area < 0.00015 * dw * dh || area > 0.06 * dw * dh || bw < 8 || bh < 8 || area / (bw * bh) < 0.45) return;
      var q = comp.quad.map(function(pt){ return { x: (pt.x + 0.5) / D.s, y: (pt.y + 0.5) / D.s }; }); if (!isConvex(q) || quadArea(q) <= 0) return;
      var key = 'w' + Math.round(q[0].x / 6) + ':' + Math.round(q[0].y / 6) + ':' + Math.round(q[2].x / 6) + ':' + Math.round(q[2].y / 6); if (seenKeys[key]) return; seenKeys[key] = 1;
      cands.push({ q: q, comp: comp, white: true });
    });
    // second source: blank regions enclosed by a closed edge (works for white paper on a white wall)
    var Sb = sobel(g, dw, dh), thrEdge = Math.max(12, percentile(Sb.mag, 0.9)), nonEdge = new Uint8Array(dw * dh);
    for (var ne = 0; ne < nonEdge.length; ne++) nonEdge[ne] = Sb.mag[ne] < thrEdge ? 1 : 0;
    components(nonEdge, dw, dh, function(comp){
      var area = comp.n, bw = comp.x1 - comp.x0 + 1, bh = comp.y1 - comp.y0 + 1;
      if (area < 0.00015 * dw * dh || area > 0.06 * dw * dh || bw < 8 || bh < 8 || area / (bw * bh) < 0.55) return;
      var q = comp.quad.map(function(pt){ return { x: (pt.x + 0.5) / D.s, y: (pt.y + 0.5) / D.s }; }); if (!isConvex(q) || quadArea(q) <= 0) return;
      // grow the inset interior quad outwards by ~1.5 px (edge thickness) before refinement
      var gx = (q[0].x + q[2].x) / 2, gy = (q[0].y + q[2].y) / 2; q = q.map(function(pt){ var dx = pt.x - gx, dy = pt.y - gy, L = Math.hypot(dx, dy) || 1, e = 1.5 / D.s; return { x: pt.x + dx / L * e, y: pt.y + dy / L * e }; });
      var key = 'e' + Math.round(q[0].x / 6) + ':' + Math.round(q[0].y / 6) + ':' + Math.round(q[2].x / 6) + ':' + Math.round(q[2].y / 6); if (seenKeys[key]) return; seenKeys[key] = 1;
      cands.push({ q: q, comp: comp, edge: true });
    });
    var bright = percentile(g, 0.995), best = null, dbg = { cands: cands.length, rejected: {}, bright: bright }; QCDetect.lastPageDebug = dbg; dbg.raw = cands.map(function(c){ return c.q.map(function(pp){ return [Math.round(pp.x), Math.round(pp.y)]; }).concat([c.edge ? 'edge' : c.white ? 'white' : 'bright']); }); function rej(k){ dbg.rejected[k] = (dbg.rejected[k] || 0) + 1; }
    cands.forEach(function(c){
      var q = refine(c.q, 8, -1), H = homography(UNIT, q); if (!H) return rej('H');
      var asp = aspectFromH(H, f, cx, cy), portrait = Math.abs(asp / 1.4142 - 1), landscape = Math.abs(asp / 0.7071 - 1), fit = Math.min(portrait, landscape); (dbg.asp = dbg.asp || []).push([+asp.toFixed(3), q.map(function(pp){ return [Math.round(pp.x), Math.round(pp.y)]; })]); if (fit > 0.12) return rej('aspect');
      // sides: opposite sides should be similar in length in the image (perspective allows some difference)
      var L = []; for (var i = 0; i < 4; i++) L.push(Math.hypot(q[(i + 1) % 4].x - q[i].x, q[(i + 1) % 4].y - q[i].y)); if (Math.min(L[0], L[2]) / Math.max(L[0], L[2]) < 0.6 || Math.min(L[1], L[3]) / Math.max(L[1], L[3]) < 0.6) return rej('sides');
      if (Math.min.apply(null, L) < 0.009 * Math.max(w, h) || Math.max.apply(null, L) > 0.45 * Math.max(w, h)) return rej('size'); // an A4 at 1.5 to 9 m on a phone photo
      // brightness inside vs ring outside, and interior uniformity, on the full-res image
      var st = quadStats(gray, w, h, q); if (!st || st.contrast < 2.5 || st.std > 9) return rej(!st ? 'stats' : st.contrast < 2.5 ? 'contrast' : 'std'); // measured on the margin band, which is white on a printed page too
      if (st.mean < 0.82 * bright) return rej('dark');
      if (st.darkerSides < 3) return rej('sides-flat'); // paper on a wall is brighter than its surroundings on at least three sides; a frame segment or a glare patch is not // paper is about the brightest thing in a room photo
      var score = Math.min(st.contrast, 25) * (1 - fit / 0.18) * (1 / (1 + st.std / 12)) * Math.sqrt(Math.min(L[0], L[1]) / 40) * Math.pow(st.mean / bright, 3);
      if (!best || score > best.score) best = { corners: q, portrait: portrait < landscape, score: score, contrast: st.contrast, aspect: asp, std: st.std };
    });
    return best;
  }
  // grey-level max over a (2r+1) square, separable; used so thin dark print does not break a page into strips
  function maxFilter(src, w, h, r){
    var tmp = new Uint8ClampedArray(w * h), out = new Uint8ClampedArray(w * h), x, y, k, v, i, row;
    for (y = 0; y < h; y++) { row = y * w; for (x = 0; x < w; x++) { v = 0; for (k = -r; k <= r; k++) { i = x + k; if (i < 0 || i >= w) continue; if (src[row + i] > v) v = src[row + i]; } tmp[row + x] = v; } }
    for (x = 0; x < w; x++) for (y = 0; y < h; y++) { v = 0; for (k = -r; k <= r; k++) { i = y + k; if (i < 0 || i >= h) continue; if (tmp[i * w + x] > v) v = tmp[i * w + x]; } out[y * w + x] = v; }
    return out;
  }
  // fill enclosed background regions smaller than maxArea (a text block inside white margins); big enclosed regions (a wall section framed by trims) are left alone
  function fillSmallHoles(mask, w, h, maxArea){
    var seen = new Uint8Array(w * h), stack = [], px = [];
    for (var s0 = 0; s0 < w * h; s0++) { if (mask[s0] || seen[s0]) continue; var touches = false; px.length = 0; stack.push(s0); seen[s0] = 1;
      while (stack.length) { var i = stack.pop(), x = i % w, y = (i / w) | 0; px.push(i); if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
        if (x > 0 && !mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); } if (x < w - 1 && !mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
        if (y > 0 && !mask[i - w] && !seen[i - w]) { seen[i - w] = 1; stack.push(i - w); } if (y < h - 1 && !mask[i + w] && !seen[i + w]) { seen[i + w] = 1; stack.push(i + w); } }
      if (!touches && px.length < maxArea) for (var k = 0; k < px.length; k++) mask[px[k]] = 1; }
  }
  // morphological closing (dilate then erode) with a square window of radius r, separable passes
  function closeMask(mask, w, h, r){
    function pass(src, op){ var tmp = new Uint8Array(w * h), out = new Uint8Array(w * h), x, y, k, v, i;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { v = op; for (k = -r; k <= r; k++) { i = x + k; if (i < 0 || i >= w) continue; var m = src[y * w + i]; if (op === 0 ? m > v : m < v) v = m; } tmp[y * w + x] = v; }
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { v = op; for (k = -r; k <= r; k++) { i = y + k; if (i < 0 || i >= h) continue; var m2 = tmp[i * w + x]; if (op === 0 ? m2 > v : m2 < v) v = m2; } out[y * w + x] = v; }
      return out; }
    return pass(pass(mask, 0), 1); // op 0 = max (dilate), op 1 = min (erode)
  }
  // connected components with a bounding box and a quad from the extreme points along the diagonals
  function components(mask, w, h, cb){
    var lab = new Int32Array(w * h), stack = [], id = 0;
    for (var s = 0; s < w * h; s++) { if (!mask[s] || lab[s]) continue; id++; var comp = { n: 0, x0: w, y0: h, x1: 0, y1: 0, e: [[1e9, null], [-1e9, null], [-1e9, null], [1e9, null]] }; stack.push(s); lab[s] = id;
      while (stack.length) { var i = stack.pop(), x = i % w, y = (i / w) | 0; comp.n++; if (x < comp.x0) comp.x0 = x; if (x > comp.x1) comp.x1 = x; if (y < comp.y0) comp.y0 = y; if (y > comp.y1) comp.y1 = y;
        var d1 = x + y, d2 = x - y; if (d1 < comp.e[0][0]) comp.e[0] = [d1, { x: x, y: y }]; if (d2 > comp.e[1][0]) comp.e[1] = [d2, { x: x, y: y }]; if (d1 > comp.e[2][0]) comp.e[2] = [d1, { x: x, y: y }]; if (d2 < comp.e[3][0]) comp.e[3] = [d2, { x: x, y: y }];
        if (x > 0 && mask[i - 1] && !lab[i - 1]) { lab[i - 1] = id; stack.push(i - 1); } if (x < w - 1 && mask[i + 1] && !lab[i + 1]) { lab[i + 1] = id; stack.push(i + 1); }
        if (y > 0 && mask[i - w] && !lab[i - w]) { lab[i - w] = id; stack.push(i - w); } if (y < h - 1 && mask[i + w] && !lab[i + w]) { lab[i + w] = id; stack.push(i + w); } }
      comp.quad = [comp.e[0][1], comp.e[1][1], comp.e[2][1], comp.e[3][1]]; cb(comp); }
  }
  function quadStats(gray, w, h, q){
    var H = homography(UNIT, q); if (!H) return null; var sIn = 0, sIn2 = 0, nIn = 0, sOut = 0, nOut = 0, N = 20, ins = [];
    [0.03, 0.05, 0.07].forEach(function(dIn){ for (var i = 0; i < N; i++) { var t0 = dIn + (1 - 2 * dIn) * i / (N - 1); [{ x: t0, y: dIn }, { x: 1 - dIn, y: t0 }, { x: t0, y: 1 - dIn }, { x: dIn, y: t0 }].forEach(function(uv){ var p = apply(H, uv), xi = Math.round(p.x), yi = Math.round(p.y); if (xi < 0 || yi < 0 || xi >= w || yi >= h) return; var val = gray[yi * w + xi]; sIn += val; sIn2 += val * val; nIn++; ins.push(val); }); } }); // the margin band: white on a printed page too
    var sideS = [0, 0, 0, 0], sideN = [0, 0, 0, 0];
    for (var k = 0; k < 4 * N; k++) { var t = (k % N) / (N - 1), side = (k / N) | 0, u2 = side === 0 ? t : side === 1 ? 1.25 : side === 2 ? t : -0.25, v2 = side === 0 ? -0.25 : side === 1 ? t : side === 2 ? 1.25 : t, p2 = apply(H, { x: u2, y: v2 }), x2 = Math.round(p2.x), y2 = Math.round(p2.y); if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) continue; sOut += gray[y2 * w + x2]; nOut++; sideS[side] += gray[y2 * w + x2]; sideN[side]++; }
    if (nIn < 20 || nOut < 10) return null; ins.sort(function(a, b){ return a - b; }); var keep = ins.slice(Math.floor(ins.length * 0.4)), mIn = 0, m2 = 0; keep.forEach(function(v){ mIn += v; m2 += v * v; }); mIn /= keep.length; m2 /= keep.length; // printed text is dark and thin: the brighter 60% of samples is the paper itself
    var darkerSides = 0; for (var sd = 0; sd < 4; sd++) if (sideN[sd] && mIn - sideS[sd] / sideN[sd] > 2.5) darkerSides++;
    return { mean: mIn, std: Math.sqrt(Math.max(0, m2 - mIn * mIn)), contrast: mIn - sOut / nOut, darkerSides: darkerSides };
  }

  // ---------- Wall detection. The page is on the wall, so the wall is the smooth region around the page. Its boundary
  // (ceiling line or cornice, skirting, the two corners) is fitted with robust lines, then each side is snapped to the
  // strongest straight edge nearby, then the corners are refined at full resolution.
  function findWall(gray, w, h, page){
    var D = downscale(gray, w, h, 900), g = D.g, dw = D.w, dh = D.h, S = sobel(g, dw, dh), thrE = Math.max(9, Math.min(percentile(S.mag, 0.965), 18));
    var pq = page ? page.map(function(p){ return { x: p.x * D.s, y: p.y * D.s }; }) : null;
    var pc = pq ? { x: (pq[0].x + pq[2].x) / 2, y: (pq[0].y + pq[2].y) / 2 } : { x: dw / 2, y: dh / 2 };
    // seeds: a ring just outside the page (or around the image centre)
    var seeds = [], ringVals = [];
    if (pq) { var Hp = homography(UNIT, pq); for (var k = 0; k < 64; k++) { var t = (k % 16) / 15, side = (k / 16) | 0, u = side === 0 ? t : side === 1 ? 1.35 : side === 2 ? t : -0.35, v = side === 0 ? -0.35 : side === 1 ? t : side === 2 ? 1.35 : t, sp = apply(Hp, { x: u, y: v }), sx = Math.round(sp.x), sy = Math.round(sp.y); if (sx > 1 && sy > 1 && sx < dw - 2 && sy < dh - 2) { seeds.push(sy * dw + sx); ringVals.push(g[sy * dw + sx]); } } }
    else { for (var k2 = -3; k2 <= 3; k2++) for (var j2 = -3; j2 <= 3; j2++) { var sx2 = Math.round(dw / 2 + k2 * 8), sy2 = Math.round(dh / 2 + j2 * 8); seeds.push(sy2 * dw + sx2); ringVals.push(g[sy2 * dw + sx2]); } }
    ringVals.sort(function(a, b){ return a - b; }); var ref = ringVals[ringVals.length >> 1];
    function yAt0(L, x){ return L.y + (x - L.x) / (Math.abs(L.dx) < 1e-9 ? 1e-9 : L.dx) * L.dy; }
    function xAt0(L, y){ return L.x + (y - L.y) / (Math.abs(L.dy) < 1e-9 ? 1e-9 : L.dy) * L.dx; }
    function pageTop(q){ return Math.min.apply(null, q.map(function(p){ return p.y; })); } function pageBot(q){ return Math.max.apply(null, q.map(function(p){ return p.y; })); }
    function pageLeft(q){ return Math.min.apply(null, q.map(function(p){ return p.x; })); } function pageRight(q){ return Math.max.apply(null, q.map(function(p){ return p.x; })); }
    // flood fill: smooth (small step to neighbour), not on an edge, and not wildly different from the ring
    var mask = new Uint8Array(dw * dh), stack = [], step = 2.5, far = 45;
    seeds.forEach(function(i){ if (Math.abs(g[i] - ref) < 12 && S.mag[i] < thrE) { mask[i] = 1; stack.push(i); } });
    while (stack.length) { var i = stack.pop(), x = i % dw, y = (i / dw) | 0, gi = g[i];
      var nb = [x > 0 ? i - 1 : -1, x < dw - 1 ? i + 1 : -1, y > 0 ? i - dw : -1, y < dh - 1 ? i + dw : -1];
      for (var n = 0; n < 4; n++) { var j = nb[n]; if (j < 0 || mask[j]) continue; if (Math.abs(g[j] - gi) < step && S.mag[j] < thrE && Math.abs(g[j] - ref) < far) { mask[j] = 1; stack.push(j); } } }
    // boundary samples
    var top = [], bot = [], left = [], right = [];
    for (var xx = 0; xx < dw; xx++) { var t0 = -1, b0 = -1; for (var yy = 0; yy < dh; yy++) if (mask[yy * dw + xx]) { if (t0 < 0) t0 = yy; b0 = yy; } if (t0 >= 0) { top.push({ x: xx, y: t0 }); bot.push({ x: xx, y: b0 }); } }
    for (var yy2 = 0; yy2 < dh; yy2++) { var l0 = -1, r0 = -1; for (var xx2 = 0; xx2 < dw; xx2++) if (mask[yy2 * dw + xx2]) { if (l0 < 0) l0 = xx2; r0 = xx2; } if (l0 >= 0) { left.push({ x: l0, y: yy2 }); right.push({ x: r0, y: yy2 }); } }
    if (top.length < dw * 0.2 || left.length < dh * 0.2) return null;
    function ransac(pts, horizontal){ // robust line through boundary samples; returns {x,y,dx,dy,inl}
      var best = null, n = pts.length, seed = 12345; function rnd(){ seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      for (var it = 0; it < 220; it++) { var a = pts[(rnd() * n) | 0], b = pts[(rnd() * n) | 0]; var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy); if (L < (horizontal ? dw : dh) * 0.15) continue; dx /= L; dy /= L;
        if (horizontal ? Math.abs(dy) > 0.5 : Math.abs(dx) > 0.5) continue; var inl = 0; for (var q = 0; q < n; q += 2) { var d = Math.abs((pts[q].x - a.x) * -dy + (pts[q].y - a.y) * dx); if (d < 2.5) inl++; } if (!best || inl > best.inl) best = { x: a.x, y: a.y, dx: dx, dy: dy, inl: inl }; }
      if (!best) return null; // refit on inliers
      var sel = pts.filter(function(p){ return Math.abs((p.x - best.x) * -best.dy + (p.y - best.y) * best.dx) < 2.5; }); if (sel.length < 8) return best;
      var cx = 0, cy = 0; sel.forEach(function(p){ cx += p.x; cy += p.y; }); cx /= sel.length; cy /= sel.length; var sxx = 0, sxy = 0, syy = 0; sel.forEach(function(p){ var ex = p.x - cx, ey = p.y - cy; sxx += ex * ex; sxy += ex * ey; syy += ey * ey; }); var th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      return { x: cx, y: cy, dx: Math.cos(th), dy: Math.sin(th), inl: sel.length, frac: sel.length / n }; }
    var LT = ransac(top, true), LB = ransac(bot, true), LL = ransac(left, false), LR = ransac(right, false); if (!LT || !LB || !LL || !LR) return null;
    // snap each side to the strongest nearby straight edge (Hough over oriented edges), within a small band
    var diag = Math.hypot(dw, dh), rhoBin = 1.5, nRho = Math.ceil(2 * diag / rhoBin), thrH = Math.max(12, Math.min(percentile(S.mag, 0.93), 40));
    function houghNear(line, vertical){ var th0 = Math.atan2(line.dy, line.dx) + Math.PI / 2, thetas = []; for (var a = -6; a <= 6; a++) thetas.push(th0 + a * Math.PI / 180);
      var acc = new Float32Array(thetas.length * nRho), cs = thetas.map(Math.cos), sn = thetas.map(Math.sin), band = 0.009 * diag, rho0 = line.x * Math.cos(th0) + line.y * Math.sin(th0);
      for (var y = 1; y < dh - 1; y++) for (var x = 1; x < dw - 1; x++) { var i = y * dw + x, m = S.mag[i]; if (m < thrH) continue; if (vertical ? Math.abs(S.gx[i]) < Math.abs(S.gy[i]) : Math.abs(S.gy[i]) < Math.abs(S.gx[i])) continue;
        var d0 = x * Math.cos(th0) + y * Math.sin(th0) - rho0; if (Math.abs(d0) > band) continue;
        for (var t = 0; t < thetas.length; t++) { var rb = Math.round((x * cs[t] + y * sn[t] + diag) / rhoBin); if (rb >= 0 && rb < nRho) acc[t * nRho + rb] += 1; } }
      var bi = -1, bv = 0; for (var q = 0; q < acc.length; q++) if (acc[q] > bv) { bv = acc[q]; bi = q; } if (bi < 0) return null;
      var tt = thetas[(bi / nRho) | 0], rr = (bi % nRho) * rhoBin - diag, need = 0.35 * (vertical ? dh : dw); if (bv < need) return null;
      return { x: rr * Math.cos(tt), y: rr * Math.sin(tt), dx: -Math.sin(tt), dy: Math.cos(tt), votes: bv }; }
    function longLine(vertical, lo, hi){ // strongest long oriented straight edge with its coordinate (y for horizontal, x for vertical) in [lo, hi]
      var thetas = [], base = vertical ? 0 : Math.PI / 2; for (var a = -20; a <= 20; a += 1) thetas.push(base + a * Math.PI / 180);
      var acc = new Float32Array(thetas.length * nRho), cs = thetas.map(Math.cos), sn = thetas.map(Math.sin);
      for (var y = 1; y < dh - 1; y++) for (var x = 1; x < dw - 1; x++) { var i = y * dw + x, m = S.mag[i]; if (m < thrH) continue; if (vertical ? Math.abs(S.gx[i]) < Math.abs(S.gy[i]) : Math.abs(S.gy[i]) < Math.abs(S.gx[i])) continue; var c0 = vertical ? x : y; if (c0 < lo || c0 > hi) continue;
        for (var t = 0; t < thetas.length; t++) { var rb = Math.round((x * cs[t] + y * sn[t] + diag) / rhoBin); if (rb >= 0 && rb < nRho) acc[t * nRho + rb] += 1; } }
      var bi = -1, bv = 0; for (var q2 = 0; q2 < acc.length; q2++) if (acc[q2] > bv) { bv = acc[q2]; bi = q2; } var need = 0.55 * (vertical ? dh : dw); if (bi < 0 || bv < need) return null;
      var tt = thetas[(bi / nRho) | 0], rr = (bi % nRho) * rhoBin - diag; return { x: rr * Math.cos(tt), y: rr * Math.sin(tt), dx: -Math.sin(tt), dy: Math.cos(tt), votes: bv, leakfix: true }; }
    var m = 0.03; // a region side that ran into the image border most likely leaked; look for the real edge between the border and the page
    if (yAt0(LT, pc.x) < m * dh) { var fT = longLine(false, m * dh, pq ? pageTop(pq) - 4 : dh * 0.45); if (fT) LT = fT; }
    if (yAt0(LB, pc.x) > (1 - m) * dh) { var fB = longLine(false, pq ? pageBot(pq) + 4 : dh * 0.55, (1 - m) * dh); if (fB) LB = fB; }
    if (xAt0(LL, pc.y) < m * dw) { var fL = longLine(true, m * dw, pq ? pageLeft(pq) - 4 : dw * 0.45); if (fL) LL = fL; }
    if (xAt0(LR, pc.y) > (1 - m) * dw) { var fR = longLine(true, pq ? pageRight(pq) + 4 : dw * 0.55, (1 - m) * dw); if (fR) LR = fR; }
    var ST = LT.leakfix ? LT : (houghNear(LT, false) || LT), SB = LB.leakfix ? LB : (houghNear(LB, false) || LB), SL = LL.leakfix ? LL : (houghNear(LL, true) || LL), SR = LR.leakfix ? LR : (houghNear(LR, true) || LR);
    function meet(A, B){ var den = A.dx * B.dy - A.dy * B.dx; if (Math.abs(den) < 1e-9) return null; var t = ((B.x - A.x) * B.dy - (B.y - A.y) * B.dx) / den; return { x: A.x + t * A.dx, y: A.y + t * A.dy }; }
    var q = [meet(ST, SL), meet(ST, SR), meet(SB, SR), meet(SB, SL)]; if (q.some(function(p){ return !p; })) return null;
    var full = q.map(function(p){ return { x: Math.min(w - 1, Math.max(0, p.x / D.s)), y: Math.min(h - 1, Math.max(0, p.y / D.s)) }; });
    var refine = makeRefiner(gray, w, h), r = isConvex(full) && quadArea(full) > 0 ? refine(full, 10) : full;
    var conf = Math.min(LT.frac || 0.5, LB.frac || 0.5, LL.frac || 0.5, LR.frac || 0.5);
    function yAt(L, x){ return L.y + (x - L.x) / (L.dx || 1e-9) * L.dy; }
    QCDetect.lastWallDebug = { scale: D.s, regionTopY: yAt(LT, pc.x) / D.s, snappedTopY: yAt(ST, pc.x) / D.s, topVotes: ST.votes || 0, regionBotY: yAt(LB, pc.x) / D.s, snappedBotY: yAt(SB, pc.x) / D.s, fr: [LT.frac, LB.frac, LL.frac, LR.frac] };
    return { corners: r, confidence: conf, snapped: [!!ST.votes, !!SR.votes, !!SB.votes, !!SL.votes], regionFrac: top.length / dw };
  }

  // ---------- Openings: rectangles in the rectified (fronto-parallel) wall. Hw maps the unit square to the image; Wmm, Hmm the wall size.
  function findOpenings(gray, w, h, Hw, Wmm, Hmm, exclude){
    var pxPerMm = 0.15, rw = Math.round(Wmm * pxPerMm), rh = Math.round(Hmm * pxPerMm); if (rw < 40 || rh < 40 || rw > 2000) return [];
    var R = new Float32Array(rw * rh);
    for (var y = 0; y < rh; y++) for (var x = 0; x < rw; x++) { var p = apply(Hw, { x: (x + 0.5) / rw, y: (y + 0.5) / rh }), xi = Math.round(p.x), yi = Math.round(p.y); R[y * rw + x] = (xi < 0 || yi < 0 || xi >= w || yi >= h) ? 128 : gray[yi * w + xi]; }
    var S = sobel(R, rw, rh), colE = new Float32Array(rw), rowE = new Float32Array(rh);
    for (var yy = 1; yy < rh - 1; yy++) for (var xx = 1; xx < rw - 1; xx++) { var i = yy * rw + xx; colE[xx] += Math.abs(S.gx[i]); rowE[yy] += Math.abs(S.gy[i]); }
    function peaks(arr, minSep, count){ var idx = []; for (var k = 2; k < arr.length - 2; k++) if (arr[k] >= arr[k - 1] && arr[k] >= arr[k + 1] && arr[k] > arr[k - 2] && arr[k] > arr[k + 2]) idx.push(k); idx.sort(function(a, b){ return arr[b] - arr[a]; }); var out = []; idx.forEach(function(k){ if (out.length >= count) return; for (var j = 0; j < out.length; j++) if (Math.abs(out[j] - k) < minSep) return; out.push(k); }); return out; }
    var cols = peaks(colE, 12, 16), rows = peaks(rowE, 12, 12), thr = percentile(S.mag, 0.94);
    function sideSupport(x0, y0, x1, y1){ var len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), hit = 0, n = 0; for (var k = 0; k <= len; k += 2) { var t = len ? k / len : 0, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t); if (x < 1 || y < 1 || x >= rw - 1 || y >= rh - 1) continue; n++; var horiz = Math.abs(x1 - x0) > Math.abs(y1 - y0), m = 0; for (var o = -2; o <= 2; o++) { var ii = horiz ? (y + o) * rw + x : y * rw + x + o, gm = horiz ? Math.abs(S.gy[ii]) : Math.abs(S.gx[ii]); m = Math.max(m, gm); } if (m > thr) hit++; } return n ? hit / n : 0; }
    function meanIn(x0, y0, x1, y1){ var s = 0, n = 0; for (var y = y0 + 3; y < y1 - 3; y += 3) for (var x = x0 + 3; x < x1 - 3; x += 3) { s += R[y * rw + x]; n++; } return n ? s / n : 0; }
    var wallMean = meanIn(0, 0, rw, rh), found = [], mm = function(px){ return px / pxPerMm; };
    var bottoms = rows.slice(); bottoms.push(rh - 1);
    for (var a = 0; a < cols.length; a++) for (var b = a + 1; b < cols.length; b++) {
      var x0 = Math.min(cols[a], cols[b]), x1 = Math.max(cols[a], cols[b]), wmm = mm(x1 - x0); if (wmm < 450 || wmm > 3500) continue;
      for (var c = 0; c < rows.length; c++) for (var d = 0; d < bottoms.length; d++) {
        var y0 = Math.min(rows[c], bottoms[d]), y1 = Math.max(rows[c], bottoms[d]), hmm = mm(y1 - y0); if (hmm < 400 || hmm > 2400 || y0 === y1) continue;
        var touchesFloor = y1 >= rh - Math.max(3, 0.045 * rh), isDoor = touchesFloor && hmm > 1850 && hmm < 2250 && wmm < 1100;
        if (!isDoor && (hmm > 2000 || touchesFloor)) continue; if (hmm > 0.92 * Hmm) continue;
        var sides = [sideSupport(x0, y0, x1, y0), sideSupport(x0, y0, x0, y1), sideSupport(x1, y0, x1, y1)]; if (!touchesFloor) sides.push(sideSupport(x0, y1, x1, y1));
        if (Math.min.apply(null, sides) < 0.6) continue; var sup = sides.reduce(function(s2, v){ return s2 + v; }, 0) / sides.length; if (sup < 0.75) continue;
        var inner = meanIn(x0, y0, x1, y1), diff = Math.abs(inner - wallMean); if (diff < 10) continue;
        var rect = { type: isDoor ? 'door' : 'window', u1: x0 / rw, v1: y0 / rh, u2: x1 / rw, v2: y1 / rh, width_mm: wmm, height_mm: hmm, score: sup + Math.min(1, diff / 40) };
        if (exclude && exclude.some(function(e){ return !(rect.u2 < e.u1 || rect.u1 > e.u2 || rect.v2 < e.v1 || rect.v1 > e.v2); })) continue;
        found.push(rect);
      }
    }
    found.sort(function(p, q){ return (q.score + 0.3 * (q.u2 - q.u1) * (q.v2 - q.v1) * 10) - (p.score + 0.3 * (p.u2 - p.u1) * (p.v2 - p.v1) * 10); });
    var out = []; found.forEach(function(r){ for (var k = 0; k < out.length; k++) { var o = out[k], ix = Math.max(0, Math.min(r.u2, o.u2) - Math.max(r.u1, o.u1)), iy = Math.max(0, Math.min(r.v2, o.v2) - Math.max(r.v1, o.v1)); if (ix * iy > 0.3 * Math.min((r.u2 - r.u1) * (r.v2 - r.v1), (o.u2 - o.u1) * (o.v2 - o.v1))) return; } if (out.length < 6) out.push(r); });
    return out;
  }

  window.QCDetect = { _quadStats: quadStats, _closeMask: closeMask, _fillSmallHoles: fillSmallHoles, _maxFilter: maxFilter, _downscale: downscale, _integral: integral, _boxMean: boxMean, _components: components, findPage: findPage, findWall: findWall, findOpenings: findOpenings, homography: homography, apply: apply, inv3: inv3, aspectFromH: aspectFromH, makeRefiner: makeRefiner };
})();
