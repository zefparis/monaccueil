"""Helpers communs aux suites Playwright du projet MonAccueil.

Chaque suite est un script autonome : elle affiche une ligne par contrôle
(« OK … » / « ECHEC … ») et termine par « N contrôles OK, M échec(s) »,
code de sortie 0 si M == 0, 1 sinon. run_all.py les agrège.
"""
import base64
import json
import os
import sys

BASE = os.environ.get('MONACCUEIL_BASE', 'http://127.0.0.1:8123/')
PIN = '1234'          # pinHash de config.json / des configs de test = SHA-256('1234')
PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'

# Clés localStorage de app.js
CLE_CONFIG = 'monaccueil.config'
CLE_JOURNAL = 'monaccueil.journal'
CLE_PRENOM = 'monaccueil.prenom'
CLE_PRENOM_PLUSTARD = 'monaccueil.prenom.plustard'
CLE_PERSO = 'monaccueil.perso'
CLE_PALETTE = 'monaccueil.palette'
CLE_TAILLE = 'monaccueil.taille'
CLE_CONTRASTE = 'monaccueil.contraste'
CLE_INSTALL = 'monaccueil.install.ferme'
CLE_INSTALL_IOS = 'monaccueil.install-ios.ferme'


class Suite:
    """Compteur de contrôles + rapport final."""

    def __init__(self, nom):
        self.nom = nom
        self.ok = 0
        self.ko = []

    def check(self, msg, cond):
        if cond:
            self.ok += 1
            print('  OK', msg)
        else:
            self.ko.append(msg)
            print('  ECHEC', msg)
        return bool(cond)

    def bilan(self):
        print(self.nom + ' : %d contrôles OK, %d échec(s)' % (self.ok, len(self.ko)))
        return len(self.ko)


def nouvelle_page(b, mobile=False, width=1400, height=900, **kw):
    """Contexte propre + page, avec capture des erreurs console/page."""
    kw.setdefault('viewport', {'width': width, 'height': height})
    if mobile:
        kw.setdefault('has_touch', True)
        kw.setdefault('is_mobile', True)
    ctx = b.new_context(**kw)
    pg = ctx.new_page()
    erreurs = []
    pg.on('pageerror', lambda e: erreurs.append('pageerror: %s' % e))
    pg.on('console', lambda m: erreurs.append('console: %s' % m.text)
          if m.type == 'error' else None)
    return ctx, pg, erreurs


def charger(pg, url=BASE):
    pg.goto(url)
    pg.wait_for_selector('.tuile', timeout=10000)
    return pg


def fermer_prenom(pg):
    """Referme le dialog prénom de premier lancement s'il est ouvert."""
    if pg.locator('#dialog-prenom[open]').count():
        pg.click('#btn-prenom-plustard')


def config_test(**remplacements):
    """Config minimale valide, modeTechnicien actif, PIN = 1234."""
    c = {
        'prenom': '', 'modeTechnicien': True, 'pinHash': PIN_HASH,
        'palette': 'chaleureux', 'ajoutParPersonne': 'catalogue',
        'ouvertureSites': 'fenetre', 'ouvertureMobile': 'onglet',
        'lienVisio': '',
        'technicien': {'nom': 'Benji', 'telephone': '0612345678'},
        'aideDistance': {'actif': True, 'outil': 'rustdesk', 'idRustdesk': '123456789'},
        'numerosUrgence': [],
        'domainesOfficiels': ['impots.gouv.fr', 'ameli.fr', 'gmail.com', 'orange.fr'],
        'raccourcisseurs': ['bit.ly'],
        'arnaques': [{'titre': 'Le faux colis', 'texte': 'Ne payez jamais par SMS.'}],
        'tuiles': [
            {'id': 'impots', 'label': 'Impôts', 'url': 'https://www.impots.gouv.fr',
             'couleur': '#2f6fbf', 'icone': 'administration.svg', 'groupe': 'Mes démarches'},
            {'id': 'ameli', 'label': 'Ameli', 'url': 'https://www.ameli.fr',
             'couleur': '#2e8b57', 'icone': 'sante.svg', 'groupe': 'Ma santé'},
            {'id': 'gmail', 'label': 'Gmail', 'url': 'https://gmail.com',
             'couleur': '#b23a48', 'icone': 'mails.svg', 'groupe': 'Mon quotidien'}
        ]
    }
    c.update(remplacements)
    return c


def injecter_config(pg, **remplacements):
    """Injecte une config de test dans localStorage puis recharge.
    Navigue d'abord vers l'app : localStorage est indisponible sur about:blank."""
    if 'about:blank' in pg.url or pg.url == 'about:blank':
        charger(pg)
    c = config_test(**remplacements)
    pg.evaluate("cfg => localStorage.setItem('%s', JSON.stringify(cfg))" % CLE_CONFIG, c)
    charger(pg)
    fermer_prenom(pg)


def activer_tech(pg):
    injecter_config(pg)


def ouvrir_tech(pg):
    """Appui long sur le titre + saisie du PIN → panneau technicien ouvert."""
    pg.evaluate("""() => {
      const t = document.getElementById('titre');
      t.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
    }""")
    pg.wait_for_selector('#dialog-pin[open]', timeout=8000)
    pg.fill('#champ-pin', PIN)
    pg.click('#form-pin button[type="submit"]')
    pg.wait_for_selector('#panneau-tech:not([hidden])', timeout=8000)


def lien_personnel(obj):
    """Construit un fragment #p= conforme au format de l'app."""
    payload = json.dumps(obj, separators=(',', ':')).encode('utf-8')
    return '#p=' + base64.urlsafe_b64encode(payload).decode('ascii').rstrip('=')


def vider_idb(pg):
    """Supprime l'enregistrement miroir (sans deleteDatabase : la connexion
    de l'app resterait ouverte et bloquerait la suppression)."""
    return pg.evaluate("""() => new Promise(resolve => {
      try {
        const req = indexedDB.open('monaccueil');
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          try {
            const tx = db.transaction('donnees', 'readwrite');
            tx.objectStore('donnees').delete('personne');
            tx.oncomplete = () => { db.close(); resolve(true); };
            tx.onerror = () => { db.close(); resolve(false); };
          } catch (e) { db.close(); resolve(false); }
        };
      } catch (e) { resolve(false); }
    })""")


def vider_stockage(pg):
    """Vide localStorage ET l'enregistrement miroir IndexedDB."""
    pg.evaluate("() => localStorage.clear()")
    vider_idb(pg)


def lire_idb(pg):
    """Lit l'enregistrement miroir IndexedDB (store 'donnees', clé 'personne')."""
    return pg.evaluate("""() => new Promise(resolve => {
      try {
        const req = indexedDB.open('monaccueil');
        req.onerror = () => resolve(null);
        req.onsuccess = () => {
          const db = req.result;
          try {
            const get = db.transaction('donnees', 'readonly').objectStore('donnees').get('personne');
            get.onsuccess = () => { db.close(); resolve(get.result || null); };
            get.onerror = () => { db.close(); resolve(null); };
          } catch (e) { db.close(); resolve(null); }
        };
      } catch (e) { resolve(null); }
    })""")


def main(nom, suite_fn):
    """Point d'entrée standard d'une suite : lance Chromium, exécute, bilan."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        S = Suite(nom)
        try:
            suite_fn(S, b)
        except Exception as e:
            S.check('exception : %s' % e, False)
            import traceback; traceback.print_exc()
        b.close()
    sys.exit(S.bilan())
