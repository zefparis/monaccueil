"""Suite « journal » : onglet technicien, ajout/validation/suppression
d'interventions, résumé, export CSV (en-tête, neutralisation formules),
import CSV (fusion, doublons, erreurs). ~20 contrôles.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *

NOM = 'journal'


def ouvrir_journal(pg):
    pg.click('#onglet-journal')
    pg.wait_for_selector('#tech-onglet-journal:not([hidden])')


def run(S, b):
    ctx, pg, errs = nouvelle_page(b)
    injecter_config(pg)
    ouvrir_tech(pg)
    ouvrir_journal(pg)

    # --- État vide ---
    S.check('journal : onglet présent', pg.locator('#tech-onglet-journal').count() == 1)
    S.check('journal vide : message', 'Aucune intervention' in (pg.text_content('#tech-onglet-journal') or ''))
    S.check('journal : résumé à 0', 'Interventions' in (pg.text_content('.resume') or ''))

    # --- Ajout valide ---
    pg.fill('#j-date', '2024-03-15')
    pg.fill('#j-duree', '45')
    pg.select_option('#j-lieu', 'sur place')
    pg.select_option('#j-motif', 'installation')
    pg.fill('#j-note', 'Réglé le volume')
    pg.click('button:has-text("+ Ajouter au journal")')
    pg.wait_for_timeout(300)
    S.check('ajout : ligne dans le tableau', pg.locator('.journal-table tbody tr').count() == 1)
    S.check('ajout : date formatée', '15' in (pg.text_content('.journal-table') or ''))
    S.check('ajout : note affichée', 'Réglé le volume' in (pg.text_content('.journal-table') or ''))
    S.check('ajout : résumé à 1 intervention',
            pg.evaluate("() => [...document.querySelectorAll('.resume dd')].map(d=>d.textContent).join('|')").startswith('1|'))
    S.check('ajout : localStorage', 'Réglé le volume' in (pg.evaluate("() => localStorage.getItem('%s')" % CLE_JOURNAL) or ''))

    # --- Ajouts invalides ---
    pg.fill('#j-duree', '')
    pg.click('button:has-text("+ Ajouter au journal")')
    S.check('duree vide : refusée', pg.locator('.journal-table tbody tr').count() == 1)
    pg.fill('#j-duree', '99999')
    pg.click('button:has-text("+ Ajouter au journal")')
    S.check('duree > 1440 : refusée', pg.locator('.journal-table tbody tr').count() == 1)
    pg.fill('#j-date', '1999-01-01')
    pg.fill('#j-duree', '30')
    pg.click('button:has-text("+ Ajouter au journal")')
    S.check('date hors plage : refusée', pg.locator('.journal-table tbody tr').count() == 1)

    # --- 2e entrée + export CSV ---
    pg.fill('#j-date', '2024-03-20')
    pg.fill('#j-duree', '30')
    pg.select_option('#j-motif', 'arnaque évitée')
    pg.fill('#j-note', '=SOMME(1;2) test formule')
    pg.click('button:has-text("+ Ajouter au journal")')
    pg.wait_for_timeout(300)
    S.check('2 entrées au tableau', pg.locator('.journal-table tbody tr').count() == 2)
    with pg.expect_download() as dl:
        pg.click('button:has-text("Exporter le journal")')
    chemin = dl.value.path()
    contenu = open(chemin, 'rb').read()
    texte = contenu.decode('utf-8')
    S.check('CSV : BOM UTF-8', contenu.startswith(b'\xef\xbb\xbf'))
    S.check('CSV : en-tête date;duree_minutes;lieu;motif;note',
            'date;duree_minutes;lieu;motif;note' in texte)
    S.check('CSV : 2 lignes de données', len([l for l in texte.split('\r\n') if l.strip()]) == 3)
    S.check('CSV : formule neutralisée', "'=SOMME" in texte)
    S.check('CSV : nom fichier daté', 'journal-interventions-' in dl.value.suggested_filename)

    # --- Suppression avec confirmation ---
    pg.on('dialog', lambda d: d.accept())
    pg.locator('.journal-table tbody tr', has_text='Réglé le volume').locator('button:has-text("Supprimer")').click()
    pg.wait_for_timeout(300)
    S.check('suppression : 1 ligne restante', pg.locator('.journal-table tbody tr').count() == 1)
    S.check('suppression persistée', 'Réglé le volume' not in (pg.evaluate("() => localStorage.getItem('%s')" % CLE_JOURNAL) or ''))

    # --- Import CSV : doublon ignoré + erreur refusée ---
    import tempfile
    csv_ok = 'date;duree_minutes;lieu;motif;note\r\n2024-03-20;30;sur place;arnaque évitée;"=SOMME(1;2) test formule"\r\n2024-04-01;60;à distance;formation;\r\n'
    with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False) as f:
        f.write(csv_ok)
        chemin_csv = f.name
    pg.set_input_files('#j-import', chemin_csv)
    pg.wait_for_timeout(500)
    S.check('import : doublon ignoré, 1 ajoutée', pg.locator('.journal-table tbody tr').count() == 2)
    csv_mauvais = 'a;b;c\r\n1;2;3\r\n'
    with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False) as f:
        f.write(csv_mauvais)
        chemin_csv2 = f.name
    pg.set_input_files('#j-import', chemin_csv2)
    pg.wait_for_timeout(500)
    S.check('import : en-tête invalide refusée', pg.locator('.journal-table tbody tr').count() == 2)
    S.check('import : message d\'erreur',
            'refusé' in (pg.text_content('#tech-onglet-journal') or '').lower()
            or 'refusé' in (pg.text_content('#panneau-tech') or '').lower())

    # --- Journal jamais visible hors mode technicien ---
    pg.click('button:has-text("Quitter")') if pg.locator('button:has-text("Quitter")').count() else None
    charger(pg); fermer_prenom(pg)
    S.check('hors tech : pas de tableau journal', pg.locator('.journal-table').count() == 0)
    S.check('aucune erreur console', len(errs) == 0)
    ctx.close()


if __name__ == '__main__':
    main(NOM, lambda S, b: run(S, b))
