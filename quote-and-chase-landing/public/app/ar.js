/* Quote & Chase: AR tape for Android (WebXR immersive-ar with hit testing). Places the four wall corners and
 * door/window corners on the real wall and hands back the same wall record the photo flow produces.
 * iPhone Safari does not expose WebXR AR, so the button only appears where a session is possible. */
(function(){
  'use strict';
  function supported(){ try { if (!navigator.xr || !navigator.xr.isSessionSupported) return Promise.resolve(false); return navigator.xr.isSessionSupported('immersive-ar').catch(function(){ return false; }); } catch (e) { return Promise.resolve(false); } }
  function v(a, b){ return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; } function len(a){ return Math.hypot(a[0], a[1], a[2]); } function dot(a, b){ return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; } function norm(a){ var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  // Pure geometry, testable without a headset: corners in metres -> wall record
  function wallFromPoints(c){ var W = (len(v(c[1], c[0])) + len(v(c[2], c[3]))) / 2, H = (len(v(c[3], c[0])) + len(v(c[2], c[1]))) / 2; return { W: W * 1000, H: H * 1000, ex: norm(v(c[1], c[0])), ey: norm(v(c[3], c[0])) }; }
  function openingFromPoints(wall, p, q){ var d = v(q, p); return { width_mm: Math.abs(dot(d, wall.ex)) * 1000, height_mm: Math.abs(dot(d, wall.ey)) * 1000 }; }

  var VS = 'attribute vec3 p; uniform mat4 vp; uniform float ps; void main(){ gl_Position = vp * vec4(p, 1.0); gl_PointSize = ps; }';
  var FS = 'precision mediump float; uniform vec4 c; void main(){ gl_FragColor = c; }';
  function start(opts){
    opts = opts || {};
    if (!navigator.xr) return Promise.reject(new Error('WebXR not available'));
    var overlay = document.createElement('div'); overlay.className = 'ar-overlay';
    overlay.innerHTML = '<div class="ar-top"><span class="ar-status">Point at the wall and move the phone slowly until the ring sits on it.</span></div>' +
      '<div class="ar-bottom"><div class="ar-row"><button class="btn tape" data-ar="place">Place point</button><button class="btn ghost sm" data-ar="undo">Undo</button></div>' +
      '<div class="ar-row" data-ar="modes" hidden><button class="btn sm tape" data-armode="door">Door</button><button class="btn sm" data-armode="window">Window</button><button class="btn sm" data-ar="save">Save wall</button></div>' +
      '<div class="ar-row"><button class="btn ghost sm" data-ar="exit">Exit</button></div></div>';
    document.body.appendChild(overlay);
    var status = overlay.querySelector('.ar-status'), canvas = document.createElement('canvas'); canvas.className = 'ar-canvas'; document.body.appendChild(canvas);
    var gl = canvas.getContext('webgl', { xrCompatible: true, alpha: true });
    var st = { corners: [], wall: null, mode: 'door', pending: null, items: [], hit: null, session: null };
    function say(t){ status.textContent = t; }
    function cleanup(){ overlay.remove(); canvas.remove(); }
    return navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test', 'dom-overlay'], domOverlay: { root: overlay } }).then(function(session){
      st.session = session;
      var prog = gl.createProgram(), vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(vs, VS); gl.compileShader(vs); gl.shaderSource(fs, FS); gl.compileShader(fs); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
      var aP = gl.getAttribLocation(prog, 'p'), uVP = gl.getUniformLocation(prog, 'vp'), uC = gl.getUniformLocation(prog, 'c'), uPS = gl.getUniformLocation(prog, 'ps'), buf = gl.createBuffer();
      function drawArr(pts, mode, color, size){ if (!pts.length) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([].concat.apply([], pts)), gl.STREAM_DRAW); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0); gl.uniform4fv(uC, color); gl.uniform1f(uPS, size || 18); gl.drawArrays(mode, 0, pts.length); }
      function mul(a, b){ var o = new Float32Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s2 = 0; for (var k = 0; k < 4; k++) s2 += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s2; } return o; }
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
      var refSpace, hitSource;
      session.requestReferenceSpace('local').then(function(rs){ refSpace = rs; return session.requestReferenceSpace('viewer'); }).then(function(vs2){ return session.requestHitTestSource({ space: vs2 }); }).then(function(hs){ hitSource = hs; });
      function place(){ if (!st.hit) { say('No surface under the ring yet. Move the phone slowly across the wall.'); return; }
        var p = st.hit.slice();
        if (!st.wall) { st.corners.push(p); var names = ['top-right', 'bottom-right', 'bottom-left']; if (st.corners.length < 4) { say('Corner ' + st.corners.length + ' placed. Now the ' + names[st.corners.length - 1] + ' corner.'); return; }
          st.wall = wallFromPoints(st.corners); say('Wall ' + (st.wall.W / 1000).toFixed(2) + ' × ' + (st.wall.H / 1000).toFixed(2) + ' m. Now doors and windows: two opposite corners each. Or save.'); overlay.querySelector('[data-ar="modes"]').hidden = false; return; }
        if (!st.pending) { st.pending = p; say('Now the opposite corner of the ' + st.mode + '.'); return; }
        var o = openingFromPoints(st.wall, st.pending, p); st.items.push({ type: st.mode, width_mm: Math.round(o.width_mm), height_mm: Math.round(o.height_mm), area_m2: +(o.width_mm * o.height_mm / 1e6).toFixed(3), a: st.pending, b: p }); st.pending = null;
        say(st.mode + ' ' + (o.width_mm / 1000).toFixed(2) + ' × ' + (o.height_mm / 1000).toFixed(2) + ' m added. Next, or save.'); }
      overlay.querySelector('[data-ar="place"]').addEventListener('click', place);
      session.addEventListener('select', place);
      overlay.querySelector('[data-ar="undo"]').addEventListener('click', function(){ if (st.pending) st.pending = null; else if (st.items.length) st.items.pop(); else if (st.wall) { st.wall = null; st.corners.pop(); overlay.querySelector('[data-ar="modes"]').hidden = true; } else st.corners.pop(); say('Undone.'); });
      overlay.querySelectorAll('[data-armode]').forEach(function(b){ b.addEventListener('click', function(){ st.mode = b.dataset.armode; st.pending = null; overlay.querySelectorAll('[data-armode]').forEach(function(x){ x.classList.toggle('tape', x === b); }); say('Tap two opposite corners of the ' + st.mode + '.'); }); });
      overlay.querySelector('[data-ar="save"]').addEventListener('click', function(){ if (!st.wall) return; var openArea = st.items.reduce(function(s2, o){ return s2 + o.area_m2; }, 0), gross = st.wall.W * st.wall.H / 1e6;
        var rec = { wall: 'Wall ' + ((opts.count ? opts.count() : 0) + 1), width_mm: Math.round(st.wall.W), height_mm: Math.round(st.wall.H), gross_area_m2: +gross.toFixed(3), openings: st.items.map(function(o){ return { type: o.type, width_mm: o.width_mm, height_mm: o.height_mm, area_m2: o.area_m2 }; }), paint_area_m2: +(gross - openArea).toFixed(3), method: 'ar', scale: 'ar', expected_error_pct: 2, measured_at: new Date().toISOString() };
        if (opts.onSave) opts.onSave(rec); session.end(); });
      overlay.querySelector('[data-ar="exit"]').addEventListener('click', function(){ session.end(); });
      session.addEventListener('end', cleanup);
      session.requestAnimationFrame(function frame(t, xrFrame){
        session.requestAnimationFrame(frame); if (!refSpace) return;
        var pose = xrFrame.getViewerPose(refSpace); if (!pose) return;
        var layer = session.renderState.baseLayer; gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (hitSource) { var hits = xrFrame.getHitTestResults(hitSource); if (hits.length) { var hp = hits[0].getPose(refSpace); st.hit = hp ? [hp.transform.position.x, hp.transform.position.y, hp.transform.position.z] : null; } else st.hit = null; }
        pose.views.forEach(function(view){ var vp = layer.getViewport(view); gl.viewport(vp.x, vp.y, vp.width, vp.height); gl.uniformMatrix4fv(uVP, false, mul(view.projectionMatrix, view.transform.inverse.matrix));
          if (st.hit) { var ring = []; for (var k = 0; k < 32; k++) { var a = k / 32 * Math.PI * 2; ring.push([st.hit[0] + Math.cos(a) * 0.03, st.hit[1] + Math.sin(a) * 0.03, st.hit[2]]); } drawArr(ring, gl.LINE_LOOP, [1, 0.35, 0.2, 1]); }
          if (st.corners.length) { drawArr(st.corners, gl.POINTS, [0.17, 0.48, 0.84, 1], 22); if (st.corners.length > 1) drawArr(st.corners, st.corners.length === 4 ? gl.LINE_LOOP : gl.LINE_STRIP, [0.17, 0.48, 0.84, 1]); }
          if (st.pending) drawArr([st.pending], gl.POINTS, [0.95, 0.64, 0.24, 1], 22);
          st.items.forEach(function(o){ drawArr([o.a, o.b], gl.LINES, o.type === 'door' ? [0.95, 0.64, 0.24, 1] : [0.7, 0.42, 0.9, 1]); }); });
      });
      say('Point at the top-left corner of the wall and tap Place point (or tap the screen).');
      return session;
    }).catch(function(e){ cleanup(); throw e; });
  }
  window.QCAR = { supported: supported, start: start, wallFromPoints: wallFromPoints, openingFromPoints: openingFromPoints };
})();
