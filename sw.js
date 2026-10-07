/* =====================================================================
   MonAccueil - service worker minimal
   Met en cache les fichiers de l'application pour que la page s'affiche
   même sans connexion. Ne touche à aucune autre requête (les sites
   officiels s'ouvrent dans un nouvel onglet, hors de la portée du SW).
   Incrémentez VERSION à chaque mise à jour des fichiers.
   ===================================================================== */
var VERSION = 'monaccueil-v3';
var FICHIERS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './verification.js',
  './icones.js',
  './config.js',
  './config.json',
  './manifest.webmanifest',
  './icons/impots.svg', './icons/sante.svg', './icons/famille.svg', './icons/retraite.svg',
  './icons/administration.svg', './icons/medecin.svg', './icons/courrier.svg', './icons/banque.svg',
  './icons/mails.svg', './icons/photos.svg', './icons/meteo.svg', './icons/aide.svg',
  './icons/cle.svg', './icons/assistance.svg', './icons/telephone.svg', './icons/bouclier.svg', './icons/app.svg',
  './icons/mon-accueil-192.png', './icons/mon-accueil-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (ev) {
  // Supprime les anciens caches
  ev.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (ev) {
  if (ev.request.method !== 'GET') { return; }
  var url = new URL(ev.request.url);
  if (url.origin !== self.location.origin) { return; }

  // config.json : réseau d'abord (pour voir les mises à jour), cache sinon
  if (url.pathname.slice(-11) === 'config.json') {
    ev.respondWith(fetch(ev.request).then(function (rep) {
      var copie = rep.clone();
      caches.open(VERSION).then(function (c) { c.put(ev.request, copie); });
      return rep;
    }).catch(function () { return caches.match(ev.request); }));
    return;
  }

  // Autres fichiers : cache d'abord, réseau sinon
  ev.respondWith(caches.match(ev.request).then(function (rep) { return rep || fetch(ev.request); }));
});
