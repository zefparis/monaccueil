/* =====================================================================
   MonAccueil - logique de l'application
   - Aucune dépendance, aucun appel réseau sortant (seul config.json local
     est lu quand la page est servie en http/https).
   - Tout le HTML dynamique est construit via l'API DOM (textContent),
     jamais via innerHTML : les textes de la configuration sont donc
     toujours traités comme du texte brut.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Constantes
     ------------------------------------------------------------------ */

  // Icônes fournies dans le dossier icons/ (liste blanche : on refuse tout autre nom)
  var ICONES = [
    'impots.svg', 'sante.svg', 'famille.svg', 'retraite.svg', 'administration.svg',
    'medecin.svg', 'courrier.svg', 'banque.svg', 'mails.svg', 'photos.svg',
    'meteo.svg', 'cle.svg', 'assistance.svg', 'aide.svg', 'telephone.svg', 'bouclier.svg',
    'transport.svg', 'energie.svg', 'magasin.svg', 'tele.svg'
  ];
  // Outils d'aide à distance pris en charge (le senior initie et accepte toujours la connexion)
  var OUTILS_DISTANCE = ['quickassist', 'rustdesk'];
  var COULEUR_PROTECTION = '#0f766e';
  var COULEUR_DISTANCE = '#a21caf';
  // Tuile fixe "Un message me paraît bizarre" (orange foncé, blanc dessus = 7:1)
  var COULEUR_BIZARRE = '#9a3412';
  var ICONE_DEFAUT = 'administration.svg';
  var COULEUR_DEFAUT = '#1d4ed8';
  var LONGUEUR_MAX_ARNAQUE = 300;

  // Ouverture des sites : fenêtre dédiée à droite, ou nouvel onglet
  var OUVERTURES = ['fenetre', 'onglet'];
  // Sur téléphone : pas de fenêtre dédiée — onglet (défaut) ou même onglet (retour arrière)
  var OUVERTURES_MOBILE = ['onglet', 'memeOnglet'];
  var RATIO_FENETRE = 0.75;            // la fenêtre occupe ~75 % de la largeur, 25 % reste pour l'accueil
  var LARGEUR_MIN_FENETRE = 1000;      // écran plus étroit : nouvel onglet (la moitié visible serait trop petite)
  var DELAI_BANDEAU_RETOUR = 45000;    // le message de retour s'efface aussi tout seul (ms)

  // Clés de mémorisation locale
  var CLE_CONFIG = 'monaccueil.config';
  var CLE_TAILLE = 'monaccueil.taille';
  var CLE_CONTRASTE = 'monaccueil.contraste';
  // Deux compteurs anonymes (aucune adresse n'est jamais conservée)
  var CLE_STAT_VERIFICATIONS = 'monaccueil.stat.verifications';
  var CLE_STAT_ROUGES = 'monaccueil.stat.rouges';
  var CLE_INSTALL = 'monaccueil.install.ferme';
  var CLE_PRENOM = 'monaccueil.prenom';           // choisi par la personne, jamais dans config.json
  var CLE_PRENOM_PLUSTARD = 'monaccueil.prenom.plustard';
  var CLE_PALETTE = 'monaccueil.palette';         // couleurs choisies par la personne
  var CLE_PERSO = 'monaccueil.perso';             // cases ajoutées par la personne (JSON)
  // Compteur anonyme des ajouts refusés par le vérificateur (aucun contenu conservé)
  var CLE_STAT_REFUS = 'monaccueil.stat.ajouts-refuses';
  var CLE_INSTALL_IOS = 'monaccueil.install-ios.ferme';
  var CLE_PROTECTION = 'monaccueil.protection';   // étapes « Protéger mon téléphone » cochées (JSON)

  // Prénom : lettres (accents compris), espaces, tiret, apostrophe ; commence par une lettre ; 30 max
  var REGEX_PRENOM = /^[\p{L}][\p{L} '\-]*$/u;
  var LONGUEUR_MAX_PRENOM = 30;

  // Familles de tuiles : ordre d'affichage et groupe déduit de l'id quand la
  // config ne précise rien. « Aide et sécurité » accueille les tuiles fixes.
  var ORDRE_GROUPES = ['Mes démarches', 'Ma santé', 'Mon quotidien', 'Aide et sécurité'];
  var GROUPES_PAR_ID = {
    impots: 'Mes démarches', caf: 'Mes démarches', retraite: 'Mes démarches',
    administration: 'Mes démarches', franceconnect: 'Mes démarches',
    sante: 'Ma santé', medecin: 'Ma santé',
    courrier: 'Mon quotidien', banque: 'Mon quotidien', mails: 'Mon quotidien',
    photos: 'Mon quotidien', meteo: 'Mon quotidien'
  };
  var GROUPE_AUTRES = 'Autres';
  // Groupe de tuile : lettres, chiffres, espaces, apostrophe, tiret ; 40 caractères max ; vide = automatique
  var REGEX_GROUPE = /^[\p{L}\p{N} '\-]+$/u;
  var LONGUEUR_MAX_GROUPE = 40;

  // Personnalisation par la personne : 6 palettes fixes, jamais de couleur libre (liste blanche)
  var PALETTES = ['chaleureux', 'bleu', 'vert', 'violet', 'rose', 'gris'];
  var PALETTE_DEFAUT = 'chaleureux';
  var NOMS_PALETTES = { chaleureux: 'Chaleureux', bleu: 'Bleu', vert: 'Vert', violet: 'Violet', rose: 'Rose', gris: 'Gris' };
  // Ajout de cases : 'catalogue' (liste proposée seule), 'libre' (catalogue + adresse libre avec PIN pour
  // les domaines inconnus), 'non' (rien). La case va toujours dans « Mon quotidien ».
  var AJOUTS = ['catalogue', 'libre', 'non'];
  var MAX_PERSO = 8;
  var GROUPE_PERSO = 'Mon quotidien';
  // Nom d'une case ajoutée : mêmes règles que le prénom + chiffres, 1 à 24 caractères
  var REGEX_NOM_BOUTON = /^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u;
  var LONGUEUR_MAX_NOM_BOUTON = 24;

  var DUREE_APPUI_LONG = 3000; // ms

  // Configuration active et brouillon du mode technicien
  var config = null;
  var brouillon = null;
  // Personnalisation locale de la personne : couleurs choisies et cases ajoutées
  var paletteChoisie = '';
  var tuilesPerso = [];
  // « Protéger mon téléphone » : marque choisie et étapes cochées {m, f:[]}
  var protectionChoisie = { m: '', f: [] };
  var echecsPin = 0;   // ralentissement partagé après chaque mauvais code

  /* ------------------------------------------------------------------
     Petits utilitaires
     ------------------------------------------------------------------ */

  function $(id) { return document.getElementById(id); }

  /**
   * Crée un élément DOM.
   * attrs : objet d'attributs (la clé "text" définit textContent).
   * enfants : tableau d'éléments ou de chaînes (insérées comme texte).
   */
  function el(tag, attrs, enfants) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') { e.textContent = attrs[k]; }
        else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) { e.setAttribute(k, attrs[k]); }
      });
    }
    (enfants || []).forEach(function (c) {
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function vider(e) { while (e.firstChild) { e.removeChild(e.firstChild); } }

  // localStorage protégé : l'application doit fonctionner même sans stockage
  function lireStockage(cle) {
    try { return window.localStorage.getItem(cle); } catch (e) { return null; }
  }
  function ecrireStockage(cle, valeur) {
    try {
      if (valeur === null) { window.localStorage.removeItem(cle); }
      else { window.localStorage.setItem(cle, valeur); }
      return true;
    } catch (e) { return false; }
  }

  function copieProfonde(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ------------------------------------------------------------------
     Persistance robuste : localStorage + IndexedDB en miroir, lien
     personnel en fragment d'URL (jamais envoyé au serveur), diagnostic.
     Aucun réseau : tout reste sur la machine.
     ------------------------------------------------------------------ */

  var stockageOK = false;          // test écriture/lecture/suppression localStorage
  var idbDisponible = false;       // indexedDB ouverte avec succès
  var lienPersonnelVu = false;     // un fragment #p= était présent au chargement
  var resemerIDB = false;          // localStorage plein, IndexedDB vide → re-sème après lecture

  var DB_NOM = 'monaccueil';
  var DB_STORE = 'donnees';
  var CLE_IDB = 'personne';        // un seul enregistrement versionné
  var TAILLE_MAX_LIEN = 4096;      // le lien personnel est refusé au-delà de 4 Ko

  // Une promesse d'ouverture partagée (une seule base, un seul store)
  var idbBase = null;
  function idbOuvrir() {
    if (idbBase) { return idbBase; }
    idbBase = new Promise(function (res) {
      try {
        if (!window.indexedDB) { res(null); return; }
        var req = indexedDB.open(DB_NOM, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(DB_STORE); };
        req.onsuccess = function () { idbDisponible = true; res(req.result); };
        req.onerror = function () { res(null); };
        req.onblocked = function () { res(null); };
      } catch (e) { res(null); }
    });
    return idbBase;
  }

  function idbLirePersonne() {
    return idbOuvrir().then(function (db) {
      if (!db) { return null; }
      return new Promise(function (res) {
        try {
          var rq = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(CLE_IDB);
          rq.onsuccess = function () { res(rq.result || null); };
          rq.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }

  function idbEcrirePersonne(obj) {
    return idbOuvrir().then(function (db) {
      if (!db) { return false; }
      return new Promise(function (res) {
        try {
          var tx = db.transaction(DB_STORE, 'readwrite');
          tx.objectStore(DB_STORE).put(obj, CLE_IDB);
          tx.oncomplete = function () { res(true); };
          tx.onerror = function () { res(false); };
          tx.onabort = function () { res(false); };
        } catch (e) { res(false); }
      });
    });
  }

  function idbEffacerPersonne() {
    return idbOuvrir().then(function (db) {
      if (!db) { return; }
      try { db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(CLE_IDB); } catch (e) { /* silencieux */ }
    });
  }

  /** L'objet unique versionné partagé par IndexedDB et le lien personnel. */
  function sauvegardePersonne() {
    return {
      v: 1,
      prenom: prenomChoisi || '',
      plustard: lireStockage(CLE_PRENOM_PLUSTARD) === '1' ? 1 : 0,
      palette: paletteChoisie || '',
      perso: tuilesPerso.map(function (t) { return { label: t.label, url: t.url, icone: t.icone }; }),
      protection: copieProfonde(protectionChoisie),
      reglages: {
        taille: taille,
        contraste: document.documentElement.classList.contains('contraste-eleve') ? 1 : 0
      }
    };
  }

  /** Recopie la personnalisation courante dans IndexedDB (miroir du localStorage). */
  function synchroniserIDB() {
    idbEcrirePersonne(sauvegardePersonne()).catch(function () { /* silencieux */ });
  }

  /** Test réel : écriture + lecture + suppression d'une clé témoin. */
  function testerStockage() {
    try {
      window.localStorage.setItem('monaccueil.test', '1');
      var ok = window.localStorage.getItem('monaccueil.test') === '1';
      window.localStorage.removeItem('monaccueil.test');
      return ok;
    } catch (e) { return false; }
  }

  /** Vrai si aucune personnalisation n'est présente en localStorage.
      Les réglages par défaut (taille 1, pas de contraste) ne comptent pas. */
  function stockageVide() {
    var t = parseInt(lireStockage(CLE_TAILLE), 10);
    var c = lireStockage(CLE_CONTRASTE);
    return !lireStockage(CLE_PRENOM) && !lireStockage(CLE_PALETTE)
      && !lireStockage(CLE_PERSO) && (isNaN(t) || t === 1) && c !== '1';
  }

  /** Affiche l'avertissement sobre quand les réglages ne peuvent pas être gardés. */
  function afficherBandeauStockage() {
    var b = $('bandeau-stockage');
    if (b) { b.hidden = false; }
  }

  /**
   * Au chargement : teste localStorage, relit l'enregistrement IndexedDB et
   * restaure chaque clé absente depuis le miroir (validation stricte à la
   * relecture). Si c'est localStorage qui est plein, re-sème IndexedDB.
   */
  function preparerStockage() {
    stockageOK = testerStockage();
    var promesse = idbLirePersonne().then(function (idb) {
      var change = false;
      if (idb && typeof idb === 'object' && idb.v === 1) {
        if (!lireStockage(CLE_PRENOM) && typeof idb.prenom === 'string' && prenomValide(idb.prenom)) {
          ecrireStockage(CLE_PRENOM, idb.prenom); change = true;
        }
        if (lireStockage(CLE_PRENOM_PLUSTARD) === null && idb.plustard === 1) {
          ecrireStockage(CLE_PRENOM_PLUSTARD, '1'); change = true;
        }
        if (!lireStockage(CLE_PALETTE) && PALETTES.indexOf(idb.palette) !== -1) {
          ecrireStockage(CLE_PALETTE, idb.palette); change = true;
        }
        if (lireStockage(CLE_PERSO) === null && Array.isArray(idb.perso)) {
          ecrireStockage(CLE_PERSO, JSON.stringify(normaliserPerso(idb.perso))); change = true;
        }
        if (lireStockage(CLE_PROTECTION) === null && idb.protection) {
          var pr = normaliserProtectionEtat(idb.protection);
          if (pr.m) { ecrireStockage(CLE_PROTECTION, JSON.stringify(pr)); change = true; }
        }
        if (idb.reglages && typeof idb.reglages === 'object') {
          var t = parseInt(idb.reglages.taille, 10);
          if (lireStockage(CLE_TAILLE) === null && t >= 1 && t <= 3) {
            ecrireStockage(CLE_TAILLE, String(t)); change = true;
          }
          if (lireStockage(CLE_CONTRASTE) === null && (idb.reglages.contraste === 0 || idb.reglages.contraste === 1)) {
            ecrireStockage(CLE_CONTRASTE, String(idb.reglages.contraste)); change = true;
          }
        }
      }
      // Re-sème la source vide — différé après la lecture du localStorage
      // (chargerPrenomChoisi/chargerPerso n'ont pas encore tourné ici)
      resemerIDB = change || !idb;
      if (!stockageOK) { afficherBandeauStockage(); }
    });
    return promesse.catch(function () { if (!stockageOK) { afficherBandeauStockage(); } });
  }

  /** storage.persist() : uniquement après une action de la personne. */
  var persistanceDemandee = false;
  function demanderPersistance() {
    if (persistanceDemandee) { return; }
    persistanceDemandee = true;
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () { /* refusé : silencieux */ });
      }
    } catch (e) { /* silencieux */ }
  }

  /**
   * Lien personnel « #p=<base64url> » : décode, valide avec le même schéma
   * strict que l'import (types, longueurs, listes blanches, https, domaines
   * vérifiés pour les cases ajoutées), puis hydrate le stockage si celui-ci
   * est vide — ou si le technicien a ajouté « &force=1 ». Le fragment est
   * nettoyé de la barre d'adresse et n'est jamais envoyé ni journalisé.
   * Renvoie true si des données ont été hydratées.
   */
  function traiterLienPersonnel() {
    var frag = '';
    try { frag = location.hash || ''; } catch (e) { return false; }
    if (!frag || frag.indexOf('p=') === -1) { return false; }
    var q;
    try { q = new URLSearchParams(frag.slice(1)); } catch (e) { return false; }
    var b64 = q.get('p');
    if (b64 === null) { return false; }   // « p= » dans un autre mot (ex. « #top= »)
    lienPersonnelVu = true;
    var force = q.get('force') === '1';
    // Nettoyage immédiat : rien ne doit rester visible dans la barre d'adresse
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file: */ }
    if (!b64 || b64.length > TAILLE_MAX_LIEN) { return false; }
    var obj = null;
    try {
      var json = decodeURIComponent(escape(atob(b64.replace(/-/g, '+').replace(/_/g, '/'))));
      if (json.length > TAILLE_MAX_LIEN) { return false; }
      obj = JSON.parse(json);
    } catch (e) { return false; }
    if (!obj || typeof obj !== 'object' || obj.v !== 1) { return false; }
    // Jamais d'écrasement silencieux : vide seulement, ou force=1 posé par le technicien
    if (!stockageVide() && !force) { return false; }
    if (typeof obj.prenom === 'string' && prenomValide(obj.prenom.trim())) {
      prenomChoisi = obj.prenom.trim();
      ecrireStockage(CLE_PRENOM, prenomChoisi);
      ecrireStockage(CLE_PRENOM_PLUSTARD, null);
    }
    if (PALETTES.indexOf(obj.palette) !== -1) {
      paletteChoisie = obj.palette;
      ecrireStockage(CLE_PALETTE, obj.palette);
    }
    if (Array.isArray(obj.perso)) {
      // Schéma strict + chaque adresse doit être reconnue par le vérificateur
      tuilesPerso = normaliserPerso(obj.perso).filter(function (t) {
        return window.MONACCUEIL_VERIF.verifierAdresse(t.url, domainesReconnus(), config.raccourcisseurs).verdict === 'vert';
      });
      sauvegarderPerso();
    }
    if (obj.protection) {
      var prt = normaliserProtectionEtat(obj.protection);
      if (prt.m) { protectionChoisie = prt; sauvegarderProtection(); }
    }
    if (obj.reglages && typeof obj.reglages === 'object') {
      var t = parseInt(obj.reglages.taille, 10);
      if (t >= 1 && t <= 3) { appliquerTaille(t); }
      if (obj.reglages.contraste === 0 || obj.reglages.contraste === 1) {
        appliquerContraste(obj.reglages.contraste === 1);
      }
    }
    synchroniserIDB();
    return true;
  }

  /** Relit stockage → état courant après hydratation par lien (initReglages est déjà passé). */
  function relireApresHydratation() {
    var t = parseInt(lireStockage(CLE_TAILLE), 10);
    appliquerTaille(isNaN(t) ? 1 : t);
    appliquerContraste(lireStockage(CLE_CONTRASTE) === '1');
    paletteChoisie = lireStockage(CLE_PALETTE) || '';
    chargerPrenomChoisi();
    chargerPerso();
    chargerProtection();
  }

  /** Lien personnel « #p= » : la base courante (sans query ni fragment)
      + le fragment. On ne reprend jamais ?url= d'un partage entrant ni un
      autre fragment : le lien généré doit être propre et stable. */
  function genererLienPersonnel(avecPrenom) {
    var obj = sauvegardePersonne();
    delete obj.plustard;
    if (!avecPrenom) { delete obj.prenom; }
    var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return location.href.split('#')[0].split('?')[0] + '#p=' + b64;
  }

  function majusculeInitiale(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ------------------------------------------------------------------
     SHA-256 (pour le code PIN). On utilise crypto.subtle quand il est
     disponible, sinon une implémentation JavaScript de secours.
     ------------------------------------------------------------------ */

  var K_SHA = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function sha256Secours(texte) {
    var octets = new TextEncoder().encode(texte);
    var l = octets.length;
    var longueur = ((l + 9 + 63) >> 6) << 6;
    var msg = new Uint8Array(longueur);
    msg.set(octets);
    msg[l] = 0x80;
    var dv = new DataView(msg.buffer);
    dv.setUint32(longueur - 4, (l * 8) >>> 0);
    dv.setUint32(longueur - 8, Math.floor((l * 8) / 4294967296));
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var W = new Uint32Array(64);
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var i = 0; i < longueur; i += 64) {
      var t;
      for (t = 0; t < 16; t++) { W[t] = dv.getUint32(i + t * 4); }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        var s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K_SHA[t] + W[t]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  }

  /** Retourne une promesse résolue avec le SHA-256 hexadécimal du texte. */
  function sha256(texte) {
    if (window.crypto && window.crypto.subtle && window.isSecureContext) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (o) {
          return ('0' + o.toString(16)).slice(-2);
        }).join('');
      }).catch(function () { return sha256Secours(texte); });
    }
    return Promise.resolve(sha256Secours(texte));
  }

  /* ------------------------------------------------------------------
     Validation des données de configuration
     ------------------------------------------------------------------ */

  function couleurValide(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }
  function iconeValide(i) { return ICONES.indexOf(i) !== -1; }
  /** Nom de domaine valide : minuscules, chiffres, tirets, au moins un point, pas de port ni de chemin. */
  function domaineValide(d) {
    return typeof d === 'string' && d.length <= 253 && d.indexOf('.') !== -1
      && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(d);
  }

  /** Analyse une URL : retourne { ok, hote, erreur }. Seul https:// est accepté. */
  function analyserUrl(url) {
    if (typeof url !== 'string' || url.trim() === '') { return { ok: false, vide: true }; }
    if (url.indexOf('https://') !== 0) { return { ok: false, erreur: 'L\'adresse doit commencer par https://' }; }
    try {
      var u = new URL(url);
      if (!u.hostname) { throw new Error('hôte manquant'); }
      return { ok: true, hote: u.hostname.toLowerCase() };
    } catch (e) {
      return { ok: false, erreur: 'Adresse invalide' };
    }
  }

  /** Vrai si l'hôte appartient à l'un des domaines officiels de la liste. */
  function domaineOfficiel(hote, liste) {
    return (liste || []).some(function (d) {
      d = String(d).toLowerCase().trim();
      return d && (hote === d || hote.slice(-(d.length + 1)) === '.' + d);
    });
  }

  /** Nettoie et filtre une liste de domaines (config, import) : seuls les noms valides sont conservés. */
  function listeDomaines(liste) {
    return liste.filter(function (d) { return typeof d === 'string'; })
      .map(function (d) { return d.trim().toLowerCase().replace(/\.$/, ''); })
      .filter(domaineValide);
  }

  function listeArnaques(liste) {
    return liste.filter(function (a) { return a && typeof a === 'object' && typeof a.titre === 'string' && a.titre.trim(); }).map(function (a) {
      return {
        titre: a.titre.trim().slice(0, 80),
        texte: typeof a.texte === 'string' ? a.texte.trim().slice(0, LONGUEUR_MAX_ARNAQUE) : ''
      };
    });
  }

  /** Nom d'une case ajoutée par la personne : 1 à 24 caractères, lettres/chiffres, espaces, tiret, apostrophe. */
  function nomBoutonValide(n) {
    return typeof n === 'string' && n.trim().length >= 1 && n.trim().length <= LONGUEUR_MAX_NOM_BOUTON && REGEX_NOM_BOUTON.test(n.trim());
  }

  /** Catalogue des services proposés : config.catalogue (facultatif) ou catalogue.js embarqué. */
  function normaliserCatalogue(liste) {
    if (!Array.isArray(liste)) { return null; }  // absent → on garde le catalogue embarqué
    return liste.filter(function (s) { return s && typeof s === 'object'; }).map(function (s, i) {
      var label = typeof s.label === 'string' ? s.label.trim() : '';
      var url = typeof s.url === 'string' ? s.url.trim() : '';
      return { id: 'catalogue-' + (i + 1), label: label, url: url,
        famille: typeof s.famille === 'string' ? s.famille.trim().slice(0, 40) : '',
        icone: iconeValide(s.icone) ? s.icone : ICONE_DEFAUT, ok: !!(label && analyserUrl(url).ok) };
    }).filter(function (s) { return s.ok; });
  }

  /** Catalogue actif : la config peut le remplacer, sinon celui de catalogue.js. */
  function catalogue() {
    return config.catalogue || normaliserCatalogue(window.MONACCUEIL_CATALOGUE) || [];
  }

  /** Liste des domaines reconnus : domaines officiels de la config + domaines du catalogue. */
  function domainesReconnus() {
    var liste = config.domainesOfficiels.slice();
    catalogue().forEach(function (s) {
      var a = analyserUrl(s.url);
      if (a.ok && liste.indexOf(a.hote) === -1) { liste.push(a.hote); }
    });
    return liste;
  }

  /** Nettoie les cases ajoutées par la personne (stockage ou import) : même schéma strict que les tuiles. */
  function normaliserPerso(liste) {
    if (!Array.isArray(liste)) { return []; }
    var vues = {};
    var out = [];
    liste.forEach(function (t) {
      if (!t || typeof t !== 'object') { return; }
      var label = typeof t.label === 'string' ? t.label.trim() : '';
      var url = typeof t.url === 'string' ? t.url.trim() : '';
      var a = analyserUrl(url);
      if (!nomBoutonValide(label) || !a.ok || !iconeValide(t.icone)) { return; }
      var cle = url.toLowerCase().replace(/\/+$/, '');
      if (vues[cle]) { return; }
      vues[cle] = true;
      out.push({ id: 'perso-' + out.length, label: label, url: url, icone: t.icone, couleur: '', groupe: GROUPE_PERSO });
    });
    return out.slice(0, MAX_PERSO);
  }

  /** Nettoie une configuration brute (fichier, import, stockage) et garantit sa structure.
      Les clés « raccourcisseurs » et « arnaques » absentes (ancienne config) sont reprises de config.js. */
  function normaliserConfig(brut) {
    var c = (brut && typeof brut === 'object') ? brut : {};
    var tech = (c.technicien && typeof c.technicien === 'object') ? c.technicien : {};
    var dist = (c.aideDistance && typeof c.aideDistance === 'object') ? c.aideDistance : {};
    var defaut = (window.MONACCUEIL_CONFIG && typeof window.MONACCUEIL_CONFIG === 'object') ? window.MONACCUEIL_CONFIG : {};
    return {
      aideDistance: {
        actif: dist.actif === true,
        outil: OUTILS_DISTANCE.indexOf(dist.outil) !== -1 ? dist.outil : 'quickassist',
        // Identifiant RustDesk du poste du client : chiffres uniquement (jamais de mot de passe)
        idRustdesk: typeof dist.idRustdesk === 'string' ? dist.idRustdesk.replace(/[^0-9]/g, '') : ''
      },
      // même règle que le prénom choisi : vide ou valide, sinon ignoré
      prenom: prenomValide(typeof c.prenom === 'string' ? c.prenom.trim() : '') ? c.prenom.trim() : '',
      technicien: {
        nom: typeof tech.nom === 'string' ? tech.nom.trim() : '',
        telephone: typeof tech.telephone === 'string' ? tech.telephone.trim() : ''
      },
      pinHash: typeof c.pinHash === 'string' ? c.pinHash.toLowerCase() : '',
      // false = mode technicien totalement désactivé (instance publique de démo) ; absent ou autre valeur = actif
      modeTechnicien: typeof c.modeTechnicien === 'boolean' ? c.modeTechnicien : true,
      ouvertureSites: OUVERTURES.indexOf(c.ouvertureSites) !== -1 ? c.ouvertureSites : 'fenetre',
      ouvertureMobile: OUVERTURES_MOBILE.indexOf(c.ouvertureMobile) !== -1 ? c.ouvertureMobile : 'onglet',
      // « Si je ne réponds pas » : gros liens tel: dans le dialog d'aide (max 8, schéma strict)
      numerosUrgence: listeNumeros(c.numerosUrgence),
      // Tuile « Protéger mon téléphone » : affichée sauf si la config dit false
      protectionTelephone: typeof c.protectionTelephone === 'boolean' ? c.protectionTelephone : true,
      // Lien d'appel vidéo facultatif : https + domaine de la liste officielle (comme toute tuile)
      lienVisio: (function () {
        var v = typeof c.lienVisio === 'string' ? c.lienVisio.trim() : '';
        if (!v) { return ''; }
        var a = analyserUrl(v);
        var domaines = listeDomaines(Array.isArray(c.domainesOfficiels) ? c.domainesOfficiels : []);
        return a.ok && domaineOfficiel(a.hote, domaines) ? v : '';
      })(),
      // Couleurs par défaut du technicien et règle d'ajout de cases par la personne (listes blanches)
      palette: PALETTES.indexOf(c.palette) !== -1 ? c.palette : PALETTE_DEFAUT,
      ajoutParPersonne: AJOUTS.indexOf(c.ajoutParPersonne) !== -1 ? c.ajoutParPersonne : 'libre',
      // Catalogue des services proposés : null = celui de catalogue.js embarqué
      catalogue: normaliserCatalogue(c.catalogue),
      domainesOfficiels: listeDomaines(Array.isArray(c.domainesOfficiels) ? c.domainesOfficiels : []),
      raccourcisseurs: listeDomaines(Array.isArray(c.raccourcisseurs) ? c.raccourcisseurs : (Array.isArray(defaut.raccourcisseurs) ? defaut.raccourcisseurs : [])),
      arnaques: listeArnaques(Array.isArray(c.arnaques) ? c.arnaques : (Array.isArray(defaut.arnaques) ? defaut.arnaques : [])),
      tuiles: (Array.isArray(c.tuiles) ? c.tuiles : []).filter(function (t) { return t && typeof t === 'object'; }).map(function (t, i) {
        return {
          id: typeof t.id === 'string' && t.id ? t.id : 'tuile-' + (i + 1),
          label: typeof t.label === 'string' ? t.label.trim() : '',
          url: typeof t.url === 'string' ? t.url.trim() : '',
          icone: iconeValide(t.icone) ? t.icone : ICONE_DEFAUT,
          couleur: couleurValide(t.couleur) ? t.couleur.toLowerCase() : COULEUR_DEFAUT,
          groupe: groupeValide(t.groupe) ? t.groupe.trim() : ''
        };
      })
    };
  }

  /* ------------------------------------------------------------------
     Chargement de la configuration
     Ordre : 1) configuration modifiée en mode technicien (localStorage)
             2) config.json (uniquement en http/https)
             3) config.js embarqué (fonctionne en file://)
     ------------------------------------------------------------------ */

  function chargerConfig() {
    var locale = lireStockage(CLE_CONFIG);
    if (locale) {
      try { return Promise.resolve(normaliserConfig(JSON.parse(locale))); } catch (e) { /* on ignore et on continue */ }
    }
    var embarquee = window.MONACCUEIL_CONFIG;
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return fetch('config.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
        .then(normaliserConfig)
        .catch(function () { return normaliserConfig(embarquee); });
    }
    return Promise.resolve(normaliserConfig(embarquee));
  }

  /* ------------------------------------------------------------------
     Rendu de l'écran principal
     ------------------------------------------------------------------ */

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * Construit une icône SVG inline à partir des formes décrites dans icones.js
   * (données internes, générées depuis icons/*.svg). Aucune requête réseau,
   * et la couleur se règle en CSS via currentColor.
   */
  function creerIcone(nom, couleur) {
    var formes = (window.MONACCUEIL_ICONES || {})[iconeValide(nom) ? nom : ICONE_DEFAUT] || [];
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icone');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    formes.forEach(function (forme) {
      var f = document.createElementNS(SVG_NS, forme[0]);
      Object.keys(forme[1]).forEach(function (a) { f.setAttribute(a, forme[1][a]); });
      svg.appendChild(f);
    });
    if (couleur) { svg.style.setProperty('--couleur', couleur); }
    return svg;
  }

  /** Remplace le contenu d'une icône existante par une autre (aperçu du mode technicien). */
  function remplacerIcone(ancienne, nom, couleur) {
    var nouvelle = creerIcone(nom, couleur);
    ancienne.parentNode.replaceChild(nouvelle, ancienne);
    return nouvelle;
  }

  /** Remplit un lien tel: (icône + numéro) avec le téléphone du technicien. */
  function remplirLienTelephone(lien) {
    var tel = config.technicien.telephone || '';
    lien.textContent = '';
    lien.appendChild(creerIcone('telephone.svg'));
    lien.appendChild(el('span', { text: tel || 'Numéro non renseigné' }));
    // Lien tel: : on ne garde que chiffres et +
    lien.setAttribute('href', tel ? 'tel:' + tel.replace(/[^0-9+]/g, '') : '#');
    lien.setAttribute('aria-label', tel ? 'Appeler ' + (config.technicien.nom || 'le technicien') + ' au ' + tel : 'Numéro non renseigné');
  }

  /** Variante « Appeler [nom] » : le nom en gros, le numéro dans l'aria-label et le href. */
  function remplirLienAppel(lien) {
    remplirLienTelephone(lien);
    lien.lastChild.textContent = 'Appeler ' + (config.technicien.nom || 'mon technicien');
  }

  /* ------------------------------------------------------------------
     Prénom choisi par la personne (localStorage, clé séparée de la config)
     Priorité d'affichage : choisi > config > « Bonjour » seul.
     ------------------------------------------------------------------ */

  var prenomChoisi = '';

  function prenomValide(p) { return typeof p === 'string' && p.length <= LONGUEUR_MAX_PRENOM && REGEX_PRENOM.test(p); }
  function groupeValide(g) { return typeof g === 'string' && g.trim().length <= LONGUEUR_MAX_GROUPE && (!g.trim() || REGEX_GROUPE.test(g.trim())); }
  function prenomEffectif() { return prenomChoisi ? majusculeInitiale(prenomChoisi) : config.prenom; }

  function chargerPrenomChoisi() {
    var p = lireStockage(CLE_PRENOM);
    prenomChoisi = (p && prenomValide(p)) ? p : '';
  }

  function ouvrirPrenom() {
    $('champ-prenom').value = prenomEffectif();
    $('prenom-erreur').textContent = '';
    ouvrirDialog($('dialog-prenom'));
    $('champ-prenom').focus();
  }

  function plusTardPrenom() {
    ecrireStockage(CLE_PRENOM_PLUSTARD, '1');   // « plus tard » mémorisé, rien d'autre
    synchroniserIDB();
    fermerDialog($('dialog-prenom'));
  }

  function initPrenom() {
    var d = $('dialog-prenom');
    $('lien-prenom').addEventListener('click', ouvrirPrenom);
    $('btn-prenom-plustard').addEventListener('click', plusTardPrenom);
    d.addEventListener('cancel', plusTardPrenom);   // Échap = « Plus tard »
    $('form-prenom').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var saisie = $('champ-prenom').value.trim().replace(/\s+/g, ' ');
      if (!saisie) {
        $('prenom-erreur').textContent = 'Écrivez votre prénom, ou cliquez sur « Plus tard ».';
      } else if (!prenomValide(saisie)) {
        $('prenom-erreur').textContent = 'Seulement des lettres, des espaces, un tiret ou une apostrophe (30 caractères maximum). Pas de chiffres ni de symboles.';
      } else {
        prenomChoisi = saisie;
        ecrireStockage(CLE_PRENOM, saisie);
        ecrireStockage(CLE_PRENOM_PLUSTARD, null);   // le choix remplace « plus tard »
        synchroniserIDB();
        demanderPersistance();                      // storage.persist() après une action utilisateur
        $('prenom-erreur').textContent = '';
        fermerDialog(d);
        afficherEntete();
      }
      $('champ-prenom').focus();
    });
  }

  function afficherEntete() {
    var prenom = prenomEffectif();
    $('titre').textContent = prenom ? 'Bonjour ' + prenom : 'Bonjour';
    $('lien-prenom').textContent = prenom ? 'Changer mon prénom' : 'Choisir mon prénom';
    $('aide-nom').textContent = config.technicien.nom || 'Votre technicien';
    remplirLienTelephone($('aide-telephone'));
    afficherAideDistance();
    afficherBizarre();
    // Barre fixe du téléphone : « Appeler [prénom du technicien] » en lien tel: natif
    remplirLienAppel($('btn-appeler'));
    afficherUrgences();
  }

  /** « Si je ne réponds pas » : gros liens tel: dans la fenêtre d'aide (config.numerosUrgence). */
  function afficherUrgences() {
    var ul = $('liste-urgences');
    if (!ul) { return; }
    vider(ul);
    config.numerosUrgence.forEach(function (u) {
      ul.appendChild(el('li', null, [
        el('a', { 'class': 'num-urgence', href: numeroTel(u.numero) }, [
          creerIcone('telephone.svg'),
          el('span', { 'class': 'num-urgence-bloc' }, [
            el('span', { 'class': 'num-urgence-nom', text: u.nom + ' : ' + u.numero }),
            u.detail ? el('span', { 'class': 'num-urgence-detail', text: u.detail }) : null
          ].filter(Boolean))
        ])
      ]));
    });
    $('urgences-titre').parentNode.hidden = !config.numerosUrgence.length;
  }

  /** Textes des étapes 2 à 4 selon l'outil choisi et le mode d'hébergement
      (file:// : raccourci Bureau ; https : l'outil se lance depuis le menu Démarrer). */
  function afficherAideDistance() {
    remplirLienTelephone($('distance-telephone'));
    var mobile = estMobile();
    // Sur téléphone : pas de contrôle à distance, 3 étapes simples + visio éventuelle
    $('distance-desktop').hidden = mobile;
    $('distance-mobile').hidden = !mobile;
    $('distance-titre').textContent = mobile ? 'Besoin d\'aide ?' : 'Aide à distance : 4 étapes';
    if (mobile) { remplirLienTelephone($('distance-telephone-mobile')); }
    var visio = $('btn-visio');
    if (mobile && config.lienVisio) { visio.href = config.lienVisio; visio.hidden = false; }
    else { visio.hidden = true; }
    if (mobile) { return; }
    var outil = config.aideDistance.outil;
    $('distance-etape-lancer').textContent = location.protocol === 'file:'
      ? 'Double-cliquez sur l\'icône « Aide à distance » sur votre Bureau.'
      : 'Appuyez sur la touche Windows, tapez « ' + (outil === 'rustdesk' ? 'RustDesk' : 'Assistance rapide') + ' », puis cliquez dessus.';
    $('distance-etape-code').textContent = outil === 'rustdesk'
      ? 'Lisez-moi le code (votre identifiant) qui s\'affiche à l\'écran.'
      : 'Lisez-moi ce qui s\'affiche, puis tapez le code que je vous donne au téléphone et cliquez sur « Envoyer ».';
    $('distance-etape-accepter').textContent = outil === 'rustdesk'
      ? 'Une fenêtre vous demandera d\'accepter : cliquez sur « Accepter ».'
      : 'Une fenêtre vous demandera d\'accepter : cliquez sur « Autoriser ».';
  }

  /* ------------------------------------------------------------------
     Ouverture des sites
     Par défaut (« fenetre ») : fenêtre popup nommée unique, ~75 % de la
     largeur à droite — l'accueil reste visible à gauche, et une autre tuile
     réutilise la même fenêtre. Repli sur l'onglet (lien target=_blank) si
     l'écran est étroit, si la fenêtre est bloquée ou si l'option vaut
     « onglet ». window.open n'hérite pas de rel=noopener : on coupe
     w.opener soi-même tout de suite (la sécurité prime sur la réutilisation).
     ------------------------------------------------------------------ */

  /**
   * Vrai si l'appareil se comporte comme un téléphone : pointeur grossier
   * (tactile), écran étroit, ou écran tactile principal. Jamais d'analyse
   * du user-agent — uniquement des capacités mesurables.
   */
  function estMobile() {
    var mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
    if (mm('(pointer: coarse)')) { return true; }
    if (mm('(max-width: 600px)')) { return true; }
    return 'ontouchstart' in window && Math.min(screen.width, screen.height) < 1024;
  }

  /** Position/taille de la fenêtre pour un écran donné ; null si trop étroit. */
  function calculerFenetre(largeurEcran, hauteurEcran, gaucheBase) {
    if (largeurEcran < LARGEUR_MIN_FENETRE) { return null; }
    var largeur = Math.floor(largeurEcran * RATIO_FENETRE);
    return {
      left: (gaucheBase || 0) + (largeurEcran - largeur),
      top: 0,
      width: largeur,
      height: hauteurEcran
    };
  }

  /** Ouvre l'URL dans la fenêtre dédiée ; retourne la fenêtre ou null (repli onglet). */
  function ouvrirSite(url) {
    var geo = calculerFenetre(screen.availWidth, screen.availHeight, screen.availLeft);
    if (!geo) { return null; }
    var w = null;
    try {
      w = window.open(url, 'monaccueil-site',
        'popup=yes,left=' + geo.left + ',top=' + geo.top + ',width=' + geo.width + ',height=' + geo.height);
    } catch (e) { w = null; }
    if (!w) { return null; }
    try { w.opener = null; } catch (e) { /* rien à faire */ }
    try { w.focus(); } catch (e) { /* idem */ }
    return w;
  }

  /* Bandeau « comment revenir » après ouverture d'un site : disparaît au
     retour sur l'accueil (focus/visibility) ou tout seul après un délai. */
  var minuteurRetour = null;
  function afficherRetour(type) {
    var b = $('retour-accueil');
    b.textContent = type === 'fenetre'
      ? 'Votre site s\'est ouvert sur la droite. Pour revenir ici : fermez-le avec la croix en haut à droite.'
      : type === 'mobile'
        ? 'Votre site s\'est ouvert. Pour revenir ici : touchez la flèche retour de votre téléphone, ou fermez l\'onglet.'
        : 'Votre site s\'est ouvert dans un autre onglet. Pour revenir ici : fermez-le avec la croix de l\'onglet.';
    b.hidden = false;
    if (minuteurRetour) { clearTimeout(minuteurRetour); }
    minuteurRetour = setTimeout(masquerRetour, DELAI_BANDEAU_RETOUR);
  }
  function masquerRetour() {
    $('retour-accueil').hidden = true;
    if (minuteurRetour) { clearTimeout(minuteurRetour); minuteurRetour = null; }
  }
  function initRetour() {
    window.addEventListener('focus', masquerRetour);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { masquerRetour(); } });
  }

  /** Groupe résolu d'une tuile : celui de la config, sinon déduit de l'id. */
  function groupeDe(t) { return t.groupe || GROUPES_PAR_ID[t.id] || ''; }

  // Les liens « Ajouter / Retirer un bouton » survivent aux re-rendus : on garde le nœud
  var persoActions = null, persoLienAjout = null;

  function afficherTuiles() {
    var conteneur = $('tuiles');
    vider(conteneur);
    var visibles = config.tuiles.filter(function (t) { return analyserUrl(t.url).ok; });

    // Une tuile = vrai lien enrichi (clic droit, clavier, repli en onglet natif)
    function creerTuileLien(t) {
      var lien = el('a', {
        'class': 'tuile',
        href: t.url,
        target: '_blank',
        rel: 'noopener noreferrer'
      }, [
        creerIcone(t.icone, t.couleur),
        el('span', { 'class': 'tuile-label', text: t.label || t.url })
      ]);
      lien.style.setProperty('--couleur', t.couleur);
      lien.addEventListener('click', function (ev) {
        // Téléphone : pas de fenêtre dédiée. « memeOnglet » navigue dans l'onglet courant
        // (la flèche retour du téléphone ramène à l'accueil) ; « onglet » = lien natif,
        // ce qui laisse le téléphone ouvrir l'application officielle s'il le souhaite.
        if (estMobile()) {
          if (config.ouvertureMobile === 'memeOnglet') { ev.preventDefault(); location.href = t.url; return; }
          afficherRetour('mobile');
          return;
        }
        if (config.ouvertureSites === 'onglet') { afficherRetour('onglet'); return; }  // lien normal : target=_blank
        if (ouvrirSite(t.url)) { ev.preventDefault(); afficherRetour('fenetre'); }
        else { afficherRetour('onglet'); }  // bloqué ou écran étroit : le lien target=_blank fait le travail
      });
      return el('li', null, [lien]);
    }

    // Les deux tuiles fixes finissent dans « Aide et sécurité »
    function creerTuilesSpeciales() {
      var items = [];
      // Tuile fixe "Aide à distance" : ouvre une fenêtre d'explications, pas un site.
      // Sur téléphone : « Besoin d'aide ? », pas de contrôle à distance mobile.
      if (config.aideDistance.actif) {
        var bouton = el('button', { type: 'button', 'class': 'tuile tuile-distance' }, [
          creerIcone('assistance.svg', COULEUR_DISTANCE),
          el('span', { 'class': 'tuile-label', text: estMobile() ? 'Besoin d\'aide ?' : 'Aide à distance' })
        ]);
        bouton.style.setProperty('--couleur', COULEUR_DISTANCE);
        bouton.addEventListener('click', function () { ouvrirDialog($('dialog-distance')); $('btn-fermer-distance').focus(); });
        items.push(el('li', null, [bouton]));
      }
      // Tuile fixe "Un message me paraît bizarre" : conseils et vérification 100 % locale, toujours présente
      var bizarre = el('button', { type: 'button', 'class': 'tuile tuile-bizarre' }, [
        creerIcone('bouclier.svg', COULEUR_BIZARRE),
        el('span', { 'class': 'tuile-label', text: 'Un message me paraît bizarre' })
      ]);
      bizarre.style.setProperty('--couleur', COULEUR_BIZARRE);
      bizarre.addEventListener('click', function () { ouvrirDialog($('dialog-bizarre')); $('champ-adresse').focus(); });
      items.push(el('li', null, [bizarre]));
      // Tuile fixe "Protéger mon téléphone" : guidage hors ligne en 3 étapes,
      // masquée si la config la désactive ou si le contenu est absent/invalide
      if (config.protectionTelephone && protectionDisponible()) {
        var protec = el('button', { type: 'button', 'class': 'tuile tuile-protec' }, [
          creerIcone('telephone.svg', COULEUR_PROTECTION),
          el('span', { 'class': 'tuile-label', text: 'Protéger mon téléphone' })
        ]);
        protec.style.setProperty('--couleur', COULEUR_PROTECTION);
        protec.addEventListener('click', function () { ouvrirProtection(); });
        items.push(el('li', null, [protec]));
      }
      return items;
    }

    // Regroupement : si aucune tuile n'a de groupe (ni config ni id connu),
    // on rend une seule grille simple, comme avant.
    // Les cases ajoutées par la personne rejoignent « Mon quotidien », après celles de la config
    var tous = visibles.concat(tuilesPerso);

    var parGroupe = {};
    var noms = [];           // ordre des groupes rencontrés
    var avecGroupe = 0;
    tous.forEach(function (t) {
      var g = groupeDe(t);
      if (g) { avecGroupe++; }
      if (!parGroupe[g]) { parGroupe[g] = []; noms.push(g); }
      parGroupe[g].push(t);
    });
    var speciales = creerTuilesSpeciales();

    // « Ajouter un bouton » devient une tuile pointillée de la grille (un
    // emplacement à remplir, impossible à manquer) ; « Retirer » est un
    // bouton visible sous la grille, seulement quand des boutons perso existent.
    var actions = persoActions || $('perso-actions');
    if (!persoActions) { persoActions = actions; }
    var ajoutActif = config.ajoutParPersonne !== 'non';
    if (!persoLienAjout) { persoLienAjout = $('lien-ajout'); }
    var lienAjout = persoLienAjout;
    function tuileAjout() {
      var li = el('li');
      li.appendChild(lienAjout);
      lienAjout.hidden = false;
      return li;
    }
    if (actions) {
      actions.hidden = !ajoutActif || !tuilesPerso.length;
      actions.querySelector('#lien-retrait').hidden = !tuilesPerso.length;
    }

    if (!avecGroupe) {
      var grille = el('ul', { 'class': 'tuiles' });
      tous.forEach(function (t) { grille.appendChild(creerTuileLien(t)); });
      speciales.forEach(function (li) { grille.appendChild(li); });
      if (ajoutActif && lienAjout) { grille.appendChild(tuileAjout()); }
      conteneur.appendChild(grille);
      if (actions && !actions.hidden) { conteneur.appendChild(actions); }
      $('message-vide').hidden = true;
      return;
    }

    // Ordre : familles canoniques d'abord, puis groupes personnalisés, puis « Autres »
    noms.sort(function (a, b) {
      var ia = ORDRE_GROUPES.indexOf(a), ib = ORDRE_GROUPES.indexOf(b);
      if (a === '') { return 1; }
      if (b === '') { return -1; }
      return (ia === -1 ? ORDRE_GROUPES.length : ia) - (ib === -1 ? ORDRE_GROUPES.length : ib);
    });
    var aide = ORDRE_GROUPES[ORDRE_GROUPES.length - 1];   // « Aide et sécurité »
    if (speciales.length && noms.indexOf(aide) === -1) { noms.push(aide); parGroupe[aide] = []; }

    // Les liens de personnalisation vivent dans le groupe « Mon quotidien »
    if (ajoutActif && noms.indexOf(GROUPE_PERSO) === -1) {
      noms.push(GROUPE_PERSO);
      parGroupe[GROUPE_PERSO] = [];
    }

    noms.forEach(function (nom) {
      var grille = el('ul', { 'class': 'tuiles' });
      (parGroupe[nom] || []).forEach(function (t) { grille.appendChild(creerTuileLien(t)); });
      if (nom === aide) { speciales.forEach(function (li) { grille.appendChild(li); }); }
      if (!grille.childNodes.length && !(nom === GROUPE_PERSO && ajoutActif)) { return; }
      var section = el('section', { 'class': 'groupe' });
      section.appendChild(el('h2', { 'class': 'groupe-titre', text: nom || GROUPE_AUTRES }));
      if (nom === GROUPE_PERSO && ajoutActif && lienAjout) { grille.appendChild(tuileAjout()); }
      if (grille.childNodes.length) { section.appendChild(grille); }
      if (nom === GROUPE_PERSO && actions && !actions.hidden) { section.appendChild(actions); }
      conteneur.appendChild(section);
    });
    $('message-vide').hidden = true;
  }

  /* ------------------------------------------------------------------
     "Un message me paraît bizarre" : 3 questions, vérification locale
     d'une adresse (jamais ouverte, jamais envoyée), arnaques du moment.
     ------------------------------------------------------------------ */

  function lireCompteur(cle) { var n = parseInt(lireStockage(cle), 10); return isNaN(n) || n < 0 ? 0 : n; }
  function incrementerCompteur(cle) { ecrireStockage(cle, String(lireCompteur(cle) + 1)); }
  function lireStatistiques() {
    return { verifications: lireCompteur(CLE_STAT_VERIFICATIONS), rouges: lireCompteur(CLE_STAT_ROUGES),
      refus: lireCompteur(CLE_STAT_REFUS) };
  }

  /** Remplit la liste des arnaques et le lien d'appel (à chaque changement de configuration). */
  function afficherBizarre() {
    remplirLienAppel($('bizarre-telephone'));
    var ul = $('liste-arnaques');
    vider(ul);
    config.arnaques.forEach(function (a) {
      ul.appendChild(el('li', null, [
        el('span', { 'class': 'arnaque-titre', text: a.titre }),
        el('span', { 'class': 'arnaque-texte', text: a.texte })
      ]));
    });
    if (!config.arnaques.length) { ul.appendChild(el('li', { 'class': 'arnaque-texte', text: 'Aucune arnaque n\'est renseignée pour le moment.' })); }
  }

  function viderVerification() {
    $('champ-adresse').value = '';
    var zone = $('verif-resultat');
    vider(zone);
    zone.className = 'verif-resultat';
  }

  /** Analyse le texte collé et affiche le résultat en gros, avec couleur ET texte. */
  function verifierAdresseSaisie() {
    var zone = $('verif-resultat');
    vider(zone);
    zone.className = 'verif-resultat';
    var r = window.MONACCUEIL_VERIF.verifierAdresse($('champ-adresse').value, domainesReconnus(), config.raccourcisseurs);
    if (r.verdict === 'vide') {
      zone.appendChild(el('p', { 'class': 'verdict', text: 'Collez d\'abord une adresse dans le champ ci-dessus.' }));
      return;
    }
    incrementerCompteur(CLE_STAT_VERIFICATIONS);
    if (r.verdict === 'vert') {
      zone.classList.add('vert');
      zone.appendChild(el('p', { 'class': 'verdict', text: 'RÉSULTAT : SÛR. Cette adresse est bien celle d\'un site officiel de la liste.' }));
      zone.appendChild(el('p', { text: 'Attention : le site est le vrai, mais le message qui vous l\'a envoyé peut quand même être une arnaque. En cas de doute, appelez-moi.' }));
      return;
    }
    incrementerCompteur(CLE_STAT_ROUGES);
    zone.classList.add('rouge');
    zone.appendChild(el('p', { 'class': 'verdict', text: r.officiel
      ? 'RÉSULTAT : DANGER. Cette adresse présente un signe suspect. Ne cliquez pas. Appelez-moi.'
      : 'RÉSULTAT : DANGER. Cette adresse n\'est PAS dans la liste. Ne cliquez pas. Appelez-moi.' }));
    if (r.raisons.length) {
      var ul = el('ul');
      r.raisons.forEach(function (t) { ul.appendChild(el('li', { text: t })); });
      zone.appendChild(ul);
    }
  }

  /**
   * Share target (manifest « Partager vers Mon Accueil ») : l'adresse reçue
   * dans ?url= ou ?text= est traitée comme une saisie normale du vérificateur.
   * Jamais ouverte, jamais stockée ; le texte est tronqué à 2048 caractères,
   * une éventuelle adresse au milieu du texte est extraite, puis la query
   * est nettoyée de la barre d'adresse (history.replaceState).
   */
  function traiterPartage() {
    var brut = '';
    try {
      var q = new URLSearchParams(location.search);
      brut = (q.get('url') || q.get('text') || q.get('title') || '').slice(0, 2048);
    } catch (e) { brut = ''; }
    if (!brut) { return; }
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* file: ou repli */ }
    // Extrait une adresse au milieu du texte reçu ; sinon le texte brut est
    // soumis tel quel au vérificateur (javascript:, data:, etc. → danger)
    var m = brut.match(/https?:\/\/[^\s"'<>()]+/i) || brut.match(/[^\s"'<>()]{2,}\.[a-z]{2,}[^\s"'<>()]*/i);
    var d = $('dialog-bizarre');
    ouvrirDialog(d);
    $('champ-adresse').value = m ? m[0] : brut;
    verifierAdresseSaisie();
    $('btn-fermer-bizarre').focus();
  }

  function initBizarre() {
    var d = $('dialog-bizarre');
    $('form-verif').addEventListener('submit', function (ev) { ev.preventDefault(); verifierAdresseSaisie(); });
    // Barre fixe du téléphone : raccourci direct vers le vérificateur
    var raccourci = $('btn-bizarre-bar');
    if (raccourci) { raccourci.addEventListener('click', function () { ouvrirDialog(d); $('champ-adresse').focus(); }); }
    // « Coller l'adresse » : Clipboard API uniquement sur action directe de la personne
    var coller = $('btn-coller');
    if (coller) {
      coller.addEventListener('click', function () {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          $('champ-adresse').focus();
          return;  // Repli : collage manuel (appui long dans le champ, « Coller »)
        }
        navigator.clipboard.readText().then(function (texte) {
          if (!texte) { return; }
          $('champ-adresse').value = texte.slice(0, 2048);
          verifierAdresseSaisie();
        }).catch(function () { $('champ-adresse').focus(); });  // refusé : collage manuel
      });
    }
    function fermer() {
      fermerDialog(d);
      viderVerification();
      var tuile = document.querySelector('.tuile-bizarre');
      if (tuile) { tuile.focus(); }
    }
    $('btn-fermer-bizarre').addEventListener('click', fermer);
    // Fermeture par Échap : on vide aussi le champ (rien ne doit rester à l'écran)
    d.addEventListener('cancel', viderVerification);
    d.addEventListener('close', viderVerification);
  }

  /* ------------------------------------------------------------------
     Date et heure
     ------------------------------------------------------------------ */

  var formatDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function majHorloge() {
    var maintenant = new Date();
    $('date').textContent = majusculeInitiale(formatDate.format(maintenant));
    var h = String(maintenant.getHours()).padStart(2, '0');
    var m = String(maintenant.getMinutes()).padStart(2, '0');
    $('heure').textContent = h + ':' + m;
  }

  /* ------------------------------------------------------------------
     Réglages d'affichage (taille du texte, contraste)
     ------------------------------------------------------------------ */

  var taille = 1;
  var initReglagesEnCours = false;   // pas de persistance pendant la relecture initiale

  function appliquerTaille(n) {
    taille = Math.min(3, Math.max(1, n));
    var html = document.documentElement;
    html.classList.remove('taille-1', 'taille-2', 'taille-3');
    html.classList.add('taille-' + taille);
    $('btn-taille-moins').disabled = taille === 1;
    $('btn-taille-plus').disabled = taille === 3;
    if (!initReglagesEnCours) { ecrireStockage(CLE_TAILLE, String(taille)); synchroniserIDB(); }
  }

  function appliquerContraste(actif) {
    document.documentElement.classList.toggle('contraste-eleve', actif);
    $('btn-contraste').setAttribute('aria-pressed', actif ? 'true' : 'false');
    if (!initReglagesEnCours) { ecrireStockage(CLE_CONTRASTE, actif ? '1' : '0'); synchroniserIDB(); }
  }

  function initReglages() {
    initReglagesEnCours = true;
    var t = parseInt(lireStockage(CLE_TAILLE), 10);
    appliquerTaille(isNaN(t) ? 1 : t);
    appliquerContraste(lireStockage(CLE_CONTRASTE) === '1');
    // Palette choisie par la personne, appliquée avant le premier affichage (pas de clignotement)
    paletteChoisie = lireStockage(CLE_PALETTE) || '';
    appliquerPalette(paletteEffective());
    $('btn-taille-moins').addEventListener('click', function () { appliquerTaille(taille - 1); });
    $('btn-taille-plus').addEventListener('click', function () { appliquerTaille(taille + 1); });
    $('btn-contraste').addEventListener('click', function () {
      appliquerContraste(!document.documentElement.classList.contains('contraste-eleve'));
    });
    // Sur téléphone, le bouton « Réglages » replie/déplie le panneau
    var br = $('btn-reglages');
    if (br) {
      br.addEventListener('click', function () {
        var ouvert = $('reglages').classList.toggle('ouvert');
        br.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      });
    }
    initReglagesEnCours = false;
  }

  /* ------------------------------------------------------------------
     Fenêtres de dialogue (avec repli si <dialog> n'est pas supporté)
     ------------------------------------------------------------------ */

  function ouvrirDialog(d) {
    if (typeof d.showModal === 'function') { if (!d.open) { d.showModal(); } }
    else { d.setAttribute('open', ''); }
  }
  function fermerDialog(d) {
    if (typeof d.close === 'function') { if (d.open) { d.close(); } }
    else { d.removeAttribute('open'); }
  }

  function initAide() {
    var d = $('dialog-aide');
    remplacerIcone($('aide-icone'), 'aide.svg');
    $('btn-aide').addEventListener('click', function () { ouvrirDialog(d); $('btn-fermer-aide').focus(); });
    $('btn-fermer-aide').addEventListener('click', function () { fermerDialog(d); $('btn-aide').focus(); });
    var dd = $('dialog-distance');
    $('btn-fermer-distance').addEventListener('click', function () {
      fermerDialog(dd);
      var tuile = document.querySelector('.tuile-distance');
      if (tuile) { tuile.focus(); }
    });
    // « Comment ça marche ? » : 3 gestes, texte adapté au téléphone
    var dm = $('dialog-mode');
    $('lien-mode').addEventListener('click', function () {
      var mobile = estMobile();
      $('mode-desktop').hidden = mobile;
      $('mode-mobile').hidden = !mobile;
      ouvrirDialog(dm);
      $('btn-fermer-mode').focus();
    });
    $('btn-fermer-mode').addEventListener('click', function () { fermerDialog(dm); $('lien-mode').focus(); });
  }

  /* ------------------------------------------------------------------
     Suggestion d'installation (PWA)
     Affichée seulement si le navigateur propose l'installation et que la
     personne n'a pas déjà installé ou fermé la bannière. Un drapeau local
     mémorise le choix ; rien d'autre n'est stocké.
     ------------------------------------------------------------------ */

  var installEvent = null;

  /**
   * Vrai sur iPhone/iPad. Le mobile est détecté par capacités ; ici on a
   * besoin de savoir que c'est Safari-iOS, car seul lui n'a pas d'événement
   * d'installation et exige le geste « Partager → Sur l'écran d'accueil ».
   */
  function estIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function initInstall() {
    var banniere = $('banniere-install');
    var installe = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || navigator.standalone === true;
    // iPhone : pas d'événement d'installation → instructions écrites, fermables à jamais
    if (estIOS() && !installe && lireStockage(CLE_INSTALL_IOS) !== '1') {
      var ios = $('banniere-ios');
      if (ios) { ios.hidden = false; }
    }
    $('btn-ios-fermer').addEventListener('click', function () {
      var ios = $('banniere-ios');
      if (ios) { ios.hidden = true; }
      ecrireStockage(CLE_INSTALL_IOS, '1');
    });
    if (!banniere || lireStockage(CLE_INSTALL) === '1' || installe) { return; }
    window.addEventListener('beforeinstallprompt', function (ev) {
      ev.preventDefault();
      installEvent = ev;
      banniere.hidden = false;
    });
    window.addEventListener('appinstalled', function () {
      banniere.hidden = true;
      ecrireStockage(CLE_INSTALL, '1');
    });
    $('btn-install').addEventListener('click', function () {
      if (!installEvent) { return; }
      var ev = installEvent;
      installEvent = null;
      ev.prompt();
      ev.userChoice.then(function (choix) {
        banniere.hidden = true;
        if (choix && choix.outcome === 'accepted') { ecrireStockage(CLE_INSTALL, '1'); }
      });
    });
    $('btn-install-fermer').addEventListener('click', function () {
      banniere.hidden = true;
      ecrireStockage(CLE_INSTALL, '1');
    });
  }

  /* ------------------------------------------------------------------
     « Protéger mon téléphone » : guidage hors ligne en 3 étapes
     (marque → réglages un par écran → conseils communs). Tout le texte
     vit dans protection-telephone.js (window.MONACCUEIL_PROTECTION),
     revalidé ici avec un schéma strict : aucun HTML, longueurs bornées.
     Les cases « C'est fait » sont mémorisées en localStorage (rien de
     sensible : juste une marque et des id d'étapes).
     ------------------------------------------------------------------ */

  var protectionContenu = null;   // contenu validé {aideInconnu, marques:[], conseils:[]}
  var protecVue = 'marques';      // 'marques' | 'etapes' | 'conseils' | 'inconnu'
  var protecIndex = 0;            // étape courante dans la marque choisie

  /** Texte court autorisé dans le contenu (pas de HTML, longueur bornée). */
  function texteContenu(v, max) {
    return typeof v === 'string' && v.length > 0 && v.length <= max && v.indexOf('<') === -1 ? v : '';
  }

  /** Revalide window.MONACCUEIL_PROTECTION : entrées invalides ignorées. */
  function normaliserProtectionContenu() {
    if (protectionContenu) { return protectionContenu; }
    var brut = window.MONACCUEIL_PROTECTION;
    var sortie = { aideInconnu: '', marques: [], conseils: [] };
    if (!brut || typeof brut !== 'object') { protectionContenu = sortie; return sortie; }
    sortie.aideInconnu = texteContenu(brut.aideInconnu, 200)
      || 'Appelez-moi, je regarde avec vous.';
    if (Array.isArray(brut.marques)) {
      brut.marques.forEach(function (m) {
        if (!m || typeof m !== 'object') { return; }
        var id = /^[a-z0-9-]{1,20}$/.test(m.id) ? m.id : '';
        var nom = texteContenu(m.nom, 40);
        var verification = texteContenu(m.verification, 40);
        var etapes = [], ids = {};
        if (Array.isArray(m.etapes)) {
          m.etapes.slice(0, 12).forEach(function (e) {
            if (!e || typeof e !== 'object') { return; }
            var eid = /^[a-z0-9-]{1,30}$/.test(e.id) ? e.id : '';
            var action = texteContenu(e.action, 300);
            var chemin = [];
            if (Array.isArray(e.chemin)) {
              e.chemin.slice(0, 8).forEach(function (s) {
                var seg = texteContenu(s, 50);
                if (seg) { chemin.push(seg); }
              });
            }
            var note = texteContenu(e.note, 300);
            if (eid && action && chemin.length && !ids[eid]) {
              ids[eid] = true;
              etapes.push({ id: eid, action: action, chemin: chemin, note: note });
            }
          });
        }
        if (id && nom && verification && etapes.length) {
          sortie.marques.push({
            id: id, nom: nom, verification: verification,
            note: texteContenu(m.note, 300), etapes: etapes
          });
        }
      });
    }
    if (Array.isArray(brut.conseils)) {
      brut.conseils.slice(0, 10).forEach(function (t) {
        var c = texteContenu(t, 400);
        if (c) { sortie.conseils.push(c); }
      });
    }
    protectionContenu = sortie;
    return sortie;
  }

  function protectionDisponible() {
    return normaliserProtectionContenu().marques.length > 0;
  }

  function marqueParId(id) {
    var trouve = null;
    normaliserProtectionContenu().marques.forEach(function (m) { if (m.id === id) { trouve = m; } });
    return trouve;
  }

  /** Schéma strict de l'état mémorisé {m, f} — même pour stockage, #p= et import. */
  function normaliserProtectionEtat(obj) {
    var vide = { m: '', f: [] };
    if (!obj || typeof obj !== 'object' || typeof obj.m !== 'string') { return vide; }
    var marque = marqueParId(obj.m);
    if (!marque) { return vide; }
    var vus = {};
    var f = [];
    if (Array.isArray(obj.f)) {
      obj.f.forEach(function (eid) {
        var ok = marque.etapes.some(function (e) { return e.id === eid; });
        if (ok && !vus[eid]) { vus[eid] = true; f.push(eid); }
      });
    }
    return { m: marque.id, f: f };
  }

  function chargerProtection() {
    protectionChoisie = { m: '', f: [] };
    var brut = lireStockage(CLE_PROTECTION);
    if (!brut) { return; }
    try {
      protectionChoisie = normaliserProtectionEtat(JSON.parse(brut));
    } catch (e) { /* corrompu : repart de zéro */ }
  }

  function sauvegarderProtection() {
    if (protectionChoisie.m || protectionChoisie.f.length) {
      ecrireStockage(CLE_PROTECTION, JSON.stringify(protectionChoisie));
    } else {
      ecrireStockage(CLE_PROTECTION, null);
    }
    synchroniserIDB();
  }

  /** Pré-sélection prudente par capacités : navigator.standalone n'existe
      que sur iOS (jamais de lecture du user-agent). Toujours modifiable. */
  function preselectionMarque() {
    if (protectionChoisie.m) { return protectionChoisie.m; }
    if (estMobile() && typeof navigator.standalone !== 'undefined') { return 'iphone'; }
    return '';
  }

  function protecAfficherRetour(visible) {
    $('btn-protec-retour').hidden = !visible;
  }

  /** Rend une étape : phrase d'action, chemin des menus en gras, note, case. */
  function rendreEtapeProtection(marque, index) {
    var zone = $('protec-contenu');
    vider(zone);
    var e = marque.etapes[index];
    zone.appendChild(el('p', { 'class': 'protec-verif discret', text: 'Dernière vérification : ' + marque.verification }));
    zone.appendChild(el('p', { 'class': 'protec-compteur discret', text: 'Réglage ' + (index + 1) + ' sur ' + marque.etapes.length }));
    zone.appendChild(el('p', { 'class': 'protec-action', text: e.action }));
    var chemin = el('p', { 'class': 'chemin-menu' });
    e.chemin.forEach(function (seg, i) {
      if (i) { chemin.appendChild(el('span', { 'class': 'chemin-sep', 'aria-hidden': 'true', text: ' › ' })); }
      chemin.appendChild(el('strong', { text: seg }));
    });
    zone.appendChild(chemin);
    if (e.note) { zone.appendChild(el('p', { 'class': 'protec-note discret', text: e.note })); }
    // Grosse case « C'est fait » : mémorisée en localStorage
    var caseFaite = el('input', { id: 'case-faite', type: 'checkbox' });
    caseFaite.checked = protectionChoisie.f.indexOf(e.id) !== -1;
    caseFaite.addEventListener('change', function () {
      if (caseFaite.checked) {
        if (protectionChoisie.f.indexOf(e.id) === -1) { protectionChoisie.f.push(e.id); }
      } else {
        protectionChoisie.f = protectionChoisie.f.filter(function (x) { return x !== e.id; });
      }
      sauvegarderProtection();
      demanderPersistance();
    });
    var label = el('label', { 'class': 'case-faite', 'for': 'case-faite' }, [caseFaite, 'C\'est fait']);
    zone.appendChild(label);
    if (marque.note) { zone.appendChild(el('p', { 'class': 'protec-note discret', text: marque.note })); }
    var actions = el('div', { 'class': 'protec-nav' });
    if (index > 0) {
      var prec = el('button', { type: 'button', 'class': 'bouton bouton-discret', text: '← Réglage précédent' });
      prec.addEventListener('click', function () { protecIndex--; rendreEtapeProtection(marque, protecIndex); });
      actions.appendChild(prec);
    }
    var suivant = el('button', {
      type: 'button', 'class': 'bouton bouton-principal',
      text: index < marque.etapes.length - 1 ? 'Réglage suivant →' : 'Voir les conseils →'
    });
    suivant.addEventListener('click', function () {
      if (index < marque.etapes.length - 1) { protecIndex++; rendreEtapeProtection(marque, protecIndex); }
      else { protecVue = 'conseils'; protecAfficherRetour(true); rendreProtecConseils(); }
    });
    actions.appendChild(suivant);
    zone.appendChild(actions);
    caseFaite.focus();
  }

  /** Étape 1 : « Quel téléphone avez-vous ? » — grosses vignettes par marque. */
  function rendreProtecMarques() {
    var zone = $('protec-contenu');
    vider(zone);
    protecAfficherRetour(false);
    zone.appendChild(el('p', { 'class': 'protec-question', text: 'Quel téléphone avez-vous ?' }));
    var liste = el('div', { 'class': 'marque-vignettes' });
    var preco = preselectionMarque();
    normaliserProtectionContenu().marques.forEach(function (m) {
      var b = el('button', {
        type: 'button', 'class': 'marque-vignette' + (m.id === preco ? ' choisie' : ''),
        'aria-pressed': m.id === preco ? 'true' : 'false'
      }, [el('span', { text: m.nom })]);
      b.addEventListener('click', function () {
        if (protectionChoisie.m !== m.id) { protectionChoisie = { m: m.id, f: [] }; sauvegarderProtection(); }
        protecVue = 'etapes';
        protecIndex = 0;
        protecAfficherRetour(true);
        rendreEtapeProtection(m, 0);
      });
      liste.appendChild(b);
    });
    var inco = el('button', { type: 'button', 'class': 'marque-vignette marque-inconnu' },
      [el('span', { text: 'Je ne sais pas' })]);
    inco.addEventListener('click', function () {
      protecVue = 'inconnu';
      protecAfficherRetour(true);
      var z = $('protec-contenu');
      vider(z);
      z.appendChild(el('p', { 'class': 'protec-action', text: normaliserProtectionContenu().aideInconnu }));
      var lienAppel = el('a', { 'class': 'aide-telephone', href: '#' });
      z.appendChild(lienAppel);
      remplirLienTelephone(lienAppel);
      $('btn-protec-retour').focus();
    });
    liste.appendChild(inco);
    zone.appendChild(liste);
    var premier = liste.querySelector('.marque-vignette');
    if (premier) { premier.focus(); }
  }

  /** Étape 3 : conseils communs « avant de commencer / après ». */
  function rendreProtecConseils() {
    var zone = $('protec-contenu');
    vider(zone);
    zone.appendChild(el('p', { 'class': 'protec-question', text: 'Pour finir, quelques conseils' }));
    var ul = el('ul', { 'class': 'protec-conseils' });
    normaliserProtectionContenu().conseils.forEach(function (t) { ul.appendChild(el('li', { text: t })); });
    zone.appendChild(ul);
    $('btn-fermer-protec').focus();
  }

  function ouvrirProtection() {
    var d = $('dialog-protec');
    protecVue = 'marques';
    rendreProtecMarques();
    ouvrirDialog(d);
    var premier = d.querySelector('.marque-vignette');
    if (premier) { premier.focus(); }
  }

  function initProtection() {
    var d = $('dialog-protec');
    $('btn-fermer-protec').addEventListener('click', function () {
      fermerDialog(d);
      var tuile = document.querySelector('.tuile-protec');
      if (tuile) { tuile.focus(); }
    });
    $('btn-protec-retour').addEventListener('click', function () {
      if (protecVue === 'etapes' || protecVue === 'conseils' || protecVue === 'inconnu') {
        protecVue = 'marques';
        rendreProtecMarques();
      }
    });
    // Échap (cancel natif) : le focus revient sur la tuile
    d.addEventListener('close', function () {
      var tuile = document.querySelector('.tuile-protec');
      if (tuile && document.activeElement === document.body) { tuile.focus(); }
    });
  }

  /* ------------------------------------------------------------------
     Accès au mode technicien : appui long sur le titre, puis code PIN
     ------------------------------------------------------------------ */

  function initAppuiLong() {
    var titre = $('titre');
    var minuteur = null;
    function demarrer(ev) {
      if (ev.type === 'pointerdown' && ev.button !== 0) { return; }
      annuler();
      minuteur = setTimeout(function () { minuteur = null; demanderPin(); }, DUREE_APPUI_LONG);
    }
    function annuler() { if (minuteur) { clearTimeout(minuteur); minuteur = null; } }
    titre.addEventListener('pointerdown', demarrer);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { titre.addEventListener(n, annuler); });
    // Empêche le menu contextuel sur appui long tactile
    titre.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  }

  function demanderPin() {
    var d = $('dialog-pin');
    $('champ-pin').value = '';
    // Config sans pinHash : aucun code ne sera jamais accepté — on le dit
    // tout de suite au lieu de laisser le technicien chercher un code qui
    // n'existe pas.
    $('pin-erreur').textContent = config.pinHash ? ''
      : 'Aucun code n\'est configuré (pinHash absent de la configuration).';
    ouvrirDialog(d);
    $('champ-pin').focus();
  }

  /**
   * Vérification du code PIN, partagée entre le mode technicien et l'ajout
   * d'un site inconnu : même hachage, et le même ralentissement progressif
   * après chaque mauvaise réponse (1,5 s puis 3 s, 4,5 s… plafonné à 9 s).
   * ok() en cas de bon code, ko() sinon.
   */
  function verifierPin(saisie, ok, ko) {
    sha256(saisie).then(function (hash) {
      if (config.pinHash && hash === config.pinHash) {
        echecsPin = 0;
        ok();
      } else {
        echecsPin++;
        setTimeout(ko, Math.min(1500 * echecsPin, 9000));
      }
    });
  }

  function initPin() {
    var d = $('dialog-pin');
    $('btn-pin-annuler').addEventListener('click', function () { fermerDialog(d); });
    $('form-pin').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var saisie = $('champ-pin').value;
      $('pin-erreur').textContent = '';   // efface l'erreur précédente pendant la vérification
      if (!/^[0-9]{4}$/.test(saisie)) { $('pin-erreur').textContent = 'Saisissez 4 chiffres.'; return; }
      verifierPin(saisie, function () {
        fermerDialog(d);
        ouvrirModeTech();
      }, function () {
        $('pin-erreur').textContent = 'Code incorrect.';
        $('champ-pin').value = '';
        $('champ-pin').focus();
      });
    });
  }

  /* ------------------------------------------------------------------
     Personnalisation par la personne : couleurs et cases ajoutées.
     Tout reste local (localStorage, try/catch), rien n'est envoyé.
     ------------------------------------------------------------------ */

  /** Palette effective : choix de la personne, sinon celui de la config, sinon le défaut. */
  function paletteEffective() {
    var locale = paletteChoisie;
    return PALETTES.indexOf(locale) !== -1 ? locale : (config ? config.palette : PALETTE_DEFAUT);
  }

  /** Applique la palette au document. Le mode contraste élevé la recouvre toujours (ordre CSS). */
  function appliquerPalette(nom) {
    var html = document.documentElement;
    PALETTES.forEach(function (p) { html.classList.remove('palette-' + p); });
    if (nom !== PALETTE_DEFAUT && PALETTES.indexOf(nom) !== -1) { html.classList.add('palette-' + nom); }
  }

  function choisirPalette(nom) {
    paletteChoisie = PALETTES.indexOf(nom) === -1 ? '' : nom;
    ecrireStockage(CLE_PALETTE, paletteChoisie || null);   // null = retour à la config/défaut
    synchroniserIDB();
    appliquerPalette(paletteEffective());
    marquerPaletteCourante();
  }

  function marquerPaletteCourante() {
    var courante = paletteEffective();
    var liste = $('liste-palettes');
    if (!liste) { return; }
    Array.prototype.forEach.call(liste.children, function (carte) {
      carte.setAttribute('aria-pressed', carte.getAttribute('data-palette') === courante ? 'true' : 'false');
    });
  }

  function initPalette() {
    var d = $('dialog-palette');
    var liste = $('liste-palettes');
    PALETTES.forEach(function (nom) {
      // Chaque carte porte la classe de sa palette : ses propres variables CSS la décorent
      var carte = el('button', { type: 'button', 'class': 'palette-carte palette-' + nom,
        'data-palette': nom, 'aria-pressed': 'false' }, [
        el('span', { 'class': 'palette-apercu' }, [
          el('span', { 'class': 'palette-pastille' }),
          el('span', { 'class': 'palette-ligne' }),
          el('span', { 'class': 'palette-ligne palette-ligne-courte' })
        ]),
        el('span', { 'class': 'palette-nom', text: NOMS_PALETTES[nom] })
      ]);
      carte.addEventListener('click', function () { choisirPalette(nom); });
      liste.appendChild(carte);
    });
    $('lien-palette').addEventListener('click', function () { marquerPaletteCourante(); ouvrirDialog(d); $('btn-fermer-palette').focus(); });
    $('btn-fermer-palette').addEventListener('click', function () { fermerDialog(d); $('lien-palette').focus(); });
    $('btn-palette-defaut').addEventListener('click', function () { choisirPalette(''); });
  }

  /** Lit les cases ajoutées par la personne (stockage local, entrées invalides ignorées). */
  function chargerPerso() {
    try {
      var brut = lireStockage(CLE_PERSO);
      tuilesPerso = normaliserPerso(brut ? JSON.parse(brut) : []);
    } catch (e) { tuilesPerso = []; }
  }

  function sauvegarderPerso() {
    var liste = tuilesPerso.map(function (t) { return { label: t.label, url: t.url, icone: t.icone }; });
    synchroniserIDB();
    return ecrireStockage(CLE_PERSO, JSON.stringify(liste));
  }

  /** Vrai si cette adresse existe déjà (config ou cases ajoutées). */
  function adresseDejaPrise(url) {
    var cle = url.trim().toLowerCase().replace(/\/+$/, '');
    return config.tuiles.concat(tuilesPerso).some(function (t) {
      return t.url.toLowerCase().replace(/\/+$/, '') === cle;
    });
  }

  function ajouterPerso(label, url, icone) {
    if (tuilesPerso.length >= MAX_PERSO) { return 'maximum'; }
    if (adresseDejaPrise(url)) { return 'doublon'; }
    tuilesPerso.push({ id: 'perso-' + Date.now(), label: label.trim(), url: url.trim(),
      icone: iconeValide(icone) ? icone : ICONE_DEFAUT, couleur: '', groupe: GROUPE_PERSO });
    sauvegarderPerso();
    afficherTuiles();
    return '';
  }

  function retirerPerso(id) {
    tuilesPerso = tuilesPerso.filter(function (t) { return t.id !== id; });
    sauvegarderPerso();
    afficherTuiles();
  }

  /* ---------- Dialog « Ajouter un bouton » ---------- */

  var iconePersoSelectionnee = ICONE_DEFAUT;

  /** Remplit la grille de grosses vignettes d'icônes (liste blanche existante). */
  function remplirIcones() {
    var zone = $('liste-icones');
    vider(zone);
    ICONES.forEach(function (nom) {
      var b = el('button', { type: 'button', 'class': 'icone-vignette', role: 'radio',
        'aria-checked': nom === iconePersoSelectionnee ? 'true' : 'false',
        'aria-label': nom.replace('.svg', ''), 'data-icone': nom }, [creerIcone(nom, null)]);
      if (nom === iconePersoSelectionnee) { b.classList.add('choisie'); }
      b.addEventListener('click', function () {
        iconePersoSelectionnee = nom;
        remplirIcones();
      });
      zone.appendChild(b);
    });
  }

  function afficherZoneLibre(afficher) {
    $('ajout-zone-catalogue').hidden = afficher;
    $('ajout-zone-libre').hidden = !afficher;
    // « Fermer » reste visible dans les deux étapes : on ne piège jamais la personne
    if (afficher) { remplirIcones(); $('ajout-url').focus(); }
  }

  function erreurAjout(message) {
    $('ajout-erreur').textContent = message;
  }

  /** Ajoute la case et referme le dialog ; message en cas de refus (doublon, maximum). */
  function conclureAjout(label, url, icone) {
    var refus = ajouterPerso(label, url, icone);
    if (refus === 'maximum') {
      erreurAjout('Il y a déjà ' + MAX_PERSO + ' boutons ajoutés. Retirez-en un d\'abord (lien « Retirer mes boutons »).');
      return;
    }
    if (refus === 'doublon') {
      erreurAjout('Ce bouton existe déjà sur votre accueil.');
      return;
    }
    fermerDialog($('dialog-ajout'));
    afficherZoneLibre(false);
    $('ajout-url').value = '';
    $('ajout-nom').value = '';
    $('ajout-pin').hidden = true;
    var tuiles = document.querySelectorAll('.tuile');
    if (tuiles.length) { tuiles[tuiles.length - 1].focus(); }
  }

  /** Vérifie l'adresse saisie : reconnue → ajout ; inconnue → PIN du technicien exigé. */
  function tenterAjout() {
    var url = $('ajout-url').value.trim();
    var nom = $('ajout-nom').value.trim();
    var a = analyserUrl(url);
    if (!a.ok) {
      erreurAjout(a.vide ? 'Collez d\'abord l\'adresse du site.' : (a.erreur || 'Cette adresse n\'est pas lisible.') + ' Elle doit commencer par https://');
      $('ajout-url').focus();
      return;
    }
    if (!nomBoutonValide(nom)) {
      erreurAjout('Le nom du bouton doit faire 1 à 24 caractères : lettres, chiffres, espaces, tiret ou apostrophe.');
      $('ajout-nom').focus();
      return;
    }
    if (adresseDejaPrise(url)) {
      erreurAjout('Ce bouton existe déjà sur votre accueil.');
      return;
    }
    if (tuilesPerso.length >= MAX_PERSO) {
      erreurAjout('Il y a déjà ' + MAX_PERSO + ' boutons ajoutés. Retirez-en un d\'abord.');
      return;
    }
    var r = window.MONACCUEIL_VERIF.verifierAdresse(url, domainesReconnus(), config.raccourcisseurs);
    if (r.verdict === 'vert') {
      conclureAjout(nom, url, iconePersoSelectionnee);
      return;
    }
    // Adresse inconnue ou suspecte : ajout refusé tant que le technicien n'a pas saisi son PIN
    incrementerCompteur(CLE_STAT_REFUS);
    erreurAjout('Ce site n\'est pas dans la liste de confiance. Appelez-moi avant de l\'ajouter.');
    $('ajout-pin').hidden = false;
    $('champ-pin-ajout').value = '';
    $('champ-pin-ajout').focus();
  }

  function initAjout() {
    var d = $('dialog-ajout');
    // Étape A : le catalogue en un clic (ses domaines sont reconnus par le vérificateur)
    var liste = $('liste-catalogue');
    var familleCourante = null;
    catalogue().forEach(function (s) {
      var f = typeof s.famille === 'string' ? s.famille.trim() : '';
      if (f !== familleCourante) {
        familleCourante = f;
        if (f) { liste.appendChild(el('p', { 'class': 'catalogue-famille', text: f })); }
      }
      var b = el('button', { type: 'button', 'class': 'catalogue-carte' }, [
        creerIcone(s.icone, null),
        el('span', { 'class': 'catalogue-nom', text: s.label })
      ]);
      b.addEventListener('click', function () { conclureAjout(s.label, s.url, s.icone); });
      liste.appendChild(b);
    });
    $('lien-autre-site').hidden = config.ajoutParPersonne !== 'libre';
    $('lien-autre-site').addEventListener('click', function () { afficherZoneLibre(true); });
    $('btn-ajout-retour').addEventListener('click', function () { afficherZoneLibre(false); erreurAjout(''); });
    $('btn-ajouter').addEventListener('click', tenterAjout);
    // PIN du technicien pour un domaine inconnu : même mécanisme que le mode technicien
    $('btn-ajout-pin').addEventListener('click', function () {
      var saisie = $('champ-pin-ajout').value;
      if (!/^[0-9]{4}$/.test(saisie)) { erreurAjout('Saisissez les 4 chiffres du code.'); return; }
      verifierPin(saisie, function () {
        conclureAjout($('ajout-nom').value.trim(), $('ajout-url').value.trim(), iconePersoSelectionnee);
      }, function () {
        $('champ-pin-ajout').value = '';
        erreurAjout('Code incorrect. Appelez-moi.');
        $('champ-pin-ajout').focus();
      });
    });
    $('lien-ajout').addEventListener('click', function () {
      if (tuilesPerso.length >= MAX_PERSO) {
        window.alert('Vous avez déjà ' + MAX_PERSO + ' boutons ajoutés. Retirez-en un d\'abord (lien « Retirer mes boutons »).');
        return;
      }
      afficherZoneLibre(false);
      erreurAjout('');
      ouvrirDialog(d);
      $('btn-fermer-ajout').focus();
    });
    $('btn-fermer-ajout').addEventListener('click', function () {
      fermerDialog(d);
      afficherZoneLibre(false);
      if (persoLienAjout) { persoLienAjout.focus(); }
    });
    // Échap (cancel natif) : le focus revient aussi sur la tuile d'ajout
    d.addEventListener('close', function () {
      if (persoLienAjout && document.activeElement === document.body) { persoLienAjout.focus(); }
    });
  }

  function ouvrirRetrait() {
    var d = $('dialog-retrait');
    var liste = $('liste-retrait');
    vider(liste);
    if (!tuilesPerso.length) {
      liste.appendChild(el('li', { text: 'Aucun bouton ajouté pour le moment.' }));
    }
    tuilesPerso.forEach(function (t) {
      var retirer = el('button', { type: 'button', 'class': 'bouton', text: 'Retirer' });
      retirer.addEventListener('click', function () {
        if (window.confirm('Retirer le bouton « ' + t.label + ' » ?')) {
          retirerPerso(t.id);
          ouvrirRetrait();  // liste rafraîchie dans le même dialog
        }
      });
      liste.appendChild(el('li', null, [
        creerIcone(t.icone, null),
        el('span', { 'class': 'retrait-nom', text: t.label }),
        retirer
      ]));
    });
    ouvrirDialog(d);
    $('btn-fermer-retrait').focus();
  }

  function initRetrait() {
    $('lien-retrait').addEventListener('click', ouvrirRetrait);
    $('btn-fermer-retrait').addEventListener('click', function () {
      fermerDialog($('dialog-retrait'));
      if (persoActions && tuilesPerso.length) { persoActions.querySelector('#lien-retrait').focus(); }
    });
    $('dialog-retrait').addEventListener('close', function () {
      if (persoLienAjout && document.activeElement === document.body) {
        (tuilesPerso.length && persoActions ? persoActions.querySelector('#lien-retrait') : persoLienAjout).focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     Mode technicien
     ------------------------------------------------------------------ */

  function ouvrirModeTech() {
    brouillon = copieProfonde(config);
    ongletTech = 'config';
    chargerJournal();
    document.body.classList.add('mode-tech');
    $('panneau-tech').hidden = false;
    rendrePanneauTech();
    window.scrollTo(0, 0);
    var h = $('tech-titre');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  function quitterModeTech() {
    brouillon = null;
    journal = [];
    document.body.classList.remove('mode-tech');
    var p = $('panneau-tech');
    p.hidden = true;
    vider(p);
    window.scrollTo(0, 0);
    $('titre').focus();
  }

  function lireListeTexte(texte) {
    return texte.split(/[\n,;]+/).map(function (d) { return d.trim().toLowerCase(); }).filter(Boolean);
  }

  /* ------------------------------------------------------------------
     Numéros utiles (« Si je ne réponds pas ») : nom | numéro | détail.
     Schéma strict : nom 1-40 car., numéro en chiffres/espaces/+/- (≥ 2
     chiffres), détail ≤ 120 car. Entrées invalides ignorées, jamais 9e.
     ------------------------------------------------------------------ */

  function numeroValide(n) { return /^[0-9+().\-\s]{2,20}$/.test(String(n || '').trim()); }
  function numeroTel(n) { return 'tel:' + String(n).replace(/[^0-9+]/g, ''); }

  function normaliserNumero(u) {
    var nom = String(u && u.nom || '').trim();
    var numero = String(u && u.numero || '').trim();
    var detail = String(u && u.detail || '').trim();
    if (!nom || nom.length > 40 || !numeroValide(numero) || numero.replace(/\D/g, '').length < 2) { return null; }
    return { nom: nom, numero: numero, detail: detail.slice(0, 120) };
  }
  function listeNumeros(liste) {
    var out = [];
    (Array.isArray(liste) ? liste : []).forEach(function (u) {
      var n = normaliserNumero(u);
      if (n && out.length < 8) { out.push(n); }
    });
    return out;
  }

  /** Format texte « Nom | numéro | détail » par ligne (panneau technicien). */
  function lireNumerosTexte(texte) {
    return listeNumeros(texte.split('\n').map(function (l) {
      var m = l.split('|').map(function (s) { return s.trim(); });
      return { nom: m[0], numero: m[1], detail: m[2] };
    }));
  }
  function numerosTexte(liste) {
    return (liste || []).map(function (u) { return u.nom + ' | ' + u.numero + (u.detail ? ' | ' + u.detail : ''); }).join('\n');
  }

  /** Lit les champs du formulaire dans le brouillon (avant toute action). */
  function lireFormulaire() {
    var p = $('panneau-tech');
    brouillon.prenom = p.querySelector('[name="prenom"]').value.trim();
    brouillon.technicien.nom = p.querySelector('[name="tech-nom"]').value.trim();
    brouillon.technicien.telephone = p.querySelector('[name="tech-tel"]').value.trim();
    brouillon.aideDistance.actif = p.querySelector('[name="distance-actif"]').checked;
    brouillon.aideDistance.outil = p.querySelector('[name="distance-outil"]').value;
    brouillon.aideDistance.idRustdesk = p.querySelector('[name="distance-id"]').value.replace(/[^0-9]/g, '');
    brouillon.ouvertureSites = p.querySelector('[name="ouverture-sites"]').value;
    brouillon.ouvertureMobile = p.querySelector('[name="ouverture-mobile"]').value;
    brouillon.lienVisio = p.querySelector('[name="lien-visio"]').value.trim();
    brouillon.palette = p.querySelector('[name="palette-defaut"]').value;
    brouillon.ajoutParPersonne = p.querySelector('[name="ajout-personne"]').value;
    brouillon.protectionTelephone = p.querySelector('[name="protection-tel"]').checked;
    brouillon.domainesOfficiels = lireListeTexte(p.querySelector('[name="domaines"]').value);
    brouillon.raccourcisseurs = lireListeTexte(p.querySelector('[name="raccourcisseurs"]').value);
    brouillon.numerosUrgence = lireNumerosTexte(p.querySelector('[name="numeros-urgence"]').value);
    brouillon.arnaques = Array.prototype.map.call(p.querySelectorAll('.carte-arnaque'), function (carte) {
      return { titre: carte.querySelector('[name="arnaque-titre"]').value.trim(), texte: carte.querySelector('[name="arnaque-texte"]').value.trim() };
    });
    var cartes = p.querySelectorAll('.carte-tuile');
    Array.prototype.forEach.call(cartes, function (carte, i) {
      var t = brouillon.tuiles[i];
      if (!t) { return; }
      t.label = carte.querySelector('[name="label"]').value.trim();
      t.url = carte.querySelector('[name="url"]').value.trim();
      t.couleur = carte.querySelector('[name="couleur"]').value.toLowerCase();
      t.icone = carte.querySelector('[name="icone"]').value;
      t.groupe = carte.querySelector('[name="groupe"]').value;
    });
  }

  /** Vérifie le brouillon : retourne { erreurs: [], avertissements: [] }. */
  function validerBrouillon() {
    var erreurs = [], avertissements = [];
    // Prénom vide autorisé : la personne choisira elle-même au premier lancement
    if (brouillon.prenom && !prenomValide(brouillon.prenom)) {
      erreurs.push('Prénom : seulement des lettres, espaces, tiret ou apostrophe (30 caractères max).');
    }
    if (!brouillon.technicien.telephone) { erreurs.push('Le numéro de téléphone du technicien est vide.'); }
    if (OUVERTURES.indexOf(brouillon.ouvertureSites) === -1) { brouillon.ouvertureSites = 'fenetre'; }
    if (OUVERTURES_MOBILE.indexOf(brouillon.ouvertureMobile) === -1) { brouillon.ouvertureMobile = 'onglet'; }
    if (brouillon.lienVisio) {
      var av = analyserUrl(brouillon.lienVisio);
      if (!av.ok) { erreurs.push('Lien d\'appel vidéo : adresse illisible ou sans https (https://… obligatoire).'); }
      else if (!domaineOfficiel(av.hote, domainesReconnus())) { erreurs.push('Lien d\'appel vidéo : « ' + av.hote + ' » n\'est pas un domaine de la liste officielle.'); }
    }
    if (PALETTES.indexOf(brouillon.palette) === -1) { brouillon.palette = PALETTE_DEFAUT; }
    if (AJOUTS.indexOf(brouillon.ajoutParPersonne) === -1) { brouillon.ajoutParPersonne = 'libre'; }
    if (OUTILS_DISTANCE.indexOf(brouillon.aideDistance.outil) === -1) { brouillon.aideDistance.outil = 'quickassist'; }
    if (brouillon.aideDistance.actif && brouillon.aideDistance.outil === 'rustdesk' && !brouillon.aideDistance.idRustdesk) {
      avertissements.push('Aide à distance : l\'identifiant RustDesk du poste est vide (facultatif, mais pratique pour vous).');
    }
    [['Domaines officiels', brouillon.domainesOfficiels], ['Raccourcisseurs', brouillon.raccourcisseurs]].forEach(function (x) {
      x[1].forEach(function (d) {
        if (!domaineValide(d)) { erreurs.push(x[0] + ' : « ' + d + ' » n\'est pas un nom de domaine valide (sans http://, sans chemin).'); }
      });
    });
    // Numéros utiles : une ligne illisible bloque l'enregistrement plutôt que de disparaître en silence
    var lignesBrutes = $('panneau-tech').querySelector('[name="numeros-urgence"]').value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (lignesBrutes.length !== brouillon.numerosUrgence.length) {
      erreurs.push('Numéros utiles : au moins une ligne est illisible. Format attendu : « Nom | numéro | explication » (explication facultative), nom ≤ 40 caractères, numéro en chiffres.');
    }
    brouillon.arnaques.forEach(function (a, i) {
      if (!a.titre) { erreurs.push('Arnaque n°' + (i + 1) + ' : le titre est vide (supprimez-la ou donnez-lui un titre).'); }
      if (a.texte.length > LONGUEUR_MAX_ARNAQUE) { erreurs.push('Arnaque n°' + (i + 1) + ' : le texte dépasse ' + LONGUEUR_MAX_ARNAQUE + ' caractères.'); }
      else if ((a.texte.match(/[.!?](\s|$)/g) || []).length > 2) { avertissements.push('Arnaque n°' + (i + 1) + ' : plus de 2 phrases, pensez à raccourcir pour rester lisible.'); }
    });
    brouillon.tuiles.forEach(function (t, i) {
      var nom = t.label || ('Tuile n°' + (i + 1));
      if (!t.label) { erreurs.push('Tuile n°' + (i + 1) + ' : le libellé est vide.'); }
      if (!groupeValide(t.groupe)) { erreurs.push(nom + ' : la famille « ' + t.groupe + ' » n\'est pas valide (lettres, espaces, tiret, apostrophe).'); }
      var a = analyserUrl(t.url);
      if (a.vide) { avertissements.push(nom + ' : adresse vide, la tuile ne sera pas affichée.'); return; }
      if (!a.ok) { erreurs.push(nom + ' : ' + a.erreur + '.'); return; }
      if (!domaineOfficiel(a.hote, brouillon.domainesOfficiels)) {
        avertissements.push(nom + ' : le domaine « ' + a.hote + ' » n\'est pas dans la liste des domaines officiels connus. Vérifiez l\'adresse.');
      }
      if (!couleurValide(t.couleur)) { t.couleur = COULEUR_DEFAUT; }
      if (!iconeValide(t.icone)) { t.icone = ICONE_DEFAUT; }
    });
    return { erreurs: erreurs, avertissements: avertissements };
  }

  function afficherMessagesTech(messages, classe) {
    var zone = $('tech-messages');
    vider(zone);
    if (!messages.length) { return; }
    var ul = el('ul', { 'class': classe });
    messages.forEach(function (m) { ul.appendChild(el('li', { text: m })); });
    zone.appendChild(ul);
    zone.focus();
  }

  function telechargerFichier(nom, contenu, type) {
    var blob = new Blob([contenu], { type: type });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: nom });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function texteConfigJs(c) {
    return '/* Configuration embarquée de MonAccueil (copie de config.json pour l\'ouverture en file://).\n' +
      '   Fichier généré par le mode technicien : ne pas modifier à la main, préférez config.json. */\n' +
      'window.MONACCUEIL_CONFIG = ' + JSON.stringify(c, null, 2) + ';\n';
  }

  function enregistrerBrouillon() {
    lireFormulaire();
    var v = validerBrouillon();
    if (v.erreurs.length) {
      afficherMessagesTech(['Rien n\'a été enregistré. Corrigez :'].concat(v.erreurs), 'liste-erreurs');
      return;
    }
    config = copieProfonde(brouillon);
    var ok = ecrireStockage(CLE_CONFIG, JSON.stringify(config));
    afficherEntete();
    afficherTuiles();
    var msgs = [ok
      ? 'Enregistré et appliqué sur cet ordinateur. Pensez à exporter pour conserver une copie.'
      : 'Appliqué, mais impossible de mémoriser dans ce navigateur : exportez la configuration et remplacez les fichiers.'];
    afficherMessagesTech(msgs.concat(v.avertissements), v.avertissements.length ? 'avertissement' : 'confirmation');
  }

  function exporterConfig() {
    lireFormulaire();
    var v = validerBrouillon();
    if (v.erreurs.length) {
      afficherMessagesTech(['Export impossible. Corrigez :'].concat(v.erreurs), 'liste-erreurs');
      return;
    }
    // Les compteurs anonymes et la personnalisation locale sont joints dans des sections à part
    var exporte = copieProfonde(brouillon);
    exporte.statistiques = lireStatistiques();
    // Section séparée, jamais mélangée à « tuiles » : restaurée dans localStorage à l'import
    exporte.personnalisation = {
      palette: paletteChoisie,
      tuiles: tuilesPerso.map(function (t) { return { label: t.label, url: t.url, icone: t.icone }; }),
      protection: copieProfonde(protectionChoisie)
    };
    var json = JSON.stringify(exporte, null, 2) + '\n';
    telechargerFichier('config.json', json, 'application/json');
    // Le second téléchargement est légèrement différé pour que les navigateurs l'acceptent
    setTimeout(function () { telechargerFichier('config.js', texteConfigJs(exporte), 'text/javascript'); }, 400);
    afficherMessagesTech(['Deux fichiers téléchargés : config.json et config.js. Copiez-les tous les deux dans le dossier MonAccueil.'].concat(v.avertissements), v.avertissements.length ? 'avertissement' : 'confirmation');
  }

  /** Télécharge uniquement config.json (la configuration appliquée) pour la ranger chez le client. */
  function sauvegarderConfig() {
    var copie = copieProfonde(config);
    copie.personnalisation = {
      palette: paletteChoisie,
      tuiles: tuilesPerso.map(function (t) { return { label: t.label, url: t.url, icone: t.icone }; }),
      protection: copieProfonde(protectionChoisie)
    };
    telechargerFichier('config.json', JSON.stringify(copie, null, 2) + '\n', 'application/json');
    afficherMessagesTech(['Sauvegarde téléchargée : rangez ce config.json dans le dossier MonAccueil du client.'], 'confirmation');
  }

  var CONFIG_IMPORT_MAX_OCTETS = 1024 * 1024;

  function importerConfig(fichier) {
    if (!fichier) { return; }
    if (fichier.size > CONFIG_IMPORT_MAX_OCTETS) {
      afficherMessagesTech(['Import refusé : fichier trop volumineux (une configuration fait quelques Ko).'], 'liste-erreurs');
      return;
    }
    var lecteur = new FileReader();
    lecteur.onload = function () {
      try {
        var texte = String(lecteur.result);
        // Accepte aussi un config.js : on extrait l'objet JSON
        var debut = texte.indexOf('{');
        var fin = texte.lastIndexOf('}');
        if (debut === -1 || fin === -1) { throw new Error('Pas de JSON'); }
        var brut = JSON.parse(texte.slice(debut, fin + 1));
        var nouveau = normaliserConfig(brut);
        if (!nouveau.pinHash) { nouveau.pinHash = brouillon.pinHash; }
        brouillon = nouveau;
        // Section « personnalisation » : revalidée par le même schéma strict, jamais dans « tuiles »
        var notes = [];
        if (brut.personnalisation && typeof brut.personnalisation === 'object') {
          var p2 = brut.personnalisation;
          if (PALETTES.indexOf(p2.palette) !== -1) {
            paletteChoisie = p2.palette;
            ecrireStockage(CLE_PALETTE, p2.palette);
            appliquerPalette(paletteEffective());
            notes.push('Couleurs de la personne restaurées : ' + NOMS_PALETTES[p2.palette] + '.');
          }
          if (Array.isArray(p2.tuiles)) {
            tuilesPerso = normaliserPerso(p2.tuiles);
            sauvegarderPerso();
            afficherTuiles();
            notes.push('Boutons de la personne restaurés : ' + tuilesPerso.length + '.');
          }
          if (p2.protection) {
            var prt = normaliserProtectionEtat(p2.protection);
            if (prt.m) {
              protectionChoisie = prt;
              ecrireStockage(CLE_PROTECTION, JSON.stringify(prt));
              notes.push('Réglages « Protéger mon téléphone » restaurés : ' + prt.f.length + ' coché(s).');
            }
          }
          synchroniserIDB();
        }
        rendrePanneauTech();
        afficherMessagesTech(['Configuration importée. Vérifiez puis cliquez sur « Enregistrer et appliquer ».'].concat(notes), 'confirmation');
      } catch (e) {
        afficherMessagesTech(['Fichier illisible : ce n\'est pas une configuration MonAccueil valide.'], 'liste-erreurs');
      }
    };
    lecteur.onerror = function () { afficherMessagesTech(['Impossible de lire le fichier.'], 'liste-erreurs'); };
    lecteur.readAsText(fichier);
  }

  function changerPin() {
    var champ = $('tech-nouveau-pin');
    var val = champ.value;
    if (!/^[0-9]{4}$/.test(val)) { afficherMessagesTech(['Le nouveau code PIN doit comporter exactement 4 chiffres.'], 'liste-erreurs'); return; }
    sha256(val).then(function (hash) {
      brouillon.pinHash = hash;
      champ.value = '';
      afficherMessagesTech(['Nouveau code PIN prêt. Il sera actif après « Enregistrer et appliquer » (et dans l\'export).'], 'confirmation');
    });
  }

  function deplacerTuile(i, delta) {
    lireFormulaire();
    var j = i + delta;
    if (j < 0 || j >= brouillon.tuiles.length) { return; }
    var tmp = brouillon.tuiles[i];
    brouillon.tuiles[i] = brouillon.tuiles[j];
    brouillon.tuiles[j] = tmp;
    rendrePanneauTech();
    var carte = $('panneau-tech').querySelectorAll('.carte-tuile')[j];
    if (carte) { carte.querySelector('[name="label"]').focus(); }
  }

  function supprimerTuile(i) {
    lireFormulaire();
    var t = brouillon.tuiles[i];
    if (!window.confirm('Supprimer la tuile « ' + (t.label || 'sans nom') + ' » ?')) { return; }
    brouillon.tuiles.splice(i, 1);
    rendrePanneauTech();
    afficherMessagesTech(['Tuile supprimée (pensez à enregistrer).'], 'confirmation');
  }

  function ajouterTuile() {
    lireFormulaire();
    brouillon.tuiles.push({ id: 'tuile-' + Date.now(), label: '', url: 'https://', icone: ICONE_DEFAUT, couleur: COULEUR_DEFAUT, groupe: '' });
    rendrePanneauTech();
    var cartes = $('panneau-tech').querySelectorAll('.carte-tuile');
    var derniere = cartes[cartes.length - 1];
    if (derniere) { derniere.scrollIntoView(); derniere.querySelector('[name="label"]').focus(); }
  }

  function ajouterArnaque() {
    lireFormulaire();
    brouillon.arnaques.push({ titre: '', texte: '' });
    rendrePanneauTech();
    var cartes = $('panneau-tech').querySelectorAll('.carte-arnaque');
    var derniere = cartes[cartes.length - 1];
    if (derniere) { derniere.scrollIntoView(); derniere.querySelector('[name="arnaque-titre"]').focus(); }
  }

  function supprimerArnaque(i) {
    lireFormulaire();
    var a = brouillon.arnaques[i];
    if (!window.confirm('Supprimer l\'arnaque « ' + (a.titre || 'sans titre') + ' » ?')) { return; }
    brouillon.arnaques.splice(i, 1);
    rendrePanneauTech();
    afficherMessagesTech(['Arnaque supprimée (pensez à enregistrer).'], 'confirmation');
  }

  /** Construit une carte d'édition pour une arnaque du moment (titre + 2 phrases max). */
  function creerCarteArnaque(a, i) {
    var idBase = 'arnaque-' + i + '-';
    var carte = el('div', { 'class': 'carte-tuile carte-arnaque' });
    carte.style.setProperty('--couleur', COULEUR_BIZARRE);
    var champs = el('div', { 'class': 'champs' });
    champs.appendChild(el('label', { 'for': idBase + 'titre' }, ['Titre',
      el('input', { id: idBase + 'titre', name: 'arnaque-titre', type: 'text', value: a.titre, maxlength: '80', autocomplete: 'off' })]));
    champs.appendChild(el('label', { 'for': idBase + 'texte' }, ['Explication (2 phrases maximum)',
      el('textarea', { id: idBase + 'texte', name: 'arnaque-texte', maxlength: String(LONGUEUR_MAX_ARNAQUE), rows: '3' }, [a.texte])]));
    carte.appendChild(champs);
    var supprimer = el('button', { type: 'button', 'class': 'bouton', text: 'Supprimer', 'aria-label': 'Supprimer l\'arnaque ' + (a.titre || i + 1) });
    supprimer.addEventListener('click', function () { supprimerArnaque(i); });
    carte.appendChild(el('div', { 'class': 'barre' }, [supprimer]));
    return carte;
  }

  function reinitialiserConfig() {
    if (!window.confirm('Oublier les modifications faites sur cet ordinateur et revenir au fichier de configuration d\'origine ?')) { return; }
    ecrireStockage(CLE_CONFIG, null);
    chargerConfig().then(function (c) {
      config = c;
      brouillon = copieProfonde(config);
      afficherEntete();
      afficherTuiles();
      rendrePanneauTech();
      afficherMessagesTech(['Configuration d\'origine rechargée.'], 'confirmation');
    });
  }

  /** Construit une carte d'édition pour une tuile. */
  function creerCarteTuile(t, i, total) {
    var carte = el('div', { 'class': 'carte-tuile' });
    carte.style.setProperty('--couleur', t.couleur);
    var idBase = 'tuile-' + i + '-';

    carte.appendChild(el('div', { 'class': 'apercu' }, [
      creerIcone(t.icone, t.couleur),
      el('span', { text: 'Tuile n°' + (i + 1) + (t.label ? ' : ' + t.label : '') })
    ]));

    var champs = el('div', { 'class': 'champs' });
    champs.appendChild(el('label', { 'for': idBase + 'label' }, ['Libellé',
      el('input', { id: idBase + 'label', name: 'label', type: 'text', value: t.label, maxlength: '40', autocomplete: 'off' })]));
    champs.appendChild(el('label', { 'for': idBase + 'url' }, ['Adresse (https://…)',
      el('input', { id: idBase + 'url', name: 'url', type: 'url', value: t.url, placeholder: 'https://www.exemple.fr', autocomplete: 'off', spellcheck: 'false' })]));
    champs.appendChild(el('label', { 'for': idBase + 'couleur' }, ['Couleur',
      el('input', { id: idBase + 'couleur', name: 'couleur', type: 'color', value: couleurValide(t.couleur) ? t.couleur : COULEUR_DEFAUT })]));
    var select = el('select', { id: idBase + 'icone', name: 'icone' });
    ICONES.forEach(function (ic) {
      var opt = el('option', { value: ic, text: ic.replace('.svg', '') });
      if (ic === t.icone) { opt.selected = true; }
      select.appendChild(opt);
    });
    champs.appendChild(el('label', { 'for': idBase + 'icone' }, ['Icône', select]));
    var selGroupe = el('select', { id: idBase + 'groupe', name: 'groupe' });
    [['', 'Automatique (selon la tuile)']].concat(ORDRE_GROUPES.map(function (g) { return [g, g]; })).forEach(function (o) {
      var opt = el('option', { value: o[0], text: o[1] });
      if (o[0] === t.groupe) { opt.selected = true; }
      selGroupe.appendChild(opt);
    });
    if (t.groupe && ORDRE_GROUPES.indexOf(t.groupe) === -1) {
      var autre = el('option', { value: t.groupe, text: t.groupe });
      autre.selected = true;
      selGroupe.appendChild(autre);
    }
    champs.appendChild(el('label', { 'for': idBase + 'groupe' }, ['Famille', selGroupe]));
    carte.appendChild(champs);

    // Avertissement en direct sur l'adresse
    var avert = el('p', { 'class': 'avertissement', 'aria-live': 'polite' });
    carte.appendChild(avert);
    function verifierUrl() {
      var a = analyserUrl(champs.querySelector('[name="url"]').value.trim());
      if (a.vide) { avert.textContent = 'Adresse vide : la tuile ne sera pas affichée.'; }
      else if (!a.ok) { avert.textContent = a.erreur + '.'; }
      else if (!domaineOfficiel(a.hote, brouillon.domainesOfficiels)) { avert.textContent = 'Attention : « ' + a.hote + ' » n\'est pas dans la liste des domaines officiels connus.'; }
      else { avert.textContent = ''; }
    }
    champs.querySelector('[name="url"]').addEventListener('input', verifierUrl);
    verifierUrl();
    // Aperçu de l'icône et de la couleur en direct
    select.addEventListener('change', function () {
      remplacerIcone(carte.querySelector('.apercu .icone'), select.value, champs.querySelector('[name="couleur"]').value);
    });
    champs.querySelector('[name="couleur"]').addEventListener('input', function (ev) {
      carte.style.setProperty('--couleur', ev.target.value);
      carte.querySelector('.apercu .icone').style.setProperty('--couleur', ev.target.value);
    });

    var barre = el('div', { 'class': 'barre' });
    var monter = el('button', { type: 'button', 'class': 'bouton', text: '▲ Monter', 'aria-label': 'Monter la tuile ' + (t.label || i + 1) });
    monter.disabled = i === 0;
    monter.addEventListener('click', function () { deplacerTuile(i, -1); });
    var descendre = el('button', { type: 'button', 'class': 'bouton', text: '▼ Descendre', 'aria-label': 'Descendre la tuile ' + (t.label || i + 1) });
    descendre.disabled = i === total - 1;
    descendre.addEventListener('click', function () { deplacerTuile(i, 1); });
    var supprimer = el('button', { type: 'button', 'class': 'bouton', text: 'Supprimer', 'aria-label': 'Supprimer la tuile ' + (t.label || i + 1) });
    supprimer.addEventListener('click', function () { supprimerTuile(i); });
    barre.appendChild(monter); barre.appendChild(descendre); barre.appendChild(supprimer);
    carte.appendChild(barre);
    return carte;
  }

  /** (Re)construit tout le panneau technicien à partir du brouillon. */
  function rendrePanneauTech() {
    var panneau = $('panneau-tech');
    vider(panneau);

    var quitter = el('button', { type: 'button', 'class': 'bouton bouton-principal', text: 'Quitter le mode technicien' });
    quitter.addEventListener('click', quitterModeTech);
    panneau.appendChild(el('div', { 'class': 'barre' }, [
      el('h1', { id: 'tech-titre', text: 'Mode technicien' }), quitter
    ]));

    // Zone de messages (erreurs, confirmations), commune aux deux onglets
    panneau.appendChild(el('div', { id: 'tech-messages', tabindex: '-1', 'aria-live': 'polite' }));

    // Onglets : Configuration (le brouillon) et Journal (vos interventions)
    var onglets = el('div', { 'class': 'onglets', role: 'tablist', 'aria-label': 'Sections du mode technicien' });
    [['config', 'Configuration'], ['journal', 'Journal des interventions']].forEach(function (o) {
      var b = el('button', { type: 'button', 'class': 'bouton onglet', role: 'tab', id: 'onglet-' + o[0], text: o[1],
        'aria-selected': ongletTech === o[0] ? 'true' : 'false', 'aria-controls': 'tech-onglet-' + o[0] });
      b.addEventListener('click', function () { ongletTech = o[0]; rendrePanneauTech(); $('onglet-' + o[0]).focus(); });
      onglets.appendChild(b);
    });
    panneau.appendChild(onglets);

    var p = el('div', { id: 'tech-onglet-config', role: 'tabpanel', 'aria-labelledby': 'onglet-config' });
    p.hidden = ongletTech !== 'config';
    panneau.appendChild(p);
    var pj = el('div', { id: 'tech-onglet-journal', role: 'tabpanel', 'aria-labelledby': 'onglet-journal' });
    pj.hidden = ongletTech !== 'journal';
    panneau.appendChild(pj);
    rendreJournal(pj);

    p.appendChild(el('p', { text: 'Modifiez, puis cliquez sur « Enregistrer et appliquer ». Exportez ensuite la configuration pour en garder une copie dans le dossier MonAccueil.' }));

    // Barre d'actions principales
    var enregistrer = el('button', { type: 'button', 'class': 'bouton bouton-principal', text: 'Enregistrer et appliquer' });
    enregistrer.addEventListener('click', enregistrerBrouillon);
    var exporter = el('button', { type: 'button', 'class': 'bouton', text: 'Exporter la configuration' });
    exporter.addEventListener('click', exporterConfig);
    var champImport = el('input', { type: 'file', id: 'tech-import', accept: '.json,.js,application/json,text/javascript', 'class': 'visuellement-cache', 'aria-label': 'Choisir un fichier de configuration à importer' });
    champImport.addEventListener('change', function () { importerConfig(champImport.files[0]); champImport.value = ''; });
    var importer = el('button', { type: 'button', 'class': 'bouton', text: 'Importer une configuration' });
    importer.addEventListener('click', function () { champImport.click(); });
    var sauvegarde = el('button', { type: 'button', 'class': 'bouton', text: 'Sauvegarde de cette configuration' });
    sauvegarde.addEventListener('click', sauvegarderConfig);
    var reinit = el('button', { type: 'button', 'class': 'bouton', text: 'Revenir au fichier d\'origine' });
    reinit.addEventListener('click', reinitialiserConfig);
    p.appendChild(el('div', { 'class': 'barre' }, [enregistrer, exporter, importer, champImport, sauvegarde, reinit]));

    // Informations générales
    p.appendChild(el('h2', { text: 'Informations générales' }));
    var general = el('div', { 'class': 'champs' });
    general.appendChild(el('label', { 'for': 'tech-prenom' }, ['Prénom de la personne (laissez vide : elle choisira elle-même)',
      el('input', { id: 'tech-prenom', name: 'prenom', type: 'text', value: brouillon.prenom, maxlength: '40', autocomplete: 'off' })]));
    general.appendChild(el('label', { 'for': 'tech-nom' }, ['Nom du technicien',
      el('input', { id: 'tech-nom', name: 'tech-nom', type: 'text', value: brouillon.technicien.nom, maxlength: '60', autocomplete: 'off' })]));
    general.appendChild(el('label', { 'for': 'tech-tel' }, ['Téléphone du technicien',
      el('input', { id: 'tech-tel', name: 'tech-tel', type: 'tel', value: brouillon.technicien.telephone, maxlength: '30', autocomplete: 'off' })]));
    p.appendChild(general);

    // Prénom choisi par la personne (stockage local séparé, jamais dans config.json)
    var lignePrenom = el('p', { 'class': 'discret', id: 'tech-prenom-choisi' });
    var btnEffacerPrenom = el('button', { type: 'button', 'class': 'bouton', text: 'Effacer le prénom choisi' });
    btnEffacerPrenom.addEventListener('click', function () {
      ecrireStockage(CLE_PRENOM, null);
      ecrireStockage(CLE_PRENOM_PLUSTARD, null);
      synchroniserIDB();
      prenomChoisi = '';
      afficherEntete();
      afficherMessagesTech(['Prénom choisi effacé : « Bonjour » seul s\'affiche, ou le prénom de la config.'], 'confirmation');
      btnEffacerPrenom.disabled = true;
      lignePrenom.textContent = 'Prénom choisi par la personne sur ce PC : aucun.';
    });
    lignePrenom.textContent = 'Prénom choisi par la personne sur ce PC : ' + (prenomChoisi ? '« ' + majusculeInitiale(prenomChoisi) + ' » (prioritaire sur le prénom ci-dessus, jamais exporté).' : 'aucun.');
    btnEffacerPrenom.disabled = !prenomChoisi;
    p.appendChild(el('div', { 'class': 'barre' }, [lignePrenom, btnEffacerPrenom]));

    // Ouverture des sites
    var selOuverture = el('select', { id: 'tech-ouverture', name: 'ouverture-sites' });
    [['fenetre', 'Dans une fenêtre à droite (l\'accueil reste visible) — recommandé'], ['onglet', 'Dans un nouvel onglet']].forEach(function (o) {
      var opt = el('option', { value: o[0], text: o[1] });
      if (o[0] === brouillon.ouvertureSites) { opt.selected = true; }
      selOuverture.appendChild(opt);
    });
    var selOuvertureMobile = el('select', { id: 'tech-ouverture-mobile', name: 'ouverture-mobile' });
    [['onglet', 'Dans un nouvel onglet (l\'application officielle peut s\'ouvrir) — recommandé'],
     ['memeOnglet', 'Dans le même onglet (la flèche retour du téléphone ramène ici)']].forEach(function (o) {
      var opt = el('option', { value: o[0], text: o[1] });
      if (o[0] === brouillon.ouvertureMobile) { opt.selected = true; }
      selOuvertureMobile.appendChild(opt);
    });
    p.appendChild(el('div', { 'class': 'champs' }, [
      el('label', { 'for': 'tech-ouverture' }, ['Quand on clique un bouton, le site s\'ouvre', selOuverture]),
      el('label', { 'for': 'tech-ouverture-mobile' }, ['Sur téléphone, le site s\'ouvre', selOuvertureMobile]),
      el('label', { 'for': 'tech-visio' }, ['Lien d\'appel vidéo sur téléphone (facultatif, https, domaine de la liste officielle)',
        el('input', { id: 'tech-visio', name: 'lien-visio', type: 'text', value: brouillon.lienVisio || '', placeholder: 'https://…' })])]));

    // Couleurs par défaut et règle d'ajout de boutons par la personne
    var selPalette = el('select', { id: 'tech-palette', name: 'palette-defaut' });
    PALETTES.forEach(function (nom) {
      var opt = el('option', { value: nom, text: NOMS_PALETTES[nom] + (nom === PALETTE_DEFAUT ? ' (couleurs d\'origine)' : '') });
      if (nom === brouillon.palette) { opt.selected = true; }
      selPalette.appendChild(opt);
    });
    var selAjout = el('select', { id: 'tech-ajout', name: 'ajout-personne' });
    [['catalogue', 'Oui, uniquement dans la liste proposée — recommandé'],
     ['libre', 'Oui, y compris une autre adresse (votre code exigé si elle est inconnue)'],
     ['non', 'Non, jamais']].forEach(function (o) {
      var opt = el('option', { value: o[0], text: o[1] });
      if (o[0] === brouillon.ajoutParPersonne) { opt.selected = true; }
      selAjout.appendChild(opt);
    });
    var caseProtec = el('input', { id: 'tech-protec', name: 'protection-tel', type: 'checkbox' });
    caseProtec.checked = brouillon.protectionTelephone !== false;
    p.appendChild(el('div', { 'class': 'champs' }, [
      el('label', { 'for': 'tech-palette' }, ['Couleurs proposées par défaut', selPalette]),
      el('label', { 'for': 'tech-ajout' }, ['La personne peut ajouter des boutons', selAjout]),
      el('label', { 'for': 'tech-protec', 'class': 'ligne' }, [caseProtec, 'Afficher la tuile « Protéger mon téléphone »'])]));

    // Personnalisation locale de la personne (lecture seule) : couleurs et cases ajoutées
    p.appendChild(el('h2', { text: 'Personnalisation de la personne' }));
    var lignesPerso = [el('p', { 'class': 'discret', text: 'Couleurs choisies sur ce PC : ' + (paletteChoisie ? NOMS_PALETTES[paletteChoisie] : 'aucune (celles de la config)') + '.' })];
    // Étapes « Protéger mon téléphone » cochées sur ce poste (lecture seule)
    if (protectionChoisie.m) {
      var mChoisie = marqueParId(protectionChoisie.m);
      if (mChoisie) {
        var libelles = mChoisie.etapes.map(function (e) {
          return (protectionChoisie.f.indexOf(e.id) !== -1 ? '✓ ' : '· ') + e.action;
        });
        var ulProtec = el('ul');
        libelles.forEach(function (t) { ulProtec.appendChild(el('li', { text: t })); });
        lignesPerso.push(el('p', { 'class': 'discret', text: 'Protéger mon téléphone (' + mChoisie.nom + ') : ' +
          protectionChoisie.f.length + ' réglage(s) coché(s) sur ' + mChoisie.etapes.length + ' — détails ci-dessous.' }));
        lignesPerso.push(ulProtec);
      }
    }
    if (tuilesPerso.length) {
      var ulPerso = el('ul');
      tuilesPerso.forEach(function (t) { ulPerso.appendChild(el('li', { text: t.label + ' — ' + t.url })); });
      lignesPerso.push(el('p', { 'class': 'discret', text: 'Boutons ajoutés par la personne (' + tuilesPerso.length + ') :' }));
      lignesPerso.push(ulPerso);
    } else {
      lignesPerso.push(el('p', { 'class': 'discret', text: 'Boutons ajoutés par la personne : aucun.' }));
    }
    lignesPerso.forEach(function (n) { p.appendChild(n); });
    var btnEffacerPerso = el('button', { type: 'button', 'class': 'bouton', text: 'Effacer la personnalisation' });
    btnEffacerPerso.addEventListener('click', function () {
      if (!window.confirm('Effacer les couleurs choisies et les boutons ajoutés par la personne ?')) { return; }
      ecrireStockage(CLE_PALETTE, null);
      ecrireStockage(CLE_PERSO, null);
      paletteChoisie = '';
      tuilesPerso = [];
      synchroniserIDB();
      appliquerPalette(paletteEffective());
      afficherTuiles();
      afficherMessagesTech(['Personnalisation effacée : couleurs d\'origine et boutons ajoutés retirés.'], 'confirmation');
      rendrePanneauTech();
    });
    btnEffacerPerso.disabled = !paletteChoisie && !tuilesPerso.length;
    p.appendChild(el('div', { 'class': 'barre' }, [btnEffacerPerso]));

    // Lien personnel : restaure prénom + couleurs + boutons via le fragment
    // d'URL (#p=…), jamais envoyé au serveur. À définir en page d'accueil.
    p.appendChild(el('h2', { text: 'Lien personnel' }));
    p.appendChild(el('p', { 'class': 'discret', text: 'Ce lien contient son prénom et ses boutons : rangez-le dans son dossier client, et ne le postez nulle part en public.' }));
    var casePrenomLien = el('input', { id: 'tech-lien-prenom', type: 'checkbox' });
    casePrenomLien.checked = true;
    var champLien = el('input', { id: 'tech-lien-perso', type: 'text', readonly: 'readonly', 'aria-label': 'Lien personnel généré' });
    var btnGenerer = el('button', { type: 'button', 'class': 'bouton', text: 'Générer le lien personnel de cette personne' });
    var btnCopierLien = el('button', { type: 'button', 'class': 'bouton', text: 'Copier', hidden: true });
    btnGenerer.addEventListener('click', function () {
      champLien.value = genererLienPersonnel(casePrenomLien.checked);
      btnCopierLien.hidden = false;
      afficherMessagesTech(['Lien généré : définissez-le comme page d\'accueil et favori sur l\'ordinateur de la personne.'], 'confirmation');
    });
    btnCopierLien.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(champLien.value).then(function () {
          afficherMessagesTech(['Lien copié.'], 'confirmation');
        }).catch(function () { champLien.select(); });
      } else { champLien.select(); }
    });
    p.appendChild(el('div', { 'class': 'champs' }, [
      el('label', { 'for': 'tech-lien-prenom', 'class': 'ligne' }, [casePrenomLien, 'Inclure le prénom'])]));
    p.appendChild(el('div', { 'class': 'lien-personnel' }, [btnGenerer, champLien, btnCopierLien]));

    // Diagnostic du stockage : état réel des deux moteurs de mémorisation
    p.appendChild(el('h2', { text: 'Diagnostic du stockage' }));
    var dl = el('dl', { 'class': 'diag-stockage' });
    function ligneDiag(nom, valeur) {
      dl.appendChild(el('dt', { text: nom }));
      return dl.appendChild(el('dd', { text: valeur }));
    }
    ligneDiag('localStorage', stockageOK ? 'disponible (écriture, lecture, suppression testées)' : 'indisponible ou bloqué');
    ligneDiag('IndexedDB', idbDisponible ? 'disponible' : 'indisponible');
    ligneDiag('Mode d\'affichage', (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'installé (standalone)' : 'onglet du navigateur');
    ligneDiag('Origine', location.origin === 'null' ? 'fichier local (file://)' : location.origin);
    ligneDiag('Lien personnel', lienPersonnelVu ? 'un lien #p= était présent au chargement' : 'aucun lien #p= au chargement');
    var ddPersist = ligneDiag('Mémorisation garantie', 'vérification…');
    var ddQuota = ligneDiag('Espace utilisé', 'vérification…');
    try {
      if (navigator.storage && navigator.storage.persisted) {
        navigator.storage.persisted().then(function (oui) {
          ddPersist.textContent = oui ? 'oui (le navigateur ne l\'efface pas tout seul)' : 'non (le navigateur peut l\'effacer)';
        }).catch(function () { ddPersist.textContent = 'inconnu'; });
      } else { ddPersist.textContent = 'non vérifiable sur ce navigateur'; }
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (e) {
          var util = Math.round((e.usage || 0) / 1024);
          var quota = e.quota ? Math.round(e.quota / (1024 * 1024)) : 0;
          ddQuota.textContent = quota ? util + ' Ko utilisés sur ' + quota + ' Mo' : util + ' Ko utilisés';
        }).catch(function () { ddQuota.textContent = 'inconnu'; });
      } else { ddQuota.textContent = 'non vérifiable sur ce navigateur'; }
    } catch (e) { /* silencieux */ }
    p.appendChild(dl);

    // Aide à distance
    p.appendChild(el('h2', { text: 'Aide à distance' }));
    p.appendChild(el('p', { text: 'Le client vous appelle, lance le raccourci Bureau « Aide à distance » et accepte la connexion. Aucun accès caché ni permanent. Le raccourci lit ce réglage dans config.json : exportez après modification.' }));
    var distance = el('div', { 'class': 'champs' });
    var caseActif = el('input', { id: 'tech-distance-actif', name: 'distance-actif', type: 'checkbox' });
    caseActif.checked = brouillon.aideDistance.actif;
    distance.appendChild(el('label', { 'for': 'tech-distance-actif', 'class': 'ligne' }, [caseActif, 'Afficher la tuile « Aide à distance »']));
    var selOutil = el('select', { id: 'tech-distance-outil', name: 'distance-outil' });
    [['quickassist', 'Assistance rapide Windows (Quick Assist)'], ['rustdesk', 'RustDesk']].forEach(function (o) {
      var opt = el('option', { value: o[0], text: o[1] });
      if (o[0] === brouillon.aideDistance.outil) { opt.selected = true; }
      selOutil.appendChild(opt);
    });
    distance.appendChild(el('label', { 'for': 'tech-distance-outil' }, ['Outil', selOutil]));
    distance.appendChild(el('label', { 'for': 'tech-distance-id' }, ['Identifiant RustDesk du poste (chiffres, facultatif)',
      el('input', { id: 'tech-distance-id', name: 'distance-id', type: 'text', inputmode: 'numeric', value: brouillon.aideDistance.idRustdesk, maxlength: '12', autocomplete: 'off' })]));
    p.appendChild(distance);

    // Code PIN
    p.appendChild(el('h2', { text: 'Code PIN du mode technicien' }));
    var pinBarre = el('div', { 'class': 'barre' });
    pinBarre.appendChild(el('label', { 'for': 'tech-nouveau-pin' }, ['Nouveau code (4 chiffres)',
      el('input', { id: 'tech-nouveau-pin', type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: 'off' })]));
    var btnPin = el('button', { type: 'button', 'class': 'bouton', text: 'Changer le code PIN' });
    btnPin.addEventListener('click', changerPin);
    pinBarre.appendChild(btnPin);
    p.appendChild(pinBarre);

    // Tuiles
    p.appendChild(el('h2', { text: 'Tuiles (' + brouillon.tuiles.length + ')' }));
    var conteneur = el('div');
    brouillon.tuiles.forEach(function (t, i) { conteneur.appendChild(creerCarteTuile(t, i, brouillon.tuiles.length)); });
    p.appendChild(conteneur);
    var ajouter = el('button', { type: 'button', 'class': 'bouton', text: '+ Ajouter une tuile' });
    ajouter.addEventListener('click', ajouterTuile);
    p.appendChild(el('div', { 'class': 'barre' }, [ajouter]));

    // Domaines officiels
    p.appendChild(el('h2', { text: 'Domaines officiels connus' }));
    p.appendChild(el('p', { text: 'Un domaine par ligne. Une tuile dont l\'adresse n\'est pas dans cette liste déclenche un avertissement (mais reste autorisée).' }));
    p.appendChild(el('label', { 'for': 'tech-domaines' }, ['Liste des domaines',
      el('textarea', { id: 'tech-domaines', name: 'domaines', spellcheck: 'false' }, [brouillon.domainesOfficiels.join('\n')])]));

    // "Un message me paraît bizarre"
    p.appendChild(el('h2', { text: 'Tuile « Un message me paraît bizarre »' }));
    var stats = lireStatistiques();
    p.appendChild(el('p', { text: 'Statistiques sur cet ordinateur (aucune adresse n\'est conservée) : ' + stats.verifications +
      ' vérification(s) d\'adresse, dont ' + stats.rouges + ' résultat(s) rouge(s), et ' + stats.refus +
      ' ajout(s) de bouton refusé(s) par le vérificateur. Elles sont jointes à l\'export dans la section « statistiques ».' }));
    p.appendChild(el('h3', { text: 'Arnaques du moment (' + brouillon.arnaques.length + ')' }));
    p.appendChild(el('p', { text: 'Un titre et deux phrases maximum par arnaque, en langage simple. Mettez à jour la liste à chaque visite.' }));
    var conteneurArnaques = el('div');
    brouillon.arnaques.forEach(function (a, i) { conteneurArnaques.appendChild(creerCarteArnaque(a, i)); });
    p.appendChild(conteneurArnaques);
    var ajouterArn = el('button', { type: 'button', 'class': 'bouton', text: '+ Ajouter une arnaque' });
    ajouterArn.addEventListener('click', ajouterArnaque);
    p.appendChild(el('div', { 'class': 'barre' }, [ajouterArn]));
    p.appendChild(el('h3', { text: 'Raccourcisseurs d\'adresses connus' }));
    p.appendChild(el('p', { text: 'Un domaine par ligne. Une adresse de ce type est toujours signalée en rouge : impossible de savoir où elle mène.' }));
    p.appendChild(el('label', { 'for': 'tech-raccourcisseurs' }, ['Liste des raccourcisseurs',
      el('textarea', { id: 'tech-raccourcisseurs', name: 'raccourcisseurs', spellcheck: 'false' }, [brouillon.raccourcisseurs.join('\n')])]));

    // Numéros utiles affichés dans la fenêtre d'aide (« Si je ne réponds pas »)
    p.appendChild(el('h3', { text: 'Numéros utiles (« Si je ne réponds pas »)' }));
    p.appendChild(el('p', { text: 'Un numéro par ligne : « Nom | numéro | explication courte ». Exemple : Info Escroqueries | 0 805 805 817 | « Mon message est-il une arnaque ? »' }));
    p.appendChild(el('label', { 'for': 'tech-urgences' }, ['Liste des numéros',
      el('textarea', { id: 'tech-urgences', name: 'numeros-urgence', spellcheck: 'false' }, [numerosTexte(brouillon.numerosUrgence)])]));

    var quitterBas = el('button', { type: 'button', 'class': 'bouton bouton-principal', text: 'Quitter le mode technicien' });
    quitterBas.addEventListener('click', quitterModeTech);
    p.appendChild(el('div', { 'class': 'barre' }, [quitterBas]));
  }

  /* ------------------------------------------------------------------
     Journal des interventions (onglet du mode technicien uniquement).
     Données du technicien, séparées de la configuration : jamais
     affichées à la personne âgée, jamais exportées avec config.json.
     Aucun réseau ; tout reste dans le navigateur de ce PC.
     ------------------------------------------------------------------ */

  var CLE_JOURNAL = 'monaccueil.journal';
  var JOURNAL_LIEUX = ['sur place', 'à distance'];
  var JOURNAL_MOTIFS = ['dépannage', 'installation', 'formation', 'arnaque évitée', 'autre'];
  var JOURNAL_NOTE_MAX = 200;
  var JOURNAL_DUREE_MAX = 1440;
  var JOURNAL_MAX_LIGNES = 5000;
  var JOURNAL_CSV_MAX_OCTETS = 200 * 1024;
  var JOURNAL_COLONNES = ['date', 'duree_minutes', 'lieu', 'motif', 'note'];

  var journal = [];          // entrées { date, duree, lieu, motif, note }, triées par date décroissante
  var ongletTech = 'config';

  function deuxChiffres(n) { return String(n).padStart(2, '0'); }
  function dateDuJour() {
    var d = new Date();
    return d.getFullYear() + '-' + deuxChiffres(d.getMonth() + 1) + '-' + deuxChiffres(d.getDate());
  }
  function dateValide(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) { return false; }
    var a = +s.slice(0, 4), m = +s.slice(5, 7), j = +s.slice(8, 10);
    var d = new Date(a, m - 1, j);
    return a >= 2000 && a <= 2100 && d.getMonth() === m - 1 && d.getDate() === j;
  }
  function formaterDateFr(s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4); }
  function formaterDuree(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h ? h + ' h' + (m ? ' ' + deuxChiffres(m) : '') : m + ' min';
  }

  /** Valide une entrée brute (formulaire, stockage, CSV) : { entree } ou { erreur }. */
  function validerEntreeJournal(brut) {
    if (!brut || typeof brut !== 'object') { return { erreur: 'ligne vide' }; }
    var date = String(brut.date === undefined ? '' : brut.date).trim();
    if (!dateValide(date)) { return { erreur: 'date invalide (attendu AAAA-MM-JJ)' }; }
    var dureeTexte = String(brut.duree === undefined ? '' : brut.duree).trim();
    var duree = parseInt(dureeTexte, 10);
    if (!/^\d{1,4}$/.test(dureeTexte) || duree < 1 || duree > JOURNAL_DUREE_MAX) { return { erreur: 'durée invalide (1 à ' + JOURNAL_DUREE_MAX + ' minutes)' }; }
    var lieu = String(brut.lieu === undefined ? '' : brut.lieu).trim().toLowerCase();
    if (JOURNAL_LIEUX.indexOf(lieu) === -1) { return { erreur: 'lieu inconnu (attendu : ' + JOURNAL_LIEUX.join(' / ') + ')' }; }
    var motif = String(brut.motif === undefined ? '' : brut.motif).trim().toLowerCase();
    if (JOURNAL_MOTIFS.indexOf(motif) === -1) { return { erreur: 'motif inconnu (attendu : ' + JOURNAL_MOTIFS.join(' / ') + ')' }; }
    // Note : texte brut, sans caractères de contrôle
    var note = String(brut.note === undefined ? '' : brut.note).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (note.length > JOURNAL_NOTE_MAX) { return { erreur: 'note trop longue (' + JOURNAL_NOTE_MAX + ' caractères maximum)' }; }
    return { entree: { date: date, duree: duree, lieu: lieu, motif: motif, note: note } };
  }

  function trierJournal(liste) {
    return liste.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }

  function chargerJournal() {
    var liste = [];
    try { liste = JSON.parse(lireStockage(CLE_JOURNAL) || '[]'); } catch (e) { liste = []; }
    if (!Array.isArray(liste)) { liste = []; }
    journal = trierJournal(liste.map(validerEntreeJournal).filter(function (v) { return v.entree; }).map(function (v) { return v.entree; }).slice(0, JOURNAL_MAX_LIGNES));
  }

  function enregistrerJournal() {
    journal = trierJournal(journal);
    return ecrireStockage(CLE_JOURNAL, JSON.stringify(journal));
  }

  function messageStockage(ok, texte) {
    return ok ? texte : texte + ' Attention : impossible de mémoriser dans ce navigateur, exportez le journal en CSV pour ne rien perdre.';
  }

  /** Statistiques : nombre, temps total, moyenne, répartition par motif et par lieu. */
  function resumeJournal(liste) {
    var total = 0, parMotif = {}, parLieu = {};
    liste.forEach(function (e) {
      total += e.duree;
      parMotif[e.motif] = (parMotif[e.motif] || 0) + 1;
      parLieu[e.lieu] = (parLieu[e.lieu] || 0) + 1;
    });
    function repartition(obj, ordre) {
      return ordre.filter(function (k) { return obj[k]; }).map(function (k) { return k + ' : ' + obj[k]; }).join(', ') || 'aucune';
    }
    return {
      nombre: liste.length,
      total: total,
      moyenne: liste.length ? Math.round(total / liste.length) : 0,
      motifs: repartition(parMotif, JOURNAL_MOTIFS),
      lieux: repartition(parLieu, JOURNAL_LIEUX)
    };
  }

  /* --- CSV : séparateur « ; », UTF-8 avec BOM, neutralisation des formules --- */

  function celluleCsv(valeur) {
    var s = String(valeur);
    // Un tableur interpréterait = + - @ (et tabulation / retour chariot) comme une formule : on neutralise
    if (/^[=+\-@\t\r]/.test(s)) { s = '\'' + s; }
    if (/[;"\r\n]/.test(s)) { s = '"' + s.replace(/"/g, '""') + '"'; }
    return s;
  }

  function journalEnCsv(liste) {
    var lignes = [JOURNAL_COLONNES.join(';')];
    liste.forEach(function (e) {
      lignes.push([e.date, e.duree, e.lieu, e.motif, e.note].map(celluleCsv).join(';'));
    });
    return '\uFEFF' + lignes.join('\r\n') + '\r\n';
  }

  /** Découpe un texte CSV (« ; », guillemets doublés, CRLF ou LF) : { lignes: [[cellules]] } ou { erreur }. */
  function analyserCsv(texte) {
    texte = texte.replace(/^\uFEFF/, '');
    var lignes = [], ligne = [], cellule = '', entreGuillemets = false, i = 0, c;
    while (i < texte.length) {
      c = texte.charAt(i);
      if (entreGuillemets) {
        if (c === '"') {
          if (texte.charAt(i + 1) === '"') { cellule += '"'; i++; }
          else { entreGuillemets = false; }
        } else { cellule += c; }
      } else if (c === '"' && cellule === '') { entreGuillemets = true; }
      else if (c === ';') { ligne.push(cellule); cellule = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texte.charAt(i + 1) === '\n') { i++; }
        ligne.push(cellule); lignes.push(ligne); ligne = []; cellule = '';
      } else { cellule += c; }
      i++;
    }
    if (entreGuillemets) { return { erreur: 'guillemet non fermé' }; }
    if (cellule !== '' || ligne.length) { ligne.push(cellule); lignes.push(ligne); }
    // Ignore les lignes totalement vides
    return { lignes: lignes.filter(function (l) { return l.some(function (x) { return x.trim() !== ''; }); }) };
  }

  /** Enlève l'apostrophe de neutralisation ajoutée par notre export (« '=... » redevient « =... »). */
  function celluleDepuisCsv(s) { return /^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s; }

  /** Convertit un texte CSV en entrées validées : { entrees } ou { erreurs: [textes] }. */
  function journalDepuisCsv(texte) {
    var a = analyserCsv(texte);
    if (a.erreur) { return { erreurs: ['Fichier illisible : ' + a.erreur + '.'] }; }
    var lignes = a.lignes;
    if (!lignes.length) { return { erreurs: ['Le fichier est vide.'] }; }
    var entete = lignes[0].map(function (x) { return x.trim().toLowerCase(); });
    if (entete.join(';') !== JOURNAL_COLONNES.join(';')) {
      return { erreurs: ['Colonnes inattendues. Première ligne attendue : ' + JOURNAL_COLONNES.join(';')] };
    }
    if (lignes.length - 1 > JOURNAL_MAX_LIGNES) { return { erreurs: ['Trop de lignes (' + JOURNAL_MAX_LIGNES + ' maximum).'] }; }
    var erreurs = [], entrees = [];
    lignes.slice(1).forEach(function (l, i) {
      var num = 'Ligne ' + (i + 2) + ' : ';
      if (l.length !== JOURNAL_COLONNES.length) { erreurs.push(num + l.length + ' colonnes au lieu de ' + JOURNAL_COLONNES.length + '.'); return; }
      var cellules = l.map(celluleDepuisCsv);
      var v = validerEntreeJournal({ date: cellules[0], duree: cellules[1], lieu: cellules[2], motif: cellules[3], note: cellules[4] });
      if (v.erreur) { erreurs.push(num + v.erreur + '.'); } else { entrees.push(v.entree); }
    });
    return erreurs.length ? { erreurs: erreurs } : { entrees: entrees };
  }

  function exporterJournal() {
    if (!journal.length) { afficherMessagesTech(['Le journal est vide : rien à exporter.'], 'avertissement'); return; }
    telechargerFichier('journal-interventions-' + dateDuJour() + '.csv', journalEnCsv(journal), 'text/csv;charset=utf-8');
    afficherMessagesTech(['Journal exporté (' + journal.length + ' intervention(s)). Le fichier s\'ouvre dans Excel ou LibreOffice.'], 'confirmation');
  }

  function importerJournal(fichier) {
    if (!fichier) { return; }
    if (fichier.size > JOURNAL_CSV_MAX_OCTETS) {
      afficherMessagesTech(['Import refusé : fichier trop volumineux (' + Math.round(JOURNAL_CSV_MAX_OCTETS / 1024) + ' Ko maximum).'], 'liste-erreurs');
      return;
    }
    var lecteur = new FileReader();
    lecteur.onload = function () {
      var r = journalDepuisCsv(String(lecteur.result));
      if (r.erreurs) {
        var liste = r.erreurs.slice(0, 8);
        if (r.erreurs.length > 8) { liste.push('… et ' + (r.erreurs.length - 8) + ' autre(s) erreur(s).'); }
        afficherMessagesTech(['Import refusé, rien n\'a été modifié. Corrigez le fichier :'].concat(liste), 'liste-erreurs');
        return;
      }
      // Fusion : on ajoute les lignes qui n'existent pas déjà à l'identique
      var existantes = journal.map(function (e) { return JSON.stringify(e); });
      var nouvelles = [], doublons = 0;
      r.entrees.forEach(function (e) {
        var cle = JSON.stringify(e);
        if (existantes.indexOf(cle) !== -1) { doublons++; return; }
        existantes.push(cle); nouvelles.push(e);
      });
      if (journal.length + nouvelles.length > JOURNAL_MAX_LIGNES) {
        afficherMessagesTech(['Import refusé : le journal dépasserait ' + JOURNAL_MAX_LIGNES + ' lignes.'], 'liste-erreurs');
        return;
      }
      journal = journal.concat(nouvelles);
      var ok = enregistrerJournal();
      rendreJournal($('tech-onglet-journal'));
      afficherMessagesTech([messageStockage(ok, 'Import terminé : ' + nouvelles.length + ' intervention(s) ajoutée(s), ' + doublons + ' doublon(s) ignoré(s).')], 'confirmation');
    };
    lecteur.onerror = function () { afficherMessagesTech(['Impossible de lire le fichier.'], 'liste-erreurs'); };
    lecteur.readAsText(fichier, 'utf-8');
  }

  function ajouterEntreeJournal() {
    var pj = $('tech-onglet-journal');
    var v = validerEntreeJournal({
      date: pj.querySelector('[name="j-date"]').value,
      duree: pj.querySelector('[name="j-duree"]').value,
      lieu: pj.querySelector('[name="j-lieu"]').value,
      motif: pj.querySelector('[name="j-motif"]').value,
      note: pj.querySelector('[name="j-note"]').value
    });
    if (v.erreur) { afficherMessagesTech(['Intervention non ajoutée : ' + v.erreur + '.'], 'liste-erreurs'); return; }
    if (journal.length >= JOURNAL_MAX_LIGNES) { afficherMessagesTech(['Journal plein (' + JOURNAL_MAX_LIGNES + ' lignes) : exportez puis supprimez d\'anciennes lignes.'], 'liste-erreurs'); return; }
    journal.push(v.entree);
    var ok = enregistrerJournal();
    rendreJournal(pj);
    afficherMessagesTech([messageStockage(ok, 'Intervention du ' + formaterDateFr(v.entree.date) + ' ajoutée.')], 'confirmation');
    pj.querySelector('[name="j-duree"]').focus();
  }

  function supprimerEntreeJournal(i) {
    var e = journal[i];
    if (!e) { return; }
    if (!window.confirm('Supprimer l\'intervention du ' + formaterDateFr(e.date) + ' (' + e.motif + ', ' + formaterDuree(e.duree) + ') ?')) { return; }
    journal.splice(i, 1);
    var ok = enregistrerJournal();
    rendreJournal($('tech-onglet-journal'));
    afficherMessagesTech([messageStockage(ok, 'Intervention supprimée.')], 'confirmation');
  }

  function creerSelect(id, nom, options, valeur) {
    var s = el('select', { id: id, name: nom });
    options.forEach(function (o) {
      var opt = el('option', { value: o, text: majusculeInitiale(o) });
      if (o === valeur) { opt.selected = true; }
      s.appendChild(opt);
    });
    return s;
  }

  /** (Re)construit l'onglet Journal : résumé, formulaire, import/export, tableau. */
  function rendreJournal(pj) {
    // Conserve la saisie en cours (date, lieu, motif) lors d'un nouveau rendu
    var precedent = {
      date: (pj.querySelector('[name="j-date"]') || {}).value || dateDuJour(),
      lieu: (pj.querySelector('[name="j-lieu"]') || {}).value || JOURNAL_LIEUX[0],
      motif: (pj.querySelector('[name="j-motif"]') || {}).value || JOURNAL_MOTIFS[0]
    };
    vider(pj);
    pj.appendChild(el('p', { text: 'Ce journal est réservé au technicien : il n\'apparaît jamais sur l\'écran de la personne et n\'est pas inclus dans config.json. Il est mémorisé dans le navigateur de ce PC : exportez-le régulièrement.' }));

    // Résumé
    var r = resumeJournal(journal);
    pj.appendChild(el('h2', { text: 'Résumé' }));
    var resume = el('dl', { 'class': 'resume' });
    [['Interventions', String(r.nombre)], ['Temps total', formaterDuree(r.total)], ['Temps moyen', formaterDuree(r.moyenne)],
      ['Par motif', r.motifs], ['Par lieu', r.lieux]].forEach(function (x) {
      resume.appendChild(el('div', null, [el('dt', { text: x[0] }), el('dd', { text: x[1] })]));
    });
    pj.appendChild(resume);

    // Formulaire d'ajout
    pj.appendChild(el('h2', { text: 'Nouvelle intervention' }));
    var champs = el('div', { 'class': 'champs' });
    champs.appendChild(el('label', { 'for': 'j-date' }, ['Date',
      el('input', { id: 'j-date', name: 'j-date', type: 'date', value: precedent.date, min: '2000-01-01', max: '2100-12-31', required: '' })]));
    champs.appendChild(el('label', { 'for': 'j-duree' }, ['Durée (minutes)',
      el('input', { id: 'j-duree', name: 'j-duree', type: 'number', inputmode: 'numeric', min: '1', max: String(JOURNAL_DUREE_MAX), step: '1', placeholder: '30', autocomplete: 'off' })]));
    champs.appendChild(el('label', { 'for': 'j-lieu' }, ['Lieu', creerSelect('j-lieu', 'j-lieu', JOURNAL_LIEUX, precedent.lieu)]));
    champs.appendChild(el('label', { 'for': 'j-motif' }, ['Motif', creerSelect('j-motif', 'j-motif', JOURNAL_MOTIFS, precedent.motif)]));
    pj.appendChild(champs);
    pj.appendChild(el('p', { 'class': 'avertissement', id: 'j-avertissement', text: 'Ne notez aucun mot de passe, numéro ou donnée personnelle.' }));
    pj.appendChild(el('label', { 'for': 'j-note' }, ['Note courte (' + JOURNAL_NOTE_MAX + ' caractères maximum, facultatif)',
      el('textarea', { id: 'j-note', name: 'j-note', maxlength: String(JOURNAL_NOTE_MAX), rows: '2', 'aria-describedby': 'j-avertissement' })]));
    var ajouter = el('button', { type: 'button', 'class': 'bouton bouton-principal', text: '+ Ajouter au journal' });
    ajouter.addEventListener('click', ajouterEntreeJournal);
    var exporter = el('button', { type: 'button', 'class': 'bouton', text: 'Exporter le journal (CSV)' });
    exporter.addEventListener('click', exporterJournal);
    var champImport = el('input', { type: 'file', id: 'j-import', accept: '.csv,text/csv', 'class': 'visuellement-cache', 'aria-label': 'Choisir un fichier CSV de journal à importer' });
    champImport.addEventListener('change', function () { importerJournal(champImport.files[0]); champImport.value = ''; });
    var importer = el('button', { type: 'button', 'class': 'bouton', text: 'Importer un journal (CSV)' });
    importer.addEventListener('click', function () { champImport.click(); });
    pj.appendChild(el('div', { 'class': 'barre' }, [ajouter, exporter, importer, champImport]));

    // Tableau
    pj.appendChild(el('h2', { text: 'Interventions (' + journal.length + ')' }));
    if (!journal.length) {
      pj.appendChild(el('p', { text: 'Aucune intervention enregistrée pour le moment.' }));
      return;
    }
    var table = el('table', { 'class': 'journal-table' });
    var thead = el('thead'), ligneEntete = el('tr');
    ['Date', 'Durée', 'Lieu', 'Motif', 'Note', ''].forEach(function (t) { ligneEntete.appendChild(el('th', { scope: 'col', text: t })); });
    thead.appendChild(ligneEntete);
    table.appendChild(thead);
    var tbody = el('tbody');
    journal.forEach(function (e, i) {
      var supprimer = el('button', { type: 'button', 'class': 'bouton', text: 'Supprimer', 'aria-label': 'Supprimer l\'intervention du ' + formaterDateFr(e.date) + ' (' + e.motif + ')' });
      supprimer.addEventListener('click', function () { supprimerEntreeJournal(i); });
      tbody.appendChild(el('tr', null, [
        el('td', { text: formaterDateFr(e.date) }),
        el('td', { text: formaterDuree(e.duree) }),
        el('td', { text: majusculeInitiale(e.lieu) }),
        el('td', { text: majusculeInitiale(e.motif) }),
        el('td', { 'class': 'journal-note', text: e.note }),
        el('td', null, [supprimer])
      ]));
    });
    table.appendChild(tbody);
    pj.appendChild(el('div', { 'class': 'journal-defilement' }, [table]));
  }

  /* ------------------------------------------------------------------
     Service worker (PWA, affichage hors ligne) : uniquement en http(s),
     les navigateurs ne l'autorisent pas en file://.
     ------------------------------------------------------------------ */

  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) { return; }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { return; }
    navigator.serviceWorker.register('sw.js').catch(function () { /* silencieux : la page fonctionne sans */ });
  }

  /* ------------------------------------------------------------------
     Démarrage
     ------------------------------------------------------------------ */

  function demarrer() {
    // Test + restauration croisée localStorage ⇄ IndexedDB avant le premier affichage
    preparerStockage().then(function () {
      initReglages();
      majHorloge();
      setInterval(majHorloge, 1000);
      chargerPrenomChoisi();
      chargerPerso();
      if (resemerIDB) { synchroniserIDB(); }   // le miroir IndexedDB était vide
      initAide();
      initBizarre();
      initInstall();
      initRetour();
      initPrenom();
      initPalette();
      // navigator.storage.persist() après une action de la personne (1er clic sur une tuile)
      $('tuiles').addEventListener('click', demanderPersistance);
      chargerConfig().then(function (c) {
        config = c;
        // Lien personnel « #p= » : hydrate le stockage vide (ou force=1), avant tout affichage
        if (traiterLienPersonnel()) { relireApresHydratation(); }
        // Lien présent mais rien d'hydraté alors que le stockage est vide :
        // le lien est probablement invalide ou tronqué — on le signale sobrement.
        else if (lienPersonnelVu && stockageVide() && stockageOK) { afficherBandeauStockage(); }
        remplirLienTelephone($('appeler-stockage'));
        appliquerPalette(paletteEffective());   // la palette de la config s'applique si la personne n'a rien choisi
        afficherEntete();
        afficherTuiles();
        // Ajout de cases par la personne : ni lien ni dialog ne sont construits quand la config dit « non »
        if (config.ajoutParPersonne === 'non') {
          var dAjout = $('dialog-ajout'), dRetrait = $('dialog-retrait');
          if (dAjout) { dAjout.remove(); }
          if (dRetrait) { dRetrait.remove(); }
        } else { initAjout(); initRetrait(); }
        chargerProtection();
        initProtection();
        // « Partager vers Mon Accueil » (share_target) : pré-remplit le vérificateur
        traiterPartage();
        // Premier lancement : demander le prénom seulement si ni choisi ni configuré,
        // et pas déjà repoussé à « plus tard » — et sans recouvrir le vérificateur
        if (!document.querySelector('dialog[open]')
          && !prenomEffectif() && lireStockage(CLE_PRENOM_PLUSTARD) !== '1') { ouvrirPrenom(); }
        // modeTechnicien : false (démo publique) = aucun geste, aucun code du panneau construit
        if (config.modeTechnicien !== false) { initAppuiLong(); initPin(); }
      });
      initServiceWorker();
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); }
  else { demarrer(); }
})();
