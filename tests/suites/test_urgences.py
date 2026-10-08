"""Suite « Urgences et arnaques » : tuile dans « Aide et sécurité »,
dialog 3 écrans (suspect / piégé / santé), contacts de confiance validés,
alerte du moment fermable, blocUrgences:false, barre mobile.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'urgences'
CAPTURES = os.path.join(os.path.dirname(__file__), '..', 'captures')
CLE_ALERTE_VUE = 'monaccueil.alerte.vue'

CONTACTS = [
    {'prenom': 'Monique', 'numero': '06 11 22 33 44'},
    {'prenom': 'Jean-Paul', 'numero': '+33688776655'},
]


def run(S, b):
    toutes_erreurs = []

    # ---------- Bureau : tuile, menu, 3 écrans ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, contactsConfiance=CONTACTS)
    tuile = pg.locator('.tuile-urgences')
    S.check('tuile « Urgences et arnaques » visible', tuile.count() == 1 and tuile.is_visible())
    S.check('tuile dans « Aide et sécurité »',
            tuile.evaluate("t => t.closest('section.groupe') && t.closest('section.groupe').querySelector('h2').textContent")
            == 'Aide et sécurité')
    S.check('tuile : couleur distincte de l\'orange « bizarre »',
            tuile.evaluate("t => t.style.getPropertyValue('--couleur')") == '#1e40af')
    tuile.click()
    S.check('dialog ouvert', pg.locator('#dialog-urgences[open]').count() == 1)
    S.check('menu : 3 choix', pg.locator('.urgence-choix').count() == 3)
    S.check('pas de bouton retour au menu', not pg.locator('#btn-urgences-retour').is_visible())

    # Écran 1 : suspect au téléphone
    pg.click('button:has-text("suspect au téléphone")')
    contenu = pg.text_content('#urgences-contenu') or ''
    S.check('suspect : « Raccrochez maintenant »', 'Raccrochez maintenant' in contenu)
    S.check('suspect : règle banque', 'jamais un code' in contenu)
    S.check('suspect : dos de la carte', 'dos de votre carte' in contenu)
    S.check('suspect : bouton « Appeler Benji »', 'Appeler Benji' in contenu)
    S.check('suspect : lien tel:',
            (pg.get_attribute('#urgences-contenu a.aide-telephone', 'href') or '').startswith('tel:'))
    S.check('suspect : numéro en clair', '0612345678' in contenu.replace(' ', '') or '06 12 34 56 78' in contenu)
    pg.screenshot(path=os.path.join(CAPTURES, 'urgences-suspect.png'))
    pg.click('#btn-urgences-retour')
    S.check('retour au menu', pg.locator('.urgence-choix').count() == 3)

    # Écran 2 : j'ai été piégé
    pg.click('button:has-text("ai été piégé")')
    contenu = pg.text_content('#urgences-contenu') or ''
    S.check('piégé : texte rassurant', 'arrive à beaucoup de monde' in contenu)
    S.check('piégé : 4 étapes', pg.locator('.urgences-etapes li').count() == 4)
    S.check('piégé : opposition banque', 'opposition' in contenu)
    S.check('piégé : ne rien supprimer', 'supprimez rien' in contenu or 'Ne supprimez rien' in contenu)
    S.check('piégé : 33700', '33700' in contenu)
    S.check('piégé : Info Escroqueries', '0 805 805 817' in contenu)
    S.check('piégé : Perceval', 'Perceval' in contenu)
    S.check('piégé : THESEE', 'THESEE' in contenu)
    S.check('piégé : « Dernière vérification »', 'Dernière vérification' in contenu)
    pg.screenshot(path=os.path.join(CAPTURES, 'urgences-piege.png'))
    pg.click('#btn-urgences-retour')

    # Écran 3 : urgence santé
    pg.click('button:has-text("Urgence santé")')
    contenu = pg.text_content('#urgences-contenu') or ''
    hrefs = pg.locator('#urgences-contenu a.urgence-appel, #urgences-contenu a.urgence-proche').evaluate_all(
        "els => els.map(e => e.getAttribute('href'))")
    S.check('santé : tel:15', 'tel:15' in hrefs)
    S.check('santé : tel:18', 'tel:18' in hrefs)
    S.check('santé : tel:112', 'tel:112' in hrefs)
    S.check('santé : tel:114', 'tel:114' in hrefs)
    S.check('santé : numéros en grand (strong)', pg.locator('#urgences-contenu .urgence-appel strong').count() >= 4)
    S.check('santé : « Appeler mon proche »', 'Appeler mon proche' in contenu)
    S.check('santé : contacts Monique et Jean-Paul', 'Monique' in contenu and 'Jean-Paul' in contenu)
    S.check('santé : lien tel proche', 'tel:+33688776655' in hrefs)
    S.check('santé : ligne « aide, pas service d\'urgence »',
            'pas un service d\'urgence' in contenu and '112' in contenu)
    S.check('santé : aucun numéro du technicien', 'tel:+33612345678' not in hrefs and 'tel:0612345678' not in hrefs)
    pg.screenshot(path=os.path.join(CAPTURES, 'urgences-sante.png'))
    pg.keyboard.press('Escape')
    S.check('Échap : dialog fermé', pg.locator('#dialog-urgences[open]').count() == 0)
    S.check('Échap : focus rendu à la tuile',
            pg.evaluate("() => document.activeElement.classList.contains('tuile-urgences')"))

    # Entrée depuis « Un message me paraît bizarre »
    pg.locator('.tuile-bizarre').click()
    S.check('bizarre : bouton « suspect » présent', pg.locator('#lien-suspect').is_visible())
    pg.click('#lien-suspect')
    S.check('bizarre → écran suspect direct',
            'Raccrochez maintenant' in (pg.text_content('#urgences-contenu') or ''))
    S.check('bizarre : dialog refermé', pg.locator('#dialog-bizarre[open]').count() == 0)
    pg.click('#btn-fermer-urgences')
    toutes_erreurs += errs
    ctx.close()

    # ---------- blocUrgences: false ----------
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=720)
    injecter_config(pg, blocUrgences=False)
    S.check('bloc false : pas de tuile', pg.locator('.tuile-urgences').count() == 0)
    S.check('bloc false : pas de bouton barre', not pg.locator('#btn-urgence').is_visible())
    pg.locator('.tuile-bizarre').click()
    S.check('bloc false : pas de lien suspect', not pg.locator('#lien-suspect').is_visible())
    pg.click('#btn-fermer-bizarre')
    toutes_erreurs += errs
    ctx.close()

    # ---------- contactsConfiance : validation stricte ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, contactsConfiance=[
        {'prenom': 'Monique', 'numero': '06 11 22 33 44'},
        {'prenom': '<img src=x>', 'numero': '0611223344'},          # HTML → rejeté
        {'prenom': 'Paul', 'numero': 'pas un numero'},              # numéro invalide → rejeté
        {'prenom': 'A', 'numero': '0611223344'},
        {'prenom': 'B', 'numero': '0611223344'},                    # 4e et 5e valides → rejetés (>3)
    ])
    pg.locator('.tuile-urgences').click()
    pg.click('button:has-text("Urgence santé")')
    contenu = pg.text_content('#urgences-contenu') or ''
    S.check('contacts : Monique gardée', 'Monique' in contenu)
    S.check('contacts : HTML filtré', '<img' not in contenu and pg.locator('#urgences-contenu img').count() == 0)
    S.check('contacts : numéro invalide rejeté', 'Paul' not in contenu)
    S.check('contacts : max 3 appliqué', 'Monique' in contenu and 'A' in contenu.split('Appeler mon proche')[-1])
    pg.keyboard.press('Escape')
    toutes_erreurs += errs
    ctx.close()

    # ---------- Alerte du moment ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, alerte={'actif': True, 'titre': 'Faux colis cette semaine',
                                'texte': 'Ne cliquez pas le lien, appelez-moi.'})
    S.check('alerte : bandeau visible', pg.locator('#bandeau-alerte:not([hidden])').count() == 1)
    S.check('alerte : titre affiché', 'Faux colis' in (pg.text_content('#alerte-titre') or ''))
    S.check('alerte : texte affiché', 'Ne cliquez pas' in (pg.text_content('#alerte-texte') or ''))
    S.check('alerte : pas de HTML rendu', pg.locator('#bandeau-alerte strong, #bandeau-alerte em').count() <= 1)
    pg.screenshot(path=os.path.join(CAPTURES, 'urgences-alerte.png'))
    pg.click('#btn-alerte-fermer')
    S.check('alerte : fermée au clic', not pg.locator('#bandeau-alerte').is_visible())
    S.check('alerte : hash mémorisé', bool(pg.evaluate("() => localStorage.getItem('%s')" % CLE_ALERTE_VUE)))
    charger(pg); fermer_prenom(pg)
    S.check('alerte : fermeture persiste au rechargement', not pg.locator('#bandeau-alerte').is_visible())
    # Le texte change → l'alerte revient
    pg.evaluate("""() => {
      const c = JSON.parse(localStorage.getItem('monaccueil.config'));
      c.alerte.texte = 'Nouvelle arnaque cette fois.';
      localStorage.setItem('monaccueil.config', JSON.stringify(c));
    }""")
    charger(pg); fermer_prenom(pg)
    S.check('alerte : revient si le texte change', pg.locator('#bandeau-alerte:not([hidden])').count() == 1)
    S.check('alerte : nouveau texte affiché', 'Nouvelle arnaque' in (pg.text_content('#alerte-texte') or ''))
    toutes_erreurs += errs
    ctx.close()

    # Alerte invalide : titre > 80 → ignorée ; HTML → ignorée
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, alerte={'actif': True, 'titre': 'x' * 81, 'texte': 'ok'})
    S.check('alerte titre > 80 : ignorée', not pg.locator('#bandeau-alerte').is_visible())
    injecter_config(pg, alerte={'actif': True, 'titre': '<b>alarme</b>', 'texte': 'ok'})
    S.check('alerte HTML : ignorée', not pg.locator('#bandeau-alerte').is_visible())
    injecter_config(pg, alerte={'actif': True, 'titre': 'titre', 'texte': 'y' * 201})
    S.check('alerte texte > 200 : ignorée', not pg.locator('#bandeau-alerte').is_visible())
    toutes_erreurs += errs
    ctx.close()

    # ---------- Mobile : bouton « Urgence » dans la barre ----------
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=720)
    injecter_config(pg, contactsConfiance=CONTACTS)
    btn = pg.locator('#btn-urgence')
    S.check('mobile : bouton Urgence visible', btn.is_visible())
    S.check('mobile : libellé écrit', 'Urgence' in (btn.text_content() or ''))
    S.check('mobile : couleur distincte d\'« Appeler »',
            btn.evaluate("b => getComputedStyle(b).backgroundColor")
            != pg.locator('#btn-appeler').evaluate("b => getComputedStyle(b).backgroundColor"))
    btn.click()
    S.check('mobile : dialog ouvert', pg.locator('#dialog-urgences[open]').count() == 1)
    pg.screenshot(path=os.path.join(CAPTURES, 'urgences-mobile.png'))
    pg.click('#btn-fermer-urgences')
    S.check('mobile : focus rendu au bouton Urgence',
            pg.evaluate("() => document.activeElement.id") == 'btn-urgence')
    toutes_erreurs += errs
    ctx.close()

    # ---------- Technicien : champs présents + validation ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, contactsConfiance=CONTACTS,
                    alerte={'actif': True, 'titre': 'Test', 'texte': 'Corps'})
    ouvrir_tech(pg)
    S.check('tech : case bloc urgences', pg.locator('#tech-urgences-bloc').is_checked())
    S.check('tech : liste contacts éditable',
            'Monique | 06 11 22 33 44' in (pg.input_value('#tech-contacts') or ''))
    S.check('tech : alerte pré-remplie', pg.input_value('#tech-alerte-titre') == 'Test')
    S.check('tech : case alerte cochée', pg.locator('#tech-alerte-actif').is_checked())
    # Ligne illisible → erreur bloquante
    pg.fill('#tech-contacts', 'Monique | 06 11 22 33 44\nligne sans numero valide')
    pg.click('button:has-text("Enregistrer et appliquer")')
    S.check('tech : contact illisible bloque', 'Contacts de confiance' in (pg.text_content('#panneau-tech') or ''))
    # 4 lignes → erreur
    pg.fill('#tech-contacts', 'A|0611\nB|0611\nC|0611\nD|0611')
    pg.click('button:has-text("Enregistrer et appliquer")')
    S.check('tech : >3 contacts bloque', '3 contacts maximum' in (pg.text_content('#panneau-tech') or ''))
    # Corriger + alerte sans titre → erreur aussi
    pg.fill('#tech-contacts', 'Monique | 06 11 22 33 44')
    pg.fill('#tech-alerte-titre', '')
    pg.click('button:has-text("Enregistrer et appliquer")')
    S.check('tech : alerte sans titre bloque', 'Alerte du moment' in (pg.text_content('#panneau-tech') or ''))
    # Tout corriger → enregistré
    pg.fill('#tech-alerte-titre', 'Arnaque colis')
    pg.click('button:has-text("Enregistrer et appliquer")')
    pg.wait_for_timeout(300)
    S.check('tech : enregistré', 'Enregistré' in (pg.text_content('#panneau-tech') or ''))
    toutes_erreurs += errs
    ctx.close()

    # ---------- Import hostile : contacts/alerte revalidés ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, contactsConfiance=[{'prenom': '<b>X</b>', 'numero': '0611'},
                                         'chaine', 42],
                    alerte={'actif': True, 'titre': '<script>', 'texte': 'x'},
                    blocUrgences='oui')
    # blocUrgences non-booléen → défaut true ; contacts rejetés ; alerte rejetée
    S.check('import : tuile présente (bloc non-booléen → défaut)',
            pg.locator('.tuile-urgences').count() == 1)
    S.check('import : alerte hostile ignorée', not pg.locator('#bandeau-alerte').is_visible())
    pg.locator('.tuile-urgences').click()
    pg.click('button:has-text("Urgence santé")')
    S.check('import : contacts hostiles absents',
            'Appeler mon proche' not in (pg.text_content('#urgences-contenu') or ''))
    pg.keyboard.press('Escape')
    toutes_erreurs += errs
    ctx.close()

    S.check('aucune erreur console cumulée', len(toutes_erreurs) == 0)


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
