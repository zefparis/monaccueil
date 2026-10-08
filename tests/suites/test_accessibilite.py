"""Suite « accessibilité » : axe-core sur tous les écrans et dialogs,
navigation clavier seul, piège de focus et retour du focus à la fermeture.
Dépendance de test uniquement (axe-core dans node_modules, servi en 'self'
par le serveur de test — jamais livré au site).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'accessibilite'
AXE_URL = BASE + 'node_modules/axe-core/axe.min.js'


def axe(pg, S, quoi):
    """Injecte axe-core (script externe même origine : CSP 'self' OK) et
    retourne la liste des violations."""
    if not pg.evaluate("() => typeof window.axe === 'object'"):
        pg.add_script_tag(url=AXE_URL)
    r = pg.evaluate("""() => axe.run(document, {
      resultTypes: ['violations']
    }).then(res => res.violations.map(v => ({
      id: v.id, impact: v.impact,
      nodes: v.nodes.slice(0, 4).map(n => n.target.join(' '))
    })))""")
    for v in r:
        print('    axe[%s] %s (%s) sur %s' % (quoi, v['id'], v['impact'], ', '.join(v['nodes'])))
    S.check('axe %s : aucune violation' % quoi, len(r) == 0)
    return r


def tab_cycle(pg):
    """Retourne l'id/étiquette de l'élément qui a le focus."""
    return pg.evaluate("""() => {
      const e = document.activeElement;
      return e ? (e.id || e.textContent || e.tagName) : '';
    }""")


def focus_reste_dans(pg, selecteur, S, quoi):
    """Tabulé depuis le dernier élément : le focus doit rester dans le dialog
    (comportement natif de <dialog> modal)."""
    ids = pg.evaluate("""(sel) => {
      const d = document.querySelector(sel);
      return [...d.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
        .filter(e => !e.disabled && e.offsetParent !== null).length;
    }""", selecteur)
    # Presse Tab un peu plus que le nombre d'éléments focusables : le focus
    # doit boucler à l'intérieur du dialog modal.
    for _ in range(ids + 3):
        pg.keyboard.press('Tab')
    dans = pg.evaluate("""(sel) => {
      const d = document.querySelector(sel);
      return d && d.contains(document.activeElement);
    }""", selecteur)
    S.check('clavier %s : le focus reste piégé dans le dialog' % quoi, bool(dans))


def run(S, b):
    # ---------- Accueil : normal / contraste / taille max / zoom 200 % ----------
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    axe(pg, S, 'accueil normal')

    pg.click('#btn-contraste')
    axe(pg, S, 'accueil contraste élevé')
    pg.click('#btn-contraste')

    pg.click('#btn-taille-plus'); pg.click('#btn-taille-plus')
    axe(pg, S, 'accueil taille maximale')
    pg.click('#btn-taille-moins'); pg.click('#btn-taille-moins')

    pg.evaluate("() => { document.documentElement.style.zoom = '2'; }")
    axe(pg, S, 'accueil zoom 200 %')
    pg.evaluate("() => { document.documentElement.style.zoom = ''; }")

    # ---------- Dialogs ----------
    pg.click('#btn-aide')
    axe(pg, S, 'dialog aide')
    focus_reste_dans(pg, '#dialog-aide', S, 'aide')
    pg.keyboard.press('Escape')
    S.check('clavier aide : Échap ferme', pg.locator('#dialog-aide[open]').count() == 0)

    pg.locator('.tuile-distance').click()
    axe(pg, S, 'dialog distance')
    pg.keyboard.press('Escape')
    S.check('clavier distance : Échap ferme', pg.locator('#dialog-distance[open]').count() == 0)

    pg.locator('.tuile-bizarre').click()
    axe(pg, S, 'dialog bizarre')
    focus_reste_dans(pg, '#dialog-bizarre', S, 'bizarre')
    # verdict rouge annoncé
    pg.fill('#champ-adresse', 'https://ameli.securite-compte.xyz')
    pg.click('#form-verif button[type="submit"]')
    axe(pg, S, 'dialog bizarre + verdict rouge')
    pg.click('#btn-fermer-bizarre')
    S.check('clavier bizarre : focus rendu à la tuile',
            pg.evaluate("() => document.activeElement.classList.contains('tuile-bizarre')"))

    pg.click('#lien-mode')
    axe(pg, S, 'dialog « Comment ça marche »')
    pg.click('#btn-fermer-mode')
    S.check('clavier mode : focus rendu au lien', tab_cycle(pg) == 'lien-mode')

    pg.click('#lien-prenom')
    axe(pg, S, 'dialog prénom')
    focus_reste_dans(pg, '#dialog-prenom', S, 'prénom')
    pg.keyboard.press('Escape')

    pg.click('#lien-palette')
    axe(pg, S, 'dialog palette')
    pg.click('#btn-fermer-palette')
    S.check('clavier palette : focus rendu au lien', tab_cycle(pg) == 'lien-palette')

    pg.click('#lien-ajout')
    axe(pg, S, 'dialog ajout (catalogue)')
    focus_reste_dans(pg, '#dialog-ajout', S, 'ajout')
    pg.evaluate("() => document.getElementById('lien-autre-site').hidden = false")
    pg.click('#lien-autre-site')
    axe(pg, S, 'dialog ajout (adresse libre)')
    pg.click('#btn-fermer-ajout')
    S.check('clavier ajout : focus rendu à la tuile', tab_cycle(pg) == 'lien-ajout')

    # ---------- Dialog protection téléphone (3 écrans) ----------
    pg.locator('.tuile-protec').click()
    axe(pg, S, 'dialog protection (marques)')
    focus_reste_dans(pg, '#dialog-protec', S, 'protection')
    pg.locator('.marque-vignette:has-text("iPhone")').click()
    axe(pg, S, 'dialog protection (étape)')
    pg.check('#case-faite')
    pg.click('button:has-text("Réglage suivant")')
    pg.click('button:has-text("Réglage suivant")')
    pg.click('button:has-text("Voir les conseils")')
    axe(pg, S, 'dialog protection (conseils)')
    pg.keyboard.press('Escape')
    S.check('clavier protection : Échap ferme', pg.locator('#dialog-protec[open]').count() == 0)
    S.check('clavier protection : focus rendu à la tuile',
            pg.evaluate("() => document.activeElement.classList.contains('tuile-protec')"))

    # ---------- Dialog PIN ----------
    ouvrir_tech(pg)
    axe(pg, S, 'panneau technicien')
    pg.click('#onglet-journal')
    axe(pg, S, 'journal technicien')
    pg.click('button:has-text("Quitter le mode technicien")')
    pg.wait_for_timeout(200)

    # ---------- Mobile ----------
    ctxm, pgm, errm = nouvelle_page(b, mobile=True, width=375, height=720)
    injecter_config(pgm)
    pgm.evaluate("() => window.scrollTo(0, 400)")
    axe(pgm, S, 'accueil mobile 375')
    pgm.locator('.tuile-bizarre').click()
    axe(pgm, S, 'dialog bizarre mobile (plein écran)')
    pgm.click('#btn-fermer-bizarre')
    # Barre fixe : navigable au clavier, cibles suffisantes
    S.check('mobile : barre fixe atteignable au clavier', pgm.locator('#btn-appeler').is_visible())
    ctxm.close()

    S.check('aucune erreur console cumulée', len(errs) == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
