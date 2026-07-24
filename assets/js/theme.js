/**
 * Bascule de thème clair / sombre — Neodyr.
 *
 * Indépendant du module d'analyse PDF : le bouton fonctionne même si pdf.js
 * ne se charge pas. Le thème initial est déjà posé par le script inline du
 * <head> (anti-flash) ; ce fichier gère seulement le clic et l'étiquette.
 */
(function () {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  var icon = toggle.querySelector('.theme-toggle-icon');
  var label = toggle.querySelector('.theme-toggle-label');
  var root = document.documentElement;

  function currentTheme() {
    var attr = root.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }

  // Le bouton PROPOSE le thème opposé au thème courant.
  function sync() {
    var isLight = currentTheme() === 'light';
    icon.textContent = isLight ? '🌙' : '☀️';
    label.textContent = isLight ? 'Thème sombre' : 'Thème clair';
  }

  toggle.addEventListener('click', function () {
    var next = currentTheme() === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('neodyr-theme', next); } catch (e) {}
    sync();
  });

  sync();
})();
