#!/bin/sh
# Prueft das JavaScript der App mit ESLint. Der Browser meldet nichts von dem,
# was hier gefunden wird, er fuehrt aus, was da steht: ein vertippter Name, eine
# doppelte Deklaration, Code hinter einem return. Deshalb vor jedem Ausrollen.
#
# Das Skript der App steckt in index.html, und ESLint liest nur .js-Dateien.
# Deshalb wird der <script>-Block in eine Hilfsdatei gezogen, mit so vielen
# Leerzeilen davor, dass die gemeldeten Zeilennummern denen in index.html
# entsprechen. Die Hilfsdatei wird danach wieder geloescht.
#
# Braucht ESLint 9 oder neuer:  npm i -g eslint
set -e
cd "$(dirname "$0")/.."

if ! command -v eslint >/dev/null 2>&1; then
  echo "eslint fehlt. Installieren mit: npm i -g eslint" >&2
  exit 2
fi

tmp=tools/.lint-app.js
trap 'rm -f "$tmp"' EXIT

# Zeile, in der <script> steht: davor kommen genauso viele Leerzeilen, dann
# stimmen die Zeilennummern ueberein. sed liefert den Block ohne die Tags.
start=$(grep -n '^<script>$' index.html | head -1 | cut -d: -f1)
[ -n "$start" ] || { echo "kein <script>-Block in index.html gefunden" >&2; exit 2; }
{
  i=0
  while [ "$i" -lt "$start" ]; do echo; i=$((i + 1)); done
  sed -n '/^<script>$/,/^<\/script>$/p' index.html | sed '1d;$d'
} > "$tmp"

# Das CSS prueft ESLint nicht. Ein offener Kommentar dort ist stumm und teuer:
# in 1.33.5 blieb beim Loeschen zweier Regeln ein "/*" ohne "*/" stehen, und
# alle Regeln bis zum naechsten Kommentarende fielen aus, die Knoepfe darunter
# standen als weisse Browser-Standardknoepfe da. Deshalb hier: jedes "/*" im
# <style>-Block braucht sein "*/", bevor das naechste "/*" kommt, und am Ende
# darf keiner offen sein.
css_err=$(python3 - <<'EOF'
import re, sys
src = open("index.html", encoding="utf-8").read()
start = src.index("<style>") + len("<style>"); end = src.index("</style>", start)
css = src[start:end]; line0 = src[:start].count("\n") + 1
open_at = None
for m in re.finditer(r"/\*|\*/", css):
    ln = line0 + css[:m.start()].count("\n")
    if m.group() == "/*":
        if open_at is not None:
            print("Zeile %d: Kommentar beginnt, waehrend der aus Zeile %d noch offen ist" % (ln, open_at)); sys.exit(1)
        open_at = ln
    else:
        if open_at is None:
            print("Zeile %d: Kommentarende ohne Anfang" % ln); sys.exit(1)
        open_at = None
if open_at is not None:
    print("Zeile %d: Kommentar bis zum Ende des <style>-Blocks offen" % open_at); sys.exit(1)
EOF
) || { echo "CSS in index.html: $css_err" >&2; exit 1; }

# Erst einsammeln, dann ausgeben: in einer Pipe ginge der Rueckgabewert von
# eslint verloren, und das Skript meldete Erfolg trotz Funden.
code=0
out=$(eslint --config tools/eslint.config.js "$tmp" sw.js tools/*.js tools/tests/*.js 2>&1) || code=$?
if [ -n "$out" ]; then
  printf '%s\n' "$out" | sed "s#$(pwd)/$tmp#index.html#; s#$(pwd)/##"
else
  echo "lint: keine Funde in index.html, sw.js, tools/"
fi
exit $code
