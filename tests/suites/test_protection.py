"""Suite « Protéger mon téléphone » : tuile dans « Aide et sécurité »,
dialog 3 étapes (marque → réglages → conseils), cases mémorisées,
pré-sélection iOS par capacités, config false, technicien, lien #p=.
"""
import sys, os, json, base64
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'protection'


def run(S, b):
    toutes_erreurs = []

    # ---------- Bureau : tuile, dialog, navigation, persistance ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    tuile = pg.locator('.tuile-protec')
    S.check('tuile « Protéger mon téléphone » visible', tuile.count() == 1 and tuile.is_visible())
    S.check('tuile dans « Aide et sécurité »',
            tuile.evaluate("t => t.closest('section.groupe') && t.closest('section.groupe').querySelector('h2').textContent")
            == 'Aide et sécurité')
    tuile.click()
    S.check('dialog ouvert', pg.locator('#dialog-protec[open]').count() == 1)
    S.check('question « Quel téléphone »', 'Quel téléphone' in (pg.text_content('#protec-contenu') or ''))
    S.check('4 marques + « Je ne sais pas »', pg.locator('.marque-vignette').count() == 5)
    S.check('iPhone présent', pg.locator('.marque-vignette:has-text("iPhone")').count() == 1)
    S.check('Samsung présent', pg.locator('.marque-vignette:has-text("Samsung")').count() == 1)
    S.check('Xiaomi présent', pg.locator('.marque-vignette:has-text("Xiaomi")').count() == 1)
    S.check('aucune pré-sélection sur PC', pg.locator('.marque-vignette.choisie').count() == 0)

    # Choix iPhone → étape 1
    pg.locator('.marque-vignette:has-text("iPhone")').click()
    pg.screenshot(path=os.path.join(os.path.dirname(__file__), '..', 'captures', 'protection-etape.png'))
    S.check('étape : phrase d\'action', 'numéros que vous ne connaissez pas' in (pg.text_content('#protec-contenu') or ''))
    S.check('étape : « Réglage 1 sur 3 »', 'Réglage 1 sur 3' in (pg.text_content('#protec-contenu') or ''))
    S.check('ligne « Dernière vérification »', 'Dernière vérification' in (pg.text_content('#protec-contenu') or ''))
    S.check('chemin en gras : segments <strong>',
            pg.locator('.chemin-menu strong').all_text_contents() == ['Réglages', 'Apps', 'Téléphone', 'Filtrage des appelants inconnus'])
    S.check('case « C\'est fait » visible', pg.locator('#case-faite').is_visible())

    # Case cochée → persistée ; navigation précédent/suivant
    pg.check('#case-faite')
    S.check('état en localStorage', '"filtrage-appels"' in (pg.evaluate("() => localStorage.getItem('monaccueil.protection')") or ''))
    pg.click('button:has-text("Réglage suivant")')
    S.check('étape 2 : Messages', 'expéditeurs inconnus' in (pg.text_content('#protec-contenu') or ''))
    S.check('case étape 2 décochée', not pg.locator('#case-faite').is_checked())
    pg.click('button:has-text("Réglage précédent")')
    S.check('retour étape 1 : case encore cochée', pg.locator('#case-faite').is_checked())
    pg.click('button:has-text("Réglage suivant")')
    pg.click('button:has-text("Réglage suivant")')
    pg.click('button:has-text("Voir les conseils")')
    conseils = pg.locator('.protec-conseils li').all_text_contents()
    S.check('4 conseils affichés', len(conseils) == 4)
    S.check('conseil contacts avant filtrage', any('enregistrez dans vos contacts' in c for c in conseils))
    S.check('conseil 33700 présent', any('33700' in c for c in conseils))
    S.check('rappel « appelez-moi »', any('appelez-moi' in c for c in conseils))
    pg.click('#btn-protec-retour')
    S.check('retour : vignettes de nouveau', pg.locator('.marque-vignette').count() == 5)
    S.check('marque mémorisée : iPhone pré-sélectionné',
            pg.locator('.marque-vignette.choisie:has-text("iPhone")').count() == 1)
    pg.keyboard.press('Escape')
    S.check('Échap : dialog fermé', pg.locator('#dialog-protec[open]').count() == 0)
    S.check('Échap : focus rendu à la tuile',
            pg.evaluate("() => document.activeElement && document.activeElement.classList.contains('tuile-protec')"))

    # Rechargement : l'état survit
    charger(pg); fermer_prenom(pg)
    pg.locator('.tuile-protec').click()
    pg.locator('.marque-vignette:has-text("iPhone")').click()
    S.check('rechargement : case étape 1 encore cochée', pg.locator('#case-faite').is_checked())
    # Miroir IndexedDB : protection incluse dans l'enregistrement personne
    idb = lire_idb(pg)
    S.check('miroir IDB : protection présente',
            bool(idb and idb.get('protection') and idb['protection'].get('m') == 'iphone'))
    pg.keyboard.press('Escape')
    toutes_erreurs += errs
    ctx.close()

    # ---------- « Je ne sais pas » → aide + appel ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    pg.locator('.tuile-protec').click()
    pg.locator('.marque-vignette:has-text("Je ne sais pas")').click()
    S.check('« Je ne sais pas » : message d\'aide',
            'je regarde avec vous' in (pg.text_content('#protec-contenu') or ''))
    S.check('« Je ne sais pas » : lien tel:',
            (pg.get_attribute('#protec-contenu a.aide-telephone', 'href') or '').startswith('tel:'))
    pg.click('#btn-protec-retour')
    pg.keyboard.press('Escape')
    toutes_erreurs += errs
    ctx.close()

    # ---------- Config protectionTelephone: false → pas de tuile ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, protectionTelephone=False)
    S.check('config false : pas de tuile', pg.locator('.tuile-protec').count() == 0)
    S.check('config false : tuile bizarre toujours là', pg.locator('.tuile-bizarre').count() == 1)
    toutes_erreurs += errs
    ctx.close()

    # ---------- Mobile : tuile + pré-sélection iOS par capacités ----------
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=720)
    injecter_config(pg)
    S.check('mobile : tuile présente', pg.locator('.tuile-protec').count() == 1)
    pg.locator('.tuile-protec').click()
    pg.screenshot(path=os.path.join(os.path.dirname(__file__), '..', 'captures', 'protection-mobile.png'))
    S.check('mobile : pas de pré-sélection (non-iOS)', pg.locator('.marque-vignette.choisie').count() == 0)
    pg.keyboard.press('Escape')
    toutes_erreurs += errs
    ctx.close()

    # iOS simulé : navigator.standalone existe (capacité, pas user-agent)
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=720)
    ctx.route('**/app.js', lambda r: r.fulfill(
        body="try{navigator.standalone=false}catch(e){}\n" + r.fetch().text(),
        content_type='application/javascript'))
    charger(pg); fermer_prenom(pg)
    pg.locator('.tuile-protec').click()
    S.check('iOS (capacité) : iPhone pré-sélectionné',
            pg.locator('.marque-vignette.choisie:has-text("iPhone")').count() == 1)
    pg.keyboard.press('Escape')
    toutes_erreurs += errs
    ctx.close()

    # ---------- Lien personnel #p= : protection restaurée / hostile ignorée ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    vider_stockage(pg)
    lien = BASE + lien_personnel({
        'v': 1, 'prenom': 'Raymonde',
        'protection': {'m': 'samsung', 'f': ['caller-id', 'id-inexistant']}})
    pg2 = ctx.new_page(); pg2.goto(lien); pg2.wait_for_selector('.tuile', timeout=10000); fermer_prenom(pg2)
    brut = pg2.evaluate("() => localStorage.getItem('monaccueil.protection')") or ''
    S.check('lien : marque restaurée', '"samsung"' in brut)
    S.check('lien : étape valide gardée', '"caller-id"' in brut)
    S.check('lien : id invalide filtré', 'id-inexistant' not in brut)
    pg2.close()
    # Le contexte partage le localStorage : vider avant le lien hostile
    vider_stockage(pg)
    pg3 = ctx.new_page()
    pg3.goto(BASE + lien_personnel({'v': 1, 'protection': {'m': '<script>', 'f': ['x']}}))
    pg3.wait_for_selector('.tuile', timeout=10000)
    S.check('lien hostile : protection ignorée',
            not pg3.evaluate("() => localStorage.getItem('monaccueil.protection')"))
    pg3.close()
    toutes_erreurs += errs
    ctx.close()

    # ---------- Technicien : liste lecture seule + case d'affichage ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    # La personne coche une étape
    pg.locator('.tuile-protec').click()
    pg.locator('.marque-vignette:has-text("iPhone")').click()
    pg.check('#case-faite')
    pg.keyboard.press('Escape')
    ouvrir_tech(pg)
    S.check('tech : case « Afficher la tuile » présente', pg.locator('#tech-protec').count() == 1)
    S.check('tech : case cochée par défaut', pg.locator('#tech-protec').is_checked())
    texte = pg.text_content('#panneau-tech') or ''
    S.check('tech : liste lecture seule des étapes', 'Protéger mon téléphone (iPhone)' in texte)
    S.check('tech : étape cochée visible', 'Ouvrez le réglage des appels' in texte)
    toutes_erreurs += errs
    ctx.close()

    S.check('aucune erreur console cumulée', len(toutes_erreurs) == 0)


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
