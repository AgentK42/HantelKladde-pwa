# HantelKladde, Arbeitsregeln

Trainingstagebuch als PWA. Eine Datei (`index.html` mit CSS und App), `sw.js`
für Offline und Update, kein Build-Schritt, keine Abhängigkeiten, `localStorage`
als Speicher, Backup als JSON. Die README erklärt jede größere Entscheidung mit
ihrem Grund; sie ist die Dokumentation, nicht dieser Text.

## Struktur, bevor du baust

- Eine Aktion der Oberfläche ist ein Eintrag `ACTIONS.name = function (v, el)`,
  nie ein Zweig anderswo. `return false` heißt: kein Neuaufbau durch den
  Verteiler. Eine Eingabe beim Tippen ist ein Eintrag
  `INPUT_ACTIONS.name = function (el, act)`, dort baut nie der Verteiler neu auf.
  Beide Arten stehen in der Ausschlussliste am Anfang des Klick-Verteilers.
- Wer ein Muster zum dritten Mal kopiert, baut erst den Helfer. Gemeinsame
  Bausteine gibt es bereits für Tageszellen (`dayCell`), Planauswahl
  (`assignPanel`), Muskelgruppen (`muscleTally`, `muscleBars`), Pause (`exRest`),
  Aufwärmzustand (`enterWarm`, `clearWarm`), Diagramme (`gridLine`, `dateRow`).
- Wer eine Funktion über 100 Zeilen erweitert oder einer Kette einen weiteren
  Zweig anhängt, sagt das vor dem Bauen in einem Satz. Anpassen an die Umgebung
  ist richtig, stilles Anpassen an eine Struktur, die kippt, nicht. Ein Präfix
  am Variablennamen, damit er in einer zu großen Funktion nicht kollidiert, ist
  das Warnzeichen dafür.
- `tools/lint.sh` warnt bei Komplexität über 40 und Funktionen über 150 Zeilen.
  Eine neue Warnung wird nicht durch Hochsetzen der Schwelle beseitigt.
- Umbau und Feature sind getrennte Commits. Eine Durchsicht der Struktur, wie
  `/code-review` über den Branch, gehört vor jeden Sprung der mittleren
  Versionsnummer.

## Konventionen im Code

- ES5-Stil: `var`, Funktionsdeklarationen, keine Klassen, keine Module. Ein
  gemeinsamer Zustand `S`, ein `render()`, das `#app` neu aufbaut.
- Kommentare auf Deutsch und sie erklären das Warum, nicht das Was. Steht eine
  Entscheidung im Code, steht ihr Grund daneben, oft mit Fassungsnummer.
- Datenmodell nur mit Import-Prüfung erweitern (`cleanEntry`, `cleanExmeta`,
  `cleanPlans`, ...) und `mergeBackup` mitziehen. Aufwärmsätze zählen nirgends,
  siehe `isWork()`.
- Sitzungszustand (Pause, Sitzung, Entwurf) liegt unter eigenen Schlüsseln, nicht
  in `S.settings`, und gehört nicht ins Backup.
- Keine Emojis, keine Gedankenstriche, keine Symbolzeichen in Texten der App,
  in Kommentaren, Commits und Antworten.

## Vor jedem Push

`APP_VERSION` in `index.html` und `sw.js` gleich anheben, dann in dieser Reihenfolge:

```
tools/check-version.sh
tools/lint.sh
NODE_PATH=$(npm root -g) node tools/test-pwa.js
```

Dazu die Playwright-Suiten für das, was geändert wurde. Eine Änderung an der
Oberfläche wird einmal in hell und dunkel bei 390 Pixel Breite angesehen. Ein
Rekord, eine Pause, ein Plan: was sich verhält, bekommt einen Test, der das
Verhalten beschreibt, nicht die Implementierung.

## Commits

Ein Thema je Commit, Titel als Satz, Rumpf mit dem Warum und dem, was sich für
den Nutzer ändert. Auf `main` nur vorspulen, wenn ausdrücklich gewünscht.
