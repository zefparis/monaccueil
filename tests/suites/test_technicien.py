"""Suite « mode technicien » : appui long, PIN (ralentissement, refus),
panneau, onglets, sauvegarde config, quitter, modeTechnicien:false.
~16 contrôles.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'technicien'


def run(S, b):
    # --- Accès : appui long + bon PIN ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    S.check('panneau caché au chargement', pg.locator('#panneau-tech:not([hidden])').count() == 0)
    # Appui trop court : rien ne s'ouvre
    pg.evaluate("""() => {
      const t = document.getElementById('titre');
      t.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
      setTimeout(() => t.dispatchEvent(new PointerEvent('pointerup', {bubbles: true})), 300);
    }""")
    pg.wait_for_timeout(4000)
    S.check('appui court : pas de PIN', pg.locator('#dialog-pin[open]').count() == 0)
    ouvrir_tech(pg)
    S.check('PIN correct : panneau ouvert', pg.locator('#panneau-tech:not([hidden])').count() == 1)
    S.check('classe mode-tech', pg.evaluate("() => document.body.classList.contains('mode-tech')"))
    S.check('2 onglets', pg.locator('.onglets .onglet').count() == 2)
    S.check('onglet config actif', pg.get_attribute('#onglet-config', 'aria-selected') == 'true')
    ctx.close()

    # --- Mauvais PIN : refus + message + délai ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    pg.evaluate("""() => {
      document.getElementById('titre').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
    }""")
    pg.wait_for_selector('#dialog-pin[open]', timeout=8000)
    pg.fill('#champ-pin', '9999')
    pg.click('#form-pin button[type="submit"]')
    pg.wait_for_timeout(2000)
    S.check('mauvais PIN : « Code incorrect »', 'incorrect' in (pg.text_content('#pin-erreur') or ''))
    S.check('mauvais PIN : panneau fermé', pg.locator('#panneau-tech:not([hidden])').count() == 0)
    pg.fill('#champ-pin', 'abc')
    pg.click('#form-pin button[type="submit"]')
    pg.wait_for_timeout(300)
    S.check('PIN non numérique : bloqué par pattern HTML5 (dialog ouvert)',
            pg.locator('#dialog-pin[open]').count() == 1)
    pg.click('#btn-pin-annuler')
    S.check('annuler PIN : dialog fermé', pg.locator('#dialog-pin[open]').count() == 0)
    ctx.close()

    # --- Sauvegarde config via le panneau ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    ouvrir_tech(pg)
    pg.select_option('[name="ouverture-sites"]', 'onglet')
    pg.click('button:has-text("Enregistrer")')
    pg.wait_for_timeout(400)
    S.check('config sauvegardée en localStorage',
            '"ouvertureSites":"onglet"' in (pg.evaluate("() => localStorage.getItem('%s')" % CLE_CONFIG) or ''))
    charger(pg); fermer_prenom(pg)
    S.check('config rechargée : onglet', '"ouvertureSites":"onglet"' in (pg.evaluate("() => localStorage.getItem('%s')" % CLE_CONFIG) or ''))
    ctx.close()

    # --- Quitter le mode technicien ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    ouvrir_tech(pg)
    pg.locator('button:has-text("Quitter")').first.click()
    S.check('quitter : panneau masqué', pg.locator('#panneau-tech:not([hidden])').count() == 0)
    S.check('quitter : classe retirée', not pg.evaluate("() => document.body.classList.contains('mode-tech')"))
    ctx.close()

    # --- modeTechnicien: false → aucun accès ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, modeTechnicien=False)
    pg.evaluate("""() => {
      document.getElementById('titre').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
    }""")
    pg.wait_for_timeout(4000)
    S.check('modeTechnicien false : pas de PIN', pg.locator('#dialog-pin[open]').count() == 0)
    S.check('modeTechnicien false : pas de panneau', pg.locator('#panneau-tech:not([hidden])').count() == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
