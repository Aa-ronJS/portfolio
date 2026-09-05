/* Inside Jokes. Puzzle generation shared by the maker page and the print page.
   Deterministic for a given seed so the print matches the preview. */
(function (global) {
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clean(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, ''); }
  function shuffle(arr, r) { arr = arr.slice(); for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

  /* ---------- Crossword ---------- */
  function tryLayout(words, r) {
    var grid = {}, placed = [];
    function key(row, col) { return row + ',' + col; }
    function put(w, row, col, dir) {
      for (var i = 0; i < w.answer.length; i++) grid[key(row + (dir === 'down' ? i : 0), col + (dir === 'across' ? i : 0))] = w.answer[i];
      placed.push({ answer: w.answer, clue: w.clue, row: row, col: col, dir: dir });
    }
    function fits(word, row, col, dir) {
      var crossings = 0, dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
      if (grid[key(row - dr, col - dc)]) return -1;
      if (grid[key(row + dr * word.length, col + dc * word.length)]) return -1;
      for (var i = 0; i < word.length; i++) {
        var rr = row + dr * i, cc = col + dc * i, ex = grid[key(rr, cc)];
        if (ex) { if (ex !== word[i]) return -1; crossings++; continue; }
        if (grid[key(rr + dc, cc + dr)] || grid[key(rr - dc, cc - dr)]) return -1;
      }
      return crossings;
    }
    put(words[0], 0, 0, 'across');
    var unplaced = [];
    for (var n = 1; n < words.length; n++) {
      var w = words[n], best = [], bestScore = 0;
      for (var p = 0; p < placed.length; p++) {
        var pw = placed[p];
        for (var i = 0; i < pw.answer.length; i++) {
          for (var j = 0; j < w.answer.length; j++) {
            if (pw.answer[i] !== w.answer[j]) continue;
            var cr = pw.row + (pw.dir === 'down' ? i : 0), cc = pw.col + (pw.dir === 'across' ? i : 0);
            var dir = pw.dir === 'across' ? 'down' : 'across';
            var row = dir === 'down' ? cr - j : cr, col = dir === 'across' ? cc - j : cc;
            var s = fits(w.answer, row, col, dir);
            if (s > bestScore) { bestScore = s; best = [[row, col, dir]]; }
            else if (s === bestScore && s > 0) best.push([row, col, dir]);
          }
        }
      }
      if (!best.length) { unplaced.push(w); continue; }
      var pick = best[Math.floor(r() * best.length)];
      put(w, pick[0], pick[1], pick[2]);
    }
    var minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    Object.keys(grid).forEach(function (k) { var p = k.split(',').map(Number); minR = Math.min(minR, p[0]); maxR = Math.max(maxR, p[0]); minC = Math.min(minC, p[1]); maxC = Math.max(maxC, p[1]); });
    var rows = maxR - minR + 1, cols = maxC - minC + 1;
    placed.forEach(function (p) { p.row -= minR; p.col -= minC; });
    var cells = {};
    Object.keys(grid).forEach(function (k) { var p = k.split(',').map(Number); cells[(p[0] - minR) + ',' + (p[1] - minC)] = grid[k]; });
    return { cells: cells, placed: placed, unplaced: unplaced, rows: rows, cols: cols,
             score: placed.length * 10000 - rows * cols - Math.abs(rows - cols) * 20 };
  }

  function number(layout) {
    var n = 0, starts = {};
    for (var r = 0; r < layout.rows; r++) for (var c = 0; c < layout.cols; c++) {
      if (!layout.cells[r + ',' + c]) continue;
      var across = !layout.cells[r + ',' + (c - 1)] && layout.cells[r + ',' + (c + 1)];
      var down = !layout.cells[(r - 1) + ',' + c] && layout.cells[(r + 1) + ',' + c];
      if (across || down) starts[r + ',' + c] = ++n;
    }
    layout.numbers = starts;
    layout.placed.forEach(function (p) { p.number = starts[p.row + ',' + p.col]; });
    layout.across = layout.placed.filter(function (p) { return p.dir === 'across'; }).sort(function (a, b) { return a.number - b.number; });
    layout.down = layout.placed.filter(function (p) { return p.dir === 'down'; }).sort(function (a, b) { return a.number - b.number; });
    return layout;
  }

  function crossword(entries, seed) {
    var words = entries.map(function (e) { return { answer: clean(e.answer), clue: String(e.clue || '').trim(), raw: e.answer }; })
      .filter(function (w) { return w.answer.length >= 2 && w.clue; });
    if (!words.length) return null;
    var r = rng(seed), best = null;
    for (var t = 0; t < 60; t++) {
      var order = words.slice().sort(function (a, b) { return b.answer.length - a.answer.length; });
      if (t > 0) { var head = order.slice(0, 2), tail = shuffle(order.slice(2), r); order = (t % 2 ? head : head.reverse()).concat(tail); }
      var lay = tryLayout(order, r);
      if (!best || lay.score > best.score) best = lay;
    }
    return number(best);
  }

  /* ---------- Word search ---------- */
  function wordsearch(entries, seed) {
    var words = entries.map(function (e) { return clean(e.answer); }).filter(function (w) { return w.length >= 2; });
    var longest = words.reduce(function (m, w) { return Math.max(m, w.length); }, 0);
    var size = Math.max(12, Math.min(18, longest + 2, Math.ceil(Math.sqrt(words.join('').length * 2.4))));
    size = Math.max(size, longest);
    var r = rng(seed ^ 0x9E3779B9), grid = [], sol = [];
    for (var i = 0; i < size; i++) { grid.push(new Array(size).fill('')); }
    var dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
    var placed = [], missed = [];
    shuffle(words, r).sort(function (a, b) { return b.length - a.length; }).forEach(function (w) {
      for (var attempt = 0; attempt < 400; attempt++) {
        var d = dirs[Math.floor(r() * dirs.length)];
        var row = Math.floor(r() * size), col = Math.floor(r() * size);
        var endR = row + d[0] * (w.length - 1), endC = col + d[1] * (w.length - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
        var ok = true;
        for (var k = 0; k < w.length; k++) { var ch = grid[row + d[0] * k][col + d[1] * k]; if (ch && ch !== w[k]) { ok = false; break; } }
        if (!ok) continue;
        var cells = [];
        for (k = 0; k < w.length; k++) { grid[row + d[0] * k][col + d[1] * k] = w[k]; cells.push([row + d[0] * k, col + d[1] * k]); }
        placed.push({ word: w, cells: cells });
        return;
      }
      missed.push(w);
    });
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (i = 0; i < size; i++) for (var j = 0; j < size; j++) if (!grid[i][j]) grid[i][j] = A[Math.floor(r() * 26)];
    return { grid: grid, size: size, placed: placed, missed: missed };
  }

  /* ---------- State ---------- */
  function encode(state) { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function decode(code) { try { code = code.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(code)))); } catch (e) { return null; } }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Render a crossword grid. mode: 'blank' | 'solved' */
  function renderCrossword(lay, mode) {
    var h = '<div class="xw" style="--cols:' + lay.cols + ';--rows:' + lay.rows + '" role="img" aria-label="Crossword grid, ' + lay.rows + ' by ' + lay.cols + '">';
    for (var r = 0; r < lay.rows; r++) for (var c = 0; c < lay.cols; c++) {
      var ch = lay.cells[r + ',' + c];
      if (!ch) { h += '<i></i>'; continue; }
      var n = lay.numbers[r + ',' + c];
      h += '<b>' + (n ? '<small>' + n + '</small>' : '') + (mode === 'solved' ? '<span>' + ch + '</span>' : '') + '</b>';
    }
    return h + '</div>';
  }
  function renderClues(list) {
    return '<ol class="clues">' + list.map(function (p) {
      return '<li value="' + p.number + '">' + esc(p.clue) + ' <em>(' + p.answer.length + ')</em></li>';
    }).join('') + '</ol>';
  }
  function renderWordsearch(ws, solved) {
    var hot = {};
    if (solved) ws.placed.forEach(function (p) { p.cells.forEach(function (c) { hot[c[0] + ',' + c[1]] = 1; }); });
    var h = '<div class="ws" style="--n:' + ws.size + '" role="img" aria-label="Word search, ' + ws.size + ' by ' + ws.size + '">';
    for (var i = 0; i < ws.size; i++) for (var j = 0; j < ws.size; j++) h += '<b' + (hot[i + ',' + j] ? ' class="hit"' : '') + '>' + ws.grid[i][j] + '</b>';
    return h + '</div>';
  }

  global.Puzzle = { crossword: crossword, wordsearch: wordsearch, encode: encode, decode: decode, clean: clean, esc: esc,
                    renderCrossword: renderCrossword, renderClues: renderClues, renderWordsearch: renderWordsearch };
})(window);
