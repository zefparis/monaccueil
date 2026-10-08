"""Smoke : chargement bureau et mobile, tuiles, en-têtes de sécurité, CSP.
Reconstruit la suite historique (bureau + mobile).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'smoke'


def run(S, b):
    # --- En-têtes HTTP identiques à vercel.json ---
    import urllib.request
    r = urllib.request.urlopen(BASE)
    h = r.headers
    S.check('en-tête CSP présent', 'Content-Security-Policy' in h)
    csp = h.get('Content-Security-Policy', '')
    for d in ["default-src 'none'", "script-src 'self'", "style-src 'self'",
              "img-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]:
        S.check('CSP contient %s' % d, d in csp)
    S.check('X-Frame-Options DENY', h.get('X-Frame-Options') == 'DENY')
    S.check('nosniff', h.get('X-Content-Type-Options') == 'nosniff')
    S.check('Referrer-Policy no-referrer', h.get('Referrer-Policy') == 'no-referrer')
    S.check('index.html servi en 200', r.status == 200)
    r2 = urllib.request.urlopen(BASE + 'style.css')
    S.check('style.css servi', r2.status == 200 and 'text/css' in r2.headers.get('Content-Type', ''))
    r3 = urllib.request.urlopen(BASE + 'sw.js')
    S.check('sw.js servi', r3.status == 200)
    r4 = urllib.request.urlopen(BASE + 'manifest.webmanifest')
    S.check('manifest servi', r4.status == 200)

    # --- Bureau ---
    ctx, pg, errs = nouvelle_page(b)
    charger(pg)
    S.check('bureau : titre « Bonjour » ou prénom', 'Bonjour' in (pg.text_content('#titre') or ''))
    S.check('bureau : tuiles présentes', pg.locator('.tuile').count() >= 10)
    S.check('bureau : tuile bizarre présente', pg.locator('.tuile-bizarre').count() == 1)
    S.check('bureau : liens réels (href https)', pg.locator('.tuile[href^="https://"]').count() >= 8)
    S.check('bureau : pas de scroll horizontal',
            pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'))
    S.check('bureau : horloge affichée', bool((pg.text_content('#heure') or '').strip()))
    S.check('bureau : aucune erreur console', len(errs) == 0)
    ctx.close()

    # --- Mobile ---
    ctx, pg, errs = nouvelle_page(b, mobile=True, width=375, height=720)
    charger(pg)
    S.check('mobile : tuiles présentes', pg.locator('.tuile').count() >= 10)
    S.check('mobile : pas de scroll horizontal',
            pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'))
    S.check('mobile : barre fixe visible',
            pg.locator('#btn-appeler').is_visible() and pg.locator('#btn-bizarre-bar').is_visible())
    S.check('mobile : lien appel tel:', (pg.get_attribute('#btn-appeler', 'href') or '').startswith('tel:'))
    S.check('mobile : aucune erreur console', len(errs) == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
