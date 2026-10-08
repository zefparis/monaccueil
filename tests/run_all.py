"""Lanceur unique de toute la suite de vérification MonAccueil.

Exécute : le serveur statique de test (en-têtes identiques à vercel.json),
les tests Node (vérificateur + contrastes des palettes), puis chaque suite
Playwright Python, puis le garde-fou déploiement.

Sortie : résumé par suite (contrôles réussis / échecs), total, durée.
Code de sortie non nul si le moindre contrôle échoue.

Usage : python3 tests/run_all.py        (ou : npm run test / npm run verif)
Prérequis : python3 -m pip install -r tests/requirements-test.txt
            python3 -m playwright install chromium
"""
import os
import re
import signal
import subprocess
import sys
import time

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TESTS = os.path.join(RACINE, 'tests')
SUITES = os.path.join(TESTS, 'suites')
PORT = 8123
BASE = 'http://127.0.0.1:%d/' % PORT

# (nom affiché, commande) — les suites Playwright en premier lieu lisible
ETAPES = [
    ('node-verification', ['node', 'outils/test-verification.js']),
    ('node-palettes', ['node', 'outils/test-palettes.js']),
    ('node-protection', ['node', 'outils/test-protection.js']),
    ('node-urgences', ['node', 'outils/test-urgences.js']),
    ('deploiement', [sys.executable, 'tests/suites/test_deploiement.py']),
    ('smoke', [sys.executable, 'tests/suites/test_smoke.py']),
    ('prenom', [sys.executable, 'tests/suites/test_prenom.py']),
    ('fenetres', [sys.executable, 'tests/suites/test_fenetres.py']),
    ('design', [sys.executable, 'tests/suites/test_design.py']),
    ('perso', [sys.executable, 'tests/suites/test_perso.py']),
    ('mobile', [sys.executable, 'tests/suites/test_mobile.py']),
    ('persistance', [sys.executable, 'tests/suites/test_persistance.py']),
    ('journal', [sys.executable, 'tests/suites/test_journal.py']),
    ('verification', [sys.executable, 'tests/suites/test_verification.py']),
    ('technicien', [sys.executable, 'tests/suites/test_technicien.py']),
    ('protection', [sys.executable, 'tests/suites/test_protection.py']),
    ('urgences', [sys.executable, 'tests/suites/test_urgences.py']),
    ('accessibilite', [sys.executable, 'tests/suites/test_accessibilite.py']),
]

MOTIF_BILAN = re.compile(r'(\d+)\s+contr[oô]les? OK,\s+(\d+)\s+[ée]chec')
# « 70 cas, 0 échec(s). » / « 34 combinaisons verifiées, 0 echec(s). »
MOTIF_TESTS_NODE = re.compile(r'(\d+)\s+(?:cas|combinaisons|tests?)\b[^,\d]*,?\s*(\d+)\s+[ée]?chec')


def attendre_serveur(timeout=10):
    import urllib.request
    debut = time.time()
    while time.time() - debut < timeout:
        try:
            urllib.request.urlopen(BASE, timeout=1)
            return True
        except Exception:
            time.sleep(0.2)
    return False


def main():
    debut = time.time()
    print('=== MonAccueil — suite complète de vérification ===')
    print('Serveur de test :', BASE)

    serveur = subprocess.Popen(
        ['node', os.path.join(TESTS, 'serveur.js'), str(PORT)],
        cwd=RACINE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not attendre_serveur():
            print('ECHEC : le serveur de test ne répond pas.')
            return 1

        resultats = []
        for nom, cmd in ETAPES:
            print('\n--- %s ---' % nom)
            t0 = time.time()
            env = dict(os.environ, MONACCUEIL_BASE=BASE)
            p = subprocess.run(cmd, cwd=RACINE, env=env,
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               text=True, timeout=600)
            print(p.stdout.rstrip())
            duree = time.time() - t0
            # Comptage : « N contrôles OK, M échec(s) » ou « N tests OK … M échec(s) »
            ok, ko = 0, 0
            m = MOTIF_BILAN.findall(p.stdout)
            if m:
                ok, ko = int(m[-1][0]), int(m[-1][1])
            else:
                m2 = MOTIF_TESTS_NODE.search(p.stdout)
                if m2:
                    ok, ko = int(m2.group(1)), int(m2.group(2))
            if p.returncode != 0:
                ko = max(ko, 1)
            resultats.append((nom, ok, ko, duree, p.returncode))

        print('\n=== Résumé ===')
        total_ok = total_ko = 0
        for nom, ok, ko, duree, rc in resultats:
            etat = 'OK   ' if ko == 0 and rc == 0 else 'ECHEC'
            print('%s %-16s %3d contrôles OK, %d échec(s)  (%.1f s)' % (etat, nom, ok, ko, duree))
            total_ok += ok
            total_ko += ko
        print('---')
        print('TOTAL : %d contrôles OK, %d échec(s), %.1f s' % (total_ok, total_ko, time.time() - debut))
        return 1 if total_ko else 0
    finally:
        serveur.terminate()
        try:
            serveur.wait(timeout=3)
        except subprocess.TimeoutExpired:
            serveur.kill()


if __name__ == '__main__':
    sys.exit(main())
