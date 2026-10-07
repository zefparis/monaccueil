# MonAccueil

Page d'accueil ultra simple pour personnes âgées : de gros boutons, chacun ouvre
directement le **vrai** site officiel dans un nouvel onglet. Rien d'autre.

- 100 % statique : aucun serveur, aucune dépendance, aucun appel réseau sortant,
  aucun cookie, aucun compte, aucune donnée personnelle.
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
  "prenom": "Jeanne",
  "technicien": { "nom": "Benji", "telephone": "+33 0 00 00 00 00" },
  "pinHash": "03ac67…46f4",
  "domainesOfficiels": ["impots.gouv.fr", "ameli.fr", "..."],
  "raccourcisseurs": ["bit.ly", "tinyurl.com", "..."],
  "arnaques": [
    { "titre": "Le faux colis à régler", "texte": "Un SMS dit qu'un colis attend… (2 phrases max)" }
  ],
  "tuiles": [
    { "id": "impots", "label": "Mes impôts", "url": "https://www.impots.gouv.fr",
      "icone": "impots.svg", "couleur": "#1d4ed8" }
  ]
}
```

- `url` : doit commencer par `https://`. **Une tuile dont l'URL est vide n'est pas
  affichée** (c'est le cas par défaut de « Ma banque », « Mes mails », « Photos »).
- `icone` : un nom parmi `impots.svg, sante.svg, famille.svg, retraite.svg,
  administration.svg, medecin.svg, courrier.svg, banque.svg, mails.svg, photos.svg,
  meteo.svg, cle.svg, aide.svg, telephone.svg, bouclier.svg`.
- `couleur` : code hexadécimal à 6 chiffres. Choisissez des couleurs foncées.
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
- **Importer une configuration** : charge un `config.json` (ou `config.js`).
- **Revenir au fichier d'origine** : oublie les modifications locales et relit les
  fichiers du dossier.
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

---

## 6. Tuile « Un message me paraît bizarre »

Tuile fixe (orange foncé, icône bouclier), toujours présente. Elle n'ouvre aucun site :
un clic affiche une grande fenêtre en 4 blocs, utilisable au clavier (Tab, Entrée, Échap).

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
   - **Vert** : « Cette adresse est bien celle d'un site officiel de la liste. » suivi,
     toujours, de « Attention : le site est le vrai, mais le message qui vous l'a envoyé
     peut quand même être une arnaque. En cas de doute, appelez-moi. »
   - **Rouge** : « Cette adresse n'est PAS dans la liste. Ne cliquez pas. Appelez-moi. »
     avec la ou les raisons en clair. Le verdict est toujours écrit en toutes lettres
     (SÛR / DANGER), jamais porté par la couleur seule.
   Le champ et le résultat sont effacés à la fermeture (bouton ou Échap).
3. **Les arnaques du moment** : liste `arnaques` de la configuration, à mettre à jour
   à chaque visite depuis le mode technicien (titre + 2 phrases max).
4. **Appeler [technicien]** (lien `tel:`) et **Fermer**.

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
configuration générique : prénom « Jeanne », technicien « Benji », numéro
fictif, aucune donnée client.

### Fichiers ajoutés pour l'hébergement

| Fichier | Rôle |
|---|---|
| `vercel.json` | En-têtes HTTP de sécurité (CSP `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Permissions-Policy`, `noindex`…) et règles de cache |
| `.vercelignore` | N'envoie sur Vercel que ce dont la page a besoin (ni `outils/`, ni `docs/`, ni les `.bat`, ni les `.md`) |
| `robots.txt` | Interdit l'indexation (instance de démonstration) |

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

### ⚠️ Le mode technicien en version hébergée

Le PIN et son hash sont publics (voir § 4) : sur l'instance hébergée le mode
technicien n'est là que pour la démonstration. Si vous préférez qu'aucun poste
ne puisse l'ouvrir, c'est une option simple à ajouter (une clé de configuration
qui désactive l'appui long) — demandez-la avant de publier.
