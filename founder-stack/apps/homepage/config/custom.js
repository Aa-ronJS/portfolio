// Founder Stack: the hub follows the console's light look. Homepage stores the
// theme per browser; this pins it to light so every visitor gets the same UI.
(function () {
  try { localStorage.setItem('theme', 'light'); } catch (e) {}
  function fix() {
    var h = document.documentElement;
    if (h.classList.contains('dark')) { h.classList.remove('dark', 'scheme-dark'); h.classList.add('light', 'scheme-light'); }
  }
  fix();
  new MutationObserver(fix).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
