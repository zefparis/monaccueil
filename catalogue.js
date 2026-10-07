/* =====================================================================
   MonAccueil - catalogue de services proposés par « Ajouter un bouton ».
   Chaque entrée : un site officiel vérifié (https), un libellé court,
   une icône de la liste blanche existante.
   Leurs domaines sont automatiquement reconnus par le vérificateur
   d'adresses. Le technicien peut remplacer cette liste par la clé
   « catalogue » de la configuration.
   ===================================================================== */
window.MONACCUEIL_CATALOGUE = [
  // -- Banques et argent ---------------------------------------------
  { "id": "credit-agricole", "label": "Crédit Agricole", "url": "https://www.credit-agricole.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "banque-postale", "label": "La Banque Postale", "url": "https://www.labanquepostale.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "caisse-epargne", "label": "Caisse d'Épargne", "url": "https://www.caisse-epargne.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "societe-generale", "label": "Société Générale", "url": "https://www.societegenerale.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "bnp", "label": "BNP Paribas", "url": "https://mabanque.bnpparibas", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "lcl", "label": "LCL", "url": "https://www.lcl.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "credit-mutuel", "label": "Crédit Mutuel", "url": "https://www.creditmutuel.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "banque-populaire", "label": "Banque Populaire", "url": "https://www.banquepopulaire.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "cic", "label": "CIC", "url": "https://www.cic.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "revolut", "label": "Revolut", "url": "https://www.revolut.com", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "boursobank", "label": "BoursoBank", "url": "https://www.boursobank.com", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "fortuneo", "label": "Fortuneo", "url": "https://www.fortuneo.fr", "famille": "Banques et argent", "icone": "banque.svg" },
  { "id": "hellobank", "label": "Hello bank!", "url": "https://www.hellobank.fr", "famille": "Banques et argent", "icone": "banque.svg" },

  // -- Assurances et mutuelles ----------------------------------------
  { "id": "maaf", "label": "MAAF", "url": "https://www.maaf.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "mutuelle-generale", "label": "Mutuelle Générale", "url": "https://www.mutuellegenerale.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "axa", "label": "AXA", "url": "https://www.axa.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "allianz", "label": "Allianz", "url": "https://www.allianz.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "maif", "label": "MAIF", "url": "https://www.maif.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "macif", "label": "MACIF", "url": "https://www.macif.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "groupama", "label": "Groupama", "url": "https://www.groupama.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "matmut", "label": "Matmut", "url": "https://www.matmut.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "gmf", "label": "GMF", "url": "https://www.gmf.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "mma", "label": "MMA", "url": "https://www.mma.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },
  { "id": "direct-assurance", "label": "Direct Assurance", "url": "https://www.direct-assurance.fr", "famille": "Assurances et mutuelles", "icone": "bouclier.svg" },

  // -- Transports, taxi et voyages ------------------------------------
  { "id": "sncf", "label": "SNCF Connect", "url": "https://www.sncf-connect.com", "famille": "Transports et voyages", "icone": "transport.svg" },
  { "id": "ratp", "label": "RATP", "url": "https://www.ratp.fr", "famille": "Transports et voyages", "icone": "transport.svg" },
  { "id": "trainline", "label": "Trainline", "url": "https://www.trainline.com", "famille": "Transports et voyages", "icone": "transport.svg" },
  { "id": "flixbus", "label": "FlixBus", "url": "https://www.flixbus.fr", "famille": "Transports et voyages", "icone": "transport.svg" },
  { "id": "blablacar", "label": "BlaBlaCar", "url": "https://www.blablacar.fr", "famille": "Transports et voyages", "icone": "transport.svg" },
  { "id": "airfrance", "label": "Air France", "url": "https://www.airfrance.fr", "famille": "Transports et voyages", "icone": "transport.svg" },
  { "id": "g7", "label": "Taxi G7", "url": "https://www.g7.fr", "famille": "Taxi et VTC", "icone": "transport.svg" },
  { "id": "uber", "label": "Uber", "url": "https://www.uber.com", "famille": "Taxi et VTC", "icone": "transport.svg" },
  { "id": "bolt", "label": "Bolt", "url": "https://www.bolt.eu", "famille": "Taxi et VTC", "icone": "transport.svg" },
  { "id": "mappy", "label": "Mappy (itinéraires)", "url": "https://www.mappy.fr", "famille": "Itinéraires", "icone": "transport.svg" },
  { "id": "viamichelin", "label": "ViaMichelin", "url": "https://www.viamichelin.com", "famille": "Itinéraires", "icone": "transport.svg" },
  { "id": "google-maps", "label": "Google Maps", "url": "https://maps.google.com", "famille": "Itinéraires", "icone": "transport.svg" },
  { "id": "waze", "label": "Waze", "url": "https://www.waze.com", "famille": "Itinéraires", "icone": "transport.svg" },

  // -- Énergie et factures --------------------------------------------
  { "id": "edf", "label": "EDF", "url": "https://www.edf.fr", "famille": "Énergie et factures", "icone": "energie.svg" },
  { "id": "engie", "label": "Engie", "url": "https://particuliers.engie.fr", "famille": "Énergie et factures", "icone": "energie.svg" },
  { "id": "totalenergies", "label": "TotalEnergies", "url": "https://www.totalenergies.fr", "famille": "Énergie et factures", "icone": "energie.svg" },

  // -- Courses et achats ----------------------------------------------
  { "id": "carrefour", "label": "Carrefour", "url": "https://www.carrefour.fr", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "leclerc", "label": "E.Leclerc", "url": "https://www.e.leclerc", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "intermarche", "label": "Intermarché", "url": "https://www.intermarche.com", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "auchan", "label": "Auchan", "url": "https://www.auchan.fr", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "lidl", "label": "Lidl", "url": "https://www.lidl.fr", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "amazon", "label": "Amazon", "url": "https://www.amazon.fr", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "vinted", "label": "Vinted", "url": "https://www.vinted.fr", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "leboncoin", "label": "Leboncoin", "url": "https://www.leboncoin.fr", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "fnac", "label": "Fnac", "url": "https://www.fnac.com", "famille": "Courses et achats", "icone": "magasin.svg" },
  { "id": "darty", "label": "Darty", "url": "https://www.darty.com", "famille": "Courses et achats", "icone": "magasin.svg" },

  // -- Téléphone et internet -------------------------------------------
  { "id": "orange", "label": "Orange", "url": "https://www.orange.fr", "famille": "Téléphone et internet", "icone": "telephone.svg" },
  { "id": "free", "label": "Free", "url": "https://www.free.fr", "famille": "Téléphone et internet", "icone": "telephone.svg" },
  { "id": "sfr", "label": "SFR", "url": "https://www.sfr.fr", "famille": "Téléphone et internet", "icone": "telephone.svg" },
  { "id": "bouygues", "label": "Bouygues Telecom", "url": "https://www.bouyguestelecom.fr", "famille": "Téléphone et internet", "icone": "telephone.svg" },

  // -- Santé ------------------------------------------------------------
  { "id": "doctolib", "label": "Doctolib", "url": "https://www.doctolib.fr", "famille": "Santé", "icone": "medecin.svg" },
  { "id": "qare", "label": "Qare (téléconsultation)", "url": "https://www.qare.fr", "famille": "Santé", "icone": "medecin.svg" },
  { "id": "livi", "label": "Livi (téléconsultation)", "url": "https://www.livi.fr", "famille": "Santé", "icone": "medecin.svg" },

  // -- Courriels, photos et divertissement -------------------------------
  { "id": "gmail", "label": "Gmail", "url": "https://mail.google.com", "famille": "Courriels et photos", "icone": "mails.svg" },
  { "id": "outlook", "label": "Outlook", "url": "https://outlook.com", "famille": "Courriels et photos", "icone": "mails.svg" },
  { "id": "google-photos", "label": "Google Photos", "url": "https://photos.google.com", "famille": "Courriels et photos", "icone": "photos.svg" },
  { "id": "whatsapp", "label": "WhatsApp", "url": "https://web.whatsapp.com", "famille": "Proches et divertissement", "icone": "telephone.svg" },
  { "id": "facebook", "label": "Facebook", "url": "https://www.facebook.com", "famille": "Proches et divertissement", "icone": "famille.svg" },
  { "id": "youtube", "label": "YouTube", "url": "https://www.youtube.com", "famille": "Proches et divertissement", "icone": "tele.svg" },
  { "id": "francetv", "label": "france.tv", "url": "https://www.france.tv", "famille": "Proches et divertissement", "icone": "tele.svg" },
  { "id": "netflix", "label": "Netflix", "url": "https://www.netflix.com", "famille": "Proches et divertissement", "icone": "tele.svg" },
  { "id": "spotify", "label": "Spotify", "url": "https://open.spotify.com", "famille": "Proches et divertissement", "icone": "tele.svg" },

  // -- Divers ------------------------------------------------------------
  { "id": "laposte-courrier", "label": "Suivi La Poste", "url": "https://www.laposte.fr", "famille": "Divers", "icone": "courrier.svg" },
  { "id": "meteo-france", "label": "Météo France", "url": "https://meteofrance.com", "famille": "Divers", "icone": "meteo.svg" }
];
