/* Fiche senior : affiche le nom et le téléphone du technicien lus dans
   ../config.js (window.MONACCUEIL_CONFIG) et construit les pictogrammes
   depuis ../icones.js (window.MONACCUEIL_ICONES), comme app.js.
   Aucune donnée n'est envoyée ; textContent uniquement.
   Si la page est imprimée sans ces fichiers, des cases à compléter
   restent affichées pour être remplies à la main. */
(function () {
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function creerIcone(nom, couleur) {
    var formes = (window.MONACCUEIL_ICONES || {})[nom] || [];
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', couleur || '#111827');
    svg.setAttribute('stroke-width', '5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    formes.forEach(function (forme) {
      var f = document.createElementNS(SVG_NS, forme[0]);
      Object.keys(forme[1]).forEach(function (a) { f.setAttribute(a, forme[1][a]); });
      svg.appendChild(f);
    });
    return svg;
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-icone]'), function (zone) {
    zone.appendChild(creerIcone(zone.getAttribute('data-icone'), zone.getAttribute('data-couleur')));
  });

  var config = window.MONACCUEIL_CONFIG || {};
  var tech = config.technicien || {};
  var nom = (tech.nom || '').trim();
  var tel = (tech.telephone || '').trim();
  document.getElementById('fiche-nom').textContent = nom || '....................';
  var lien = document.getElementById('fiche-telephone');
  lien.textContent = tel || '....................';
  if (tel) { lien.setAttribute('href', 'tel:' + tel.replace(/[^0-9+]/g, '')); }
})();
