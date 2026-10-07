# Checklist de test chez le client

À faire **sur le PC du client, avec le client à côté**, après `install.bat`.
Cochez chaque ligne. Durée : environ 15 minutes.

## A. Lancement

- [ ] Le PC démarre, le navigateur s'ouvre (ou le raccourci « Mon Accueil ») et la
      page MonAccueil apparaît **sans rien faire d'autre**.
- [ ] Le titre affiche « Bonjour [prénom] » avec le bon prénom.
- [ ] Même contrôle **dans Edge** : la page s'ouvre et affiche la même chose que dans
      le navigateur habituel du client.
- [ ] La date du jour est correcte, en français ; l'heure est à l'heure.
- [ ] Aucun message d'erreur, aucune barre jaune « bloqué » dans le navigateur.
- [ ] (Si plein écran) Pas de barre d'adresse, pas d'onglets visibles.

## A bis. Prénom choisi par la personne

- [ ] Premier lancement sans prénom configuré : le dialog « Comment voulez-vous
      que je vous appelle ? » s'affiche, utilisable au clavier (Entrée valide,
      Échap = « Plus tard »).
- [ ] Prénom valide (accents, tiret, apostrophe) : « Bonjour [prénom] » apparaît,
      majuscule en première lettre, conservé après rechargement.
- [ ] Refus net en gros caractères : chiffres, symboles, balise, > 30 caractères,
      champ vide.
- [ ] « Plus tard » : ferme, « Bonjour » seul, le dialog ne revient pas au
      rechargement ; le lien « Choisir mon prénom » le rouvre pré-rempli.
- [ ] Le prénom choisi n'apparaît **pas** dans l'export de la configuration ;
      dans le panneau technicien, il est lisible en lecture seule et le bouton
      « Effacer le prénom choisi » fonctionne.
- [ ] Le lien « Changer mon prénom » n'a rien à voir avec l'appui long
      technicien (qui reste discret et inchangé).

## B. Lisibilité

- [ ] Assis à sa place habituelle, le client lit **tous** les libellés sans effort.
- [ ] Sinon : cliquer « Texte plus grand » une ou deux fois (en haut à droite,
      sous l'heure). Le réglage reste après fermeture / réouverture du navigateur.
- [ ] Tester « Contraste » ; garder ce qui convient au client.
- [ ] Les tuiles sont regroupées en familles lisibles (« Mes démarches »,
      « Ma santé », « Mon quotidien », « Aide et sécurité »).
- [ ] Sur l'écran du client, les principales tuiles tiennent sans défiler ;
      sinon le bouton rouge d'aide reste collé en bas.
- [ ] Zoom navigateur à 200 % (Ctrl + molette) : rien ne déborde, pas de défilement
      horizontal. Remettre à 100 % (Ctrl + 0) si non souhaité.
- [ ] Chaque tuile a une icône claire dans une pastille de couleur distincte.

## C. Clics

- [ ] Cliquer **chaque** tuile : le bon site s'ouvre dans la **fenêtre dédiée à
      droite** (~75 % de la largeur), MonAccueil reste visible à gauche.
- [ ] Cliquer une **deuxième tuile** : le site s'ouvre dans la **même** fenêtre
      (pas d'empilement) et repasse au premier plan.
- [ ] Le bandeau « Votre site s'est ouvert sur la droite… » apparaît en haut de
      l'accueil et disparaît au retour.
- [ ] **Écran étroit** (< 1000 px de large) ou **fenêtre bloquée** : repli en
      nouvel onglet, bandeau adapté (« dans un autre onglet »).
- [ ] Option `ouvertureSites: "onglet"` en mode technicien : tout s'ouvre en
      onglet comme avant.
- [ ] Même vérification **dans Edge et dans Chrome**.
- [ ] L'adresse ouverte commence bien par `https://` et le domaine est le bon.
- [ ] Les tuiles « Banque », « Mails », « Photos » ouvrent les sites
      personnels du client (ou sont absentes si non configurées).
- [ ] Aucun site ne demande d'installer quelque chose au premier clic.

## D. Retour à l'accueil

- [ ] Montrer au client comment **fermer la fenêtre du site** (croix en haut à
      droite) ou cliquer l'icône **Mon Accueil dans la barre des tâches** :
      l'accueil est toujours là. Épingler l'icône à la barre des tâches.
- [ ] Fermer complètement le navigateur, le rouvrir : MonAccueil réapparaît.
- [ ] Bouton Accueil du navigateur (si activé) : revient sur MonAccueil.
- [ ] Redémarrer le PC une fois : MonAccueil est de retour.

## E. Bouton « J'ai besoin d'aide »

- [ ] Le bouton rouge est visible sans défiler (sinon réduire « Texte plus petit »).
- [ ] Il affiche votre nom et votre numéro, en gros.
- [ ] Le numéro est correct. Sur un appareil capable d'appeler, le lien `tel:`
      lance l'appel. Si le lien `tel:` ne fait rien sur ce PC : **plan B**, le
      numéro est aussi écrit en très gros sur la fiche `docs/fiche-senior.html`
      imprimée — vérifier qu'il est bien lisible de loin.
- [ ] « Fermer » ramène à l'accueil, rien d'autre n'a changé.
- [ ] Le bandeau « Ces boutons ouvrent uniquement les vrais sites officiels… » est
      lisible. Expliquer au client : **« en cas de doute, appelez-moi avant de
      cliquer »**.

## F. Aide à distance

- [ ] La tuile violette « Aide à distance » est présente (ou absente si `actif: false`).
- [ ] Un clic ouvre la fenêtre en 4 étapes ; le numéro de téléphone est le vôtre ;
      les étapes 3 et 4 correspondent à l'outil choisi (code à taper / code à lire).
- [ ] Le texte « Je ne vous demanderai jamais… » est lu **à voix haute** avec le
      client ; il sait qu'il doit raccrocher si quelqu'un d'autre le lui demande.
- [ ] « Fermer » (souris et clavier : Tab puis Entrée, ou Échap) ramène à l'accueil.
- [ ] Le raccourci Bureau « Aide à distance » existe, avec sa grande icône violette.
- [ ] Double-clic sur le raccourci : Assistance rapide (ou RustDesk) s'ouvre. Si
      l'outil manque, un message en français s'affiche (pas une console noire).
- [ ] **Parcours complet avec un faux client** (collègue ou proche au téléphone) :
      appel → tuile → raccourci → code → Autoriser/Accepter → vous voyez l'écran →
      vous fermez la session devant lui → il confirme qu'il ne voit plus rien.
- [ ] RustDesk uniquement : mot de passe **temporaire** actif, « Accepter via clic »
      coché, pas de démarrage automatique ni d'accès sans surveillance.
- [ ] Aucun mot de passe, code ou ID n'est noté sur un papier collé à l'écran.

## F bis. Tuile « Un message me paraît bizarre »

- [ ] La tuile orange foncé avec le bouclier est présente ; un clic ouvre la grande
      fenêtre, le curseur est dans le champ d'adresse.
- [ ] Lire **à voix haute** les 3 questions et la conclusion « Si la réponse est oui à
      UNE seule question… » avec le client.
- [ ] Coller `https://www.ameli.fr` → résultat **vert** « SÛR », avec la phrase
      « le message qui vous l'a envoyé peut quand même être une arnaque ».
- [ ] Coller `https://ameli.fr.secure-login.net` → résultat **rouge** « DANGER », raison
      « imite le nom d'un site officiel ».
- [ ] Coller `http://www.ameli.fr` (sans s) → rouge, raison « http:// sans le s ».
- [ ] Coller un texte quelconque (« bonjour ») → rouge, pas de plantage.
- [ ] Pendant ces tests, **aucun onglet ne s'ouvre**, rien ne se charge.
- [ ] Montrer au client comment copier l'adresse d'un lien (clic droit → « Copier
      l'adresse du lien ») sans cliquer dessus.
- [ ] Les 5 arnaques du moment s'affichent avec un titre et un texte court ; les mettre
      à jour si besoin (mode technicien).
- [ ] « Appeler [votre nom] » affiche bien votre nom ; le lien `tel:` contient votre
      numéro.
- [ ] « Fermer » et **Échap** ferment la fenêtre ; à la réouverture, le champ et le
      résultat sont **vides**.
- [ ] En contraste élevé et en taille maximale : la fenêtre reste lisible, défile si
      besoin, rien ne déborde.
- [ ] Mode technicien : les compteurs « vérifications / rouges » ont augmenté.

## G. Clavier (si le client utilise peu la souris)

- [ ] Tab passe de bouton en bouton, le contour de focus est bien visible.
- [ ] Entrée ouvre la tuile sélectionnée.
- [ ] Dans « Un message me paraît bizarre » : Tab atteint le champ, « Vérifier »,
      « Appeler » et « Fermer » ; Entrée dans le champ lance la vérification ; Échap
      ferme et le focus revient sur la tuile.

## H. Hors ligne

- [ ] Couper le Wi-Fi / débrancher le câble. Fermer et rouvrir le navigateur :
      la page MonAccueil s'affiche quand même (en `file://` c'est automatique ;
      en https, la PWA doit être installée et ouverte une première fois).
- [ ] Cliquer une tuile hors ligne : le navigateur affiche sa page « pas de
      connexion » (normal). Reconnecter.

## I. Mode technicien

- [ ] Appui long de 3 s sur le titre → demande de PIN. Le client ne tombe pas
      dessus par hasard (un clic simple ne fait rien).
- [ ] Le PIN par défaut `1234` a été **changé**.
- [ ] Un mauvais PIN est refusé.
- [ ] « Quitter le mode technicien » ramène à l'écran normal.
- [ ] Réglages « Aide à distance » (actif, outil, ID RustDesk) corrects et exportés.
- [ ] Une copie du `config.json` du client est conservée dans vos archives.

## I bis. Onglet « Journal des interventions »

- [ ] L'onglet « Journal des interventions » s'ouvre ; rien du journal n'est visible
      hors du mode technicien (quitter, vérifier l'écran du client).
- [ ] Ajouter l'intervention du jour (date pré-remplie, durée, lieu, motif, note
      **sans donnée personnelle**) : elle apparaît en haut de la liste, le résumé
      (nombre, temps total, moyenne, par motif, par lieu) est mis à jour.
- [ ] Une durée vide ou à 0 est refusée avec un message clair.
- [ ] « Supprimer » demande confirmation ; « Annuler » ne supprime rien.
- [ ] « Exporter le journal (CSV) » : le fichier s'ouvre dans Excel avec les colonnes
      séparées et les accents corrects.
- [ ] Réimporter ce même CSV : « 0 ajoutée, N doublon(s) ignoré(s) », liste inchangée.
- [ ] Importer un fichier quelconque (photo, texte) : refus propre, journal inchangé.
- [ ] Fermer et rouvrir le navigateur : le journal est toujours là.
- [ ] Le CSV exporté est archivé dans la fiche client.

## J. Finitions

- [ ] Bureau nettoyé : seulement « Mon Accueil », « Aide à distance » (et
      éventuellement la corbeille).
- [ ] Navigateur : extensions inutiles supprimées, barre de favoris masquée.
- [ ] Le client a fait **seul** : ouvrir le PC → cliquer une tuile → revenir →
      cliquer « J'ai besoin d'aide » → fermer. Sans aide, en moins de 5 secondes
      pour comprendre quoi faire.

## K. Version hébergée (Vercel)

À vérifier **après** le premier vrai déploiement :

- [ ] L'URL `https://…vercel.app` ouvre la page et les tuiles fonctionnent.
- [ ] Les en-têtes arrivent : dans les outils développeur → Réseau, vérifier
      `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`.
- [ ] `robots.txt` répond `Disallow: /` ; les URL de prévisualisation sont
      protégées (Deployment Protection activée).
- [ ] L'installation PWA est proposée (Chrome : icône « Installer » dans la
      barre d'adresse) ; l'app installée s'ouvre en plein écran avec l'icône
      maison.
- [ ] Hors ligne : désactiver le réseau → la page déjà visitée s'affiche encore.
- [ ] Mise à jour : modifier `config.json` + incrémenter `VERSION` dans `sw.js`,
      pousser → le changement apparaît après rechargement (le service worker se
      met à jour).
- [ ] Bascule file:// → https d'un poste : la configuration et le journal ont
      été exportés AVANT (les stockages sont séparés).
- [ ] Le mode technicien est **désactivé** sur la démo publique
      (`"modeTechnicien": false`) : l'appui long 3 s sur le titre ne fait rien,
      aucune boîte PIN n'apparaît.
- [ ] Sur une instance de **vrai client** (`"modeTechnicien": true`), l'appui
      long + PIN ouvrent le panneau comme en local.

### K bis. Nouveau client en version hébergée (≈ 2 minutes)

- [ ] `/installer.html` s'ouvre sur le PC du client ; les 3 étapes sont lisibles.
- [ ] La bannière « Installer Mon Accueil sur cet ordinateur » apparaît en haut
      (uniquement avant installation), son clic ouvre la fenêtre d'installation.
- [ ] App installée : icône « Mon Accueil » sur le Bureau ou le menu Démarrer,
      ouverture en plein écran ; la bannière n'apparaît plus (ni après fermeture
      de la bannière avec ✕).
- [ ] Dialog « Aide à distance » : l'étape 2 dit « touche Windows → Assistance
      rapide » (et non le raccourci Bureau).
- [ ] Configuration du client importée puis **« Sauvegarde de cette
      configuration »** : `config.json` rangé dans `C:\MonAccueil`.
- [ ] Page de démarrage du navigateur réglée sur l'adresse (secours).
- [ ] **Temps mesuré** de l'installation : ______ minutes (objectif < 2).
- [ ] Même contrôle **dans Edge et Firefox**.
