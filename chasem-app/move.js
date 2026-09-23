/* Chasem: the move from chasem.app/app/ to go.chasem.app.
   A browser keeps the app's data per address, so the new address starts empty and a plain redirect would open on a
   blank app. Instead the two addresses hand the data across through move.html, hidden in a frame, before anything
   moves. The old copy is never deleted, and nothing redirects until the new address has answered, so if go.chasem.app
   is down, not set up yet, or there is no signal, the app simply opens where it is, as it always did.
     old address: nothing worth keeping, or already handed over and not touched since -> straight to the new one.
                  Otherwise hand it over, then go. If the new address has its own work, stay put.
     new address: empty -> ask the old address for its data, load it, and open.
   Anywhere else (a preview, localhost, the tests) this does nothing. */
(function () {
  'use strict';
  var NEW = 'https://go.chasem.app', OLD = ['https://chasem.app', 'https://www.chasem.app'];
  var KEY = 'qc-app-v1', MARK = 'qc-moved', MARK_IN = 'qc-moved-in', WAIT = 4000;
  var isNew = location.origin === NEW, isOld = OLD.indexOf(location.origin) >= 0;
  if ((!isNew && !isOld) || window.top !== window) return;
  if (navigator.onLine === false) return;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function state() { try { return JSON.parse(get(KEY) || 'null'); } catch (e) { return null; } }
  function worth(s) { return !!(s && ((s.jobs && s.jobs.length) || (s.account && s.account.email) || (s.details && s.details.trading_name))); }
  function dump() { var out = {}, i, k; try { for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k && k.indexOf('qc-') === 0 && k !== MARK && k !== MARK_IN) out[k] = localStorage.getItem(k); } } catch (e) {} return out; }

  var root = document.documentElement, css = document.createElement('style');
  css.textContent = 'html.qc-moving body{visibility:hidden}';
  (document.head || root).appendChild(css);
  function hold() { root.className += ' qc-moving'; }
  function release() { root.className = root.className.replace(/\s*qc-moving/g, ''); }

  // One hidden frame, one conversation, one answer, and never longer than WAIT.
  function talk(url, origin, onMsg, done) {
    var f = document.createElement('iframe'), over = false, t;
    function end(v) { if (over) return; over = true; clearTimeout(t); window.removeEventListener('message', hear); if (f.parentNode) f.parentNode.removeChild(f); done(v); }
    function say(m) { try { f.contentWindow.postMessage(m, origin); } catch (e) { end(null); } }
    function hear(e) { if (e.origin !== origin || e.source !== f.contentWindow || !e.data || typeof e.data !== 'object') return; var r; try { r = onMsg(e.data, say); } catch (x) { r = null; } if (r !== undefined) end(r); }
    t = setTimeout(function () { end(onMsg({ chasem: 'timeout' }, say)); }, WAIT);
    window.addEventListener('message', hear);
    f.setAttribute('aria-hidden', 'true'); f.setAttribute('tabindex', '-1'); f.style.cssText = 'position:absolute;width:1px;height:1px;border:0;left:-9999px';
    f.src = url; root.appendChild(f);
  }

  hold();
  if (isOld) {
    var start = state(), moved = worth(start) && get(MARK) === String(start.saved_at || ''), sent = null;
    talk(NEW + '/move.html', NEW, function (d, say) {
      if (d.chasem === 'ready') {
        var s = state();
        if (!worth(s) || moved) return 'go';
        sent = String(s.saved_at || ''); say({ chasem: 'take', keys: dump() }); return;
      }
      if (d.chasem === 'taken') { set(MARK, sent); return 'go'; }
      if (d.chasem === 'kept' || d.chasem === 'failed' || d.chasem === 'timeout') return null;
    }, function (v) { if (v === 'go') location.replace(NEW + '/' + location.hash); else release(); });
    return;
  }
  // the new address: only when it has nothing of its own
  if (worth(state())) { release(); return; }
  var wrote = false;
  talk(OLD[0] + '/app/move.html', OLD[0], function (d, say) {
    if (d.chasem === 'ready') { say({ chasem: 'give' }); return; }
    if (d.chasem === 'here') {
      var s = null; try { s = JSON.parse(d.keys[KEY]); } catch (e) {}
      if (!worth(s) || worth(state())) return null;
      // the jobs first: if they do not fit, nothing else is written, and next time it tries again
      if (!set(KEY, String(d.keys[KEY]))) return null;
      for (var k in d.keys) if (Object.prototype.hasOwnProperty.call(d.keys, k) && k.indexOf('qc-') === 0 && k !== KEY) set(k, String(d.keys[k]));
      set(MARK_IN, String(s.saved_at || '')); wrote = true;
      say({ chasem: 'got' }); return; // wait for the old address to note it has been handed over, so it sends him here next time
    }
    if (d.chasem === 'marked') return 'reload';
    if (d.chasem === 'timeout') return wrote ? 'reload' : null;
    if (d.chasem === 'none' || d.chasem === 'failed') return null;
  }, function (v) { if (v === 'reload') location.reload(); else release(); });
})();
