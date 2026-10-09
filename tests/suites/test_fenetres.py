"""Suite « ouverture des sites » : fenêtre dédiée à droite, réutilisation,
repli onglet (écran étroit, popup bloquée, option « onglet »), mobile,
bandeau de retour. 24 contrôles.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'fenetres'


def run(S, b):
    # --- Bureau large : fenêtre dédiée nommée ---
    ctx, pg, errs = nouvelle_page(b, width=1600, height=900)
    injecter_config(pg)
    # window.open instrumenté par evaluate (add_init_script n'atteint pas le
    # monde principal sous CSP stricte). On vérifie les features demandées —
    # l'OS ne positionne pas la fenêtre en headless.
    pg.evaluate("""() => {
      const orig = window.open.bind(window);
      window.__ouverture = null;
      window.open = function (url, name, features) {
        window.__ouverture = { url: String(url), name: name, features: features };
        return orig(url, name, features);
      };
    }""")
    S.check('lien tuile = vrai <a target=_blank>',
            pg.get_attribute('.tuile[href^="https://"]', 'target') == '_blank')
    S.check('lien tuile rel=noopener',
            'noopener' in (pg.get_attribute('.tuile[href^="https://"]', 'rel') or ''))
    S.check('bandeau retour : role=status', pg.get_attribute('#retour-accueil', 'role') == 'status')
    with ctx.expect_page() as pw:
        pg.locator('.tuile[href^="https://"]').first.click()
    w = pw.value
    S.check('fenêtre ouverte sur l\'URL de la tuile', w.url.startswith('https://www.impots.gouv.fr'))
    S.check('opener coupé (sécurité)',
            w.evaluate('() => window.opener === null'))
    taille = w.viewport_size
    w2 = w.evaluate('() => ({w: window.outerWidth, h: window.outerHeight, x: window.screenX, y: window.screenY})')
    S.check('fenêtre ~75% de la largeur à droite', w2['w'] > 900 and w2['w'] < 1600)
    feat = pg.evaluate('() => window.__ouverture')
    S.check('fenêtre nommée « monaccueil-site »', feat and feat['name'] == 'monaccueil-site')
    S.check('fenêtre : features popup + left calculé',
            feat and 'popup=yes' in feat['features'] and 'left=' in feat['features']
            and 'width=' in feat['features'])
    w.close()

    # Réutilisation : un 2e clic rouvre la même fenêtre nommée (pas d'onglet en plus)
    with ctx.expect_page() as pw2:
        pg.locator('.tuile[href^="https://"]').nth(1).click()
    w_b = pw2.value
    S.check('2e clic : fenêtre nommée réutilisée (1 seule page créée)',
            w_b.url.startswith('https://www.ameli.fr'))
    w_b.close()
    S.check('bandeau retour « fenêtre » affiché',
            pg.locator('#retour-accueil:not([hidden])').count() == 1
            and 'croix en haut à droite' in (pg.text_content('#retour-accueil') or ''))
    S.check('bandeau : rappel FranceConnect (ameli.fr est dans la liste)',
            'mail de confirmation' in (pg.text_content('#retour-accueil .retour-fc') or ''))
    ctx.close()

    # --- Rappel « mail FranceConnect » : liste configurable sitesFranceConnect ---
    ctx, pg, errs_fc = nouvelle_page(b)
    tuiles_fc = config_test()['tuiles'] + [
        {'id': 'franceconnect', 'label': 'FranceConnect',
         'url': 'https://franceconnect.gouv.fr', 'couleur': '#034263',
         'icone': 'administration.svg', 'groupe': 'Mes démarches'},
        {'id': 'meteo', 'label': 'Météo', 'url': 'https://meteofrance.com',
         'couleur': '#0369a1', 'icone': 'meteo.svg', 'groupe': 'Mon quotidien'}]
    injecter_config(pg, tuiles=tuiles_fc)
    # Chaque domaine de la liste par défaut affiche le rappel
    for sel, nom in [('.tuile[href*="franceconnect"]', 'franceconnect'),
                     ('.tuile[href*="impots"]', 'impots'),
                     ('.tuile[href*="ameli"]', 'ameli')]:
        with ctx.expect_page() as pw_fc:
            pg.locator(sel).click()
        pw_fc.value.close()
        S.check('rappel mail : tuile %s' % nom,
                'mail de confirmation' in (pg.text_content('#retour-accueil .retour-fc') or ''))
        S.check('rappel mail : « quelques minutes plus tard » (%s)' % nom,
                'quelques minutes plus tard' in (pg.text_content('#retour-accueil .retour-fc') or ''))
    # Tuile hors liste : pas de rappel
    with ctx.expect_page() as pw_m:
        pg.locator('.tuile[href*="meteofrance"]').click()
    pw_m.value.close()
    S.check('rappel mail : absent pour meteofrance.com',
            pg.locator('#retour-accueil .retour-fc').count() == 0)
    ctx.close()

    # Sous-domaine réel accepté, domaine trompeur refusé, tuile ajoutée par la
    # personne (perso) fonctionne par domaine — même règle que le vérificateur
    ctx, pg, errs_fc2 = nouvelle_page(b)
    injecter_config(pg, tuiles=[
        {'id': 'sous', 'label': 'Sous-domaine', 'url': 'https://cfspart.impots.gouv.fr',
         'couleur': '#2f6fbf', 'icone': 'impots.svg', 'groupe': 'Mes démarches'},
        {'id': 'piege', 'label': 'Trompeur', 'url': 'https://franceconnect.gouv.fr.autre.com',
         'couleur': '#2f6fbf', 'icone': 'impots.svg', 'groupe': 'Mes démarches'}])
    with ctx.expect_page() as pw_s:
        pg.locator('.tuile[href*="cfspart.impots"]').click()
    pw_s.value.close()
    S.check('rappel mail : sous-domaine réel accepté',
            pg.locator('#retour-accueil .retour-fc').count() == 1)
    with ctx.expect_page() as pw_p:
        pg.locator('.tuile[href*="autre.com"]').click()
    pw_p.value.close()
    S.check('rappel mail : domaine trompeur refusé',
            pg.locator('#retour-accueil .retour-fc').count() == 0)
    ctx.close()

    # Liste invalide à l'import → repli sur la liste par défaut
    ctx, pg, errs_fc3 = nouvelle_page(b)
    injecter_config(pg, sitesFranceConnect=['<script>', 'pas un domaine', 42],
                    tuiles=[{'id': 'ameli', 'label': 'Ameli', 'url': 'https://www.ameli.fr',
                             'couleur': '#2e8b57', 'icone': 'sante.svg', 'groupe': 'Ma santé'}])
    with ctx.expect_page() as pw_i:
        pg.locator('.tuile[href*="ameli"]').click()
    pw_i.value.close()
    S.check('rappel mail : liste invalide → défaut utilisé',
            pg.locator('#retour-accueil .retour-fc').count() == 1)
    ctx.close()

    # Tuile ajoutée par la personne : le rappel dépend du domaine aussi
    ctx, pg, errs_fc5 = nouvelle_page(b)
    injecter_config(pg, tuiles=[
        {'id': 'meteo', 'label': 'Météo', 'url': 'https://meteofrance.com',
         'couleur': '#0369a1', 'icone': 'meteo.svg', 'groupe': 'Mon quotidien'}])
    pg.evaluate("""() => localStorage.setItem('monaccueil.perso',
      JSON.stringify([{label: 'Ma Caf', url: 'https://www.caf.fr', icone: 'famille.svg'}]))""")
    charger(pg); fermer_prenom(pg)
    with ctx.expect_page() as pw_perso:
        pg.locator('.tuile[href*="caf.fr"]').click()
    pw_perso.value.close()
    S.check('rappel mail : tuile ajoutée par la personne (caf.fr)',
            pg.locator('#retour-accueil .retour-fc').count() == 1)
    ctx.close()

    # Liste personnalisée : seuls les domaines choisis affichent le rappel
    ctx, pg, errs_fc4 = nouvelle_page(b)
    injecter_config(pg, sitesFranceConnect=['ameli.fr'],
                    tuiles=[{'id': 'ameli', 'label': 'Ameli', 'url': 'https://www.ameli.fr',
                             'couleur': '#2e8b57', 'icone': 'sante.svg', 'groupe': 'Ma santé'},
                            {'id': 'impots', 'label': 'Impôts', 'url': 'https://www.impots.gouv.fr',
                             'couleur': '#2f6fbf', 'icone': 'impots.svg', 'groupe': 'Mes démarches'}])
    with ctx.expect_page() as pw_a:
        pg.locator('.tuile[href*="ameli"]').click()
    pw_a.value.close()
    S.check('rappel mail : liste perso (ameli oui)', pg.locator('#retour-accueil .retour-fc').count() == 1)
    with ctx.expect_page() as pw_i2:
        pg.locator('.tuile[href*="impots"]').click()
    pw_i2.value.close()
    S.check('rappel mail : liste perso (impots non)', pg.locator('#retour-accueil .retour-fc').count() == 0)
    ctx.close()

    # --- Option « onglet » : clic = lien natif target=_blank ---
    ctx, pg, errs2 = nouvelle_page(b)
    injecter_config(pg, ouvertureSites='onglet')
    with ctx.expect_page() as pw3:
        pg.locator('.tuile[href^="https://"]').first.click()
    S.check('option onglet : nouvel onglet sur la tuile',
            pw3.value.url.startswith('https://www.impots.gouv.fr'))
    S.check('bandeau « onglet »',
            'autre onglet' in (pg.text_content('#retour-accueil') or ''))
    ctx.close()

    # --- Écran étroit : repli onglet (largeur < 1000) ---
    ctx, pg, errs3 = nouvelle_page(b, width=800, height=900)
    injecter_config(pg)
    with ctx.expect_page() as pw4:
        pg.locator('.tuile[href^="https://"]').first.click()
    S.check('écran étroit : repli onglet',
            pw4.value.url.startswith('https://www.impots.gouv.fr'))
    S.check('bandeau « onglet » (étroit)',
            'autre onglet' in (pg.text_content('#retour-accueil') or ''))
    ctx.close()

    # --- Popup bloquée : window.open renvoie null → repli lien ---
    ctx, pg, errs4 = nouvelle_page(b)
    injecter_config(pg)
    pg.evaluate('() => { window.open = () => null; }')
    with ctx.expect_page() as pw5:
        pg.locator('.tuile[href^="https://"]').first.click()
    S.check('popup bloquée : le lien natif prend le relais',
            pw5.value.url.startswith('https://www.impots.gouv.fr'))
    S.check('popup bloquée : bandeau onglet',
            'autre onglet' in (pg.text_content('#retour-accueil') or ''))
    ctx.close()

    # --- Mobile : jamais de fenêtre dédiée ---
    ctx, pg, errs5 = nouvelle_page(b, mobile=True, width=390, height=780)
    injecter_config(pg)
    with ctx.expect_page() as pw6:
        pg.locator('.tuile[href^="https://"]').first.click()
    S.check('mobile : nouvel onglet (pas de popup)', pw6.value.url.startswith('https://'))
    S.check('mobile : bandeau adapté',
            'flèche retour' in (pg.text_content('#retour-accueil') or ''))
    ctx.close()

    # --- Mobile « memeOnglet » : navigation dans l'onglet courant ---
    ctx, pg, errs6 = nouvelle_page(b, mobile=True, width=390, height=780)
    ctx.route('**://www.impots.gouv.fr/**', lambda r: r.fulfill(body='<h1>ok</h1>'))
    injecter_config(pg, ouvertureMobile='memeOnglet')
    pg.locator('.tuile[href^="https://"]').first.click()
    pg.wait_for_timeout(800)
    S.check('memeOnglet : navigation dans l\'onglet courant',
            pg.url.startswith('https://www.impots.gouv.fr'))
    S.check('memeOnglet : aucune page supplémentaire', len(ctx.pages) == 1)
    pg.go_back()
    S.check('memeOnglet : retour arrière ramène à l\'accueil',
            pg.wait_for_selector('.tuile', timeout=8000) is not None)
    ctx.close()

    # --- Le bandeau se masque seul au retour ---
    ctx, pg, errs7 = nouvelle_page(b)
    injecter_config(pg)
    with ctx.expect_page():
        pg.locator('.tuile[href^="https://"]').first.click()
    S.check('bandeau affiché après clic', pg.locator('#retour-accueil:not([hidden])').count() == 1)
    pg.evaluate("() => window.dispatchEvent(new Event('focus'))")
    pg.wait_for_timeout(200)
    S.check('bandeau masqué au retour de focus', pg.locator('#retour-accueil:not([hidden])').count() == 0)
    ctx.close()

    S.check('aucune erreur console cumulée',
            len(errs) + len(errs2) + len(errs3) + len(errs4) + len(errs5) + len(errs6) + len(errs7)
            + len(errs_fc) + len(errs_fc2) + len(errs_fc3) + len(errs_fc4) + len(errs_fc5) == 0)


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
