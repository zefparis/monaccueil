"""Suite « persistance » : double écriture localStorage ⇄ IndexedDB,
restauration croisée, lien personnel #p= (hydratation, force=1, refus),
bandeau stockage indisponible, diagnostic technicien. 42 contrôles.
"""
import sys, os, json, base64
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'persistance'


def lier(ctx, url):
    """Nouvelle page du même contexte → vrai chargement complet (requis
    pour que le fragment #p= soit traité : changement de hash seul = même doc)."""
    pg = ctx.new_page()
    pg.goto(url)
    pg.wait_for_selector('.tuile', timeout=10000)
    return pg


def run(S, b):
    # ---------- 1. Écriture redondante ----------
    ctx, pg, errs = nouvelle_page(b)
    charger(pg)
    # Premier lancement : le dialog prénom s'ouvre tout seul → choisir « Marie »
    if pg.locator('#dialog-prenom[open]').count() == 0:
        pg.click('#lien-prenom')
    pg.fill('#champ-prenom', 'Marie')
    pg.click('#form-prenom button[type="submit"]')
    pg.click('#lien-palette')
    pg.click('.palette-carte[data-palette="bleu"]')
    pg.keyboard.press('Escape')
    pg.evaluate("""() => localStorage.setItem('%s', JSON.stringify([
      {label: 'Train', url: 'https://www.sncf-connect.com', icone: 'transport.svg'}]))""" % CLE_PERSO)
    charger(pg)
    pg.wait_for_timeout(500)   # synchroniserIDB est asynchrone
    S.check('prénom dans localStorage', pg.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM) == 'Marie')
    S.check('palette dans localStorage', pg.evaluate("() => localStorage.getItem('%s')" % CLE_PALETTE) == 'bleu')
    idb = lire_idb(pg)
    S.check('miroir IDB existe', idb is not None)
    S.check('miroir IDB : v=1', (idb or {}).get('v') == 1)
    S.check('miroir IDB : prenom', (idb or {}).get('prenom') == 'Marie')
    S.check('miroir IDB : palette', (idb or {}).get('palette') == 'bleu')
    S.check('miroir IDB : perso', any(t.get('label') == 'Train' for t in (idb or {}).get('perso', [])))
    S.check('miroir IDB : reglages', isinstance((idb or {}).get('reglages'), dict))
    S.check('rechargement : tout affiché',
            pg.text_content('#titre') == 'Bonjour Marie'
            and 'palette-bleu' in pg.evaluate("() => document.documentElement.className")
            and any('Train' in t for t in pg.locator('.tuile').all_text_contents()))

    # ---------- 2. localStorage vidé → restauration depuis IndexedDB ----------
    pg.evaluate("() => localStorage.clear()")
    charger(pg)
    pg.wait_for_timeout(300)
    S.check('LS vidé : prénom restauré depuis IDB', pg.text_content('#titre') == 'Bonjour Marie')
    S.check('LS vidé : palette restaurée',
            'palette-bleu' in pg.evaluate("() => document.documentElement.className"))
    S.check('LS vidé : perso restauré',
            any('Train' in t for t in pg.locator('.tuile').all_text_contents()))
    S.check('LS vidé : localStorage re-ssemé',
            pg.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM) == 'Marie')

    # ---------- 3. IndexedDB vidée → re-ssemée depuis localStorage ----------
    vider_idb(pg)
    charger(pg)
    pg.wait_for_timeout(500)
    S.check('IDB vidée : écran intact', pg.text_content('#titre') == 'Bonjour Marie')
    idb2 = lire_idb(pg)
    S.check('IDB vidée : miroir re-ssemé', (idb2 or {}).get('prenom') == 'Marie')

    # ---------- 4. Les deux vidés → hydratation par lien ----------
    vider_stockage(pg)
    injecter_config(pg)   # remet une config propre (LS seul)
    vider_stockage(pg)    # config ne compte pas comme personnalisation
    lien = lien_personnel({'v': 1, 'prenom': 'Ginette', 'palette': 'vert',
                           'perso': [{'label': 'News', 'url': 'https://www.ameli.fr', 'icone': 'sante.svg'}],
                           'reglages': {'taille': 2, 'contraste': 1}})
    pg2 = lier(ctx, BASE.split('#')[0] + lien)
    S.check('lien : prénom hydraté', pg2.text_content('#titre') == 'Bonjour Ginette')
    S.check('lien : palette hydratée',
            'palette-vert' in pg2.evaluate("() => document.documentElement.className"))
    S.check('lien : perso hydraté',
            any('News' in t for t in pg2.locator('.tuile').all_text_contents()))
    S.check('lien : taille 2', 'taille-2' in pg2.evaluate("() => document.documentElement.className"))
    S.check('lien : contraste', 'contraste-eleve' in pg2.evaluate("() => document.documentElement.className"))
    S.check('lien : fragment nettoyé', 'p=' not in pg2.url)
    S.check('lien : stockage rempli',
            pg2.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM) == 'Ginette')

    # ---------- 5. Stockage non vide + pas de force → jamais écrasé ----------
    pg2.evaluate("() => localStorage.setItem('%s', 'Raymonde')" % CLE_PRENOM)
    pg3 = lier(ctx, BASE.split('#')[0] + lien_personnel(
        {'v': 1, 'prenom': 'Autre', 'palette': 'rose', 'perso': [], 'reglages': {'taille': 1, 'contraste': 0}}))
    S.check('sans force : prénom local conservé', pg3.text_content('#titre') == 'Bonjour Raymonde')
    pg3.close()

    # ---------- 6. force=1 → écrase ----------
    pg4 = lier(ctx, BASE.split('#')[0] + lien_personnel(
        {'v': 1, 'prenom': 'Autre', 'palette': 'rose', 'perso': [], 'reglages': {'taille': 1, 'contraste': 0}}) + '&force=1')
    S.check('force=1 : lien appliqué', pg4.text_content('#titre') == 'Bonjour Autre')
    pg4.close()
    pg2.close()

    # ---------- 7. Liens invalides / hostiles : tout est ignoré ----------
    hostiles = [
        ('#p=!!!pas-base64!!!', 'base64 invalide'),
        ('#p=' + 'a' * 5000, 'lien > 4 Ko'),
        ('#p=' + base64.urlsafe_b64encode(b'"chaine"').decode().rstrip('='), 'JSON non-objet'),
        ('#p=' + base64.urlsafe_b64encode(b'{"v":2,"prenom":"X"}').decode().rstrip('='), 'mauvaise version'),
        (lien_personnel({'v': 1, 'prenom': '<img src=x onerror=alert(1)>', 'perso': []}), 'prénom HTML'),
        (lien_personnel({'v': 1, 'prenom': 'Z' * 40, 'perso': []}), 'prénom trop long'),
        (lien_personnel({'v': 1, 'perso': [{'label': 'J', 'url': 'javascript:alert(1)', 'icone': 'administration.svg'}]}), 'perso javascript:'),
        (lien_personnel({'v': 1, 'perso': [{'label': 'H', 'url': 'http://ameli.fr', 'icone': 'sante.svg'}]}), 'perso http:'),
        (lien_personnel({'v': 1, 'perso': [{'label': 'Inconnu', 'url': 'https://inconnu.xyz', 'icone': 'sante.svg'}]}), 'domaine non reconnu'),
        (lien_personnel({'v': 1, 'palette': 'arc-en-ciel', 'perso': []}), 'palette inconnue'),
    ]
    for frag, nom in hostiles:
        vider_stockage(pg)
        injecter_config(pg)
        vider_stockage(pg)
        pgx = lier(ctx, BASE.split('#')[0] + frag)
        vide = (pgx.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM) is None
                and pgx.evaluate("() => (localStorage.getItem('%s') || '')" % CLE_PERSO) in ('', '[]'))
        S.check('hostile ignoré : %s' % nom, vide and 'p=' not in pgx.url)
        pgx.close()
    # Un lien sain au milieu de données partiellement mauvaises : le sain est gardé
    vider_stockage(pg); injecter_config(pg); vider_stockage(pg)
    mixte = lien_personnel({'v': 1, 'prenom': 'Paul', 'perso': [
        {'label': 'Bon', 'url': 'https://www.ameli.fr', 'icone': 'sante.svg'},
        {'label': 'Mauvais', 'url': 'https://inconnu.xyz', 'icone': 'sante.svg'}]})
    pgm = lier(ctx, BASE.split('#')[0] + mixte)
    S.check('lien mixte : sain gardé, mauvais filtré',
            pgm.text_content('#titre') == 'Bonjour Paul'
            and any('Bon' == t.strip() or 'Bon' in t for t in pgm.locator('.tuile').all_text_contents())
            and not any('Mauvais' in t for t in pgm.locator('.tuile').all_text_contents()))
    pgm.close()
    ctx.close()

    # ---------- 8. Stockage bloqué → bandeau sobre, app fonctionnelle ----------
    # add_init_script n'atteint pas le monde principal (CSP stricte) : on
    # préfixe app.js via interception de route, même origine → CSP OK.
    ctx, pg, errs = nouvelle_page(b)
    ctx.route('**/app.js', lambda r: r.fulfill(
        body="try{Storage.prototype.setItem=function(){throw new Error('bloque')}}catch(e){}\n"
             + r.fetch().text(),
        content_type='application/javascript'))
    charger(pg)
    pg.wait_for_timeout(300)
    S.check('stockage bloqué : bandeau affiché', pg.locator('#bandeau-stockage').is_visible())
    S.check('stockage bloqué : message sobre',
            'Appelez-moi' in (pg.text_content('#bandeau-stockage') or ''))
    S.check('stockage bloqué : bouton Appeler = tel:',
            (pg.get_attribute('#appeler-stockage', 'href') or '').startswith('tel:'))
    S.check('stockage bloqué : tuiles affichées', pg.locator('.tuile').count() >= 5)
    ctx.close()

    # ---------- 9. Diagnostic technicien ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    ouvrir_tech(pg)
    diag = pg.locator('.diag-stockage')
    S.check('diag : bloc affiché', diag.count() == 1)
    texte = diag.text_content() or ''
    for mot in ['localStorage', 'IndexedDB', 'Mode d', 'Origine', 'Mémorisation', 'Espace']:
        S.check('diag : ligne « %s »' % mot, mot in texte)
    S.check('diag : localStorage testé', 'testées' in texte)
    ctx.close()

    # ---------- 10. Génération du lien personnel ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    pg.evaluate("() => localStorage.setItem('%s', 'Odette')" % CLE_PRENOM)
    charger(pg); fermer_prenom(pg)
    ouvrir_tech(pg)
    S.check('lien perso : case prénom cochée', pg.locator('#tech-lien-prenom').is_checked())
    pg.click('button:has-text("Générer le lien personnel")')
    lien_gen = pg.input_value('#tech-lien-perso')
    S.check('lien perso généré', '#p=' in lien_gen)
    S.check('lien perso : bouton Copier apparu', pg.locator('button:has-text("Copier")').is_visible())
    # Le lien régénéré ré-hydrate un contexte vierge
    ctx2, pg2, errs = nouvelle_page(b)
    charger(pg2)
    vider_stockage(pg2)
    injecter_config(pg2)
    vider_stockage(pg2)
    pg3 = lier(ctx2, lien_gen)
    S.check('lien généré → réhydrate le prénom', pg3.text_content('#titre') == 'Bonjour Odette')
    pg3.close(); ctx2.close(); ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
