#!/usr/bin/env python3
"""Génère les icônes Windows (.ico, 256 px) des raccourcis Bureau.
   À relancer si vous changez les couleurs : python3 outils/gen-ico.py
   Nécessite Pillow (pip install pillow)."""
import pathlib
from PIL import Image, ImageDraw
racine = pathlib.Path(__file__).resolve().parent.parent / "icons"
S = 256; W = 18  # taille et épaisseur de trait

def fond(couleur):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=48, fill=couleur)
    return im, d

# Icône "Mon Accueil" : maison blanche sur bleu
im, d = fond("#1d4ed8")
d.line([(56, 128), (128, 64), (200, 128)], fill="white", width=W, joint="curve")
d.line([(76, 120), (76, 192), (180, 192), (180, 120)], fill="white", width=W, joint="curve")
d.rectangle((112, 152, 144, 192), outline="white", width=W // 2)
im.save(racine / "mon-accueil.ico", sizes=[(256, 256), (48, 48), (32, 32), (16, 16)])

# Icône "Aide à distance" : écran + téléphone blancs sur violet
im, d = fond("#a21caf")
d.rounded_rectangle((28, 48, 172, 150), radius=14, outline="white", width=W)
d.line([(100, 150), (100, 190)], fill="white", width=W)
d.line([(64, 196), (136, 196)], fill="white", width=W)
d.rounded_rectangle((176, 120, 236, 216), radius=14, outline="white", width=W)
d.line([(198, 200), (214, 200)], fill="white", width=8)
im.save(racine / "aide-distance.ico", sizes=[(256, 256), (48, 48), (32, 32), (16, 16)])
print("icônes .ico générées")
