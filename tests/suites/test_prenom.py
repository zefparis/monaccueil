"""Suite « prénom » : premier lancement, saisie, validation, persistance,
« Plus tard », priorité config < choix de la personne. 40 contrôles.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'prenom'


def run(S, b):
    # --- Premier lancement : le dialog s'ouvre tout seul ---
    ctx, pg, errs = nouvelle_page(b)
    charger(pg)
    S.check('dialog prénom ouvert au 1er lancement', pg.locator('#dialog-prenom[open]').count() == 1)
    S.check('champ prénom a le focus', pg.evaluate('() => document.activeElement.id') == 'champ-prenom')
    S.check('label « Comment voulez-vous… »', 'Comment' in (pg.text_content('#dialog-prenom label') or ''))
    S.check('bouton « Plus tard » visible', pg.locator('#btn-prenom-plustard').is_visible())
    S.check('bouton « Valider » visible', pg.locator('#form-prenom button[type="submit"]').is_visible())

    # --- « Plus tard » : referme, mémorisé, ne rouvre pas ---
    pg.click('#btn-prenom-plustard')
    S.check('« Plus tard » referme le dialog', pg.locator('#dialog-prenom[open]').count() == 0)
    S.check('plustard mémorisé', pg.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM_PLUSTARD) == '1')
    S.check('titre reste « Bonjour »', pg.text_content('#titre') == 'Bonjour')
    S.check('lien « Choisir mon prénom »', 'Choisir' in (pg.text_content('#lien-prenom') or ''))
    charger(pg)
    S.check('rechargement : dialog ne se rouvre pas', pg.locator('#dialog-prenom[open]').count() == 0)

    # --- Réouverture par le lien ---
    pg.click('#lien-prenom')
    S.check('lien « Choisir » rouvre le dialog', pg.locator('#dialog-prenom[open]').count() == 1)
    S.check('champ vide à la réouverture', pg.input_value('#champ-prenom') == '')

    # --- Saisie invalide : messages, dialog reste ouvert ---
    cas_invalides = ['', '   ', 'Jean2', '<script>alert(1)</script>', 'Marie!', 'A' * 31, '123', 'Jean;DROP']
    for i, v in enumerate(cas_invalides):
        pg.fill('#champ-prenom', v)
        pg.click('#form-prenom button[type="submit"]')
        S.check('invalide refusé (%d) : %r' % (i, v[:20]),
                pg.locator('#dialog-prenom[open]').count() == 1
                and bool((pg.text_content('#prenom-erreur') or '').strip()))
        S.check('invalide non stocké (%d)', pg.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM) is None)
    S.check('titre toujours « Bonjour » après refus', pg.text_content('#titre') == 'Bonjour')

    # --- Saisie valide ---
    pg.fill('#champ-prenom', 'marie')
    pg.click('#form-prenom button[type="submit"]')
    S.check('valide : dialog refermé', pg.locator('#dialog-prenom[open]').count() == 0)
    S.check('valide : erreur vidée', not (pg.text_content('#prenom-erreur') or '').strip())
    S.check('titre « Bonjour Marie » (majuscule)', pg.text_content('#titre') == 'Bonjour Marie')
    S.check('prénom stocké', pg.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM) == 'marie')
    S.check('plustard effacé après choix', pg.evaluate("() => localStorage.getItem('%s')" % CLE_PRENOM_PLUSTARD) is None)
    S.check('lien devient « Changer mon prénom »', 'Changer' in (pg.text_content('#lien-prenom') or ''))

    # --- Persistance au rechargement ---
    charger(pg)
    S.check('rechargement : « Bonjour Marie »', pg.text_content('#titre') == 'Bonjour Marie')
    S.check('rechargement : pas de dialog', pg.locator('#dialog-prenom[open]').count() == 0)

    # --- Réouverture : champ pré-rempli ---
    pg.click('#lien-prenom')
    S.check('champ pré-rempli « Marie » (majuscule)', pg.input_value('#champ-prenom') == 'Marie')
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(100)
    S.check('Échap referme (plus tard)', pg.locator('#dialog-prenom[open]').count() == 0)
    S.check('Échap ne perd pas le prénom', pg.text_content('#titre') == 'Bonjour Marie')

    # --- Prénom stocké corrompu : ignoré proprement ---
    pg.evaluate("() => localStorage.setItem('%s', '<b>x</b>')" % CLE_PRENOM)
    charger(pg)
    S.check('prénom corrompu ignoré', pg.text_content('#titre') == 'Bonjour')
    pg.evaluate("() => localStorage.setItem('%s', 'A'.repeat(31))" % CLE_PRENOM)
    charger(pg)
    S.check('prénom trop long ignoré', pg.text_content('#titre') == 'Bonjour')

    # --- Prénom de la config : utilisé tant que la personne n'a pas choisi ---
    injecter_config(pg, prenom='Henri')
    S.check('prénom de config affiché', pg.text_content('#titre') == 'Bonjour Henri')
    S.check('config + pas de choix : pas de dialog', pg.locator('#dialog-prenom[open]').count() == 0)
    pg.click('#lien-prenom')
    pg.fill('#champ-prenom', 'Colette')
    pg.click('#form-prenom button[type="submit"]')
    S.check('choix prime sur config', pg.text_content('#titre') == 'Bonjour Colette')

    # --- Jamais de HTML interprété ---
    pg.click('#lien-prenom')
    pg.fill('#champ-prenom', '<img src=x>')
    pg.click('#form-prenom button[type="submit"]')
    S.check('balises refusées', pg.locator('#dialog-prenom[open]').count() == 1)
    S.check('aucun élément injecté dans le titre',
            pg.evaluate("() => document.getElementById('titre').children.length") == 0)

    # --- Accents, apostrophes, tirets acceptés ---
    for v in ['Jean-Ève', "Marie d'Arc", 'Ôdile']:
        if pg.locator('#dialog-prenom[open]').count() == 0:
            pg.click('#lien-prenom')
        pg.fill('#champ-prenom', v)
        pg.click('#form-prenom button[type="submit"]')
        ok = pg.locator('#dialog-prenom[open]').count() == 0
        S.check('prénom accepté : %s' % v, ok)
        if not ok:
            pg.click('#btn-prenom-plustard')
    S.check('aucune erreur console/page', len(errs) == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
