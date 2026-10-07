#!/usr/bin/env python3
"""Génère icones.js à partir des fichiers icons/*.svg.
Chaque icône devient une liste de formes [balise, attributs] que app.js
reconstruit en SVG inline via l'API DOM (aucune requête réseau, colorable en CSS).
À relancer après toute modification d'une icône : python3 outils/gen-icones.py
"""
import json, re, pathlib
racine = pathlib.Path(__file__).resolve().parent.parent
icones = {}
for f in sorted((racine / "icons").glob("*.svg")):
    if f.stem == "app":  # icône de l'application (manifest), pas une icône de tuile
        continue
    svg = f.read_text(encoding="utf-8")
    corps = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
    formes = []
    for m in re.finditer(r"<(\w+)([^>]*)/>", corps):
        attrs = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(2)))
        formes.append([m.group(1), attrs])
    icones[f.name] = formes
sortie = ("/* Icônes de MonAccueil, générées depuis icons/*.svg par outils/gen-icones.py.\n"
          "   Ne pas modifier à la main. */\n"
          "window.MONACCUEIL_ICONES = " + json.dumps(icones, ensure_ascii=False, indent=1) + ";\n")
(racine / "icones.js").write_text(sortie, encoding="utf-8")
print(len(icones), "icônes écrites dans icones.js")
