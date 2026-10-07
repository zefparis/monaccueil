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
    'meteo.svg', 'cle.svg', 'assistance.svg', 'aide.svg', 'telephone.svg', 'bouclier.svg'
  ];
  // Outils d'aide à distance pris en charge (le senior initie et accepte toujours la connexion)
  var OUTILS_DISTANCE = ['quickassist', 'rustdesk'];
  var COULEUR_DISTANCE = '#a21caf';
  // Tuile fixe "Un message me paraît bizarre" (orange foncé, blanc dessus = 7:1)
  var COULEUR_BIZARRE = '#9a3412';
  var ICONE_DEFAUT = 'administration.svg';
  var COULEUR_DEFAUT = '#1d4ed8';
  var LONGUEUR_MAX_ARNAQUE = 300;

  // Clés de mémorisation locale
  var CLE_CONFIG = 'monaccueil.config';
  var CLE_TAILLE = 'monaccueil.taille';
  var CLE_CONTRASTE = 'monaccueil.contraste';
  // Deux compteurs anonymes (aucune adresse n'est jamais conservée)
  var CLE_STAT_VERIFICATIONS = 'monaccueil.stat.verifications';
  var CLE_STAT_ROUGES = 'monaccueil.stat.rouges';
  var CLE_INSTALL = 'monaccueil.install.ferme';

  var DUREE_APPUI_LONG = 3000; // ms

  // Configuration active et brouillon du mode technicien
  var config = null;
  var brouillon = null;

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
      prenom: typeof c.prenom === 'string' ? c.prenom.trim() : '',
      technicien: {
        nom: typeof tech.nom === 'string' ? tech.nom.trim() : '',
        telephone: typeof tech.telephone === 'string' ? tech.telephone.trim() : ''
      },
      pinHash: typeof c.pinHash === 'string' ? c.pinHash.toLowerCase() : '',
      // false = mode technicien totalement désactivé (instance publique de démo) ; absent ou autre valeur = actif
      modeTechnicien: typeof c.modeTechnicien === 'boolean' ? c.modeTechnicien : true,
      domainesOfficiels: listeDomaines(Array.isArray(c.domainesOfficiels) ? c.domainesOfficiels : []),
      raccourcisseurs: listeDomaines(Array.isArray(c.raccourcisseurs) ? c.raccourcisseurs : (Array.isArray(defaut.raccourcisseurs) ? defaut.raccourcisseurs : [])),
      arnaques: listeArnaques(Array.isArray(c.arnaques) ? c.arnaques : (Array.isArray(defaut.arnaques) ? defaut.arnaques : [])),
      tuiles: (Array.isArray(c.tuiles) ? c.tuiles : []).filter(function (t) { return t && typeof t === 'object'; }).map(function (t, i) {
        return {
          id: typeof t.id === 'string' && t.id ? t.id : 'tuile-' + (i + 1),
          label: typeof t.label === 'string' ? t.label.trim() : '',
          url: typeof t.url === 'string' ? t.url.trim() : '',
          icone: iconeValide(t.icone) ? t.icone : ICONE_DEFAUT,
          couleur: couleurValide(t.couleur) ? t.couleur.toLowerCase() : COULEUR_DEFAUT
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

  function afficherEntete() {
    $('titre').textContent = config.prenom ? 'Bonjour ' + config.prenom : 'Bonjour';
    $('aide-nom').textContent = config.technicien.nom || 'Votre technicien';
    remplirLienTelephone($('aide-telephone'));
    afficherAideDistance();
    afficherBizarre();
  }

  /** Textes des étapes 2 à 4 selon l'outil choisi et le mode d'hébergement
      (file:// : raccourci Bureau ; https : l'outil se lance depuis le menu Démarrer). */
  function afficherAideDistance() {
    remplirLienTelephone($('distance-telephone'));
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

  function afficherTuiles() {
    var liste = $('tuiles');
    vider(liste);
    var visibles = config.tuiles.filter(function (t) { return analyserUrl(t.url).ok; });
    visibles.forEach(function (t) {
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
      liste.appendChild(el('li', null, [lien]));
    });
    // Tuile fixe "Aide à distance" : ouvre une fenêtre d'explications, pas un site
    if (config.aideDistance.actif) {
      var bouton = el('button', { type: 'button', 'class': 'tuile tuile-distance' }, [
        creerIcone('assistance.svg', COULEUR_DISTANCE),
        el('span', { 'class': 'tuile-label', text: 'Aide à distance' })
      ]);
      bouton.style.setProperty('--couleur', COULEUR_DISTANCE);
      bouton.addEventListener('click', function () { ouvrirDialog($('dialog-distance')); $('btn-fermer-distance').focus(); });
      liste.appendChild(el('li', null, [bouton]));
    }
    // Tuile fixe "Un message me paraît bizarre" : conseils et vérification 100 % locale, toujours présente
    var bizarre = el('button', { type: 'button', 'class': 'tuile tuile-bizarre' }, [
      creerIcone('bouclier.svg', COULEUR_BIZARRE),
      el('span', { 'class': 'tuile-label', text: 'Un message me paraît bizarre' })
    ]);
    bizarre.style.setProperty('--couleur', COULEUR_BIZARRE);
    bizarre.addEventListener('click', function () { ouvrirDialog($('dialog-bizarre')); $('champ-adresse').focus(); });
    liste.appendChild(el('li', null, [bizarre]));
    $('message-vide').hidden = true;
  }

  /* ------------------------------------------------------------------
     "Un message me paraît bizarre" : 3 questions, vérification locale
     d'une adresse (jamais ouverte, jamais envoyée), arnaques du moment.
     ------------------------------------------------------------------ */

  function lireCompteur(cle) { var n = parseInt(lireStockage(cle), 10); return isNaN(n) || n < 0 ? 0 : n; }
  function incrementerCompteur(cle) { ecrireStockage(cle, String(lireCompteur(cle) + 1)); }
  function lireStatistiques() {
    return { verifications: lireCompteur(CLE_STAT_VERIFICATIONS), rouges: lireCompteur(CLE_STAT_ROUGES) };
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
    var r = window.MONACCUEIL_VERIF.verifierAdresse($('champ-adresse').value, config.domainesOfficiels, config.raccourcisseurs);
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

  function initBizarre() {
    var d = $('dialog-bizarre');
    $('form-verif').addEventListener('submit', function (ev) { ev.preventDefault(); verifierAdresseSaisie(); });
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

  function appliquerTaille(n) {
    taille = Math.min(3, Math.max(1, n));
    var html = document.documentElement;
    html.classList.remove('taille-1', 'taille-2', 'taille-3');
    html.classList.add('taille-' + taille);
    $('btn-taille-moins').disabled = taille === 1;
    $('btn-taille-plus').disabled = taille === 3;
    ecrireStockage(CLE_TAILLE, String(taille));
  }

  function appliquerContraste(actif) {
    document.documentElement.classList.toggle('contraste-eleve', actif);
    $('btn-contraste').setAttribute('aria-pressed', actif ? 'true' : 'false');
    ecrireStockage(CLE_CONTRASTE, actif ? '1' : '0');
  }

  function initReglages() {
    var t = parseInt(lireStockage(CLE_TAILLE), 10);
    appliquerTaille(isNaN(t) ? 1 : t);
    appliquerContraste(lireStockage(CLE_CONTRASTE) === '1');
    $('btn-taille-moins').addEventListener('click', function () { appliquerTaille(taille - 1); });
    $('btn-taille-plus').addEventListener('click', function () { appliquerTaille(taille + 1); });
    $('btn-contraste').addEventListener('click', function () {
      appliquerContraste(!document.documentElement.classList.contains('contraste-eleve'));
    });
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
  }

  /* ------------------------------------------------------------------
     Suggestion d'installation (PWA)
     Affichée seulement si le navigateur propose l'installation et que la
     personne n'a pas déjà installé ou fermé la bannière. Un drapeau local
     mémorise le choix ; rien d'autre n'est stocké.
     ------------------------------------------------------------------ */

  var installEvent = null;

  function initInstall() {
    var banniere = $('banniere-install');
    if (!banniere || lireStockage(CLE_INSTALL) === '1') { return; }
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) { return; }
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
    $('pin-erreur').textContent = '';
    ouvrirDialog(d);
    $('champ-pin').focus();
  }

  function initPin() {
    var d = $('dialog-pin');
    $('btn-pin-annuler').addEventListener('click', function () { fermerDialog(d); });
    $('form-pin').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var saisie = $('champ-pin').value;
      if (!/^[0-9]{4}$/.test(saisie)) { $('pin-erreur').textContent = 'Saisissez 4 chiffres.'; return; }
      sha256(saisie).then(function (hash) {
        if (config.pinHash && hash === config.pinHash) {
          fermerDialog(d);
          ouvrirModeTech();
        } else {
          $('pin-erreur').textContent = 'Code incorrect.';
          $('champ-pin').value = '';
          $('champ-pin').focus();
        }
      });
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

  /** Lit les champs du formulaire dans le brouillon (avant toute action). */
  function lireFormulaire() {
    var p = $('panneau-tech');
    brouillon.prenom = p.querySelector('[name="prenom"]').value.trim();
    brouillon.technicien.nom = p.querySelector('[name="tech-nom"]').value.trim();
    brouillon.technicien.telephone = p.querySelector('[name="tech-tel"]').value.trim();
    brouillon.aideDistance.actif = p.querySelector('[name="distance-actif"]').checked;
    brouillon.aideDistance.outil = p.querySelector('[name="distance-outil"]').value;
    brouillon.aideDistance.idRustdesk = p.querySelector('[name="distance-id"]').value.replace(/[^0-9]/g, '');
    brouillon.domainesOfficiels = lireListeTexte(p.querySelector('[name="domaines"]').value);
    brouillon.raccourcisseurs = lireListeTexte(p.querySelector('[name="raccourcisseurs"]').value);
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
    });
  }

  /** Vérifie le brouillon : retourne { erreurs: [], avertissements: [] }. */
  function validerBrouillon() {
    var erreurs = [], avertissements = [];
    if (!brouillon.prenom) { erreurs.push('Le prénom est vide.'); }
    if (!brouillon.technicien.telephone) { erreurs.push('Le numéro de téléphone du technicien est vide.'); }
    if (OUTILS_DISTANCE.indexOf(brouillon.aideDistance.outil) === -1) { brouillon.aideDistance.outil = 'quickassist'; }
    if (brouillon.aideDistance.actif && brouillon.aideDistance.outil === 'rustdesk' && !brouillon.aideDistance.idRustdesk) {
      avertissements.push('Aide à distance : l\'identifiant RustDesk du poste est vide (facultatif, mais pratique pour vous).');
    }
    [['Domaines officiels', brouillon.domainesOfficiels], ['Raccourcisseurs', brouillon.raccourcisseurs]].forEach(function (x) {
      x[1].forEach(function (d) {
        if (!domaineValide(d)) { erreurs.push(x[0] + ' : « ' + d + ' » n\'est pas un nom de domaine valide (sans http://, sans chemin).'); }
      });
    });
    brouillon.arnaques.forEach(function (a, i) {
      if (!a.titre) { erreurs.push('Arnaque n°' + (i + 1) + ' : le titre est vide (supprimez-la ou donnez-lui un titre).'); }
      if (a.texte.length > LONGUEUR_MAX_ARNAQUE) { erreurs.push('Arnaque n°' + (i + 1) + ' : le texte dépasse ' + LONGUEUR_MAX_ARNAQUE + ' caractères.'); }
      else if ((a.texte.match(/[.!?](\s|$)/g) || []).length > 2) { avertissements.push('Arnaque n°' + (i + 1) + ' : plus de 2 phrases, pensez à raccourcir pour rester lisible.'); }
    });
    brouillon.tuiles.forEach(function (t, i) {
      var nom = t.label || ('Tuile n°' + (i + 1));
      if (!t.label) { erreurs.push('Tuile n°' + (i + 1) + ' : le libellé est vide.'); }
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
    // Les deux compteurs anonymes sont joints dans une section à part (ignorée à l'import)
    var exporte = copieProfonde(brouillon);
    exporte.statistiques = lireStatistiques();
    var json = JSON.stringify(exporte, null, 2) + '\n';
    telechargerFichier('config.json', json, 'application/json');
    // Le second téléchargement est légèrement différé pour que les navigateurs l'acceptent
    setTimeout(function () { telechargerFichier('config.js', texteConfigJs(exporte), 'text/javascript'); }, 400);
    afficherMessagesTech(['Deux fichiers téléchargés : config.json et config.js. Copiez-les tous les deux dans le dossier MonAccueil.'].concat(v.avertissements), v.avertissements.length ? 'avertissement' : 'confirmation');
  }

  /** Télécharge uniquement config.json (la configuration appliquée) pour la ranger chez le client. */
  function sauvegarderConfig() {
    telechargerFichier('config.json', JSON.stringify(config, null, 2) + '\n', 'application/json');
    afficherMessagesTech(['Sauvegarde téléchargée : rangez ce config.json dans le dossier MonAccueil du client.'], 'confirmation');
  }

  function importerConfig(fichier) {
    if (!fichier) { return; }
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
        rendrePanneauTech();
        afficherMessagesTech(['Configuration importée. Vérifiez puis cliquez sur « Enregistrer et appliquer ».'], 'confirmation');
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
    brouillon.tuiles.push({ id: 'tuile-' + Date.now(), label: '', url: 'https://', icone: ICONE_DEFAUT, couleur: COULEUR_DEFAUT });
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
      el('h2', { id: 'tech-titre', text: 'Mode technicien' }), quitter
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
    var champImport = el('input', { type: 'file', id: 'tech-import', accept: '.json,.js,application/json,text/javascript', 'class': 'visuellement-cache' });
    champImport.addEventListener('change', function () { importerConfig(champImport.files[0]); champImport.value = ''; });
    var importer = el('button', { type: 'button', 'class': 'bouton', text: 'Importer une configuration' });
    importer.addEventListener('click', function () { champImport.click(); });
    var sauvegarde = el('button', { type: 'button', 'class': 'bouton', text: 'Sauvegarde de cette configuration' });
    sauvegarde.addEventListener('click', sauvegarderConfig);
    var reinit = el('button', { type: 'button', 'class': 'bouton', text: 'Revenir au fichier d\'origine' });
    reinit.addEventListener('click', reinitialiserConfig);
    p.appendChild(el('div', { 'class': 'barre' }, [enregistrer, exporter, importer, champImport, sauvegarde, reinit]));

    // Informations générales
    p.appendChild(el('h3', { text: 'Informations générales' }));
    var general = el('div', { 'class': 'champs' });
    general.appendChild(el('label', { 'for': 'tech-prenom' }, ['Prénom de la personne',
      el('input', { id: 'tech-prenom', name: 'prenom', type: 'text', value: brouillon.prenom, maxlength: '40', autocomplete: 'off' })]));
    general.appendChild(el('label', { 'for': 'tech-nom' }, ['Nom du technicien',
      el('input', { id: 'tech-nom', name: 'tech-nom', type: 'text', value: brouillon.technicien.nom, maxlength: '60', autocomplete: 'off' })]));
    general.appendChild(el('label', { 'for': 'tech-tel' }, ['Téléphone du technicien',
      el('input', { id: 'tech-tel', name: 'tech-tel', type: 'tel', value: brouillon.technicien.telephone, maxlength: '30', autocomplete: 'off' })]));
    p.appendChild(general);

    // Aide à distance
    p.appendChild(el('h3', { text: 'Aide à distance' }));
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
    p.appendChild(el('h3', { text: 'Code PIN du mode technicien' }));
    var pinBarre = el('div', { 'class': 'barre' });
    pinBarre.appendChild(el('label', { 'for': 'tech-nouveau-pin' }, ['Nouveau code (4 chiffres)',
      el('input', { id: 'tech-nouveau-pin', type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: 'off' })]));
    var btnPin = el('button', { type: 'button', 'class': 'bouton', text: 'Changer le code PIN' });
    btnPin.addEventListener('click', changerPin);
    pinBarre.appendChild(btnPin);
    p.appendChild(pinBarre);

    // Tuiles
    p.appendChild(el('h3', { text: 'Tuiles (' + brouillon.tuiles.length + ')' }));
    var conteneur = el('div');
    brouillon.tuiles.forEach(function (t, i) { conteneur.appendChild(creerCarteTuile(t, i, brouillon.tuiles.length)); });
    p.appendChild(conteneur);
    var ajouter = el('button', { type: 'button', 'class': 'bouton', text: '+ Ajouter une tuile' });
    ajouter.addEventListener('click', ajouterTuile);
    p.appendChild(el('div', { 'class': 'barre' }, [ajouter]));

    // Domaines officiels
    p.appendChild(el('h3', { text: 'Domaines officiels connus' }));
    p.appendChild(el('p', { text: 'Un domaine par ligne. Une tuile dont l\'adresse n\'est pas dans cette liste déclenche un avertissement (mais reste autorisée).' }));
    p.appendChild(el('label', { 'for': 'tech-domaines' }, ['Liste des domaines',
      el('textarea', { id: 'tech-domaines', name: 'domaines', spellcheck: 'false' }, [brouillon.domainesOfficiels.join('\n')])]));

    // "Un message me paraît bizarre"
    p.appendChild(el('h3', { text: 'Tuile « Un message me paraît bizarre »' }));
    var stats = lireStatistiques();
    p.appendChild(el('p', { text: 'Statistiques sur cet ordinateur (aucune adresse n\'est conservée) : ' + stats.verifications +
      ' vérification(s) d\'adresse, dont ' + stats.rouges + ' résultat(s) rouge(s). Elles sont jointes à l\'export dans la section « statistiques ».' }));
    p.appendChild(el('h4', { text: 'Arnaques du moment (' + brouillon.arnaques.length + ')' }));
    p.appendChild(el('p', { text: 'Un titre et deux phrases maximum par arnaque, en langage simple. Mettez à jour la liste à chaque visite.' }));
    var conteneurArnaques = el('div');
    brouillon.arnaques.forEach(function (a, i) { conteneurArnaques.appendChild(creerCarteArnaque(a, i)); });
    p.appendChild(conteneurArnaques);
    var ajouterArn = el('button', { type: 'button', 'class': 'bouton', text: '+ Ajouter une arnaque' });
    ajouterArn.addEventListener('click', ajouterArnaque);
    p.appendChild(el('div', { 'class': 'barre' }, [ajouterArn]));
    p.appendChild(el('h4', { text: 'Raccourcisseurs d\'adresses connus' }));
    p.appendChild(el('p', { text: 'Un domaine par ligne. Une adresse de ce type est toujours signalée en rouge : impossible de savoir où elle mène.' }));
    p.appendChild(el('label', { 'for': 'tech-raccourcisseurs' }, ['Liste des raccourcisseurs',
      el('textarea', { id: 'tech-raccourcisseurs', name: 'raccourcisseurs', spellcheck: 'false' }, [brouillon.raccourcisseurs.join('\n')])]));

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
    pj.appendChild(el('h3', { text: 'Résumé' }));
    var resume = el('dl', { 'class': 'resume' });
    [['Interventions', String(r.nombre)], ['Temps total', formaterDuree(r.total)], ['Temps moyen', formaterDuree(r.moyenne)],
      ['Par motif', r.motifs], ['Par lieu', r.lieux]].forEach(function (x) {
      resume.appendChild(el('div', null, [el('dt', { text: x[0] }), el('dd', { text: x[1] })]));
    });
    pj.appendChild(resume);

    // Formulaire d'ajout
    pj.appendChild(el('h3', { text: 'Nouvelle intervention' }));
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
    var champImport = el('input', { type: 'file', id: 'j-import', accept: '.csv,text/csv', 'class': 'visuellement-cache' });
    champImport.addEventListener('change', function () { importerJournal(champImport.files[0]); champImport.value = ''; });
    var importer = el('button', { type: 'button', 'class': 'bouton', text: 'Importer un journal (CSV)' });
    importer.addEventListener('click', function () { champImport.click(); });
    pj.appendChild(el('div', { 'class': 'barre' }, [ajouter, exporter, importer, champImport]));

    // Tableau
    pj.appendChild(el('h3', { text: 'Interventions (' + journal.length + ')' }));
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
    initReglages();
    majHorloge();
    setInterval(majHorloge, 1000);
    initAide();
    initBizarre();
    initInstall();
    chargerConfig().then(function (c) {
      config = c;
      afficherEntete();
      afficherTuiles();
      // modeTechnicien : false (démo publique) = aucun geste, aucun code du panneau construit
      if (config.modeTechnicien !== false) { initAppuiLong(); initPin(); }
    });
    initServiceWorker();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', demarrer); }
  else { demarrer(); }
})();
