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

# Icônes PWA : la maison de mon-accueil en PNG (192 et 512 px), même dessin qu'au-dessus.
# Nécessaires à l'installation de la page comme application (manifest.webmanifest).
def maison(taille):
    k = taille / S
    im = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, taille - 1, taille - 1), radius=int(48 * k), fill="#1d4ed8")
    w = int(W * k)
    d.line([(56 * k, 128 * k), (128 * k, 64 * k), (200 * k, 128 * k)], fill="white", width=w, joint="curve")
    d.line([(76 * k, 120 * k), (76 * k, 192 * k), (180 * k, 192 * k), (180 * k, 120 * k)], fill="white", width=w, joint="curve")
    d.rectangle((112 * k, 152 * k, 144 * k, 192 * k), outline="white", width=max(2, w // 2))
    return im

for taille in (192, 512):
    maison(taille).save(racine / f"mon-accueil-{taille}.png")

print("icônes .ico et .png générées")
