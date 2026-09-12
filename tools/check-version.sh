#!/bin/sh
# Die Versionsnummer steht an zwei Stellen: in index.html zeigt sie die App an,
# in sw.js bestimmt sie den Namen des Caches. Laufen beide auseinander, meldet
# die App eine Fassung, die nicht zu den ausgelieferten Dateien gehoert.
# Vor jedem Ausrollen einmal aufrufen.
set -e
cd "$(dirname "$0")/.."

app=$(sed -n 's/^var APP_VERSION = "\(.*\)";$/\1/p' index.html | head -1)
sw=$(sed -n 's/^var APP_VERSION = "\(.*\)";$/\1/p' sw.js | head -1)

if [ -z "$app" ] || [ -z "$sw" ]; then
  echo "APP_VERSION nicht gefunden (index.html: '$app', sw.js: '$sw')" >&2
  exit 2
fi
if [ "$app" != "$sw" ]; then
  echo "Versionen laufen auseinander: index.html $app, sw.js $sw" >&2
  exit 1
fi
echo "Version $app in index.html und sw.js"
