/* =====================================================================
   MonAccueil - vérification locale d'une adresse de site
   - Analyse 100 % locale : l'adresse n'est JAMAIS ouverte, chargée ni
     envoyée. On ne fait que lire le texte collé.
   - Fichier partagé entre le navigateur (window.MONACCUEIL_VERIF) et le
     script de test Node (outils/test-verification.js).
   ===================================================================== */
(function (racine) {
  'use strict';

  /** Distance de Levenshtein (nombre minimal de lettres à changer). */
  function levenshtein(a, b) {
    if (a === b) { return 0; }
    if (!a.length) { return b.length; }
    if (!b.length) { return a.length; }
    var prec = [], i, j;
    for (j = 0; j <= b.length; j++) { prec[j] = j; }
    for (i = 1; i <= a.length; i++) {
      var cour = [i];
      for (j = 1; j <= b.length; j++) {
        cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prec = cour;
    }
    return prec[b.length];
  }

  function nettoyerListe(liste) {
    return (Array.isArray(liste) ? liste : []).map(function (d) { return String(d).trim().toLowerCase().replace(/\.$/, ''); }).filter(Boolean);
  }

  /** Vrai si hote est exactement le domaine, ou un vrai sous-domaine (se termine par ".domaine"). */
  function appartient(hote, domaine) {
    return hote === domaine || hote.slice(-(domaine.length + 1)) === '.' + domaine;
  }

  /** Les derniers "n" morceaux d'un hôte (ex. 3 morceaux de a.b.c.d -> b.c.d). */
  function suffixe(hote, n) { return hote.split('.').slice(-n).join('.'); }

  /**
   * Cherche un domaine officiel dont le nom "ressemble" à l'hôte (faute de
   * frappe, lettre ajoutée ou retirée). Retourne le domaine ou null.
   */
  function domaineProche(hote, officiels) {
    var candidat = hote.replace(/^www\./, '');
    var meilleur = null, meilleureDist = Infinity;
    officiels.forEach(function (d) {
      var seuil = d.length <= 8 ? 1 : 2;
      var dist = Math.min(levenshtein(candidat, d), levenshtein(suffixe(candidat, d.split('.').length), d));
      if (dist > 0 && dist <= seuil && dist < meilleureDist) { meilleur = d; meilleureDist = dist; }
    });
    return meilleur;
  }

  /**
   * Vrai si l'hôte contient le nom d'un site officiel sans en être un vrai
   * sous-domaine (ex. impots.gouv.fr.autre-site.com, impots-gouv-fr.com).
   */
  function imiteOfficiel(hote, officiels) {
    var plat = hote.replace(/[-.]/g, '');
    return officiels.filter(function (d) { return d.indexOf('.') !== -1 && d.length >= 6; }).some(function (d) {
      return hote.indexOf(d + '.') !== -1 || hote.indexOf(d + '-') !== -1 || plat.indexOf(d.replace(/[-.]/g, '')) !== -1;
    }) ? true : false;
  }

  /**
   * Analyse une adresse collée par la personne.
   * saisie        : texte brut
   * officiels     : liste des domaines officiels (config.domainesOfficiels)
   * raccourcisseurs : liste des raccourcisseurs d'adresses connus
   * Retourne { verdict: 'vide' | 'vert' | 'rouge', hote, officiel, raisons: [textes] }.
   * officiel = vrai si l'hôte appartient à la liste (même quand le verdict est rouge
   * à cause d'un autre signe : http://, port inhabituel…).
   * Aucune requête, aucun stockage : fonction pure.
   */
  function verifierAdresse(saisie, officiels, raccourcisseurs) {
    officiels = nettoyerListe(officiels);
    raccourcisseurs = nettoyerListe(raccourcisseurs);
    function rouge(hote, raisons, officiel) { return { verdict: 'rouge', hote: hote, officiel: officiel === true, raisons: raisons }; }

    var texte = String(saisie === null || saisie === undefined ? '' : saisie).trim();
    // Enlève les chevrons et guillemets qui entourent souvent une adresse copiée
    texte = texte.replace(/^[<"'«\s]+|[>"'»\s.,;]+$/g, '');
    if (!texte) { return { verdict: 'vide', hote: '', officiel: false, raisons: [] }; }

    var raisons = [];
    if (/\s/.test(texte)) {
      return rouge('', ['Ce texte contient des espaces : ce n\'est pas une adresse de site lisible.']);
    }

    // Schéma (https:, mailto:, javascript:…). "site.fr:8080" n'est pas un schéma mais un port.
    var m = /^([a-z][a-z0-9+.-]*):(\/\/)?/i.exec(texte);
    var schema = m && (m[2] || !/^\d/.test(texte.slice(m[0].length))) ? m[1].toLowerCase() : null;
    if (schema && schema !== 'http' && schema !== 'https') {
      return rouge('', ['Cette adresse ne commence ni par https:// ni par http:// : type d\'adresse inhabituel.']);
    }
    if (schema && !m[2]) {
      return rouge('', ['Adresse mal formée (il manque les deux barres après http:).']);
    }
    if (schema === 'http') { raisons.push('L\'adresse commence par http:// sans le « s » : connexion non sécurisée.'); }
    var aArobase = texte.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0].indexOf('@') !== -1;
    if (aArobase) { raisons.push('L\'adresse contient un @ : le vrai site est celui écrit APRÈS le @, pas avant.'); }

    var u;
    try {
      u = new URL(schema ? texte : 'https://' + texte);
    } catch (e) {
      return rouge('', ['Adresse illisible ou mal formée.']);
    }
    var hote = String(u.hostname || '').toLowerCase().replace(/\.$/, '');
    if (!hote) { return rouge('', ['Adresse illisible : aucun nom de site.']); }

    if (/^\[/.test(hote) || /^\d{1,3}(\.\d{1,3}){3}$/.test(hote) || /^(0x[0-9a-f]+|\d+)$/.test(hote)) {
      raisons.push('L\'adresse est une suite de chiffres (adresse IP) et non le nom d\'un site.');
    } else if (hote.indexOf('.') === -1) {
      raisons.push('Ce n\'est pas le nom complet d\'un site (il manque le .fr, .com…).');
    }
    if (hote.split('.').some(function (m) { return m.indexOf('xn--') === 0; })) {
      raisons.push('L\'adresse contient des caractères déguisés (lettres qui imitent d\'autres lettres).');
    }
    if (u.port) { raisons.push('L\'adresse contient un numéro inhabituel (« :' + u.port + ' »).'); }
    if (raccourcisseurs.some(function (r) { return appartient(hote, r); })) {
      raisons.push('C\'est une adresse raccourcie : impossible de savoir où elle mène vraiment.');
    }

    var officiel = officiels.some(function (d) { return appartient(hote, d); });
    if (officiel && !raisons.length) {
      return { verdict: 'vert', hote: hote, officiel: true, raisons: [] };
    }
    if (!officiel) {
      if (imiteOfficiel(hote, officiels)) {
        raisons.push('Cette adresse imite le nom d\'un site officiel, mais ce n\'est pas lui (le vrai nom est à la fin, juste avant le premier « / »).');
      } else {
        var proche = domaineProche(hote, officiels);
        if (proche) { raisons.push('Cette adresse ressemble à « ' + proche + ' » à une ou deux lettres près : c\'est une imitation.'); }
      }
      raisons.push('Le site « ' + hote + ' » n\'est pas dans la liste des sites officiels.');
    }
    return rouge(hote, raisons, officiel);
  }

  var api = { verifierAdresse: verifierAdresse, levenshtein: levenshtein };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  else { racine.MONACCUEIL_VERIF = api; }
})(typeof window !== 'undefined' ? window : this);
