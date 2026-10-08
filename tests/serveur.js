/* Serveur statique de test — aucune dépendance.
   Reproduit les en-têtes de sécurité de vercel.json pour que les tests
   vérifient le site dans les mêmes conditions que le déploiement.
   Usage : node tests/serveur.js [port]  (défaut : 8123) */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2]) || 8123;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

// Même politique que vercel.json (tenue à jour à la main : si vercel.json
// change, ce bloc doit suivre — la suite smoke vérifie les en-têtes clés)
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; " +
  "connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'none'; " +
  "form-action 'none'; frame-ancestors 'none'; object-src 'none'";

const SECURITE = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': "accelerometer=(), autoplay=(), bluetooth=(), browsing-topics=(), " +
    "camera=(), display-capture=(), fullscreen=(self), geolocation=(), gyroscope=(), hid=(), " +
    "interest-cohort=(), magnetometer=(), microphone=(), midi=(), payment=(), serial=(), usb=(), " +
    "xr-spatial-tracking=()",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  // Vercel met 'Access-Control-Allow-Origin: *' par défaut sur les fichiers
  // statiques : vercel.json le remplace par l'origine du site. Même chose ici.
  'Access-Control-Allow-Origin': 'https://monaccueil.vercel.app'
};

function enTetesPour(cheminRelatif) {
  const h = Object.assign({}, SECURITE);
  if (/^icons\//.test(cheminRelatif)) {
    h['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else {
    h['Cache-Control'] = 'no-cache';   // comme vercel.json : jamais de fichier obsolète
  }
  return h;
}

const serveur = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (e) { res.writeHead(400); res.end(); return; }
  if (urlPath === '/') { urlPath = '/index.html'; }
  const cible = path.normalize(path.join(RACINE, urlPath));
  if (!cible.startsWith(RACINE + path.sep) && cible !== RACINE) {
    res.writeHead(403); res.end(); return;      // anti-traversal
  }
  fs.stat(cible, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, enTetesPour(urlPath.slice(1)));
      res.end('Introuvable');
      return;
    }
    const rel = path.relative(RACINE, cible).split(path.sep).join('/');
    const h = enTetesPour(rel);
    h['Content-Type'] = MIME[path.extname(cible).toLowerCase()] || 'application/octet-stream';
    h['Content-Length'] = st.size;
    res.writeHead(200, h);
    fs.createReadStream(cible).pipe(res);
  });
});

serveur.listen(PORT, '127.0.0.1', () => {
  console.log('Serveur de test prêt : http://127.0.0.1:' + PORT + '/');
});
