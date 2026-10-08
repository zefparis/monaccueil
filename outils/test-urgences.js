#!/usr/bin/env node
/* Tests du contenu « Urgences et arnaques » (urgences.js).
   Vérifie le schéma du fichier de contenu : 3 écrans présents, date de
   vérification affichée, numéros officiels 15/18/112/114 et dispositifs
   (33700, Info Escroqueries, Perceval, THESEE) cités, aucun HTML, aucun
   prix ni application payante. Aucune dépendance, aucun réseau.
   Lancer : node outils/test-urgences.js */
'use strict';
var path = require('path');
var racine = path.resolve(__dirname, '..');

global.window = {};
require(path.join(racine, 'urgences.js'));
var U = global.window.MONACCUEIL_URGENCES;

var ok = 0, ko = 0;
function check(nom, cond) {
  if (cond) { ok++; console.log('  OK ' + nom); }
  else { ko++; console.log('  ECHEC ' + nom); }
}
var sansHtml = function (s) { return typeof s === 'string' && s.indexOf('<') === -1 && s.indexOf('&lt;') === -1; };
var tel = function (n) { return /^[0-9+().\-\s]{2,20}$/.test(String(n || '').trim()); };
var toutTexte = [];
(function ramasser(x) {
  if (typeof x === 'string') { toutTexte.push(x); }
  else if (Array.isArray(x)) { x.forEach(ramasser); }
  else if (x && typeof x === 'object') { Object.keys(x).forEach(function (k) { ramasser(x[k]); }); }
})(U || {});
var joint = toutTexte.join(' ');

console.log('Contenu « Urgences et arnaques » :');
check('MONACCUEIL_URGENCES présent', !!U && typeof U === 'object');
check('date « Dernière vérification » présente', typeof U.verifie === 'string' && U.verifie.length >= 8);

/* Écran 1 — suspect au téléphone */
check('suspect : titre', sansHtml(U.suspect && U.suspect.titre));
check('suspect : 3 règles', Array.isArray(U.suspect && U.suspect.regles) && U.suspect.regles.length >= 3);
check('suspect : règle « Raccrochez »', (U.suspect.regles || []).some(function (r) { return /raccroch/i.test(r); }));
check('suspect : règle banque/code/virement', (U.suspect.regles || []).some(function (r) { return /banque/i.test(r) && /code|virement/i.test(r); }));
check('suspect : règles sans HTML', (U.suspect.regles || []).every(sansHtml));

/* Écran 2 — j'ai été piégé */
check('piégé : titre', sansHtml(U.piege && U.piege.titre));
check('piégé : intro rassurante sans jugement', sansHtml(U.piege && U.piege.intro) && /arrive|vite/i.test(U.piege.intro));
check('piégé : 4 étapes', Array.isArray(U.piege && U.piege.etapes) && U.piege.etapes.length === 4);
check('piégé : étape opposition banque', (U.piege.etapes || []).some(function (e) { return /banque|opposition/i.test(e); }));
check('piégé : étape « ne rien supprimer »', (U.piege.etapes || []).some(function (e) { return /supprim/i.test(e); }));
check('piégé : étape signaler', (U.piege.etapes || []).some(function (e) { return /signal/i.test(e); }));
check('piégé : étape appeler le technicien', (U.piege.etapes || []).some(function (e) { return /appelez-moi|appelez.moi/i.test(e); }));
check('piégé : signalements présents', Array.isArray(U.piege && U.piege.signalements) && U.piege.signalements.length >= 4);
check('piégé : signalements sans HTML', (U.piege.signalements || []).every(function (s) { return sansHtml(s.nom) && sansHtml(s.detail); }));

/* Dispositifs officiels cités (vérifiés sur service-public.gouv.fr,
   masecurite.interieur.gouv.fr, arcep.fr — voir en-tête du fichier) */
check('33700 cité', /33700/.test(joint));
check('Info Escroqueries cité', /0\s?805\s?805\s?817/.test(joint));
check('Perceval cité', /Perceval/i.test(joint));
check('THESEE cité', /THESEE/i.test(joint));
check('PHAROS ou plainte cité', /PHAROS|plainte/i.test(joint));
check('gendarmerie ou police citée', /gendarmerie|police/i.test(joint));

/* Écran 3 — urgence santé */
check('santé : titre', sansHtml(U.sante && U.sante.titre));
var nums = (U.sante && U.sante.numeros || []);
check('santé : 4 numéros', nums.length === 4);
check('santé : numéros valides', nums.every(function (n) { return tel(n.numero) && sansHtml(n.nom) && sansHtml(n.detail || ''); }));
['15', '18', '112', '114'].forEach(function (n) {
  check('santé : numéro ' + n + ' présent', nums.some(function (u) { return u.numero === n; }));
});
check('santé : section proches', sansHtml(U.sante && U.sante.proches) && /proche/i.test(U.sante.proches));
check('santé : ligne « aide, pas service d\'urgence »', sansHtml(U.sante && U.sante.avertissement) && /aide, pas un service d.urgence/i.test(U.sante.avertissement) && /112/.test(U.sante.avertissement));

/* Menu */
check('menu : 3 entrées', Array.isArray(U.menu && U.menu.choix) && U.menu.choix.length === 3);
check('menu : ids connus uniquement', (U.menu.choix || []).every(function (m) {
  return ['suspect', 'piege', 'sante'].indexOf(m.id) !== -1 && sansHtml(m.label);
}));

/* Interdits transverses */
check('aucun HTML dans le contenu', toutTexte.every(sansHtml));
check('aucun prix ni application payante', !/prix|abonnement|€|euros|payant/i.test(joint));
check('aucun numéro surtaxé (089x)', !/0\s?89[0-9]/.test(joint));

console.log(ok + ' contrôles OK, ' + ko + ' échec(s).');
process.exit(ko === 0 ? 0 : 1);
