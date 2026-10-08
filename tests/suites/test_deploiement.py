"""Garde-fou déploiement : .vercelignore exclut tests/, l'inventaire des
fichiers déployés correspond aux fichiers référencés par la page
(HTML, manifest, service worker), aucun orphelin ni fichier de test.
Pur Python — pas de navigateur.
"""
import sys, os, json, re, fnmatch

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(__file__))
from common import Suite

NOM = 'deploiement'
S = Suite(NOM)


def lire(rel):
    with open(os.path.join(RACINE, rel), encoding='utf-8') as f:
        return f.read()


# ---------- .vercelignore ----------
vercelignore = lire('.vercelignore')
S.check('.vercelignore exclut tests/', re.search(r'(?m)^/?tests/?\*?$', vercelignore.strip()) is not None
        or 'tests/' in vercelignore)
S.check('.vercelignore exclut les docs', 'docs/' in vercelignore or '*.md' in vercelignore)
S.check('.vercelignore exclut node_modules', 'node_modules' in vercelignore)

# ---------- Cohérence CSP : meta de index.html vs en-tête vercel.json ----------
# (le meta ne peut pas contenir frame-ancestors : ignoré volontairement)
html = lire('index.html')
meta = re.search(r'http-equiv="Content-Security-Policy"\s+content="([^"]+)"', html)
S.check('meta CSP présent dans index.html', meta is not None)
vc = json.loads(lire('vercel.json'))
csp_entete = ''
for bloc in vc.get('headers', []):
    for h in bloc.get('headers', []):
        if h.get('key') == 'Content-Security-Policy':
            csp_entete = h.get('value', '')
S.check('vercel.json : CSP présent', bool(csp_entete))
# Vercel ajoute Access-Control-Allow-Origin: * aux fichiers statiques :
# on impose une valeur explicite (l'origine du site), jamais '*'.
acao = ''
for bloc in vc.get('headers', []):
    for h in bloc.get('headers', []):
        if h.get('key', '').lower() == 'access-control-allow-origin':
            acao = h.get('value', '')
S.check('vercel.json : Access-Control-Allow-Origin explicite', bool(acao))
S.check('vercel.json : ACAO n\'est pas « * »', acao != '*')
if meta and csp_entete:
    meta_dirs = set(d.strip() for d in meta.group(1).split(';') if d.strip())
    hdr_dirs = set(d.strip() for d in csp_entete.split(';') if d.strip())
    # Le meta ne doit rien exiger d'absent de l'en-tête (frame-ancestors ne
    # peut pas figurer dans un meta : il n'existe que côté en-tête).
    S.check('CSP meta ⊆ CSP en-tête', meta_dirs <= hdr_dirs)
    S.check("CSP : aucun 'unsafe-inline' / 'unsafe-eval' nulle part",
            not any('unsafe' in d for d in meta_dirs | hdr_dirs))

# ---------- Fichiers référencés par la page ----------
refs = set(re.findall(r'(?:src|href)="([^"#]+)"', html))
refs = {r for r in refs if not r.startswith(('http', 'tel:', 'mailto:', 'data:'))}
S.check('index.html référence app.js', 'app.js' in refs)
S.check('index.html référence style.css', 'style.css' in refs)
S.check('index.html référence le manifest', 'manifest.webmanifest' in refs)
manquants = [r for r in refs if not os.path.isfile(os.path.join(RACINE, r))]
S.check('toutes les références HTML existent (%d)' % len(manquants), not manquants)

# ---------- Manifest ----------
manifest = json.loads(lire('manifest.webmanifest'))
icones_manifest = [i['src'] for i in manifest.get('icons', [])]
S.check('manifest : icônes 192/512 présentes',
        any('192' in s for s in icones_manifest) and any('512' in s for s in icones_manifest))
manq_man = [s for s in icones_manifest if not os.path.isfile(os.path.join(RACINE, s))]
S.check('manifest : toutes les icônes existent', not manq_man)
S.check('manifest : share_target GET',
        manifest.get('share_target', {}).get('method') == 'GET')

# ---------- Service worker : la liste de cache = fichiers déployés ----------
sw = lire('sw.js')
m = re.search(r"VERSION\s*=\s*'([^']+)'", sw)
S.check('sw.js : VERSION présente', m is not None)
cache = set(re.findall(r"'([^']+\.(?:html|css|js|json|webmanifest|svg|png))'", sw))
manq_sw = [f for f in cache if not os.path.isfile(os.path.join(RACINE, f))]
S.check('sw.js : %d fichiers en cache, tous existent' % len(cache), not manq_sw)
for f in ['index.html', 'app.js', 'style.css', 'verification.js', 'catalogue.js', 'icones.js']:
    S.check('sw.js : %s en cache' % f, f in cache or './' + f in sw or '/' + f in sw)

# ---------- Inventaire déployé : aucun orphelin, aucun test ----------
exclusions = [l.strip() for l in vercelignore.splitlines() if l.strip() and not l.startswith('#')]
deployes = []
for base, sous_dossiers, fichiers in os.walk(RACINE):
    sous_dossiers[:] = [d for d in sous_dossiers if d not in ('.git', 'node_modules')]
    for f in fichiers:
        rel = os.path.relpath(os.path.join(base, f), RACINE).replace(os.sep, '/')
        # .vercelignore : motifs simples (dossiers/, *.ext, chemins)
        exclu = False
        for motif in exclusions:
            motif = motif.lstrip('/')
            if motif.endswith('/') and rel.startswith(motif):
                exclu = True
            elif fnmatch.fnmatch(rel, motif) or fnmatch.fnmatch(os.path.basename(rel), motif):
                exclu = True
        if not exclu:
            deployes.append(rel)
S.check('aucun fichier tests/ dans le déployé',
        not any(d.startswith('tests/') for d in deployes))
S.check('aucun fichier outils/ dans le déployé',
        not any(d.startswith('outils/') for d in deployes))
S.check('aucun .md déployé', not any(d.endswith('.md') for d in deployes))
S.check('aucun .py déployé', not any(d.endswith('.py') for d in deployes))
attendus = {'index.html', 'installer.html', 'style.css', 'installer.css', 'app.js',
            'verification.js', 'catalogue.js', 'config.js', 'config.json', 'icones.js',
            'sw.js', 'manifest.webmanifest', 'vercel.json', 'robots.txt'}
orphelins = [d for d in deployes if not d.startswith('icons/') and d not in attendus]
S.check('aucun fichier orphelin à la racine (%s)' % ', '.join(orphelins) or 'aucun', not orphelins)
S.check('le déployé contient les fichiers essentiels', attendus.issubset(set(deployes)))

n = S.bilan()
sys.exit(0 if n == 0 else 1)
