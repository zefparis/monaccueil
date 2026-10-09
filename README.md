# MonAccueil

Page d'accueil ultra simple pour personnes âgées : de gros boutons, chacun ouvre
directement le **vrai** site officiel dans un nouvel onglet. Rien d'autre.

- 100 % statique : aucun serveur, aucune dépendance, **aucun appel réseau vers
  des serveurs tiers**, aucun cookie, aucun compte, aucune donnée personnelle.
  Quand la page est hébergée en https, seules des requêtes **vers la même
  origine** existent : lecture de `config.json` et cache hors ligne du service
  worker. En `file://`, aucune requête du tout.
- Fonctionne en double-clic sur `index.html` (`file://`) ou hébergé tel quel.
- Installable (PWA) et consultable hors ligne quand elle est hébergée en https.

Ce document s'adresse au **technicien**. La personne âgée n'a rien à lire : elle
voit des boutons et un gros bouton rouge « J'ai besoin d'aide ».

---

## 1. Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page (CSP stricte) |
| `style.css` | Styles : 3 tailles de texte, contraste élevé, focus visible |
| `app.js` | Logique : rendu des tuiles, aide, réglages, mode technicien |
| `verification.js` | Analyse locale d'une adresse collée (tuile « Un message me paraît bizarre ») |
| `protection-telephone.js` | Contenu de la tuile « Protéger mon téléphone » : marques, chemins de réglages, conseils — **modifiable sans toucher à `app.js`** |
| `urgences.js` | Contenu du bloc « Urgences et arnaques » : règles anti-arnaque, dispositifs de signalement, numéros d'urgence — **modifiable sans toucher à `app.js`** |
| `config.json` | **La configuration** (prénom, technicien, tuiles, PIN, domaines, arnaques) |
| `config.js` | Copie de `config.json` lisible en `file://` (fallback) |
| `icones.js` | Icônes SVG inline (générées depuis `icons/`) |
| `icons/` | Pictogrammes SVG génériques (aucun logo de marque) |
| `manifest.webmanifest`, `sw.js` | Installation PWA + affichage hors ligne (https uniquement) |
| `install.bat` | Installation Windows dans `C:\MonAccueil` + raccourcis Bureau « Mon Accueil » et « Aide à distance » |
| `lancer-plein-ecran.bat` | Ouvre la page en mode application plein écran (Edge/Chrome) |
| `aide-a-distance.bat` | Cible du raccourci « Aide à distance » : lance Assistance rapide ou RustDesk selon `config.json` |
| `installer-rustdesk.bat` | (Optionnel) Procédure d'installation et de réglage sécurisé de RustDesk |
| `icons/*.ico` | Icônes Windows des raccourcis (générées par `outils/gen-ico.py`) |
| `CHECKLIST-TEST.md` | Checklist de test à faire chez le client |
| `outils/gen-icones.py` | Régénère `icones.js` si vous modifiez une icône |
| `outils/test-verification.js` | Tests de la vérification d'adresse : `node outils/test-verification.js` |
| `docs/` | Kit de test pilote : `fiche-senior.html` (A4 imprimable), `script-visite.md`, `questionnaire-retour.md`, `accord-test.md` |

---

## 2. Installation pas à pas (Windows 10 / 11)

1. Copiez le dossier `MonAccueil` sur une clé USB (ou téléchargez-le sur le PC).
2. **Avant** d'installer, personnalisez la configuration (voir § 3) : prénom,
   votre téléphone, URLs de la banque / des mails, et **changez le PIN**.
3. Double-cliquez sur `install.bat`. Il :
   - copie le dossier dans `C:\MonAccueil` ;
   - crée les raccourcis « Mon Accueil » et « Aide à distance » sur le Bureau ;
   - affiche les instructions pour la page d'accueil du navigateur.
4. Définissez la page d'accueil **et** la page de démarrage du navigateur sur :
   `file:///C:/MonAccueil/index.html`
   - **Edge** : Paramètres → Démarrer, Accueil et nouveaux onglets → « Ouvrir ces
     pages » → ajouter l'adresse. Activez aussi le bouton Accueil avec la même adresse.
   - **Chrome** : Paramètres → Au démarrage → « Ouvrir une page spécifique » →
     ajouter l'adresse. Apparence → Afficher le bouton Accueil → même adresse.
   - **Firefox** : Paramètres → Accueil → Page d'accueil → « Adresses personnalisées ».
5. Épinglez le navigateur à la barre des tâches, supprimez les autres icônes
   inutiles du Bureau. Testez avec la `CHECKLIST-TEST.md`.

### Variante « mode application plein écran »

`lancer-plein-ecran.bat` ouvre la page dans Edge (ou Chrome) avec `--app=` et
`--start-fullscreen` : pas de barre d'adresse, pas d'onglets. Les tuiles s'ouvrent
alors dans une fenêtre de navigateur normale, et MonAccueil reste derrière. Le
raccourci Bureau créé par `install.bat` pointe sur ce script. Vous pouvez aussi le
copier dans le dossier Démarrage
(`shell:startup`) pour qu'il se lance à l'allumage.

### Hébergement en ligne (optionnel)

Déposez le dossier tel quel sur n'importe quel hébergement statique en **https**.
La PWA devient installable (« Installer l'application » dans le navigateur) et la
page s'affiche même sans connexion. Dans ce cas `config.json` est lu en priorité
(puis `config.js` en secours).

---

## 3. Modifier la configuration

Deux méthodes : à la main dans `config.json`, ou via le mode technicien (§ 4).

### Structure de `config.json`

```json
{
  "prenom": "",
  "technicien": { "nom": "Benji", "telephone": "+33 7 58 06 05 56" },
  "pinHash": "03ac67…46f4",
  "domainesOfficiels": ["impots.gouv.fr", "ameli.fr", "..."],
  "raccourcisseurs": ["bit.ly", "tinyurl.com", "..."],
  "arnaques": [
    { "titre": "Le faux colis à régler", "texte": "Un SMS dit qu'un colis attend… (2 phrases max)" }
  ],
  "tuiles": [
    { "id": "impots", "label": "Impôts", "url": "https://www.impots.gouv.fr",
      "icone": "impots.svg", "couleur": "#1d4ed8" }
  ]
}
```

- `url` : doit commencer par `https://`. **Une tuile dont l'URL est vide n'est pas
  affichée** (c'est le cas par défaut de « Banque », « Mails », « Photos »).
- `icone` : un nom parmi `impots.svg, sante.svg, famille.svg, retraite.svg,
  administration.svg, medecin.svg, courrier.svg, banque.svg, mails.svg, photos.svg,
  meteo.svg, cle.svg, assistance.svg, aide.svg, telephone.svg, bouclier.svg,
  transport.svg, energie.svg, magasin.svg, tele.svg`.
- `couleur` : code hexadécimal à 6 chiffres. Choisissez des couleurs foncées
  (elle teinte la pastille d'icône et la bordure au survol).
- `groupe` *(facultatif)* : famille affichée au-dessus de la tuile —
  « Mes démarches », « Ma santé », « Mon quotidien » ou « Aide et sécurité »
  (choix dans le panneau technicien). Vide ou absent = déduit de l'`id` ;
  si aucune tuile n'a de groupe, la page rend une grille simple sans titres.
- `prenom` : prénom affiché après « Bonjour » ; laissez vide pour que la
  personne choisisse elle-même au premier lancement. **Priorité d'affichage** :
  prénom choisi par la personne (`localStorage`, clé `monaccueil.prenom`,
  jamais dans `config.json` ni dans l'export) > `prenom` de la config >
  « Bonjour » seul. Le lien « Choisir / Changer mon prénom » sous le titre
  rouvre le dialog ; « Plus tard » est mémorisé sans donnée. Le panneau
  technicien affiche le prénom choisi (lecture seule) et peut l'effacer.
- `modeTechnicien` : `true` par défaut (absent = actif). `false` désactive
  totalement le mode technicien : l'appui long sur le titre ne fait rien, aucun
  panneau n'est construit, rien ne le laisse deviner. Mettez `false` sur une
  instance **publique de démonstration**, `true` chez un vrai client (§ 10).
- `ouvertureSites` : `"fenetre"` (défaut) ou `"onglet"`. Avec `fenetre`, un clic
  de tuile ouvre le site dans une **fenêtre dédiée à droite** (~75 % de la
  largeur) — l'accueil reste visible à gauche, un autre clic réutilise la même
  fenêtre, et un bandeau explique comment revenir. Repli automatique sur un
  onglet si l'écran est étroit (< 1000 px) ou si la fenêtre est bloquée. Les
  tuiles restent de vrais liens : clic droit, Entrée et navigateurs sans
  `window.open` fonctionnent toujours. Sécurité : `w.opener` est coupé
  immédiatement (l'isolation `noopener` est préservée ; sans elle, la fenêtre
  nommée ne pourrait pas être réutilisée).
- `ouvertureMobile` : `"onglet"` (défaut) ou `"memeOnglet"`. Sur téléphone —
  détecté par **capacités** (pointeur grossier, écran étroit ou tactile
  principal, jamais par user-agent) — il n'y a pas de fenêtre dédiée : le lien
  natif `target="_blank" rel="noopener noreferrer"` s'applique, ce qui laisse le
  téléphone ouvrir l'application officielle s'il le souhaite. Avec
  `"memeOnglet"`, le site s'ouvre dans l'onglet courant et la flèche retour du
  téléphone ramène à l'accueil. Le bandeau de retour est adapté au tactile.
- `lienVisio` *(facultatif, vide par défaut)* : adresse `https://` d'appel
  vidéo, limitée aux domaines de `domainesOfficiels` (même validation que les
  tuiles). Si renseigné, un bouton « Rejoindre l'appel vidéo » apparaît dans
  « Besoin d'aide ? » sur téléphone uniquement.
- `numerosUrgence` : liste des numéros affichés dans la fenêtre d'aide sous
  « Si je ne réponds pas » — chacun devient un gros lien `tel:` cliquable.
  Format `{ "nom", "numero", "detail" }` : nom ≤ 40 caractères, numéro en
  chiffres/espaces (normalisé en `tel:` automatiquement), détail court ≤ 120
  caractères, 8 entrées maximum, entrées invalides ignorées. Par défaut :
  **Info Escroqueries `0 805 805 817`** (le service public « est-ce une
  arnaque ? »), 112, SAMU 15, Police 17, Pompiers 18. Éditable dans le mode
  technicien au format `Nom | numéro | explication` par ligne. Liste vide →
  la section disparaît de la fenêtre d'aide.
- `palette` *(facultatif)* : couleurs par défaut parmi `chaleureux` (défaut),
  `bleu`, `vert`, `violet`, `rose`, `gris`. La personne peut en choisir une
  autre via le lien « Changer les couleurs » (stockée dans `localStorage`,
  clé `monaccueil.palette`, prioritaire sur la config, jamais écrasée par une
  valeur invalide). Le mode contraste élevé ignore toujours la palette.
- `ajoutParPersonne` : `"catalogue"` (liste proposée seule), `"libre"`
  (défaut : catalogue + adresse libre, code PIN exigé si le domaine est
  inconnu) ou `"non"` (aucun lien, aucun dialog construit). Les cases ajoutées
  sont stockées dans `localStorage` (clé `monaccueil.perso`), affichées dans
  « Mon quotidien » après les cases de la config, limitées à 8, validées par
  le même schéma strict (https obligatoire, doublons refusés, icône en liste
  blanche, nom de 1 à 24 caractères). « Retirer mes boutons » ne touche que
  ces cases-là. Le catalogue est dans `catalogue.js` (ou remplacé par la clé
  `catalogue` de la config : même format que `tuiles` sans `couleur` ni
  `groupe`, plus la clé facultative `famille` qui regroupe les entrées sous
  un titre) ; ses domaines sont automatiquement reconnus par le vérificateur.
  L'export inclut une section séparée `personnalisation` (palette + cases),
  restaurée dans `localStorage` à l'import après revalidation — jamais
  mélangée à `tuiles`.
- `domainesOfficiels` : liste de domaines « connus ». Toute URL hors liste déclenche
  un avertissement en mode technicien (elle reste autorisée). Ajoutez-y la banque
  et la messagerie du client. **C'est aussi la liste de référence de la tuile
  « Un message me paraît bizarre »** (§ 6) : une adresse collée est « sûre » seulement
  si son domaine y figure. Règles strictes :
  - n'y mettez que le **domaine exact du service** (ex. `impots.gouv.fr`), jamais un
    domaine proche « par commodité » ;
  - **jamais d'hébergeur générique** où n'importe qui peut publier une page
    (`wixsite.com`, `github.io`, `blogspot.com`, `netlify.app` et équivalents) : un
    faux site y passerait au **vert**.
- `raccourcisseurs` : domaines de raccourcisseurs d'adresses (bit.ly…). Une adresse
  de ce type est toujours signalée en rouge.
- `domainesOfficiels` et `raccourcisseurs` n'acceptent que des noms de domaine nus
  (lettres, chiffres, tirets, au moins un point ; jamais `http://`, port ou chemin) :
  une entrée invalide bloque « Enregistrer et appliquer » et est ignorée à l'import.
- `arnaques` : liste affichée dans « Les arnaques du moment ». Chaque entrée a un
  `titre` (80 caractères max) et un `texte` (2 phrases, 300 caractères max).
- `aideDistance` : `{ "actif": true, "outil": "quickassist" | "rustdesk", "idRustdesk": "" }`.
  Voir § 5. Si `actif` est `false`, la tuile « Aide à distance » n'apparaît pas.
- `protectionTelephone` : `true` par défaut (absent = actif). `false` masque la
  tuile « Protéger mon téléphone » (§ 6 bis). Case présente dans le panneau
  technicien ; les étapes cochées par la personne (`localStorage`, clé
  `monaccueil.protection`) sont lisibles en lecture seule dans le panneau,
  incluses dans le lien personnel `#p=` et la section `personnalisation` de
  l'export (section séparée, revalidée à l'import).
- `blocUrgences` : `true` par défaut (absent = actif). `false` masque tout le bloc
  « Urgences et arnaques » : la tuile, le bouton « Urgence » de la barre mobile,
  l'entrée depuis « Un message me paraît bizarre » et l'alerte du moment (§ 6 ter).
- `contactsConfiance` : jusqu'à 3 contacts `{ "prenom": "Monique", "numero":
  "06 11 22 33 44" }` affichés dans l'écran « Urgence santé » (« Appeler mon
  proche »). Schéma strict : prénom en lettres, numéro au format téléphone,
  entrées invalides ignorées. Donnée de la configuration (technicien), jamais
  mélangée à la personnalisation locale de la personne.
- `alerte` : `{ "actif": bool, "titre": "≤ 80 caractères", "texte": "≤ 200
  caractères" }`. Bandeau sobre en haut de l'accueil, fermable ; il revient si
  le texte change (le navigateur compare un haché du contenu, clé
  `monaccueil.alerte.vue`). Texte brut uniquement : aucune balise.
- `statistiques` : section ajoutée par l'export (§ 6), ignorée à l'import.

Si `raccourcisseurs` ou `arnaques` manquent (configuration d'un ancien client), les
valeurs de `config.js` sont utilisées.

> **Important en `file://`** : les navigateurs n'autorisent pas la lecture de
> `config.json` depuis un fichier local. C'est `config.js` qui est utilisé. Après
> une modification manuelle de `config.json`, **reportez-la dans `config.js`**
> (même contenu, précédé de `window.MONACCUEIL_CONFIG = ` et suivi de `;`), ou
> utilisez simplement « Exporter la configuration » du mode technicien, qui
> produit les deux fichiers.

---

## 4. Mode technicien

### Entrer

1. **Maintenez le clic (ou le doigt) 3 secondes** sur le titre « Bonjour … ».
2. Saisissez le **code PIN à 4 chiffres** (par défaut `1234`).

Rien n'indique ce geste à l'écran : il est introuvable par hasard.

> ⚠️ **Ce que le PIN protège — et ne protège pas.** Le PIN empêche une **fausse
> manipulation** (la personne âgée qui clique au hasard, un enfant qui joue avec
> l'écran). Il ne protège **pas contre un attaquant** : le code par défaut `1234`
> figure dans ce README, et le hash `pinHash` est servi publiquement — quiconque
> lit la configuration peut en deviner la valeur par force brute (4 chiffres).
> Sur une instance hébergée (§ 10), considérez le mode technicien comme une
> fonction de **démonstration**, pas comme une barrière de sécurité.

Le panneau a deux onglets : **Configuration** (ci-dessous) et **Journal des
interventions** (§ 4 bis).

### Ce que vous pouvez faire (onglet Configuration)

- Modifier le prénom, le nom et le téléphone du technicien.
- Ajouter / supprimer / renommer une tuile, changer son URL, sa couleur, son icône.
- Réordonner avec **▲ Monter / ▼ Descendre**.
- Modifier la liste des domaines officiels.
- Activer/désactiver la tuile « Aide à distance », choisir l'outil, noter l'ID RustDesk.
- Mettre à jour les « arnaques du moment », la liste des raccourcisseurs, et lire les
  deux compteurs de la tuile « Un message me paraît bizarre » (§ 6).
- **Changer le code PIN**.
- **Enregistrer et appliquer** : vérifie tout (https obligatoire, libellé non vide,
  avertissement si domaine inconnu), puis mémorise la configuration **dans le
  navigateur de ce PC** (localStorage) et met à jour l'écran immédiatement.
- **Exporter la configuration** : télécharge `config.json` **et** `config.js`.
  Copiez les deux dans `C:\MonAccueil` (remplacez les anciens). Ainsi la
  configuration survit à un nettoyage du navigateur ou à une réinstallation.
- **Sauvegarde de cette configuration** : télécharge uniquement `config.json`
  tel qu'appliqué, avec le rappel de le ranger dans le dossier MonAccueil du
  client.
- **Importer une configuration** : charge un `config.json` (ou `config.js`).
- **Revenir au fichier d'origine** : oublie les modifications locales et relit les
  fichiers du dossier.
- **Lien personnel** : « Générer le lien personnel de cette personne » produit un
  lien `…/index.html#p=…` qui contient (encodés, sans serveur) le prénom, la
  palette, les boutons ajoutés et les réglages d'affichage. Option « Inclure le
  prénom » cochée par défaut. Ce lien est la **procédure de récupération** si le
  navigateur efface ses données : définissez-le comme page d'accueil et favori.
  Il ne restaure rien si le stockage contient déjà des choix — sauf avec
  `&force=1` ajouté par vos soins. Attention : il contient le prénom et les
  boutons de la personne — dossier client uniquement, jamais en public.
- **Diagnostic du stockage** : état réel de `localStorage` (écriture, lecture,
  suppression testées), d'`IndexedDB`, du mode standalone/onglet, de l'origine,
  du résultat de `navigator.storage.persisted()` et du quota utilisé.
- **Quitter le mode technicien** (bouton en haut et en bas).

### 4 bis. Onglet « Journal des interventions »

Un carnet de suivi **réservé au technicien** : il n'apparaît jamais sur l'écran de
la personne, n'est pas inclus dans `config.json` et ne quitte jamais le PC sauf par
votre export CSV.

- **Formulaire** : date (aujourd'hui par défaut), durée en minutes (1 à 1440), lieu
  (sur place / à distance), motif (dépannage, installation, formation, arnaque évitée,
  autre) et note courte (200 caractères max). Au-dessus de la note, le rappel
  « Ne notez aucun mot de passe, numéro ou donnée personnelle. » Respectez-le : le
  journal est en clair dans le navigateur du client.
- **Résumé** en haut : nombre d'interventions, temps total, temps moyen, répartition
  par motif et par lieu.
- **Liste** triée par date (la plus récente en premier) ; « Supprimer » demande
  confirmation.
- **Exporter le journal (CSV)** : fichier `journal-interventions-AAAA-MM-JJ.csv`,
  séparateur `;`, UTF-8 avec BOM (s'ouvre directement dans Excel français), colonnes
  `date;duree_minutes;lieu;motif;note`. Toute cellule commençant par `=`, `+`, `-`
  ou `@` est préfixée d'une apostrophe pour qu'aucun tableur ne l'exécute comme formule.
- **Importer un journal (CSV)** : validation stricte, tout ou rien. Refusé si le
  fichier dépasse 200 Ko, si la première ligne n'est pas exactement
  `date;duree_minutes;lieu;motif;note`, si une ligne n'a pas 5 colonnes, si une date,
  une durée, un lieu, un motif ou une note est invalide (le numéro de ligne est
  indiqué). Les lignes identiques à une ligne existante sont ignorées (fusion sans
  doublon) ; 5 000 lignes maximum.
- Stockage : clé `monaccueil.journal` du navigateur (`try/catch` : si le stockage est
  indisponible, un avertissement vous invite à exporter). Le journal est **propre au
  PC du client** : exportez-le à la fin de chaque visite et archivez le CSV dans la
  fiche client.

### Changer le PIN

Dans le mode technicien, section « Code PIN » : tapez 4 chiffres → « Changer le code
PIN » → « Enregistrer et appliquer » → « Exporter » et remplacez les fichiers.

Pour le faire à la main : calculez le SHA-256 du code et collez-le dans `pinHash`.

```powershell
# Windows PowerShell
$s=[Security.Cryptography.SHA256]::Create(); -join ($s.ComputeHash([Text.Encoding]::UTF8.GetBytes("1234")) | % { $_.ToString("x2") })
```
```bash
# Linux / macOS
printf '1234' | sha256sum
```

Le PIN n'est jamais stocké en clair. Il protège contre une modification
accidentelle par la personne âgée, pas contre un attaquant disposant du PC.

### Mettre à jour les liens

Si un site officiel change d'adresse : mode technicien → modifiez l'URL de la tuile
(vérifiez qu'elle est bien en `https://` et sur le bon domaine) → Enregistrer →
Exporter → remplacer `config.json` et `config.js` dans `C:\MonAccueil`.

---

## 5. Aide à distance

### Principe (non négociable)

Le lien discret **« Comment ça marche ? »**, sous le prénom, ré-affiche à tout
moment les 3 gestes de base (toucher une tuile → revenir à l'accueil → bouton
rouge), avec le texte adapté à l'écran (croix sur PC, flèche retour sur
téléphone) et le rappel anti-arnaque. C'est la fiche senior, toujours à portée
de main.

Le senior **initie et accepte** toujours la connexion. Rien n'est embarqué dans
MonAccueil : la tuile « Aide à distance » ouvre seulement une fenêtre d'explications
en 4 étapes (appeler → double-cliquer le raccourci Bureau → échanger le code →
Autoriser). Le raccourci Bureau lance un logiciel **séparé**, installé sur le PC.
Aucun accès caché, aucun accès permanent, aucun mot de passe stocké où que ce soit.

La fenêtre affiche aussi ce rappel au client : *« Je ne vous demanderai jamais
d'ouvrir l'aide à distance sans que vous m'ayez appelé. Si quelqu'un d'autre vous le
demande, refusez et raccrochez. »* Répétez-le à chaque visite : c'est la meilleure
protection contre les faux « supports Microsoft ».

### Choix de l'outil

| | Assistance rapide Windows (`quickassist`) | RustDesk (`rustdesk`) |
|---|---|---|
| Installation | Déjà dans Windows 10 ; Store sur Windows 11 (gratuit) | À installer (libre, AGPL, gratuit y compris en pro) |
| Compte requis | Le **technicien** doit se connecter avec un compte Microsoft ; le client non | Aucun |
| Déroulé | Vous générez un code à 6 caractères, le client le tape puis clique **Autoriser** | Le client vous lit son **ID** et son **mot de passe temporaire**, puis clique **Accepter** |
| Idéal pour | Dépannage ponctuel sans rien installer | Clients réguliers, meilleure qualité, pas de dépendance Microsoft |

**Licences** : n'utilisez **pas** les versions gratuites d'AnyDesk ou TeamViewer pour
une activité professionnelle, même occasionnelle : leurs licences gratuites sont
réservées à l'usage privé, et les sessions sont rapidement détectées puis bloquées.
Assistance rapide et RustDesk sont utilisables gratuitement en usage pro.

Les textes des étapes 3 et 4 de la fenêtre s'adaptent automatiquement à l'outil
choisi (code à taper pour Assistance rapide, code à lire pour RustDesk).

### Procédure côté technicien

**Assistance rapide**
1. Le client vous appelle. Ouvrez Assistance rapide sur votre PC → « Aider une
   personne » → connectez-vous à votre compte Microsoft → un code s'affiche.
2. Dites au client de double-cliquer sur « Aide à distance » (le raccourci lance
   `quickassist.exe`, ou le Store s'il manque sur Windows 11).
3. Dictez le code ; le client le tape et clique « Envoyer », puis « Autoriser ».
4. Demandez le contrôle total seulement si nécessaire ; il devra l'accepter aussi.
5. À la fin, cliquez « Quitter » devant lui et confirmez-lui que c'est terminé.

**RustDesk**
1. Installez RustDesk sur le PC du client avec `installer-rustdesk.bat` (procédure
   affichée) et réglez : mot de passe **unique/temporaire**, « Accepter les sessions
   via clic », pas de démarrage automatique, pas d'accès sans surveillance.
2. Mode technicien → outil « RustDesk », notez l'ID du poste → Enregistrer → Exporter.
3. Le client vous appelle et double-clique « Aide à distance » (lance RustDesk, ou
   affiche un message clair s'il n'est pas installé).
4. Il vous lit son ID et son mot de passe temporaire ; vous vous connectez ; il
   clique « Accepter ».
5. Fermez la session à la fin, devant lui.

### Bonnes pratiques de consentement

- Toujours un appel téléphonique **du client** avant toute session.
- Jamais de mot de passe permanent ni d'accès non surveillé sans **accord écrit et
  signé** du client, conservé dans son dossier ; même avec accord, préférez l'accès
  à la demande.
- Annoncez ce que vous faites pendant la session, ne touchez pas aux données
  personnelles sans le dire, et terminez la session visiblement.
- Notez chaque intervention (date, durée, motif) dans l'onglet Journal (§ 4 bis) et
  exportez-le dans la fiche client.

### Sur téléphone

Sur téléphone, la tuile devient « Besoin d'aide ? » et affiche 3 étapes simples :
appeler le technicien, décrire ce qui s'affiche, partager l'écran en appel vidéo
uniquement si le technicien le demande (bouton « Rejoindre l'appel vidéo » si
`lienVisio` est renseigné). Il n'y a **pas** de prise de contrôle à distance sur
téléphone dans l'application :

- **Android** : RustDesk existe sur Android, mais il doit être **installé et
  autorisé par la personne elle-même**, à chaque session — jamais d'accès
  permanent ni de démarrage automatique.
- **iPhone** : Apple n'autorise pas le contrôle à distance — seule l'appel vidéo
  avec partage d'écran est possible.
- Le consentement est toujours **oral** et à l'initiative de la personne.

---

## 6. Tuile « Un message me paraît bizarre »

Tuile fixe (orange foncé, icône bouclier), toujours présente. Elle n'ouvre aucun site :
un clic affiche une grande fenêtre en 5 blocs, utilisable au clavier (Tab, Entrée, Échap).

1. **Posez-vous 3 questions** : argent / code / mot de passe ? pression ? inattendu ?
   « Si la réponse est oui à UNE seule question : ne cliquez pas, ne répondez pas,
   appelez-moi. » À lire à voix haute avec le client lors de l'installation.
2. **Vérifier une adresse** : le client colle l'adresse d'un lien (clic droit → copier
   l'adresse du lien, ou recopie depuis un SMS) et clique « Vérifier ». **Le lien n'est
   jamais ouvert ni chargé** : `verification.js` lit seulement le texte, extrait le nom
   de domaine (`new URL`) et le compare à `domainesOfficiels` (domaine identique ou
   vrai sous-domaine, c'est-à-dire se terminant par `.domaine`). Sont signalés en rouge :
   sous-domaine trompeur (`impots.gouv.fr.autre-site.com`), nom qui imite un officiel
   (`impots-gouv-fr.com`), faute de frappe proche (`amelie.fr`, distance de Levenshtein),
   caractères déguisés (`xn--`), adresse IP, présence de `@`, `http://` sans s, port
   inhabituel, raccourcisseur, schéma non web (`mailto:`, `javascript:`), adresse
   malformée ou texte avec espaces. Majuscules, espaces autour, guillemets, port `:443`,
   adresse sans `https://` et chemins longs sont tolérés.
   - **Bouton « Coller l'adresse »** : lit le presse-papiers
     (`navigator.clipboard.readText`, sur action directe uniquement) puis lance
     la vérification. Si la permission est refusée ou l'API absente, le collage
     manuel (appui long → Coller) reste la voie normale.
   - **« Partager vers Mon Accueil » (Android)** : le manifest déclare un
     `share_target` (`GET`, paramètres `url` et `text`). Partager un lien ou un
     message vers l'application ouvre directement le vérificateur, pré-rempli :
     l'adresse reçue est tronquée à 2048 caractères, extraite du texte
     environnant, soumise au même vérificateur, **jamais ouverte ni stockée**,
     et retirée de la barre d'adresse (`history.replaceState`).
   - **Vert** : « Cette adresse est bien celle d'un site officiel de la liste. » suivi,
     toujours, de « Attention : le site est le vrai, mais le message qui vous l'a envoyé
     peut quand même être une arnaque. En cas de doute, appelez-moi. »
   - **Rouge** : « Cette adresse n'est PAS dans la liste. Ne cliquez pas. Appelez-moi. »
     avec la ou les raisons en clair. Le verdict est toujours écrit en toutes lettres
     (SÛR / DANGER), jamais porté par la couleur seule.
   Le champ et le résultat sont effacés à la fermeture (bouton ou Échap).
3. **Les arnaques du moment** : liste `arnaques` de la configuration, à mettre à jour
   à chaque visite depuis le mode technicien (titre + 2 phrases max). Elle comprend
   le **faux mail d'alerte de connexion** (FranceConnect, impôts, Ameli).
4. **J'ai reçu un mail d'alerte de connexion** : rappel en gros caractères — si la
   démarche vient d'être faite, ne cliquer sur rien ; sinon, ne cliquer aucun lien
   du mail, ouvrir FranceConnect depuis l'accueil, regarder le tableau de bord et
   appeler le technicien. **Ne jamais désactiver ces alertes.** Vérifié le 9 octobre
   2026 sur aide.franceconnect.gouv.fr (alerte mail en cas de connexion inhabituelle,
   historique consultable sur le tableau de bord FranceConnect). Bouton
   « Appeler [technicien] » à côté. Au retour de la tuile **FranceConnect**, le
   bandeau de retour ajoute : « Vous pouvez recevoir un mail de confirmation. »
5. **Appeler [technicien]** (lien `tel:`) et **Fermer**.

**Compteurs** : seuls deux nombres sont mémorisés dans le navigateur (`try/catch`) :
nombre de vérifications et nombre de résultats rouges. **Aucune adresse saisie n'est
conservée ni envoyée.** Les compteurs s'affichent dans le mode technicien et sont joints
à l'export dans une section séparée `statistiques` (ignorée à l'import). Ils vous
permettent, lors d'une visite, de savoir si le client utilise l'outil et s'il reçoit
beaucoup de messages douteux.

**Tests** : `node outils/test-verification.js` rejoue 70 cas pièges (majuscules, ports,
chemins longs, sans https, espaces, malformées, punycode, `@`, IP…) à partir des
listes de `config.json`. À relancer après toute modification de `verification.js`.

> La liste `domainesOfficiels` est la seule référence : un site légitime qui n'y figure
> pas sera signalé rouge. C'est voulu (« dans le doute, appelez-moi »). Ajoutez-y les
> sites personnels du client (banque, messagerie, mutuelle…).

---

## 6 bis. Tuile « Protéger mon téléphone »

Tuile fixe du groupe « Aide et sécurité » (mobile et PC). Elle n'ouvre aucun site :
un clic affiche un dialog en 3 écrans, utilisable au clavier.

1. **« Quel téléphone avez-vous ? »** : grosses vignettes iPhone, Samsung,
   Xiaomi / Redmi / POCO, Pixel ou autre Android, et « Je ne sais pas »
   (« Appelez-moi, je regarde avec vous » + lien `tel:`). Sur mobile, une
   pré-sélection **prudente par capacités** peut cocher iPhone (jamais par
   user-agent seul, toujours modifiable).
2. **Les réglages de la marque**, un par écran : phrase d'action courte +
   chemin des menus en gras, ligne « Dernière vérification : [date] », case
   « C'est fait » mémorisée dans `localStorage` (`try/catch`, aucune donnée
   sensible).
3. **Conseils communs** : enregistrer les contacts importants avant de silencer
   les inconnus, vérifier la liste des appels filtrés une fois par semaine,
   rappel « ne donnez jamais un code reçu par SMS », signalement **33700**
   (transférer le SMS frauduleux ; pour un appel, SMS « spam vocal » suivi du
   numéro — ce n'est pas un blocage immédiat). Aucun prix, aucune application
   payante citée.

**Contenu** : tout vit dans `protection-telephone.js` (un objet par marque :
`nom`, `verifie` = date de vérification, `etapes` = id + action + chemin de
menus + note facultative). Les intitulés français exacts sont à corriger après
vérification sur de vrais téléphones — modifiables sans toucher à `app.js`.

**État mémorisé** : clé `monaccueil.protection` = `{ "m": "<marque>",
"f": ["<étapes cochées>"] }`, scopée à la marque. Restaurée depuis le lien
personnel `#p=` et la section `personnalisation` de l'export, après revalidation
(marque connue, ids existants, entrées invalides filtrées). Lisible en lecture
seule dans le panneau technicien ; `protectionTelephone: false` masque la tuile.

**Test** : `node outils/test-protection.js` vérifie que chaque marque a une date
de vérification et au moins un réglage, que les chemins ont ≥ 2 menus, qu'il n'y
a ni HTML ni prix. Relancé par `npm run verif`.

---

## 6 ter. Bloc « Urgences et arnaques »

Tuile fixe du groupe « Aide et sécurité » (PC) et bouton **« Urgence »** de la
barre fixe du bas (mobile, violet — distinct de l'orange « Appeler » et du rouge
d'aide). Un seul dialog, trois écrans, tout hors ligne :

1. **« Quelqu'un de suspect au téléphone »** (aussi accessible depuis la tuile
   « Un message me paraît bizarre ») : les 3 règles en gros (« Raccrochez
   maintenant. Une banque ne vous demande jamais un code, un virement ou
   d'installer une application. Rappelez vous-même le numéro au dos de votre
   carte. »), puis « Appeler [nom du technicien] » avec le numéro écrit en clair.
2. **« J'ai été piégé »** : texte sans jugement, 4 étapes (opposition à la
   banque, ne rien supprimer, signaler, appeler le technicien) puis les
   dispositifs officiels : **Perceval** (carte utilisée en ligne, après
   opposition), **33700** (SMS et appels frauduleux), **Info Escroqueries
   0 805 805 817**, **THESEE** (plainte en ligne arnaques internet),
   **PHAROS**, et le dépôt de plainte en commissariat/gendarmerie. Ligne
   « Dernière vérification » affichée.
3. **« Urgence santé »** : gros boutons d'appel **15** (SAMU), **18** (pompiers),
   **112** (urgence européen), **114** (urgence par SMS, sourds et
   malentendants), puis « Appeler mon proche » avec jusqu'à 3 contacts de la
   config (`contactsConfiance`). Ligne fixe : « Mon Accueil est une aide, pas
   un service d'urgence. En cas de danger, appelez le 112. » Le numéro du
   technicien n'y figure jamais.

**Numéros et dispositifs vérifiés** le 8 octobre 2026 sur les sources
officielles : service-public.gouv.fr (Perceval : fiche R46526 ; THESEE via Ma
Sécurité), masecurite.interieur.gouv.fr, arcep.fr et 33700.fr. Aucun numéro non
confirmé par une source officielle n'est affiché.

**Contenu** : tout vit dans `urgences.js` (`window.MONACCUEIL_URGENCES`),
revalidé à chaque affichage (textes bornés, aucun HTML) — modifiable sans
toucher à `app.js`. Mettez la ligne `verifie` à jour après toute correction.

**Alerte du moment** : bandeau sobre en haut de l'accueil (`alerte` dans la
config, éditable dans le panneau technicien), fermable ; il réapparaît si le
texte change.

**Test** : `node outils/test-urgences.js` + `tests/suites/test_urgences.py`
(73 contrôles : écrans, clavier, contacts hostiles, alerte, `blocUrgences`
à `false`). Relancés par `npm run verif`.

---

## 7. Dupliquer pour un nouveau client

1. Copiez le dossier `MonAccueil` d'origine (celui du dépôt, pas celui d'un client).
2. Ouvrez `index.html`, passez en mode technicien, renseignez prénom, téléphone,
   banque, mails, photos, et changez le PIN.
3. « Exporter la configuration », remplacez `config.json` et `config.js` dans le
   dossier copié.
4. Lancez `install.bat` sur le PC du client, puis la `CHECKLIST-TEST.md`.

Gardez une copie du `config.json` de chaque client dans vos archives : en cas de
changement de PC, il suffit de le réimporter.

---

## 8. Mise à jour de l'application

Remplacez tous les fichiers **sauf** `config.json` et `config.js` du client. Si la
page est hébergée en https, incrémentez `VERSION` dans `sw.js` pour forcer le
rafraîchissement du cache hors ligne.

## 9. Sécurité et confidentialité (rappel)

- Aucun mot de passe, identifiant ou donnée sensible n'est saisi ni stocké. L'adresse
  collée dans « Vérifier une adresse » est analysée en mémoire, jamais ouverte, jamais
  conservée ; seuls deux compteurs anonymes sont mémorisés.
- Aucun script externe, aucune police web, aucun CDN, aucune statistique.
- `Content-Security-Policy` stricte, textes de la configuration insérés via
  `textContent` uniquement, liens `rel="noopener noreferrer"`, `https://` obligatoire.
- Les seules choses mémorisées dans le navigateur : taille du texte, contraste, les deux
  compteurs de vérification et, après usage du mode technicien, la configuration (sans
  aucune donnée sensible) et le journal des interventions (sans donnée personnelle :
  c'est à vous d'y veiller).
- L'export CSV du journal neutralise les cellules commençant par `=`, `+`, `-`, `@`
  (injection de formule) et l'import rejette tout fichier hors format.
- L'aide à distance n'est jamais embarquée dans l'app : un raccourci Bureau lance un
  logiciel séparé, et seul le client peut ouvrir et accepter une session.
- Le PIN du mode technicien est un garde-fou d'usage, pas un secret : voir § 4.

## 10. Version hébergée (Vercel)

Le site peut être hébergé en https — par exemple chez Vercel — pour servir de
**démonstration** ou d'accueil de dépannage distant. Le dépôt ne contient qu'une
configuration générique : prénom **vide** (la personne choisit le sien au
premier lancement), technicien « Benji » avec son numéro professionnel
(public), aucune donnée client.

### Fichiers ajoutés pour l'hébergement

| Fichier | Rôle |
|---|---|
| `vercel.json` | En-têtes HTTP de sécurité (CSP `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Permissions-Policy`, `noindex`…) et règles de cache |
| `.vercelignore` | N'envoie sur Vercel que ce dont la page a besoin (ni `outils/`, ni `docs/`, ni les `.bat`, ni les `.md`) |
| `robots.txt` | Interdit l'indexation (instance de démonstration) |
| `installer.html` (+ `installer.css`) | Fiche technicien « installer en 2 minutes » : servie sur le même domaine (`/installer.html`), cachée par le service worker |

### Connexion du dépôt (à faire dans l'interface Vercel)

1. Sur vercel.com : **Add New → Project → Import Git Repository**, choisissez ce
   dépôt GitHub.
2. **Framework preset : Other** — il n'y a rien à construire.
3. **Build command : vide**, **output directory : la racine** (par défaut).
   Les fichiers sont servis tels quels.
4. Deploy : le site est en ligne avec les en-têtes de `vercel.json`.
5. **Protection** : dans *Settings → Deployment Protection*, activez la
   protection des déploiements de prévisualisation (les URL `*-git-*.vercel.app`
   ne doivent pas être publiques).
6. Domaine personnalisé facultatif : *Settings → Domains*.

### Mettre à jour un lien

Modifiez `config.json` (ou le mode technicien → exporter), committez et poussez :
Vercel redéploie automatiquement. `config.json` est servi en `no-cache` et relu
à chaque chargement : un lien corrigé arrive immédiatement.

### ⚠️ Attention au stockage navigateur

Le stockage de `file:///…/index.html` et celui de `https://votre-site.vercel.app`
sont **deux navigateurs-storage séparés** : configuration, réglages d'affichage,
compteurs et journal enregistrés chez le client **ne se retrouveront pas** sur la
version hébergée, et inversement. Avant de basculer un poste de l'un à l'autre :

1. Exportez la configuration (mode technicien → onglet Configuration →
   **Exporter**), gardez les deux fichiers.
2. Exportez le journal (onglet Journal → **Exporter le journal**).

#### Pourquoi le prénom peut disparaître — et ce qui est en place

Le stockage navigateur peut être vidé malgré nous : option « effacer les données
à la fermeture », nettoyeurs type CCleaner, navigation privée/InPrivate, et sur
iPhone/iPad une purge automatique après 7 jours sans visite. Trois protections
locales (aucune donnée ne quitte la machine) :

- **Double écriture** : prénom, palette, boutons ajoutés et réglages sont écrits
  dans `localStorage` **et** dans `IndexedDB` (base `monaccueil`, enregistrement
  unique versionné). Au chargement, la source encore pleine re-sème l'autre —
  chaque donnée relue repasse par la validation stricte.
- **`navigator.storage.persist()`** est demandé après la première action de la
  personne (clic sur une tuile, prénom validé) : si le navigateur l'accepte, il
  n'efface plus le stockage tout seul. Le bloc « Diagnostic du stockage » du
  mode technicien indique si la demande a été acceptée.
- **Lien personnel `#p=`** (voir § 4) : le plan de secours. Mettez-le en page
  d'accueil *et* en favori ; si tout est effacé, son ouverture réhydrate la
  personnalisation. Rien n'est écrasé quand des choix existent déjà (sauf
  `&force=1` ajouté par le technicien).

Si même l'écriture est impossible (navigation privée, stockage bloqué), un
bandeau sobre s'affiche : « Vos réglages n'ont pas pu être gardés sur cet
ordinateur. Appelez-moi, je règle ça en 2 minutes. » avec le bouton Appeler.
Vérifiez alors le réglage « effacer à la fermeture » du navigateur.

### ⚠️ Le mode technicien en version hébergée

Le PIN et son hash sont publics (voir § 4) : sur une instance publique le mode
technicien ne doit pas être joignable. C'est pourquoi la configuration livrée
dans le dépôt a **`"modeTechnicien": false`** : l'appui long est inerte, aucun
panneau n'est construit, rien ne laisse deviner le mode. Pour une instance d'un
**vrai client**, passez la clé à `true` dans `config.json` **et** `config.js`.

### Installer chez un client en moins de 2 minutes (hébergé)

Sans clé USB ni script :

1. Sur le PC du client, ouvrez `https://votre-site.vercel.app/installer.html`
   et suivez la fiche : ouvrir l'adresse dans Edge/Chrome → « Installer ce site
   comme application » → vérifier l'icône sur le Bureau.
   La bannière « Installer Mon Accueil sur cet ordinateur » (visible tant que
   l'app n'est pas installée ou fermée) fait la même chose en un clic.
2. Préparez `config.json` + `config.js` du client (prénom, banque, courriels,
   `modeTechnicien: true`, PIN) et copiez-les sur un dossier `C:\MonAccueil` —
   ou importez-les via le mode technicien puis « Sauvegarde de cette
   configuration ».
3. Réglez la page de démarrage du navigateur sur l'adresse (les 3 lignes de
   secours figurent sur la fiche).

Le dialog « Aide à distance » adapte son étape 2 : raccourci Bureau en
`file://`, « touche Windows → tapez Assistance rapide (ou RustDesk) » en https.

## 11. Tests automatisés

Les suites de vérification vivent dans `tests/` (dossier **exclu du déploiement**
par `.vercelignore` : rien de tout cela n'est livré au site).

### Installation (une fois)

```bash
python3 -m pip install -r tests/requirements-test.txt
python3 -m playwright install chromium
npm install           # dépendances de test uniquement (axe-core pour l'accessibilité)
```

Node.js doit être présent (tests unitaires + serveur de test). Les paquets
npm (`axe-core`) et `node_modules/` sont **exclus du déploiement** et ne
servent qu'aux tests. Aucune dépendance n'est nécessaire à l'application
elle-même.

### Lancer l'ensemble

```bash
npm run test        # ou : python3 tests/run_all.py
npm run verif       # même chose — à lancer avant chaque commit
```

`run_all.py` démarre `tests/serveur.js` (serveur statique sans dépendance qui
rejoue les en-têtes de `vercel.json` : CSP, X-Frame-Options…), exécute les
tests Node puis chaque suite Playwright, et termine par un résumé
(contrôles par suite, échecs, durée). **Code de sortie non nul si le moindre
contrôle échoue** — bloque avant commit.

### Suites

| Suite | Contenu |
|---|---|
| `node-verification` | 70 cas unitaires du vérificateur d'adresses |
| `node-palettes` | 34 combinaisons de contraste des palettes |
| `node-protection` | 56 contrôles du contenu `protection-telephone.js` (date de vérif, réglages, chemins ≥ 2 menus, ni HTML ni prix) |
| `deploiement` | garde-fou : `.vercelignore`, inventaire déployé = fichiers référencés, aucun orphelin ni fichier de test |
| `smoke` | en-têtes de sécurité, chargement bureau + mobile, aucune erreur console |
| `prenom` | premier lancement, validation stricte, « Plus tard », priorité choix > config |
| `fenetres` | fenêtre dédiée nommée, repli onglet (écran étroit, popup bloquée, option), mobile, bandeau de retour |
| `design` | pas de défilement aux résolutions courantes, 6 palettes, contraste, taille maximale |
| `perso` | catalogue 68 services / 12 familles, ajout libre + PIN, doublons, retrait, max 8, mode « non » |
| `mobile` | colonnes, barre fixe, share target, Coller, « Besoin d'aide ? », appui long, installation Android/iOS |
| `persistance` | double écriture localStorage ⇄ IndexedDB, lien `#p=` (force=1, hostiles), bandeau stockage, diagnostic |
| `journal` | interventions, résumé, export/import CSV (BOM, neutralisation des formules, doublons) |
| `verification` | verdicts vert/rouge/vide, raisons, statistiques, 68/68 catalogue vert |
| `technicien` | appui long, PIN (refus, ralentissement mesuré), sauvegarde, quitter, `modeTechnicien:false` |
| `protection` | tuile « Protéger mon téléphone » : 3 écrans, cases mémorisées, pré-sélection iOS, lien `#p=`, `protectionTelephone:false`, liste technicien |
| `accessibilite` | axe-core sur tous les écrans et dialogs (normal, contraste, taille max, zoom 200 %, mobile), piège de focus, Échap, retour de focus |

Chaque suite peut aussi se lancer seule : `python3 tests/suites/test_mobile.py`
(le serveur doit tourner : `node tests/serveur.js`).

### Captures de référence

`tests/captures/` contient quelques images produites par les suites
(bureau, contraste élevé, mobile, catalogue) — utiles pour comparer un rendu
après modification du CSS.

### Avant chaque commit

`npm run verif` (le lanceur complet). Pour en faire un hook Git automatique :

```bash
printf '#!/bin/sh\nnpm run verif || exit 1\n' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```
