/* ====================================================================
   Contenu du bloc « Urgences et arnaques » (window.MONACCUEIL_URGENCES).
   Modifiable par le technicien sans toucher à app.js : tout est relu et
   validé (textes sans HTML, longueurs bornées) avant affichage.

   Numéros et dispositifs vérifiés sur les sources officielles
   (service-public.gouv.fr, masecurite.interieur.gouv.fr, arcep.fr).
   La ligne « Dernière vérification » est affichée à l'écran : mettez-la
   à jour quand vous corrigez un texte.
   ==================================================================== */
window.MONACCUEIL_URGENCES = {
  verifie: '8 octobre 2026',

  /* Écran 1 — « Je suis au téléphone avec quelqu'un de suspect ».
     3 règles courtes, affichées en très gros. */
  suspect: {
    titre: 'Quelqu\'un de suspect au téléphone ?',
    regles: [
      'Raccrochez maintenant.',
      'Une banque ne vous demande jamais un code, un virement ou d\'installer une application.',
      'Rappelez vous-même le numéro écrit au dos de votre carte, ou le mien.'
    ]
  },

  /* Écran 2 — « J'ai été piégé ». Texte sans jugement, 4 étapes. */
  piege: {
    titre: 'J\'ai été piégé',
    intro: 'Cela arrive à beaucoup de monde. Ne vous en voulez pas : agissez vite.',
    etapes: [
      'Appelez votre banque tout de suite pour faire opposition (le numéro est au dos de votre carte).',
      'Ne supprimez rien : gardez les SMS, les mails et les captures d\'écran, ils servent de preuves.',
      'Signalez la fraude (les moyens officiels sont listés ci-dessous).',
      'Appelez-moi : je vous aide pour la suite.'
    ],
    /* Dispositifs de signalement vérifiés sur service-public.gouv.fr,
       masecurite.interieur.gouv.fr et arcep.fr. N'ajoutez aucun numéro
       qui ne figure pas sur une source officielle. */
    signalements: [
      { nom: 'Banque — opposition', detail: 'Appelez votre banque sans attendre : le numéro figure au dos de votre carte ou sur vos relevés.' },
      { nom: 'Perceval', detail: 'Si votre carte a été utilisée en ligne : signalement sur service-public.fr (rubrique « Signaler une fraude à la carte bancaire »), après opposition.' },
      { nom: '33700', detail: 'Transférez le SMS frauduleux au 33700. Pour un appel : envoyez « Spam vocal » suivi du numéro. Ce n\'est pas un blocage immédiat.' },
      { nom: 'Info Escroqueries — 0 805 805 817', detail: 'Conseil et orientation, service et appel gratuits.' },
      { nom: 'THESEE', detail: 'Plainte en ligne pour une arnaque sur internet : Ma Sécurité (masecurite.interieur.gouv.fr) ou service-public.fr.' },
      { nom: 'PHAROS', detail: 'Signalement d\'un contenu illicite en ligne : internet-signalement.gouv.fr (ministère de l\'Intérieur).' },
      { nom: 'Dépôt de plainte', detail: 'Dans un commissariat de police ou une gendarmerie, ou par courrier au procureur de la République. Je peux vous accompagner.' }
    ]
  },

  /* Écran 3 — « Urgence santé » : gros boutons d'appel.
     Le numéro du technicien n'apparaît PAS ici (ligne fixe imposée). */
  sante: {
    titre: 'Urgence santé',
    numeros: [
      { numero: '15', nom: 'SAMU', detail: 'Urgence médicale' },
      { numero: '18', nom: 'Pompiers', detail: 'Incendie, accident, personne en danger' },
      { numero: '112', nom: 'Numéro d\'urgence européen', detail: 'Partout en Europe' },
      { numero: '114', nom: 'Urgence par SMS', detail: 'Pour les personnes sourdes ou malentendantes' }
    ],
    proches: 'Appeler mon proche',
    avertissement: 'Mon Accueil est une aide, pas un service d\'urgence. En cas de danger, appelez le 112.'
  },

  /* Écran d'accueil du bloc : les 3 grosses entrées. */
  menu: {
    titre: 'Urgences et arnaques',
    choix: [
      { id: 'suspect', label: 'Quelqu\'un de suspect au téléphone' },
      { id: 'piege', label: 'J\'ai été piégé' },
      { id: 'sante', label: 'Urgence santé' }
    ]
  }
};
