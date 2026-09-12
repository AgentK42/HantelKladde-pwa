# HantelKladde

Trainingstagebuch für Kraftsport als installierbare Web-App (PWA).

Läuft nach dem ersten Aufruf vollständig offline. Alle Daten bleiben im Browser
des Geräts (`localStorage`), es gibt keinen Server, keine Anmeldung, keine
Übertragung nach außen.

**App:** https://agentk42.github.io/HantelKladde-pwa/

## Installieren

1. Die Adresse oben in **Chrome für Android** öffnen (nicht in einem
   In-App-Browser, etwa aus WhatsApp heraus, dort fehlt der Eintrag)
2. Unter **Daten → App** auf **App installieren** tippen. Alternativ über das
   Chrome-Menü (drei Punkte) → **App installieren**
3. Die App startet danach ohne Adressleiste in einem eigenen Fenster und
   erscheint in den Android-Einstellungen als eigenständige App

Der erste Aufruf braucht Netz, danach läuft alles offline.

Auf dem Startbildschirm öffnet ein langer Druck auf das Icon die Kurzbefehle
für Training, Verlauf und Daten.

Unter iOS geht es über Safari, Teilen-Symbol → **Zum Home-Bildschirm**. Dort
fehlen allerdings einige Funktionen, unter anderem das Wachhalten des Displays
während der Satzpause.

## Daten übertragen

Die Trainingsdaten hängen an der Adresse, unter der die App läuft. Wer die App
bisher als lokale Datei oder unter einer anderen Adresse genutzt hat, sieht in
der installierten Fassung zunächst einen leeren Stand:

1. In der alten Fassung unter **Daten** ein Backup exportieren
2. Die installierte App öffnen
3. Dort unter **Daten** das Backup importieren

Der Import ergänzt, er überschreibt nicht.

Ist die App installiert, geht es auch andersherum: eine Backup-Datei im
Dateimanager oder in der Cloud antippen, **Teilen** wählen und **HantelKladde**
als Ziel nehmen. Die App öffnet sich, liest die Datei ein und meldet, wie viele
Sätze dazugekommen sind. Dahinter steckt `share_target` im Manifest; den POST
nimmt der ServiceWorker selbst entgegen, weil GitHub Pages nur Dateien
ausliefert und nichts annehmen kann.

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html` | die vollständige App in einer Datei, ohne externe Abhängigkeiten |
| `manifest.webmanifest` | Name, Icons, Startadresse, Anzeige ohne Adressleiste, Kurzbefehle, Teilen-Ziel |
| `sw.js` | ServiceWorker für den Offline-Betrieb und für das Entgegennehmen geteilter Backups |
| `icons/` | App-Icons in 192 und 512 Pixel, je randlos und maskierbar |
| `screenshots/` | drei Bilder für den Installationsdialog von Chrome |
| `tools/` | drei Helfer für das Ausrollen und zum Prüfen, siehe unten |

## Hosting

Ausgeliefert über GitHub Pages aus dem Wurzelverzeichnis des `main`-Branch.
Das Paket ist pfadunabhängig: Manifest und ServiceWorker arbeiten mit relativen
Adressen, der Ordner lässt sich also unverändert auch woanders ausliefern.

Die einzige feste Angabe ist `id` im Manifest. Sie steht auf
`/HantelKladde-pwa/` und ist damit genau das, was Chrome bisher von selbst
angenommen hat, nämlich die `start_url`. Ohne diese Zeile hinge die Identität
der App weiter an der Startadresse, und ein Umzug des Ordners hieße: zwei Icons
auf dem Startbildschirm, weil Chrome die verschobene Fassung für eine andere App
hält. Die Zeile ändert daran nichts für bereits installierte Geräte, sie hält
den Zustand nur fest. Wer den Ordner tatsächlich verschiebt, trägt dort den
neuen Pfad ein und muss einmal neu installieren.

## Farbe der Statusleiste

Android faerbt bei einer installierten PWA den Streifen am oberen Bildschirmrand
mit dem `theme_color` aus dem Manifest. Das `<meta name="theme-color">`, das die
App beim Umschalten zwischen Hell und Dunkel mitfuehrt, wertet Chrome dafuer
nicht aus: es wirkt nur im Browser, nicht in der installierten App. Die
Statusleiste kann dem gewaehlten Thema also nicht folgen, sie bekommt einen
festen Wert.

Der steht auf `#151816`, dem Hintergrund des dunklen Themas, passend dazu, dass
die App bei einer frischen Installation dunkel startet. Wer dauerhaft hell
arbeitet, traegt in `manifest.webmanifest` stattdessen `#E6E7E2` ein.

Aenderungen am Manifest erreichen ein bereits installiertes Geraet nicht sofort.
Chrome prueft das Manifest im Hintergrund und erneuert die installierte App
danach von selbst, das kann bis zu einem Tag dauern. Wer nicht warten will,
deinstalliert die App und installiert sie neu.

## Speicher

Die Trainingsdaten liegen im `localStorage`. Damit der Browser sie nicht von
sich aus wegräumt, wenn der Platz auf dem Gerät knapp wird, fragt die App beim
Start `navigator.storage.persist()` an. Einer installierten App sagt Chrome das
in der Regel ohne Nachfrage zu; im Browser hängt es davon ab, wie oft die Seite
benutzt wird. Unter **Daten → Speicher** steht, ob der Schutz vorliegt und wie
groß die eigenen Daten sind.

Die Größe wird aus den eigenen Schlüsseln im `localStorage` gerechnet und nicht
über `navigator.storage.estimate()`: das zählt die offline abgelegte App mit,
also 330 kB Programm neben ein paar kB Sätzen, und sagt damit nichts mehr über
die Trainingsdaten aus.

Gegen bewusstes Löschen über die Browser- oder App-Einstellungen hilft der
Schutz nicht. Dagegen hilft nur ein Backup.

## Zurück-Geste

Im installierten Fenster gibt es keine Adressleiste und keine Seite, auf die
zurück führen könnte. Ohne eigenen Eintrag im Verlauf schlösse die Zurück-Geste
sofort die ganze App, auch mitten im Fokus-Modus. Deshalb legt die App für den
Fokus-Modus, die Zusammenfassung und ein aufgeklapptes Diagramm im Verlauf je
einen History-Eintrag an (`navOpen`/`navBack` in `index.html`). Zurück schließt
damit erst die offene Ansicht, und erst aus der Grundansicht heraus die App.

## Neue Version ausrollen

`index.html` austauschen und in `sw.js` die Zeile `APP_VERSION` auf die neue
Nummer setzen. Dieselbe Nummer steht in `index.html`, sie wird dort angezeigt.
`tools/check-version.sh` vergleicht beide und meldet sich, wenn sie
auseinanderlaufen. Der alte Cache wird beim Aktivieren verworfen. Die
Trainingsdaten im `localStorage` bleiben davon unberührt.

Die neue Fassung wird im Hintergrund geladen und wartet dann. Die laufende App
zeigt oben **Ein Update ist vorhanden** mit einem Knopf; ohne einen Tipp darauf
übernimmt sie beim nächsten Start, sobald kein Fenster mehr offen ist.
Bewusst kein sofortiges Neuladen, damit nicht mitten im Satz die Seite wechselt.

Unter **Daten → App** steht, welche Fassung die App meldet und welche der
ServiceWorker tatsächlich ausliefert. Laufen beide auseinander, ist im Cache
etwas anderes als das, was die Versionsnummer behauptet.

## Icons und Screenshots

Die Icons kommen aus einem Bildeditor und tragen in den Flächen ein Rauschen von
plus/minus einem Wert je Kanal. Für das Auge ist das nichts, für die
PNG-Kompression ist es teuer: eine eigentlich einfarbige Fläche wird Zeile für
Zeile neu kodiert. `tools/optimize-icons.py` schnappt diese Werte auf die
Flächenfarbe zurück und speichert palettiert. Aus 367 kB wurden damit 13 kB,
sichtbar ist der Unterschied nicht. Neue Icons einmal durch das Skript schicken,
bereits palettierte lässt es liegen.

Die drei Bilder in `screenshots/` zeigt Chrome unter Android im großen
Installationsdialog. Ohne sie bleibt es bei der schmalen Leiste am unteren
Rand. Sie sind 412 auf 915 Pixel groß und als `form_factor: narrow` im Manifest
eingetragen; ändert sich die Oberfläche deutlich, gehören sie neu aufgenommen.

## Prüfen

Offline-Betrieb, Update-Weg, Zurück-Geste, Speicherzusage, Kurzbefehle und das
Entgegennehmen eines geteilten Backups lassen sich nicht durch Hinsehen prüfen.
`tools/test-pwa.js` fährt sie in Chromium durch. Das Skript startet den Server
selbst und braucht außer Playwright nichts:

```
npm i -g playwright && npx playwright install chromium
NODE_PATH=$(npm root -g) node tools/test-pwa.js
```

Es hebt dabei kurzfristig die Version in `sw.js` an, um den Update-Weg
auszulösen, und setzt die Datei danach wieder zurück.
