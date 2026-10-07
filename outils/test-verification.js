#!/usr/bin/env node
/* Tests de la vérification locale d'adresse (verification.js).
   Aucune dépendance, aucun réseau. Lancer : node outils/test-verification.js
   Les listes de domaines officiels et de raccourcisseurs sont lues dans config.json
   pour tester exactement ce que verra le client. */
'use strict';
var path = require('path');
var fs = require('fs');
var racine = path.resolve(__dirname, '..');
var verif = require(path.join(racine, 'verification.js'));
var config = JSON.parse(fs.readFileSync(path.join(racine, 'config.json'), 'utf8'));
var OFFICIELS = config.domainesOfficiels;
var RACCOURCISSEURS = config.raccourcisseurs;

// [saisie, verdict attendu, hôte attendu (facultatif), fragment de raison attendu (facultatif)]
var CAS = [
  // --- Adresses officielles correctes (vert) ---
  ['https://www.impots.gouv.fr', 'vert', 'www.impots.gouv.fr'],
  ['https://www.ameli.fr/assure/droits-demarches', 'vert', 'www.ameli.fr'],
  ['HTTPS://WWW.IMPOTS.GOUV.FR/ACCUEIL', 'vert', 'www.impots.gouv.fr'],                 // majuscules
  ['   https://www.laposte.fr/   ', 'vert', 'www.laposte.fr'],                          // espaces autour
  ['\thttps://www.caf.fr\n', 'vert', 'www.caf.fr'],                                     // tabulation / retour à la ligne
  ['https://www.impots.gouv.fr:443/particulier', 'vert', 'www.impots.gouv.fr'],         // port https par défaut
  ['https://cfspart.impots.gouv.fr/LoginAccess?op=c&url=aHR0cHM6Ly9jZnNwYXJ0LmltcG90cy5nb3V2LmZyL21vbnByb2ZpbC13ZWJhcHAvbW9uUHJvZmls&a=b&c=d', 'vert', 'cfspart.impots.gouv.fr'], // chemin très long
  ['www.ameli.fr', 'vert', 'www.ameli.fr'],                                             // sans https://
  ['ameli.fr/assure', 'vert', 'ameli.fr'],                                              // domaine nu + chemin
  ['https://franceconnect.gouv.fr/', 'vert', 'franceconnect.gouv.fr'],
  ['https://www.impots.gouv.fr.', 'vert', 'www.impots.gouv.fr'],                        // point final
  ['« https://www.service-public.fr »', 'vert', 'www.service-public.fr'],               // guillemets collés
  ['<https://www.doctolib.fr/>', 'vert', 'www.doctolib.fr'],                            // chevrons de mail
  ['https://mabanque.bnpparibas/connexion', 'vert', 'mabanque.bnpparibas'],
  ['https://www.impots.gouv.fr/#ancre', 'vert', 'www.impots.gouv.fr'],
  ['https://www.impots.gouv.fr?utm=1', 'vert', 'www.impots.gouv.fr'],

  // --- Sous-domaines trompeurs ---
  ['https://impots.gouv.fr.autre-site.com', 'rouge', 'impots.gouv.fr.autre-site.com', 'imite'],
  ['https://www.ameli.fr.secure-login.net/compte', 'rouge', 'www.ameli.fr.secure-login.net', 'imite'],
  ['https://impots-gouv-fr.com', 'rouge', 'impots-gouv-fr.com', 'imite'],
  ['https://ameli.fr-remboursement.com', 'rouge', 'ameli.fr-remboursement.com', 'imite'],
  ['https://impots.gouv.fr-connexion.info/login', 'rouge', 'impots.gouv.fr-connexion.info', 'imite'],
  ['https://secure-impotsgouvfr.com', 'rouge', 'secure-impotsgouvfr.com', 'imite'],

  // --- Fautes de frappe proches (Levenshtein) ---
  ['https://www.amelie.fr', 'rouge', 'www.amelie.fr', 'ressemble'],
  ['https://impots.gouvv.fr', 'rouge', 'impots.gouvv.fr', 'ressemble'],
  ['https://lassuranceretraitte.fr', 'rouge', 'lassuranceretraitte.fr', 'ressemble'],
  ['https://www.lassurance-retraite.fr', 'rouge', 'www.lassurance-retraite.fr', 'imite'],
  ['https://impot.gouv.fr', 'vert', 'impot.gouv.fr'],                                   // vrai sous-domaine de gouv.fr (dans la liste)
  ['https://www.doctolibb.fr', 'rouge', 'www.doctolibb.fr', 'ressemble'],
  ['https://labanquepostal.fr', 'rouge', 'labanquepostal.fr', 'ressemble'],

  // --- Caractères déguisés (punycode) ---
  ['https://xn--amel-9ra.fr', 'rouge', 'xn--amel-9ra.fr', 'déguisés'],
  ['https://www.xn--impts-fsa.gouv.fr.evil.com', 'rouge', null, 'déguisés'],
  ['https://amelí.fr', 'rouge', null, 'déguisés'],                                      // lettre accentuée -> punycode automatique

  // --- Adresses IP ---
  ['https://192.168.1.10/connexion', 'rouge', '192.168.1.10', 'adresse IP'],
  ['http://10.0.0.1', 'rouge', '10.0.0.1', 'adresse IP'],
  ['https://[2001:db8::1]/', 'rouge', null, 'adresse IP'],

  // --- Présence de @ ---
  ['https://impots.gouv.fr@evil.com', 'rouge', 'evil.com', '@'],
  ['https://www.ameli.fr:motdepasse@pirate.ru/login', 'rouge', 'pirate.ru', '@'],
  ['https://impots.gouv.fr@185.12.3.4', 'rouge', '185.12.3.4', '@'],

  // --- http sans s (même sur un site officiel) ---
  ['http://www.impots.gouv.fr', 'rouge', 'www.impots.gouv.fr', 'http://'],
  ['HTTP://WWW.AMELI.FR', 'rouge', 'www.ameli.fr', 'http://'],
  ['http://pirate.com', 'rouge', 'pirate.com', 'http://'],

  // --- Raccourcisseurs ---
  ['https://bit.ly/3xYz12', 'rouge', 'bit.ly', 'raccourcie'],
  ['https://tinyurl.com/abc', 'rouge', 'tinyurl.com', 'raccourcie'],
  ['t.co/abc', 'rouge', 't.co', 'raccourcie'],
  ['https://www.bit.ly/x', 'rouge', 'www.bit.ly', 'raccourcie'],
  ['https://urlz.fr/abcd', 'rouge', 'urlz.fr', 'raccourcie'],

  // --- Ports inhabituels ---
  ['https://www.impots.gouv.fr:8443/x', 'rouge', 'www.impots.gouv.fr', 'inhabituel'],
  ['https://www.ameli.fr:80', 'rouge', 'www.ameli.fr', 'inhabituel'],
  ['ameli.fr:8080', 'rouge', 'ameli.fr', 'inhabituel'],

  // --- Sites inconnus ---
  ['https://www.site-inconnu-quelconque.com', 'rouge', 'www.site-inconnu-quelconque.com', 'pas dans la liste'],
  ['https://colis-livraison-frais.xyz/payer', 'rouge', 'colis-livraison-frais.xyz', 'pas dans la liste'],
  ['https://gouv.fr.com', 'rouge', 'gouv.fr.com', 'pas dans la liste'],
  ['https://notgouv.fr', 'rouge', 'notgouv.fr', 'pas dans la liste'],                  // se termine par "gouv.fr" sans point : pas un sous-domaine

  // --- Schémas non web ---
  ['mailto:contact@impots.gouv.fr', 'rouge', '', 'inhabituel'],
  ['javascript:alert(1)', 'rouge', '', 'inhabituel'],
  ['ftp://www.impots.gouv.fr', 'rouge', '', 'inhabituel'],
  ['data:text/html,bonjour', 'rouge', '', 'inhabituel'],

  // --- Malformées ---
  ['https:impots.gouv.fr', 'rouge', '', 'mal formée'],
  ['https:/www.ameli.fr', 'rouge', '', 'mal formée'],
  ['https://www.impots .gouv.fr', 'rouge', '', 'espaces'],
  ['cliquez ici pour votre remboursement', 'rouge', '', 'espaces'],
  ['https://', 'rouge', '', null],
  ['https://///', 'rouge', '', null],
  ['bonjour', 'rouge', 'bonjour', 'nom complet'],
  ['.', 'vide', '', null],
  ['', 'vide', '', null],
  ['     ', 'vide', '', null],
  [null, 'vide', '', null],
  [undefined, 'vide', '', null],
  [12345, 'rouge', null, null],
];

var echecs = 0;
CAS.forEach(function (cas, i) {
  var saisie = cas[0], attendu = cas[1], hoteAttendu = cas[2], fragment = cas[3];
  var r;
  try { r = verif.verifierAdresse(saisie, OFFICIELS, RACCOURCISSEURS); }
  catch (e) { r = { verdict: 'EXCEPTION ' + e.message, hote: '', raisons: [] }; }
  var problemes = [];
  if (r.verdict !== attendu) { problemes.push('verdict ' + r.verdict + ' (attendu ' + attendu + ')'); }
  if (hoteAttendu !== null && hoteAttendu !== undefined && r.hote !== hoteAttendu) { problemes.push('hôte "' + r.hote + '" (attendu "' + hoteAttendu + '")'); }
  if (fragment && !r.raisons.some(function (t) { return t.indexOf(fragment) !== -1; })) { problemes.push('aucune raison ne contient "' + fragment + '" : ' + JSON.stringify(r.raisons)); }
  if (r.verdict === 'vert' && r.raisons.length) { problemes.push('un résultat vert ne doit avoir aucune raison'); }
  if (r.verdict === 'rouge' && !r.raisons.length) { problemes.push('un résultat rouge doit expliquer pourquoi'); }
  var etiquette = (i + 1 < 10 ? ' ' : '') + (i + 1) + '. ' + JSON.stringify(saisie === undefined ? 'undefined' : saisie);
  if (problemes.length) { echecs++; console.log('ÉCHEC ' + etiquette + '\n       ' + problemes.join('\n       ')); }
  else { console.log('ok    ' + etiquette + ' -> ' + r.verdict); }
});

// Garanties de pureté : même entrée, même sortie ; les listes passées ne sont pas modifiées
var avant = JSON.stringify(OFFICIELS) + JSON.stringify(RACCOURCISSEURS);
verif.verifierAdresse('https://www.impots.gouv.fr', OFFICIELS, RACCOURCISSEURS);
if (avant !== JSON.stringify(OFFICIELS) + JSON.stringify(RACCOURCISSEURS)) { echecs++; console.log('ÉCHEC : les listes de configuration ont été modifiées'); }
if (verif.levenshtein('ameli', 'amelie') !== 1 || verif.levenshtein('impots', 'impots') !== 0 || verif.levenshtein('', 'abc') !== 3) { echecs++; console.log('ÉCHEC : distance de Levenshtein incorrecte'); }

console.log('\n' + CAS.length + ' cas, ' + echecs + ' échec(s).');
process.exit(echecs ? 1 : 0);
