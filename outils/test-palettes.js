/* =====================================================================
   Test : contraste WCAG des 6 palettes de MonAccueil.
   Parse style.css, extrait les variables de :root et de chaque
   .palette-*, puis vérifie que le texte garde un ratio >= 7:1 (niveau AAA)
   et que le texte des boutons d'accent garde >= 7:1 aussi.
   Usage : node outils/test-palettes.js   (exit 1 si un ratio échoue)
   ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

/** Extrait les --variables d'un bloc CSS « selecteur { ... } ». */
function bloc(selecteur) {
  var m = css.match(new RegExp(selecteur.replace(/[.*]/g, function (c) { return '\\' + c; }) + '\\s*\\{([^}]*)\\}'));
  var vars = {};
  if (m) {
    m[1].replace(/--([a-z-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g, function (_, nom, val) {
      vars[nom] = val.toLowerCase();
      return '';
    });
  }
  return vars;
}

/** #rgb ou #rrggbb -> [r,g,b] 0..255 */
function hex(s) {
  var h = s.replace('#', '');
  if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Luminance relative WCAG. */
function luminance(rgb) {
  return rgb.map(function (v) {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }).reduce(function (acc, v, i) { return acc + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
}

function ratio(a, b) {
  var la = luminance(hex(a)), lb = luminance(hex(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

var racine = bloc(':root');
var palettes = ['chaleureux', 'bleu', 'vert', 'violet', 'rose', 'gris'];
var echecs = 0;
var nb = 0;

function verifier(desc, texte, fond) {
  nb++;
  var r = ratio(texte, fond);
  var ok = r >= 7;
  if (!ok) { echecs++; }
  console.log((ok ? '  OK ' : 'ECHEC') + ' ' + desc + ' : ' + r.toFixed(2) + ':1');
}

palettes.forEach(function (nom) {
  var p = Object.assign({}, racine, bloc('.palette-' + nom));
  ['fond', 'carte', 'fond-doux', 'texte', 'texte-secondaire', 'principal', 'principal-texte'].forEach(function (v) {
    if (!p[v]) { console.log('ECHEC palette ' + nom + ' : variable --' + v + ' absente'); echecs++; }
  });
  console.log('Palette « ' + nom + ' » :');
  verifier('texte / fond', p.texte, p.fond);
  verifier('texte / carte', p.texte, p.carte);
  verifier('texte-secondaire / fond', p['texte-secondaire'], p.fond);
  verifier('texte-secondaire / carte', p['texte-secondaire'], p.carte);
  verifier('boutons (principal-texte / principal)', p['principal-texte'], p.principal);
});

// Le mode contraste élevé aussi
var ce = Object.assign({}, racine, bloc('html.contraste-eleve'));
console.log('Contraste élevé :');
verifier('texte / fond', ce.texte, ce.fond);
verifier('texte / carte', ce.texte, ce.carte);
verifier('aide-texte / aide', ce['aide-texte'], ce.aide);
verifier('principal-texte / principal', ce['principal-texte'], ce.principal);

console.log(nb + ' combinaisons verifiées, ' + echecs + ' echec(s).');
process.exit(echecs ? 1 : 0);
