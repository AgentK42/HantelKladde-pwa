# HantelKladde

Trainingstagebuch für Kraftsport als installierbare Web-App (PWA).

Läuft nach dem ersten Aufruf vollständig offline. Alle Daten bleiben im Browser
des Geräts (`localStorage`), es gibt keinen Server, keine Anmeldung, keine
Übertragung nach außen.

**App:** https://agentk42.github.io/HantelKladde-pwa/

## Installieren

1. Die Adresse oben in **Chrome für Android** öffnen (nicht in einem
   In-App-Browser, etwa aus WhatsApp heraus, dort fehlt der Eintrag)
2. Menü (drei Punkte) → **App installieren** bzw. **Zum Startbildschirm hinzufügen**
3. Die App startet danach ohne Adressleiste in einem eigenen Fenster und
   erscheint in den Android-Einstellungen als eigenständige App

Der erste Aufruf braucht Netz, danach läuft alles offline.

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

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html` | die vollständige App in einer Datei, ohne externe Abhängigkeiten |
| `manifest.webmanifest` | Name, Icons, Startadresse, Anzeige ohne Adressleiste |
| `sw.js` | ServiceWorker für den Offline-Betrieb |
| `icons/` | App-Icons in 192 und 512 Pixel, je randlos und maskierbar |

## Hosting

Ausgeliefert über GitHub Pages aus dem Wurzelverzeichnis des `main`-Branch.
Das Paket ist pfadunabhängig: Manifest und ServiceWorker arbeiten mit relativen
Adressen, der Ordner lässt sich also unverändert auch woanders ausliefern.

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

## Neue Version ausrollen

`index.html` austauschen und in `sw.js` die Zeile `APP_VERSION` auf die neue
Nummer setzen. Der alte Cache wird damit verworfen. Die Trainingsdaten im
`localStorage` bleiben davon unberührt.

Die neue Fassung wird im Hintergrund geladen und ist beim nächsten Start der App
aktiv. Bewusst kein sofortiges Neuladen, damit nicht mitten im Satz die Seite
wechselt.
