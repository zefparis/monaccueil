#!/usr/bin/env node
/* Tests du contenu « Protéger mon téléphone » (protection-telephone.js).
   Vérifie le schéma du fichier de contenu : chaque marque a une date de
   vérification et au moins un réglage ; aucun HTML ; identifiants uniques.
   Aucune dépendance, aucun réseau. Lancer : node outils/test-protection.js */
'use strict';
var path = require('path');
var racine = path.resolve(__dirname, '..');

global.window = {};
require(path.join(racine, 'protection-telephone.js'));
var P = global.window.MONACCUEIL_PROTECTION;

var ok = 0, ko = 0;
function check(nom, cond) {
  if (cond) { ok++; console.log('  OK ' + nom); }
  else { ko++; console.log('  ECHEC ' + nom); }
}

console.log('Contenu « Protéger mon téléphone » :');
check('MONACCUEIL_PROTECTION présent', !!P && typeof P === 'object');
check('aide « Je ne sais pas » présente', typeof P.aideInconnu === 'string' && P.aideInconnu.length > 10);
check('aide sans HTML', !/</.test(P.aideInconnu || ''));
check('marques : tableau non vide', Array.isArray(P.marques) && P.marques.length >= 4);

var marquesIds = {};
var sansHtml = function (s) { return !/</.test(s); };
(P && P.marques || []).forEach(function (m) {
  check('marque « ' + m.id + ' » : nom', typeof m.nom === 'string' && m.nom.length > 0);
  check('marque « ' + m.id + ' » : date de vérification', typeof m.verification === 'string' && m.verification.length >= 8);
  check('marque « ' + m.id + ' » : au moins un réglage', Array.isArray(m.etapes) && m.etapes.length > 0);
  check('marque « ' + m.id + ' » : aucun HTML', sansHtml(m.nom) && sansHtml(m.note || ''));
  check('marque « ' + m.id + ' » : id de marque unique', !marquesIds[m.id]);
  marquesIds[m.id] = true;
  var etapesIds = {};
  (m.etapes || []).forEach(function (e) {
    check('étape « ' + e.id + ' » : action', typeof e.action === 'string' && e.action.length > 10);
    check('étape « ' + e.id + ' » : chemin ≥ 2 menus', Array.isArray(e.chemin) && e.chemin.length >= 2);
    check('étape « ' + e.id + ' » : aucun HTML', sansHtml(e.action) && sansHtml(e.note || '') && (e.chemin || []).every(sansHtml));
    // Les id d'étapes doivent être uniques DANS la marque (l'état est {m, f})
    check('étape « ' + e.id + ' » : id unique dans la marque', !etapesIds[e.id]);
    etapesIds[e.id] = true;
  });
});

check('conseils : tableau non vide', Array.isArray(P.conseils) && P.conseils.length >= 3);
check('conseils : aucun HTML', (P.conseils || []).every(sansHtml));
check('conseil 33700 présent', (P.conseils || []).some(function (t) { return t.indexOf('33700') !== -1; }));
check('aucun prix ni abonnement', !(P.conseils || []).concat(P.marques.map(function (m) { return m.nom; })).some(function (t) { return /prix|abonnement|€|euros/i.test(t); }));

console.log(ok + ' contrôles OK, ' + ko + ' échec(s).');
process.exit(ko === 0 ? 0 : 1);
