"""Suite « design » : mise en page sans défilement vertical/horizontal aux
résolutions courantes, palettes, contraste élevé, taille maximale,
tuile d'ajout pointillée. 38 contrôles.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'design'
CAPTURES = os.path.join(os.path.dirname(__file__), '..', 'captures')


def pas_de_scroll_horizontal(pg):
    return pg.evaluate('() => document.documentElement.scrollWidth <= window.innerWidth')


def hauteur_page(pg):
    return pg.evaluate('() => document.documentElement.scrollHeight')


def run(S, b):
    # --- Bureau 1920×1080 : tout tient sans scroll vertical ---
    ctx, pg, errs = nouvelle_page(b, width=1920, height=1080)
    charger(pg)
    fermer_prenom(pg)
    S.check('1920 : sans scroll vertical', hauteur_page(pg) <= 1080)
    S.check('1920 : sans scroll horizontal', pas_de_scroll_horizontal(pg))
    S.check('1920 : 14 tuiles (9 config + 4 fixes + ajout)', pg.locator('.tuile').count() == 14)
    S.check('1920 : groupes avec titres', pg.locator('.groupe-titre').count() >= 3)
    S.check('tuile ajout pointillée visible', pg.locator('#lien-ajout.tuile-ajout').is_visible())
    S.check('bouton aide présent', pg.locator('#btn-aide').is_visible())
    S.check('lien « Comment ça marche ? »', pg.locator('#lien-mode').is_visible())
    pg.screenshot(path=os.path.join(CAPTURES, 'bureau-1920.png'))
    ctx.close()

    # --- Taille maximale : la page peut défiler mais rien ne déborde ---
    ctx, pg, errs = nouvelle_page(b, width=1920, height=1080)
    charger(pg)
    fermer_prenom(pg)
    pg.click('#btn-taille-plus')
    pg.click('#btn-taille-plus')
    S.check('taille-3 appliquée', pg.evaluate("() => document.documentElement.className") == 'taille-3')
    S.check('taille max : pas de scroll horizontal', pas_de_scroll_horizontal(pg))
    S.check('taille max : tuiles toujours là', pg.locator('.tuile').count() == 14)
    S.check('taille max : bouton « plus grand » désactivé', pg.locator('#btn-taille-plus').is_disabled())
    S.check('taille max : « plus petit » actif', not pg.locator('#btn-taille-moins').is_disabled())
    pg.click('#btn-taille-moins')
    S.check('retour taille-2', pg.evaluate("() => document.documentElement.className") == 'taille-2')
    S.check('taille persistée en localStorage', pg.evaluate("() => localStorage.getItem('%s')" % CLE_TAILLE) == '2')
    charger(pg)
    S.check('taille-2 survit au rechargement', pg.evaluate("() => document.documentElement.className") == 'taille-2')
    ctx.close()

    # --- Contraste élevé ---
    ctx, pg, errs = nouvelle_page(b, width=1920, height=1080)
    charger(pg)
    fermer_prenom(pg)
    pg.click('#btn-contraste')
    S.check('contraste activé', pg.evaluate("() => document.documentElement.classList.contains('contraste-eleve')"))
    S.check('contraste : pas de scroll horizontal', pas_de_scroll_horizontal(pg))
    S.check('contraste : aria-pressed', pg.get_attribute('#btn-contraste', 'aria-pressed') == 'true')
    fond = pg.evaluate('() => getComputedStyle(document.body).backgroundColor')
    S.check('contraste : fond foncé', fond in ('rgb(0, 0, 0)', 'rgb(17, 17, 17)', 'rgb(0,0,0)'))
    S.check('contraste persisté', pg.evaluate("() => localStorage.getItem('%s')" % CLE_CONTRASTE) == '1')
    pg.screenshot(path=os.path.join(CAPTURES, 'bureau-contraste.png'))
    ctx.close()

    # --- Les 6 palettes ---
    for p in ['chaleureux', 'bleu', 'vert', 'violet', 'rose', 'gris']:
        ctx, pg, errs = nouvelle_page(b, width=1600, height=900)
        charger(pg)
        fermer_prenom(pg)
        pg.click('#lien-palette')
        pg.click('.palette-carte[data-palette="%s"]' % p)
        pg.keyboard.press('Escape')
        pg.wait_for_timeout(100)
        S.check('palette %s appliquée' % p,
                pg.evaluate("p => document.documentElement.classList.contains('palette-' + p)", p) if p != 'chaleureux'
                else not pg.evaluate("() => [...document.documentElement.classList].some(c => c.startsWith('palette-'))"))
        S.check('palette %s : pas de scroll horizontal' % p, pas_de_scroll_horizontal(pg))
        ctx.close()

    # --- Tailles intermédiaires ---
    ctx, pg, errs = nouvelle_page(b, width=1366, height=768)
    charger(pg)
    fermer_prenom(pg)
    S.check('1366 : sans scroll horizontal', pas_de_scroll_horizontal(pg))
    ctx.close()
    ctx, pg, errs = nouvelle_page(b, width=1024, height=768)
    charger(pg)
    fermer_prenom(pg)
    S.check('1024 : sans scroll horizontal', pas_de_scroll_horizontal(pg))
    ctx.close()

    # --- Éléments d'accessibilité toujours présents ---
    ctx, pg, errs = nouvelle_page(b)
    charger(pg)
    fermer_prenom(pg)
    S.check('lien d\'évitement présent', pg.locator('a.evitement').count() == 1)
    S.check('html lang=fr', pg.get_attribute('html', 'lang') == 'fr')
    S.check('icônes aria-hidden', pg.locator('.tuile svg[aria-hidden="true"]').count() >= 10)
    S.check('tuiles = liens réels clavier-accessibles',
            pg.locator('a.tuile').count() + pg.locator('button.tuile').count() == pg.locator('.tuile').count())
    S.check('dialog aide présent', pg.locator('#dialog-aide').count() == 1)
    S.check('dialog bizarre présent', pg.locator('#dialog-bizarre').count() == 1)
    S.check('aucune erreur console', len(errs) == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
