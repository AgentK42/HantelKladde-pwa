#!/usr/bin/env python3
"""Icons verkleinern, ohne sie neu zu zeichnen.

Die Vorlagen kommen aus einem Bildeditor und tragen in den Flaechen ein
Rauschen von plus/minus einem Wert je Kanal. Fuer das Auge ist das nichts,
fuer PNG ist es das Gegenteil von dem, was der Filter braucht: eine Flaeche,
die eigentlich aus einer einzigen Farbe besteht, wird Zeile fuer Zeile neu
kodiert. Deshalb hier erst die Flaechenfarben einsammeln und alles, was nur
knapp danebenliegt, darauf zurueckschnappen, danach palettiert speichern.
Die Kanten bleiben unangetastet, der Antialiasing-Verlauf bekommt genug
Palettenplaetze, um nicht zu stufen.

Aufruf: python3 tools/optimize-icons.py [datei ...]
Ohne Angabe werden alle PNG in icons/ bearbeitet.
"""
import collections
import glob
import os
import sys

from PIL import Image

SNAP = 6      # erlaubter Kanalabstand zu einer Flaechenfarbe
COLORS = 64   # Palettenplaetze, reichlich fuer einen einzelnen Farbverlauf


def pixels(im):
    """Pixel als Tupel, ohne getdata(): das verschwindet in Pillow 14."""
    raw = im.tobytes()
    return list(zip(raw[0::3], raw[1::3], raw[2::3]))


def clean(path):
    src = Image.open(path)
    if src.mode == "P":
        # Schon bearbeitet. Ein zweiter Durchgang wuerde die Palette erneut
        # quantisieren und die Abweichung zur Vorlage aufaddieren.
        print("%-34s bereits palettiert, uebersprungen" % path)
        return
    im = src.convert("RGB")
    data = pixels(im)

    dom = []
    for col, _ in collections.Counter(data).most_common(40):
        if all(sum(abs(a - b) for a, b in zip(col, d)) > 3 * SNAP for d in dom):
            dom.append(col)
        if len(dom) >= 4:
            break

    out = []
    for p in data:
        for d in dom:
            if max(abs(a - b) for a, b in zip(p, d)) <= SNAP:
                out.append(d)
                break
        else:
            out.append(p)

    flat = Image.new("RGB", im.size)
    flat.putdata(out)
    q = flat.quantize(colors=COLORS, dither=Image.Dither.NONE)

    worst = max(max(abs(a - b) for a, b in zip(p1, p2))
                for p1, p2 in zip(data, pixels(q.convert("RGB"))))
    before = os.path.getsize(path)
    q.save(path, optimize=True)
    after = os.path.getsize(path)
    print("%-34s %7d -> %6d Bytes, groesste Kanalabweichung %d"
          % (path, before, after, worst))


if __name__ == "__main__":
    targets = sys.argv[1:] or sorted(glob.glob("icons/*.png"))
    if not targets:
        sys.exit("keine Dateien gefunden")
    for t in targets:
        clean(t)
