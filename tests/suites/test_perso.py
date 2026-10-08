"""Suite « personnalisation » : tuile d'ajout, catalogue (68 services),
ajout libre avec PIN pour domaines inconnus, retrait, doublons,
maximum 8, modes ajoutParPersonne. ~70 contrôles.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'perso'


def run(S, b):
    # --- Tuile d'ajout + dialog catalogue ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, ajoutParPersonne='catalogue')
    S.check('tuile « Ajouter un bouton » visible', pg.locator('#lien-ajout.tuile-ajout').is_visible())
    S.check('« Retirer » caché sans bouton perso',
            not pg.locator('#lien-retrait').is_visible())
    pg.click('#lien-ajout')
    S.check('dialog ajout ouvert', pg.locator('#dialog-ajout[open]').count() == 1)
    n_cartes = pg.locator('.catalogue-carte').count()
    S.check('catalogue : 68 services', n_cartes == 68)
    S.check('catalogue : en-têtes de famille', pg.locator('.catalogue-famille').count() >= 10)
    noms = pg.locator('.catalogue-nom').all_text_contents()
    for attendu in ['Revolut', 'SNCF Connect', 'Taxi G7', 'Uber', 'AXA', 'EDF', 'Vinted']:
        S.check('catalogue contient %s' % attendu, attendu in noms)
    S.check('« Autre site » caché en mode catalogue',
            not pg.locator('#lien-autre-site').is_visible())
    S.check('cartes catalogue : icône SVG',
            pg.locator('.catalogue-carte svg.icone').count() == 68)
    S.check('tuile ajout : texte visible',
            'Ajouter' in (pg.text_content('#lien-ajout') or ''))

    # --- Ajout via le catalogue : 1 clic, pas de PIN ---
    pg.locator('.catalogue-carte', has_text='SNCF Connect').click()
    pg.wait_for_timeout(300)
    S.check('ajout catalogue : dialog refermé', pg.locator('#dialog-ajout[open]').count() == 0)
    tuiles = pg.locator('.tuile').all_text_contents()
    S.check('tuile SNCF ajoutée', any('SNCF Connect' in t for t in tuiles))
    tuile_sncf = pg.locator('.tuile', has_text='SNCF Connect').first
    S.check('tuile perso : vrai lien https',
            'https://www.sncf-connect.com' in (tuile_sncf.get_attribute('href') or ''))
    S.check('tuile perso : target _blank', tuile_sncf.get_attribute('target') == '_blank')
    S.check('tuile perso : rel noopener',
            'noopener' in (tuile_sncf.get_attribute('rel') or ''))
    S.check('tuile perso : icône affichée', tuile_sncf.locator('svg.icone').count() == 1)
    S.check('SNCF dans « Mon quotidien »',
            pg.evaluate("""() => {
              const g = [...document.querySelectorAll('.groupe')].find(s => s.querySelector('.groupe-titre') && s.querySelector('.groupe-titre').textContent === 'Mon quotidien');
              return g && g.textContent.includes('SNCF Connect');
            }"""))
    S.check('tuile ajout : dernière de « Mon quotidien »',
            pg.evaluate("""() => {
              const g = [...document.querySelectorAll('.groupe')].find(s => (s.querySelector('.groupe-titre')||{}).textContent === 'Mon quotidien');
              const t = g ? [...g.querySelectorAll('.tuile')] : [];
              return t.length && t[t.length-1].id === 'lien-ajout';
            }"""))
    S.check('« Retirer » visible après ajout', pg.locator('#lien-retrait').is_visible())
    S.check('perso en localStorage',
            'SNCF' in (pg.evaluate("() => localStorage.getItem('%s')" % CLE_PERSO) or ''))
    S.check('perso dans le miroir IndexedDB', pg.evaluate("""() => new Promise(function (res) {
      const r = indexedDB.open('monaccueil');
      r.onsuccess = function () {
        const q = r.result.transaction('donnees').objectStore('donnees').get('personne');
        q.onsuccess = function () {
          res(q.result && q.result.perso && JSON.stringify(q.result.perso).indexOf('SNCF') !== -1);
        };
      };
      r.onerror = function () { res(false); };
    })"""))
    charger(pg)
    S.check('perso survit au rechargement',
            any('SNCF' in t for t in pg.locator('.tuile').all_text_contents()))

    # --- Doublon catalogue ---
    pg.click('#lien-ajout')
    pg.locator('.catalogue-carte', has_text='SNCF Connect').click()
    S.check('doublon : erreur affichée', 'existe déjà' in (pg.text_content('#ajout-erreur') or ''))
    S.check('doublon : dialog reste ouvert', pg.locator('#dialog-ajout[open]').count() == 1)
    pg.keyboard.press('Escape')
    S.check('Échap referme le dialog', pg.locator('#dialog-ajout[open]').count() == 0)

    # --- Mode « libre » : adresse connue, icônes, PIN pour l'inconnu ---
    injecter_config(pg, ajoutParPersonne='libre')
    pg.evaluate("() => localStorage.removeItem('%s')" % CLE_PERSO)
    charger(pg); fermer_prenom(pg)
    pg.click('#lien-ajout')
    S.check('libre : catalogue affiché d\'abord', pg.locator('#ajout-zone-catalogue').is_visible())
    S.check('libre : « Autre site » visible', pg.locator('#lien-autre-site').is_visible())
    pg.click('#lien-autre-site')
    S.check('zone libre affichée', pg.locator('#ajout-zone-libre').is_visible())
    S.check('zone catalogue masquée', not pg.locator('#ajout-zone-catalogue').is_visible())
    S.check('20 vignettes d\'icônes', pg.locator('.icone-vignette').count() == 20)
    pg.locator('.icone-vignette[data-icone="transport.svg"]').click()
    S.check('icône sélectionnée marquée',
            pg.locator('.icone-vignette.choisie[data-icone="transport.svg"]').count() == 1)

    # Adresse invalide / nom invalide
    pg.fill('#ajout-url', 'pas-une-url')
    pg.fill('#ajout-nom', 'Test')
    pg.click('#btn-ajouter')
    S.check('url invalide : erreur', 'https://' in (pg.text_content('#ajout-erreur') or ''))
    pg.fill('#ajout-url', 'https://www.orange.fr')
    pg.fill('#ajout-nom', '<b>x</b>')
    pg.click('#btn-ajouter')
    S.check('nom invalide : erreur', 'nom du bouton' in (pg.text_content('#ajout-erreur') or ''))
    pg.fill('#ajout-nom', 'X' * 25)
    pg.click('#btn-ajouter')
    S.check('nom > 24 car. : erreur', 'nom du bouton' in (pg.text_content('#ajout-erreur') or ''))

    # Domaine connu hors tuiles config (orange.fr) : ajout direct sans PIN
    pg.fill('#ajout-url', 'https://www.orange.fr')
    pg.fill('#ajout-nom', 'Ma box')
    pg.click('#btn-ajouter')
    pg.wait_for_timeout(300)
    S.check('domaine connu : ajout sans PIN', pg.locator('#dialog-ajout[open]').count() == 0)
    S.check('tuile « Ma box » présente',
            any('Ma box' in t for t in pg.locator('.tuile').all_text_contents()))

    # Domaine inconnu : PIN exigé
    pg.click('#lien-ajout')
    pg.click('#lien-autre-site')
    pg.fill('#ajout-url', 'https://www.site-inconnu.fr')
    pg.fill('#ajout-nom', 'Inconnu')
    pg.click('#btn-ajouter')
    S.check('domaine inconnu : refus + message', 'liste de confiance' in (pg.text_content('#ajout-erreur') or ''))
    S.check('zone PIN affichée', pg.locator('#ajout-pin').is_visible())
    pg.click('#btn-ajout-pin')
    S.check('PIN vide : erreur 4 chiffres',
            '4 chiffres' in (pg.text_content('#ajout-erreur') or ''))
    pg.fill('#champ-pin-ajout', '0000')
    pg.click('#btn-ajout-pin')
    pg.wait_for_timeout(2000)   # ralentissement progressif après mauvais PIN
    S.check('mauvais PIN : refusé', 'incorrect' in (pg.text_content('#ajout-erreur') or ''))
    S.check('mauvais PIN : tuile absente',
            not any('Inconnu' in t for t in pg.locator('.tuile').all_text_contents()))
    pg.fill('#champ-pin-ajout', PIN)
    pg.click('#btn-ajout-pin')
    pg.wait_for_timeout(500)
    S.check('bon PIN : ajout accepté', pg.locator('#dialog-ajout[open]').count() == 0)
    S.check('tuile « Inconnu » ajoutée',
            any('Inconnu' in t for t in pg.locator('.tuile').all_text_contents()))
    # URL javascript / http refusées avant même le PIN
    pg.click('#lien-ajout')
    pg.click('#lien-autre-site')
    pg.fill('#ajout-url', 'javascript:alert(1)')
    pg.fill('#ajout-nom', 'Hack')
    pg.click('#btn-ajouter')
    S.check('javascript: refusé', 'https://' in (pg.text_content('#ajout-erreur') or ''))
    pg.fill('#ajout-url', 'http://www.ameli.fr')
    pg.click('#btn-ajouter')
    S.check('http refusé', 'https://' in (pg.text_content('#ajout-erreur') or ''))
    pg.click('#btn-ajout-retour')
    S.check('« Retour à la liste » ramène au catalogue', pg.locator('#ajout-zone-catalogue').is_visible())
    S.check('retour : erreur effacée', (pg.text_content('#ajout-erreur') or '').strip() == '')
    pg.click('#btn-fermer-ajout')
    ctx.close()

    # --- Retrait ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    pg.evaluate("""() => localStorage.setItem('%s', JSON.stringify([
      {label: 'Ma messagerie', url: 'https://gmail.com', icone: 'mails.svg'},
      {label: 'Train', url: 'https://www.sncf-connect.com', icone: 'transport.svg'}]))""" % CLE_PERSO)
    charger(pg); fermer_prenom(pg)
    S.check('2 tuiles perso affichées',
            len([t for t in pg.locator('.tuile').all_text_contents() if 'Ma messagerie' in t or 'Train' in t]) == 2)
    pg.click('#lien-retrait')
    S.check('dialog retrait ouvert', pg.locator('#dialog-retrait[open]').count() == 1)
    S.check('2 lignes dans la liste', pg.locator('#liste-retrait li').count() == 2)
    pg.on('dialog', lambda d: d.accept())
    pg.locator('#liste-retrait li', has_text='Ma messagerie').locator('button').click()
    pg.wait_for_timeout(200)
    S.check('retrait : liste rafraîchie à 1', pg.locator('#liste-retrait li').count() == 1)
    pg.click('#btn-fermer-retrait')
    S.check('messagerie retirée de la grille',
            not any('Ma messagerie' in t for t in pg.locator('.tuile').all_text_contents()))
    charger(pg)
    S.check('retrait persisté', not any('Ma messagerie' in t for t in pg.locator('.tuile').all_text_contents()))

    # Retirer le dernier bouton : le lien « Retirer » disparaît
    pg.click('#lien-retrait')
    pg.locator('#liste-retrait li', has_text='Train').locator('button').click()
    pg.wait_for_timeout(200)
    S.check('dernier retrait : message « aucun bouton »',
            'Aucun bouton' in (pg.text_content('#liste-retrait') or ''))
    pg.click('#btn-fermer-retrait')
    S.check('dernier retrait : « Retirer » re-masqué',
            not pg.locator('#lien-retrait').is_visible())

    # --- Maximum 8 boutons ---
    perso = [{'label': 'Perso %d' % i, 'url': 'https://site%d.ameli.fr' % i, 'icone': 'administration.svg'} for i in range(8)]
    pg.evaluate("l => localStorage.setItem('%s', JSON.stringify(l))" % CLE_PERSO, perso)
    charger(pg); fermer_prenom(pg)
    pg.on('dialog', lambda d: d.accept())
    pg.click('#lien-ajout')
    pg.wait_for_timeout(300)
    S.check('max 8 : dialog ajout non ouvert (alert)', pg.locator('#dialog-ajout[open]').count() == 0)
    ctx.close()

    # --- Mode « non » : rien n'est construit ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg, ajoutParPersonne='non')
    S.check('mode non : aucune tuile ajout visible', not pg.locator('#lien-ajout').is_visible())
    S.check('mode non : aucun lien retrait visible', not pg.locator('#lien-retrait').is_visible())
    S.check('mode non : dialog ajout supprimé', pg.locator('#dialog-ajout').count() == 0)
    S.check('mode non : dialog retrait supprimé', pg.locator('#dialog-retrait').count() == 0)
    ctx.close()

    # --- Perso invalide en localStorage : ignorées ---
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    pg.evaluate("""() => localStorage.setItem('%s', JSON.stringify([
      {label: 'OK', url: 'https://www.orange.fr', icone: 'sante.svg'},
      {label: '<img>', url: 'https://www.orange.fr', icone: 'sante.svg'},
      {label: 'Bon', url: 'javascript:alert(1)', icone: 'sante.svg'},
      {label: 'Bon2', url: 'https://ok.fr', icone: 'inexistante.svg'}]))""" % CLE_PERSO)
    charger(pg); fermer_prenom(pg)
    textes = pg.locator('.tuile').all_text_contents()
    S.check('perso valide affichée', any('OK' in t for t in textes))
    S.check('perso label invalide ignorée', not any('<img>' in t for t in textes))
    S.check('perso javascript ignorée', not any(t.strip() == 'Bon' for t in textes))
    S.check('perso icône invalide ignorée', not any('Bon2' in t for t in textes))
    S.check('aucune erreur console', len(errs) == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
