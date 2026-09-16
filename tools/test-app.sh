#!/bin/sh
# Faehrt die Verhaltenstests unter tools/tests durch: Pause, Aufwaermen, Rekorde,
# Planung, Wochenstreifen, Einstellungen und die anderen Themen, je eine Datei,
# je ein eigener Chromium-Lauf gegen die echte index.html. Das ist die zweite
# Haelfte der Pruefung neben tools/test-pwa.js, das die App-Schicht abdeckt
# (ServiceWorker, Offline, Update).
#
# Ohne Argumente laufen alle Suiten, sonst die genannten:
#   tools/test-app.sh
#   tools/test-app.sh pause aufwaermen
#
# Je Suite steht eine Zeile. Die Ausgabe einer Suite erscheint nur, wenn sie
# nicht gruen ist, sonst waeren es rund 300 Zeilen je Lauf, in denen der eine
# Fehlschlag untergeht. Rueckgabewert 0 nur, wenn alle Suiten gruen sind.
#
# Braucht Playwright mit Chromium, wie test-pwa.js:
#   npm i -g playwright && npx playwright install chromium
set -u
cd "$(dirname "$0")/.."

# Die Suiten laden playwright aus der globalen Installation. Wer NODE_PATH schon
# gesetzt hat, behaelt seinen Wert.
NODE_PATH="${NODE_PATH:-$(npm root -g)}"
export NODE_PATH

if ! node -e 'require("playwright")' 2>/dev/null; then
  echo "playwright fehlt. Installieren mit: npm i -g playwright && npx playwright install chromium" >&2
  exit 2
fi

if [ $# -gt 0 ]; then
  list=""
  for n in "$@"; do
    f="tools/tests/${n%.js}.js"
    [ -f "$f" ] || { echo "keine Suite $n unter tools/tests" >&2; exit 2; }
    list="$list $f"
  done
else
  list=$(ls tools/tests/*.js | grep -v '/lib\.js$')
fi

ok=0
bad=""
start_all=$(date +%s)
for f in $list; do
  name=$(basename "$f" .js)
  start=$(date +%s)
  out=$(node "$f" 2>&1)
  code=$?
  secs=$(( $(date +%s) - start ))
  n=$(printf '%s\n' "$out" | grep -c '^OK   ')
  if [ "$code" -eq 0 ]; then
    printf 'OK   %-16s %3d Pruefungen  %3ds\n' "$name" "$n" "$secs"
    ok=$((ok + 1))
  else
    printf 'FEHL %-16s Rueckgabe %d  %3ds\n' "$name" "$code" "$secs"
    printf '%s\n' "$out" | sed 's/^/     /'
    bad="$bad $name"
  fi
done

total=$(( $(date +%s) - start_all ))
if [ -n "$bad" ]; then
  echo "FEHLER in:$bad  ($ok gruen, ${total}s)"
  exit 1
fi
echo "alle $ok Suiten gruen (${total}s)"
