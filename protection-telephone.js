/* =====================================================================
   MonAccueil - contenu « Protéger mon téléphone »
   ---------------------------------------------------------------------
   TOUT le texte de la tuile vit ici : noms de marques, réglages, chemins
   de menus, conseils. Modifiez ce fichier sans toucher à app.js.

   Règles d'édition :
   - Texte simple seulement : aucun HTML, aucune balise, aucun lien.
   - « chemin » = liste des menus en gras, affichés séparés par « › ».
     Écrivez l'intitulé EXACT du menu, entre guillemets.
   - « verification » = date de dernière vérification sur un vrai
     téléphone, affichée à la personne.
   - « id » des étapes : court, lettres minuscules et tirets ; jamais
     deux fois le même dans une marque (ils mémorisent les cases cochées).
   - Une étape = une phrase d'action courte + le chemin des menus.
     « note » = précision facultative affichée en plus petit.
   ===================================================================== */
window.MONACCUEIL_PROTECTION = {

  /* Affiché quand la personne choisit « Je ne sais pas » */
  aideInconnu: 'Appelez-moi, je regarde avec vous.',

  /* Une entrée par vignette de l'étape 1 (sauf « Je ne sais pas ») */
  marques: [
    {
      id: 'iphone',
      nom: 'iPhone',
      verification: '8 octobre 2026',
      note: 'Le filtre anti-spam dépend de votre opérateur : il peut s’appeler « filtrage des appels indésirables » ou être absent.',
      etapes: [
        {
          id: 'filtrage-appels',
          action: 'Ouvrez le réglage des appels et choisissez « Silence » ou « Demander la raison de l’appel » pour les numéros que vous ne connaissez pas.',
          chemin: ['Réglages', 'Apps', 'Téléphone', 'Filtrage des appelants inconnus'],
          note: 'Activez aussi les listes « Inconnus » et « Spam » dans le même écran (iOS 26 ou plus récent).'
        },
        {
          id: 'filtrage-messages',
          action: 'Activez le tri des expéditeurs inconnus et le filtre anti-spam des messages.',
          chemin: ['Réglages', 'Apps', 'Messages', 'Filtrer', 'Gérer le filtrage'],
          note: 'Les messages des inconnus partent dans un onglet séparé : vous pouvez toujours les lire.'
        },
        {
          id: 'ios-ancien',
          action: 'Seulement si votre iPhone a iOS 25 ou plus ancien : activez « Silence des numéros inconnus ».',
          chemin: ['Réglages', 'Téléphone', 'Silence des numéros inconnus'],
          note: 'Sur iOS 26, ce réglage est remplacé par l’écran de la première étape.'
        }
      ]
    },
    {
      id: 'android',
      nom: 'Pixel ou autre Android',
      verification: '8 octobre 2026',
      note: 'Sur Pixel en France, le filtrage est manuel : il n’y a pas de liste automatique des appels indésirables. Si votre téléphone n’est pas dans la liste, essayez ce chemin, sinon appelez-moi.',
      etapes: [
        {
          id: 'filtrage-appels',
          action: 'Activez l’identification des appelants et le filtrage des appels indésirables.',
          chemin: ['Téléphone', 'Trois points (⋮)', 'Paramètres', 'Numéro de l’appelant et spam'],
          note: 'N’activez PAS « bloquer tous les numéros inconnus » : cela enverrait aussi vos proches en messagerie.'
        }
      ]
    },
    {
      id: 'samsung',
      nom: 'Samsung',
      verification: '8 octobre 2026',
      note: 'Ce réglage ne couvre pas les appels WhatsApp. Sur One UI 8.5 ou plus récent, un réglage séparé de détection d’arnaques peut exister dans les Paramètres du téléphone.',
      etapes: [
        {
          id: 'caller-id',
          action: 'Activez « Caller ID and spam protection » et acceptez les conditions.',
          chemin: ['Téléphone', 'Plus d’options (trois points ⋮)', 'Paramètres', 'Caller ID and spam protection'],
          note: 'L’intitulé peut rester en anglais selon la version : cherchez la ligne avec « spam ».'
        },
        {
          id: 'blocage-spam',
          action: 'Dans le même écran, activez les options de blocage des appels spam et des arnaques.',
          chemin: ['Téléphone', 'Plus d’options (trois points ⋮)', 'Paramètres', 'Caller ID and spam protection', 'Options de blocage'],
          note: 'Gardez les appels de vos contacts normaux : ce réglage ne les bloque pas.'
        }
      ]
    },
    {
      id: 'xiaomi',
      nom: 'Xiaomi, Redmi ou POCO',
      verification: '8 octobre 2026',
      etapes: [
        {
          id: 'filtrage-appels',
          action: 'Activez le filtrage des appels indésirables.',
          chemin: ['Téléphone', 'Trois points (⋮)', 'Paramètres', 'Identification de l’appelant et spam'],
          note: 'L’intitulé peut aussi s’appeler « Anti-spam » selon la version.'
        }
      ]
    }
  ],

  /* Étape 3 : conseils communs, affichés après les réglages */
  conseils: [
    'Avant de silencer les inconnus : enregistrez dans vos contacts votre médecin, votre pharmacie, vos proches, votre banque. Sinon leurs appels iront en messagerie.',
    'Regardez la liste des appels filtrés une fois par semaine.',
    'Ces réglages réduisent les appels gênants mais n’arrêtent pas tous les escrocs : ne donnez jamais un code reçu par SMS, raccrochez et appelez-moi.',
    'SMS frauduleux : transférez-le gratuitement au 33700. Pour un appel suspect, envoyez au 33700 un SMS « spam vocal » suivi du numéro. Ce n’est pas un blocage immédiat : cela aide les opérateurs à identifier les escrocs.'
  ]
};
