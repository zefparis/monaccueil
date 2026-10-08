"""Suite « mobile » : détection par capacités, colonnes, barre fixe du bas,
ouverture onglet/même onglet, share target, Coller, « Besoin d'aide ? »,
lienVisio, appui long technicien, bannières d'installation Android/iOS,
dialogs plein écran. 82 contrôles.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'mobile'


def run(S, b):
    # ================= Détection + colonnes =================
    for w, colonnes, nom in [(375, 2, '375px'), (412, 2, '412px'), (320, 1, '320px')]:
        ctx, pg, errs = nouvelle_page(b, mobile=True, width=w, height=760)
        charger(pg); fermer_prenom(pg)
        S.check('%s : sans scroll horizontal' % nom,
                pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'))
        boite = pg.locator('.tuiles').first.bounding_box()
        tuiles = pg.locator('.tuile').all()
        if len(tuiles) >= 2:
            b1, b2 = tuiles[0].bounding_box(), tuiles[1].bounding_box()
            S.check('%s : %d colonnes' % (nom, colonnes),
                    (b1['y'] == b2['y'] and b2['x'] > b1['x']) if colonnes == 2 else (b2['y'] > b1['y']))
        ctx.close()

    # 1 colonne en taille maximale
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    pg.click('#btn-reglages')
    pg.click('#btn-taille-plus'); pg.click('#btn-taille-plus')
    pg.wait_for_timeout(200)
    t1, t2 = pg.locator('.tuile').nth(0).bounding_box(), pg.locator('.tuile').nth(1).bounding_box()
    S.check('taille max : 1 colonne', t2['y'] > t1['y'])
    S.check('taille max mobile : sans scroll horizontal',
            pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'))
    ctx.close()

    # ================= Barre fixe du bas =================
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    S.check('barre : « Appeler » visible', pg.locator('#btn-appeler').is_visible())
    S.check('barre : un seul bouton (le vérificateur est dans les tuiles)',
            pg.locator('.pied-mobile .bouton').count() == 1)
    S.check('barre : Appeler = lien tel:', (pg.get_attribute('#btn-appeler', 'href') or '').startswith('tel:'))
    S.check('barre : Appeler nommé avec le technicien', 'Benji' in (pg.text_content('#btn-appeler') or ''))
    bb = pg.locator('#btn-appeler').bounding_box()
    S.check('barre : cible ≥ 56 px de haut', bb['height'] >= 56)
    S.check('barre : Appeler occupe toute la largeur',
            bb['width'] >= 375 - 30 and bb['x'] <= 20)
    S.check('barre : au bas de l\'écran', bb['y'] + bb['height'] >= 700)
    # Visible pendant le défilement (sticky)
    pg.evaluate('() => window.scrollTo(0, 0)')
    pg.wait_for_timeout(100)
    S.check('barre toujours visible en haut de page', pg.locator('#btn-appeler').is_visible())
    # Tuile bizarre → même dialog
    pg.click('.tuile-bizarre')
    S.check('barre : bizarre ouvre le vérificateur', pg.locator('#dialog-bizarre[open]').count() == 1)
    S.check('bizarre : champ adresse a le focus', pg.evaluate('() => document.activeElement.id') == 'champ-adresse')
    pg.click('#btn-fermer-bizarre')
    ctx.close()

    # ================= Réglages repliables =================
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    S.check('réglages : bouton visible', pg.locator('#btn-reglages').is_visible())
    S.check('réglages : panneau replié par défaut',
            pg.evaluate("() => !document.getElementById('reglages').classList.contains('ouvert')"))
    pg.click('#btn-reglages')
    S.check('réglages : déplié au clic', pg.locator('#reglages.ouvert').count() == 1)
    S.check('réglages : aria-expanded', pg.get_attribute('#btn-reglages', 'aria-expanded') == 'true')
    S.check('réglages : Contraste accessible', pg.locator('#btn-contraste').is_visible())
    ctx.close()

    # ================= Dialogs = feuilles plein écran =================
    for sel, declencheur in [('#dialog-bizarre', '.tuile-bizarre'),
                             ('#dialog-distance', '.tuile-distance'),
                             ('#dialog-ajout', '#lien-ajout')]:
        ctx, pg, errs = nouvelle_page(b, mobile=True, width=320, height=700)
        charger(pg); fermer_prenom(pg)
        pg.click(declencheur)
        pg.wait_for_timeout(200)
        S.check('%s ouvert à 320px' % sel, pg.locator(sel + '[open]').count() == 1)
        S.check('%s : sans débordement horizontal' % sel,
                pg.evaluate('(s) => document.querySelector(s).scrollWidth <= innerWidth', sel))
        S.check('%s : plein écran' % sel,
                pg.evaluate('''(s) => {
                  const r = document.querySelector(s).getBoundingClientRect();
                  return r.width >= innerWidth - 2 && r.left <= 2;
                }''', sel))
        pg.keyboard.press('Escape')
        pg.wait_for_timeout(100)
        ctx.close()

    # ================= Vérificateur mobile =================
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    pg.click('.tuile-bizarre')
    pg.fill('#champ-adresse', 'https://www.ameli.fr')
    pg.click('#form-verif button[type="submit"]')
    S.check('verdict vert lisible', 'SÛR' in (pg.text_content('#verif-resultat') or ''))
    pg.fill('#champ-adresse', 'https://ameli.securite-compte.xyz')
    pg.click('#form-verif button[type="submit"]')
    S.check('verdict rouge lisible', 'DANGER' in (pg.text_content('#verif-resultat') or ''))
    S.check('verdict rouge : classe appliquée', pg.locator('#verif-resultat.rouge').count() == 1)
    pg.click('#btn-fermer-bizarre')
    ctx.close()

    # ================= Share target =================
    cas_partage = [
        ('?url=https://www.ameli.fr', 'SÛR', 'share url= connu'),
        ('?text=Regarde https://www.impots.gouv.fr stp', 'SÛR', 'share texte avec URL au milieu'),
        ('?url=https://impots.remboursement.xyz', 'DANGER', 'share url= sosie'),
        ('?url=javascript:alert(1)', 'DANGER', 'share javascript:'),
        ('?text=data:text/html,<b>x</b>', 'DANGER', 'share data:'),
        ('?url=' + 'a' * 3000, None, 'share 3000 car. tronqué'),
    ]
    for query, verdict, nom in cas_partage:
        ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
        charger(pg, BASE + 'index.html' + query)
        pg.wait_for_timeout(300)
        S.check('%s : dialog bizarre ouvert' % nom, pg.locator('#dialog-bizarre[open]').count() == 1)
        if verdict:
            S.check('%s : verdict %s' % (nom, verdict), verdict in (pg.text_content('#verif-resultat') or ''))
        S.check('%s : query nettoyée' % nom, '?' not in pg.url)
        S.check('%s : champ ≤ 2048 car.' % nom, len(pg.input_value('#champ-adresse')) <= 2048)
        ctx.close()
    # Paramètre inconnu : rien ne s'ouvre
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg, BASE + 'index.html?inconnu=1')
    pg.wait_for_timeout(300)
    S.check('share : paramètre inconnu ignoré', pg.locator('#dialog-bizarre[open]').count() == 0)
    ctx.close()

    # ================= « Coller l'adresse » =================
    ctx = b.new_context(viewport={'width': 375, 'height': 760}, has_touch=True, is_mobile=True,
                        permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    charger(pg); fermer_prenom(pg)
    pg.evaluate("() => navigator.clipboard.writeText('https://www.ameli.fr')")
    pg.click('.tuile-bizarre')
    pg.click('#btn-coller')
    pg.wait_for_timeout(400)
    S.check('coller : champ rempli', pg.input_value('#champ-adresse') == 'https://www.ameli.fr')
    S.check('coller : vérification lancée', 'SÛR' in (pg.text_content('#verif-resultat') or ''))
    ctx.close()
    # Permission refusée : focus dans le champ, pas de crash
    ctx, pg, errs2 = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    pg.click('.tuile-bizarre')
    pg.click('#btn-coller')
    pg.wait_for_timeout(300)
    S.check('coller refusé : pas de crash', pg.locator('#dialog-bizarre[open]').count() == 1)
    S.check('coller refusé : champ utilisable', pg.evaluate('() => document.activeElement.id') == 'champ-adresse')
    ctx.close()

    # ================= « Besoin d'aide ? » =================
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    S.check('tuile « Besoin d\'aide ? »', any('Besoin d\'aide' in t for t in pg.locator('.tuile').all_text_contents()))
    pg.click('.tuile-distance')
    S.check('dialog distance ouvert', pg.locator('#dialog-distance[open]').count() == 1)
    S.check('version mobile affichée', pg.locator('#distance-mobile').is_visible())
    S.check('version bureau masquée', not pg.locator('#distance-desktop').is_visible())
    S.check('mobile : téléphone dans les étapes',
            (pg.get_attribute('#distance-telephone-mobile', 'href') or '').startswith('tel:'))
    S.check('sans lienVisio : bouton caché', not pg.locator('#btn-visio').is_visible())
    pg.click('#btn-fermer-distance')
    ctx.close()
    # lienVisio valide → bouton « Rejoindre l'appel vidéo »
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    injecter_config(pg, lienVisio='https://meet.jit.si/test', domainesOfficiels=['meet.jit.si', 'ameli.fr'])
    pg.click('.tuile-distance')
    S.check('lienVisio valide : bouton visible', pg.locator('#btn-visio').is_visible())
    S.check('lienVisio : bon href', pg.get_attribute('#btn-visio', 'href') == 'https://meet.jit.si/test')
    pg.click('#btn-fermer-distance')
    ctx.close()
    # lienVisio hors liste blanche → ignoré
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    injecter_config(pg, lienVisio='https://inconnu.example.com/x')
    pg.click('.tuile-distance')
    S.check('lienVisio hors-liste : bouton caché', not pg.locator('#btn-visio').is_visible())
    ctx.close()

    # ================= « Comment ça marche ? » mobile =================
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    pg.click('#lien-mode')
    S.check('emploi mobile : version téléphone', pg.locator('#mode-mobile').is_visible())
    S.check('emploi mobile : bureau masqué', not pg.locator('#mode-desktop').is_visible())
    S.check('emploi mobile : « flèche retour »', 'flèche retour' in (pg.text_content('#mode-mobile') or ''))
    pg.click('#btn-fermer-mode')
    ctx.close()

    # ================= Appui long tactile → PIN =================
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    injecter_config(pg)
    pg.evaluate("""() => {
      const t = document.getElementById('titre');
      t.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
    }""")
    pg.wait_for_selector('#dialog-pin[open]', timeout=8000)
    S.check('appui long tactile : dialog PIN', pg.locator('#dialog-pin[open]').count() == 1)
    pg.fill('#champ-pin', PIN)
    pg.click('#form-pin button[type="submit"]')
    pg.wait_for_selector('#panneau-tech:not([hidden])', timeout=8000)
    S.check('PIN mobile : panneau technicien', pg.locator('#panneau-tech:not([hidden])').count() == 1)
    ctx.close()
    # modeTechnicien: false → aucun geste
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    injecter_config(pg, modeTechnicien=False)
    pg.evaluate("""() => {
      const t = document.getElementById('titre');
      t.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0}));
    }""")
    pg.wait_for_timeout(4000)
    S.check('modeTechnicien false : aucun dialog PIN', pg.locator('#dialog-pin[open]').count() == 0)
    S.check('modeTechnicien false : panneau absent', pg.locator('#panneau-tech:not([hidden])').count() == 0)
    ctx.close()

    # ================= Bannières d'installation =================
    # Android : beforeinstallprompt → bannière
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=390, height=780)
    charger(pg); fermer_prenom(pg)
    pg.evaluate("""() => {
      const ev = new Event('beforeinstallprompt', {cancelable: true});
      ev.prompt = () => {}; ev.userChoice = Promise.resolve({outcome: 'dismissed'});
      window.dispatchEvent(ev);
    }""")
    pg.wait_for_timeout(200)
    S.check('Android : bannière install affichée', pg.locator('#banniere-install').is_visible())
    S.check('Android : texte « Ajouter Mon Accueil »', 'écran d\'accueil' in (pg.text_content('#banniere-install') or ''))
    pg.click('#btn-install-fermer')
    S.check('Android : fermeture', not pg.locator('#banniere-install').is_visible())
    S.check('Android : fermeture mémorisée',
            pg.evaluate("() => localStorage.getItem('%s')" % CLE_INSTALL) == '1')
    charger(pg); fermer_prenom(pg)
    pg.evaluate("() => window.dispatchEvent(new Event('beforeinstallprompt'))")
    pg.wait_for_timeout(200)
    S.check('Android : bannière jamais réaffichée', not pg.locator('#banniere-install').is_visible())
    ctx.close()
    # Acceptée → mémorisée
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=390, height=780)
    charger(pg); fermer_prenom(pg)
    pg.evaluate("""() => {
      const ev = new Event('beforeinstallprompt', {cancelable: true});
      ev.prompt = () => {}; ev.userChoice = Promise.resolve({outcome: 'accepted'});
      window.dispatchEvent(ev);
    }""")
    pg.wait_for_timeout(200)
    pg.click('#btn-install')
    pg.wait_for_timeout(300)
    S.check('Android : acceptation masque la bannière', not pg.locator('#banniere-install').is_visible())
    S.check('Android : acceptation mémorisée',
            pg.evaluate("() => localStorage.getItem('%s')" % CLE_INSTALL) == '1')
    ctx.close()
    # iOS : encart instructions
    ctx = b.new_context(viewport={'width': 390, 'height': 780}, has_touch=True, is_mobile=True,
                        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
    pg = ctx.new_page()
    charger(pg); fermer_prenom(pg)
    S.check('iOS : encart affiché', pg.locator('#banniere-ios').is_visible())
    S.check('iOS : « Partager » expliqué', 'Partager' in (pg.text_content('#banniere-ios') or ''))
    pg.click('#btn-ios-fermer')
    S.check('iOS : fermeture mémorisée',
            pg.evaluate("() => localStorage.getItem('%s')" % CLE_INSTALL_IOS) == '1')
    charger(pg); fermer_prenom(pg)
    S.check('iOS : encart jamais réaffiché', not pg.locator('#banniere-ios').is_visible())
    ctx.close()

    # ================= Numéros utiles sur mobile =================
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=760)
    charger(pg); fermer_prenom(pg)
    # Sur téléphone l'aide passe par la barre « Appeler » (lien tel: natif) ;
    # les numéros utiles restent construits dans le DOM du dialog d'aide.
    S.check('aide : numéros utiles présents', pg.locator('#liste-urgences a[href^="tel:"]').count() >= 3)
    S.check('aide : Info Escroqueries', '0 805 805 817' in (pg.text_content('#liste-urgences') or ''))
    S.check('aide : Urgences 112', '112' in (pg.text_content('#liste-urgences') or ''))
    ctx.close()

    # ================= Formes d'écran × modes : jamais de débordement =================
    for w, h in [(320, 568), (375, 720), (412, 800), (768, 1024), (1024, 500)]:
        for mode in ['normal', 'contraste', 'taille3']:
            ctx, pg, errs = nouvelle_page(b, mobile=True, width=w, height=h)
            charger(pg); fermer_prenom(pg)
            # « Réglages » n'existe que sous le breakpoint mobile ; au-dessus,
            # le panneau est déjà visible.
            if mode != 'normal' and pg.locator('#btn-reglages').is_visible():
                pg.click('#btn-reglages')
            if mode == 'contraste':
                pg.click('#btn-contraste')
            elif mode == 'taille3':
                pg.click('#btn-taille-plus'); pg.click('#btn-taille-plus')
            S.check('%sx%s %s : sans scroll horizontal' % (w, h, mode),
                    pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'))
            ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
