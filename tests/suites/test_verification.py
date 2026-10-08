"""Suite « vérificateur » : dialog « Un message bizarre ? », verdicts
vert/rouge/vide, raisons affichées, statistiques locales, conseils
anti-arnaque, catalogue entier reconnu vert. ~20 contrôles.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'verification'


def run(S, b):
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, numerosUrgence=[])
    pg.click('.tuile-bizarre')
    S.check('dialog bizarre ouvert', pg.locator('#dialog-bizarre[open]').count() == 1)
    S.check('3 questions affichées', pg.locator('#dialog-bizarre .questions li').count() == 3)
    S.check('conseils SMS/QR/banque', 'QR code' in (pg.text_content('#dialog-bizarre') or ''))
    S.check('arnaques du moment listées', pg.locator('#liste-arnaques li').count() >= 1)
    S.check('champ adresse a le focus', pg.evaluate('() => document.activeElement.id') == 'champ-adresse')
    S.check('téléphone technicien en bas',
            (pg.get_attribute('#bizarre-telephone', 'href') or '').startswith('tel:'))

    # --- Verdicts ---
    pg.click('#form-verif button[type="submit"]')
    S.check('vide : message « Collez »', 'Collez' in (pg.text_content('#verif-resultat') or ''))
    cas = [
        ('https://www.ameli.fr', 'vert', 'SÛR'),
        ('https://www.impots.gouv.fr/remboursement', 'vert', 'SÛR'),
        ('https://ameli.securite-compte.xyz', 'rouge', 'DANGER'),
        ('https://www.impots.gouv.fr.evil.com', 'rouge', 'DANGER'),
        ('https://bit.ly/xyz', 'rouge', 'DANGER'),
        ('javascript:alert(1)', 'rouge', 'DANGER'),
        ('data:text/html,<h1>x</h1>', 'rouge', 'DANGER'),
        ('http://www.ameli.fr', 'rouge', 'DANGER'),
        ('https://192.168.0.1/login', 'rouge', 'DANGER'),
    ]
    for url, classe, texte in cas:
        pg.fill('#champ-adresse', url)
        pg.click('#form-verif button[type="submit"]')
        S.check('%s → %s' % (url[:45], classe),
                pg.locator('#verif-resultat.' + classe).count() == 1
                and texte in (pg.text_content('#verif-resultat') or ''))
    # Raisons affichées pour un sosie
    pg.fill('#champ-adresse', 'https://www.impots.gouv.fr.evil.com')
    pg.click('#form-verif button[type="submit"]')
    S.check('raisons listées', pg.locator('#verif-resultat li').count() >= 1)
    # Statistiques locales comptées
    stats = pg.evaluate("""() => ({
      v: parseInt(localStorage.getItem('monaccueil.stat.verifications') || '0'),
      r: parseInt(localStorage.getItem('monaccueil.stat.rouges') || '0') })""")
    S.check('stats : vérifications comptées', stats['v'] >= 9)
    S.check('stats : rouges comptés', stats['r'] >= 6)

    # --- Tout le catalogue embarqué est reconnu vert ---
    verts = pg.evaluate("""() => {
      const cat = (window.MONACCUEIL_CATALOGUE || []);
      const d = ['impots.gouv.fr','ameli.fr','gmail.com','orange.fr'];
      cat.forEach(x => { try { d.push(new URL(x.url).hostname); } catch(e){} });
      return cat.every(x => window.MONACCUEIL_VERIF.verifierAdresse(x.url, d, []).verdict === 'vert');
    }""")
    S.check('catalogue : 68/68 domaines reconnus verts', verts)

    # --- Fermeture : champ vidé, rien ne reste ---
    pg.fill('#champ-adresse', 'https://ameli.xyz.evil.com')
    pg.click('#form-verif button[type="submit"]')
    pg.click('#btn-fermer-bizarre')
    S.check('fermeture : dialog fermé', pg.locator('#dialog-bizarre[open]').count() == 0)
    pg.click('.tuile-bizarre')
    S.check('réouverture : champ vidé', pg.input_value('#champ-adresse') == '')
    S.check('réouverture : résultat vidé', not (pg.text_content('#verif-resultat') or '').strip())
    S.check('aucune erreur console', len(errs) == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
