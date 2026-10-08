# Audit indépendant — MonAccueil

Relecture externe complète (sécurité, accessibilité, robustesse, confidentialité,
cohérence produit et qualité des tests). Gravité : **critique** / **important** /
**mineur**. Statut : corrigé / restant / décision d'architecture (signalée, non
changée).

## Problèmes trouvés et corrigés

### Critiques

| # | Problème | Correction |
|---|----------|------------|
| C1 | Fermeture du dialog « Ajouter un bouton » : `persoActions.querySelector('#lien-ajout').focus()` levait `TypeError` (la tuile d'ajout vit désormais dans la grille, plus dans `perso-actions`) — erreur console + focus perdu | `app.js` : focus via la référence en cache `persoLienAjout` |
| C2 | Panneau technicien : `role="main"` absent, titre en `h2`, sauts de niveaux de titres (`h1`→`h3`), inputs fichier sans nom accessible — 4 violations axe (`landmark-one-main`, `page-has-heading-one`, `label` ×2, `heading-order`) | `index.html` : `role="main"` sur `#panneau-tech` ; `app.js` : titre `h1`, hiérarchie `h2`/`h3`, `aria-label` sur les imports ; `style.css` : tailles réalignées |
| C3 | Fragment `#top=…` (ou tout fragment contenant « p= » dans un autre mot) marquait `lienPersonnelVu` → le bandeau « Vos réglages n'ont pas pu être gardés » pouvait s'afficher sans raison | `app.js` : `lienPersonnelVu` ne passe à `true` que si `URLSearchParams.get('p')` existe réellement |
| C4 | Import de configuration sans limite de taille (fichier arbitraire lu en mémoire) | `app.js` : refus au-delà de 1 Mo avec message sobre |

### Importants

| # | Problème | Correction |
|---|----------|------------|
| I1 | `genererLienPersonnel` reprenait la query courante : un lien généré depuis un partage entrant (`?url=…`) embarquait l'adresse partagée dans le lien personnel | `app.js` : base nettoyée de `?` et `#` avant d'ajouter `#p=` |
| I2 | Config sans `pinHash` : le dialog PIN se comportait comme si un code existait — le technicien cherchait un code jamais accepté | `app.js` : message explicite « Aucun code n'est configuré » |
| I3 | `.vercelignore` n'excluait pas `node_modules/` — ajout d'`axe-core` en dépendance de test aurait livré `node_modules` sur Vercel | `.vercelignore` : `node_modules/` ajouté ; garde-fou dans `test_deploiement.py` |
| I4 | Serveur de test désaligné de `vercel.json` : `Cache-Control: max-age=0` au lieu de `no-cache`, `Permissions-Policy` tronquée | `tests/serveur.js` aligné ; `test_deploiement.py` vérifie désormais meta CSP ⊆ en-tête CSP et l'absence d'`unsafe-*` |
| I5 | Service worker : les navigations tombaient dans le cas générique « cache puis réseau » — hors ligne, une navigation non mise en cache (ex. `/?url=…` du share target) échouait | `sw.js` : branche `mode === 'navigate'` avec `ignoreSearch` et repli `./` ; cache v14 |
| I6 | Message d'erreur PIN jamais effacé entre deux essais (l'ancien « Code incorrect » restait affiché pendant la vérification) | `app.js` : vidé à la soumission ; rend mesurable le backoff — nouveau contrôle dans `test_technicien.py` |
| I7 | Aucun retour de focus sur Échap dans « Ajouter » et « Retirer » (le focus tombait sur `body`) | `app.js` : écouteurs `close` qui rendent le focus à la tuile/bouton déclencheur |

### Mineurs

| # | Problème | Statut |
|---|----------|--------|
| M1 | README affirmait « aucun appel réseau sortant » alors que `config.json` est lu en https et que le SW fait des requêtes même-origine | Corrigé : formulation « aucun appel vers des serveurs tiers » |
| M2 | README : `npm install` non documenté, suite `accessibilite` absente du tableau | Corrigé |
| M3 | Après « Quitter le mode technicien », le focus va sur `#titre` (h1 non focalisable) → retombe sur `body` | Restant — impact faible (la personne ne quitte pas ce mode seule) |

## Vérificateur d'adresses : ~70 tentatives de contournement

Toutes refusées correctement : `javascript:`, `data:`, `blob:`, `http:`,
`file:`, userinfo `https://user@ameli.fr`, ports non standard, IPv4/IPv6,
sous-domaines trompeurs (`impots.gouv.fr.evil.com`, `www.ameli.fr.secure-login.net`),
tirets (`impots-gouv-fr.com`), homoglyphes (`amelí.fr`, `impot.gouv.fr` variantes),
punycode (`xn--amel-9ra.fr`), raccourcisseurs (bit.ly, tinyurl…), hébergeurs
génériques (github.io, vercel.app, weebly…), majuscules, espaces, retours,
URL > 2000 caractères, `?`, `@` encodés, double slash, backslash.

Deux cas marqués « vert » après vérification manuelle — **non fautifs** : le
navigateur normalise réellement vers le domaine légitime (`ｗ` pleine chasse → `w`,
`%61meli.fr` → `ameli.fr`, `www.ameli.fr..` → `ameli.fr`). Le verdict vert
correspond donc au site réellement visité.

## PIN

- Comparaison par hachage SHA-256 (Web Crypto, repli JS pur en `file://`), jamais
  en clair ; rien n'est journalisé.
- Délai croissant vérifié en test : 1ᵉʳ échec ≈ 1,5 s, 2ᵉ ≈ 3 s (mesuré 3,3 s),
  plafond 9 s. Le message d'erreur est vidé à chaque soumission.
- `pattern="[0-9]{4}"` bloque le non-numérique nativement, le JS re-vérifie
  (double barrière — testé).
- Documenté : le PIN ne protège **pas** contre quelqu'un qui a la main sur le PC
  (le hachage est dans `config.json`, lisible).

## Fenêtres ouvertes

- `window.open(url, 'sitesMonAccueil', 'popup=yes,…')` puis `opener = null` +
  `rel="noopener"` sur le lien de repli ; COOP `same-origin`. La fenêtre ne
  reçoit aucune donnée (pas de postMessage, pas de paramètres).
- Si le site ouvert redirige sa propre fenêtre vers MonAccueil : aucun canal ne
  relie les deux contextes — la fenêtre afficherait juste l'accueil. Sans objet.

## Service worker

- Portée : racine du déploiement. `config.json` en réseau-d'abord (jamais de
  version obsolète tant que le réseau répond) ; les autres fichiers en
  cache-d'abord ; navigations avec repli hors ligne ; purge des anciens caches à
  l'activation ; `skipWaiting` + `clients.claim`.
- Liste de cache = 35 fichiers, vérifiée identique aux fichiers déployés par le
  garde-fou `deploiement`.
- Limite connue : `index.html`/`app.js` en cache-d'abord peuvent servir **une
  version de décalage** à la première visite après déploiement (le nouveau SW
  s'installe pendant ce chargement). Accepté : la fenêtre est d'un seul
  chargement et `config.json` est toujours frais.

## En-têtes et CSP

`Access-Control-Allow-Origin` : Vercel ajoute `ACAO: *` par défaut sur tous les
fichiers statiques. `vercel.json` le remplace par l'origine du site
(`https://monaccueil.vercel.app`). **Vérifié en conditions réelles** sur le
déploiement de prévisualisation (`vercel curl` + jeton de bypass) : `/`,
`/index.html`, `/app.js`, `/config.json`, `/sw.js`, `/icons/impots.svg`
renvoient tous `access-control-allow-origin: https://monaccueil.vercel.app`,
même avec un `Origin` hostile — le `*` n'apparaît nulle part. Garde-fou dans
`test_deploiement.py` (ACAO présent et ≠ `*`). Le serveur de test rejoue la
même valeur.

`vercel.json` et `tests/serveur.js` fournissent : CSP complète sans
`unsafe-*` ni source externe (`default-src 'none'`, `script-src 'self'`,
`style-src 'self'`, `img-src 'self'`, `frame-ancestors 'none'`,
`object-src 'none'`), `nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer`, `Permissions-Policy` restrictive, COOP
`same-origin`, `noindex`. Le meta CSP de `index.html` est un sous-ensemble
strict de l'en-tête (`frame-ancestors` ne peut pas figurer dans un meta —
c'est normal). Cohérence vérifiée par le test.

## Confidentialité

- Grep exhaustif : aucun `innerHTML`, `eval`, `Function`, `document.write`,
  `import(` dynamique. Construction DOM via `textContent` uniquement.
- Seules requêtes réseau : `config.json` et le cache SW, **même origine**,
  uniquement en https. Aucune en `file://`.
- Le fragment `#p=` n'atteint jamais le réseau (fragments non envoyés),
  est nettoyé par `history.replaceState` à la lecture, jamais journalisé.
  `genererLienPersonnel` ne contamine plus le lien avec `?url=`.
- `Referrer-Policy: no-referrer` + `<meta name="referrer">` : rien ne fuit
  dans les referrers vers les sites ouverts.
- `.gitignore` : `clients/`, `config.client*.json`, `sauvegardes/`, `*.csv`,
  `node_modules/`. Historique git : aucune donnée client — seuls `config.js`/
  `config.json` de démonstration (le numéro de téléphone réel du technicien y
  a été commité volontairement, cf. `1e411be`).

## Assertions de tests faibles ou discutables

| Suite | Assertion | Verdict |
|-------|-----------|---------|
| `perso` | « catalogue : 68 services », « 20 vignettes d'icônes » | Compteurs figés : casseront à chaque ajout. Garde-fou de régression assumé, mais ce ne sont pas des exigences produit |
| `fenetres` | « features popup + left calculé » | Teste la **chaîne** passée à `window.open`, pas la géométrie réelle (inobservable sous Playwright) — proxy nécessaire, pas une preuve de rendu |
| `fenetres` | « rel=noopener », « opener coupé » | Attributs = le mécanisme de sécurité réel ; légitime |
| `technicien` | « PIN non numérique : bloqué par pattern HTML5 » | Vérifie le blocage **natif** (le message JS n'est jamais atteint) — comportement voulu : la barrière HTML5 suffit, le JS est une seconde ligne |
| `technicien` | (avant) aucun contrôle du **délai croissant** | Ajouté : le 2ᵉ échec mesuré à 3,3 s > 2 s |
| `persistance` | « stockage bloqué » | Simulé en sabotant `Storage.prototype.setItem` via interception de route — approxime la navigation privée mais `getItem` reste fonctionnel ; pas une preuve sur vraie fenêtre privée |
| `persistance` | liens `#p=` | Testés via navigation complète sur nouvelle page (une navigation même-document ne recharge pas — limite réelle des navigateurs, correctement contournée) |
| `mobile`, `technicien` | appui long via `dispatchEvent('pointerdown')` | Ne prouve pas le geste tactile réel — vérifie seulement la logique JS |
| `journal` | « formule neutralisée » | Vérifie le préfixe `'` dans le CSV (anti-injection Excel) — mécanisme correct |

## Décisions d'architecture (signalées, non modifiées)

1. **`fetch('config.json')` même origine en https** — déroge au « zéro réseau »
   strict ; justifié (config locale à l'hébergement), désormais documenté
   précisément. Alternatives : tout embarquer dans `config.js` (perd la
   modification sans rebuild) ou Nebula/edge (ajoute une dépendance).
2. **`#p=` non chiffré** — lisible dans la barre d'adresse et l'historique avant
   nettoyage. Pour un lien « dossier client » c'est le bon compromis ; chiffrer
   exigerait une clé à gérer par le technicien.
3. **PIN local uniquement** — documenté comme insuffisant contre un attaquant
   ayant accès au PC (le hash voyage avec la config).
4. **Repli JS SHA-256** quand `crypto.subtle` est indisponible (`file://`,
   navigateurs anciens) — code embarqué, pas de dépendance.
5. **Cache-first SW** pour les assets — une version de décalage possible une
   fois après déploiement (voir « Service worker »).
6. **Numéro réel du technicien dans la config de démo** — commité sciemment
   (public sur l'activité).
7. **Site 100 % statique** — pas de backend ; conséquence directe de tous les
   points ci-dessus.

## Ce qui ne peut se vérifier que sur de vrais appareils

- Windows réel + Edge (géométrie de la fenêtre nommée, appui long souris),
- iPhone : purge IndexedDB à 7 jours, `navigator.storage.persist()` refusé par
  Safari, `tel:` qui déclenche l'app Téléphone, encart d'installation iOS,
- Android : bannière d'installation PWA réelle, share target depuis une vraie
  app « Partager »,
- Vercel réel : en-têtes effectifs, comportement du `?url=` en production,
- vraie imprimante (fiche senior), lecteur d'écran réel (NVDA, VoiceOver) —
  axe-core ne détecte pas tout,
- nettoyeurs type CCleaner sur l'origine `file://`, vraie navigation privée,
- coupure secteur entre deux sessions (déjà en CHECKLIST-TEST « A quater »).

## Résultat final

**`npm run verif` : 597 contrôles OK, 0 échec** (14 suites, 101 s).

| Suite | Contrôles |
|---|---|
| node-verification | 70 |
| node-palettes | 34 |
| deploiement | 28 |
| smoke | 26 |
| prenom | 51 |
| fenetres | 24 |
| design | 41 |
| perso | 70 |
| mobile | 108 |
| persistance | 51 |
| journal | 24 |
| verification | 24 |
| technicien | 17 |
| accessibilite | 29 |
