# HantelKladde

Trainingstagebuch für Kraftsport als installierbare Web-App (PWA).

Läuft nach dem ersten Aufruf vollständig offline. Alle Daten bleiben im Browser
des Geräts (`localStorage`), es gibt keinen Server, keine Anmeldung, keine
Übertragung nach außen.

**App:** https://agentk42.github.io/HantelKladde-pwa/

## Installieren

1. Die Adresse oben in **Chrome für Android** öffnen (nicht in einem
   In-App-Browser, etwa aus WhatsApp heraus, dort fehlt der Eintrag)
2. Unter **Daten → App Version** auf **App installieren** tippen. Alternativ über das
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

Gelesen werden Backups im Format 6, also aus Fassung 1.14.1 und neuer. Die Nummer
steht als `version` in der Datei, `BACKUP_VERSION` in `index.html` nennt den
erwarteten Stand. Ältere Dateien lehnt der Import seit 1.18.0 mit Angabe des
gefundenen Formats ab, statt die Hälfte einzulesen und den Rest zu verschweigen.
Bis dahin wurde die Nummer zwar mitgeschrieben, aber nie geprüft.

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
| `tools/` | Helfer für das Ausrollen und zum Prüfen, siehe unten |

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
groß ein Backup dieser Daten wäre.

Die Größe ist die des tatsächlichen Exports, nicht die Belegung aus
`navigator.storage.estimate()`: das zählt die offline abgelegte App mit, also
330 kB Programm neben ein paar kB Sätzen, und sagt damit nichts mehr über die
Trainingsdaten aus. Gerechnet wird einmal und dann gemerkt, `persist()`
verwirft den Wert bei jeder Änderung.

Gegen bewusstes Löschen über die Browser- oder App-Einstellungen hilft der
Schutz nicht. Dagegen hilft nur ein Backup.

## Wo das Training gerade steht

Neben den Trainingsdaten hält die App drei Dinge fest, die nur zur laufenden
Sitzung gehören und deshalb je einen eigenen Schlüssel bekommen statt im Backup
zu landen: den Pausentimer (`kraftlog:rest`), die angenommenen und verworfenen
Vorschläge des Tages (`kraftlog:suggest`) und seit 1.17.2 die Stelle im Training
(`kraftlog:session`) mit Reiter, Fokus-Modus, Plan, Übung und den eingestellten
Werten.

Startet die App neu, kommt sie damit still dorthin zurück, wo sie war, ohne
Nachfrage. Der Eintrag verfällt nach vier Stunden, ein Reiter aus einem Shortcut
oder aus einem geteilten Backup schlägt ihn, und ein Plan oder eine Übung, die
es nicht mehr gibt, bleibt leer. Anlass war der Fokus-Modus: dort ist der Inhalt
kürzer als der Bildschirm, ein Wisch nach unten löste deshalb Chromes
Pull-to-refresh aus und warf einen in den leeren Trainingsreiter. Die Geste
selbst ist inzwischen abgestellt (`overscroll-behavior-y: contain` auf
`html, body`); die App holt nichts vom Server, es gab dort also nie etwas
aufzufrischen. Ein neues Update kommt weiterhin über den Knopf.

## Zurück-Geste

Im installierten Fenster gibt es keine Adressleiste und keine Seite, auf die
zurück führen könnte. Ohne eigenen Eintrag im Verlauf schlösse die Zurück-Geste
sofort die ganze App, auch mitten im Fokus-Modus. Deshalb legt die App für den
Fokus-Modus, die Zusammenfassung und ein aufgeklapptes Diagramm im Verlauf je
einen History-Eintrag an (`navOpen`/`navBack` in `index.html`). Zurück schließt
damit erst die offene Ansicht, und erst aus der Grundansicht heraus die App.

Wird der Fokus-Modus nach einem Neustart wiederhergestellt, zieht
`restoreSession()` diesen Eintrag nach. Trägt der Eintrag, auf dem die App wieder
hochkommt, schon eine Tiefe, wird nur der Stapel darauf gebracht statt ein
zweiter Eintrag gelegt, sonst bräuchte es zwei Gesten für eine Ebene.

## Pausenlänge

Zwei Stufen, gesetzt in `DEFAULT_EXMETA` über die Konstante `REST_COMPOUND`.

Die zwölf Mehrgelenksübungen tragen **120 Sekunden** als eigenen Wert. Alles
andere hat gar keinen und fällt auf die Pause aus den Einstellungen zurück,
ab Werk **90 Sekunden**. Der eine Regler unter *Daten, Pause* verschiebt damit
weiterhin sämtliche Isolationsübungen und alle selbst angelegten Übungen auf
einmal, während die schweren Übungen unabhängig davon stehen bleiben.

Nach einem **Aufwärmsatz** läuft immer die kurze Pause von 60 Sekunden
(`WARM_REST`), aber nie länger als die der Übung selbst: Wer den Regler auf
45 Sekunden stellt, bekommt auch beim Aufwärmen 45. Das rechnet `warmRest()`.

Die Stufen kommen aus der Literatur. Der ACSM Position Stand nennt zwei bis
drei Minuten für Mehrgelenksübungen und ein bis zwei für Assistenzübungen. Die
Bayes-Metaanalyse von Singer u.a. (2024) findet unterhalb von 60 Sekunden einen
Nachteil, oberhalb von 90 aber keinen weiteren Vorteil. Feinere Abstufungen
wären nicht belegt, deshalb nur zwei Werte. Der Mechanismus ist die
Volumenlast: Eine zu kurze Pause kostet Wiederholungen im Folgesatz, und genau
an dieser Zahl hängen hier die doppelte Progression und `plateau()`.

Je Übung änderbar ist die Pause unter *Daten, Übungen*, im Kasten hinter dem
Namen. Der erste Eintrag *Wie eingestellt* nimmt einen eigenen Wert wieder weg,
auch den mitgelieferten: Er schreibt eine Null, und `exMeta()` liest die Null
als „hat keine eigene Pause“. Ein Wert, der von der Einstellung abweicht, steht
als eigene Zeile unter der Übung.

## Signal am Ende der Pause

Drei Wege, je nachdem, wo die App steht.

Im Vordergrund vibriert und piepst es wie bisher. Eine Benachrichtigung wäre
dort nur im Weg, der Pausenbalken steht ja sichtbar auf dem Schirm.

Im Hintergrund richten beide nichts mehr aus. Der Ton braucht eine hörbare
Seite, und eine laufende Vibration bricht der Browser ab, sobald das Dokument
versteckt ist. Dort übernimmt eine Benachrichtigung, die Android zustellt und
nicht die Seite. Die Erlaubnis dafür holt ein Knopf unter **Daten → Pause**,
bewusst dort und nicht mitten im Training: eine abgelehnte Nachfrage holt Chrome
nicht von selbst zurück. Danach steht an derselben Stelle ein Schalter.

Das **Vibrationsmuster** unter Daten, Pause hat zwei Stellungen. *Einfach* ist
ein kurzer Doppelschlag je Signal, *durchgehend* vibriert vom ersten Signal an
ohne Pause bis zum dritten, also rund zehn Sekunden, gedacht für das Handy in
der Hosentasche. Das lange Muster startet nur beim ersten Signal, sonst setzte
jedes weitere es zurück und die Vibration liefe über das Ende hinaus. Bei
versteckter Seite greift keines von beiden, siehe unten.

Ton und Vibration werden trotzdem immer versucht, nicht nur im Vordergrund. Die
Vibration bricht der Browser bei versteckter Seite ab, der Ton dagegen läuft
weiter, solange der AudioContext bereits steht. Deshalb wird er beim Start der
Pause geöffnet und nicht erst beim Signal: ein im Hintergrund frisch angelegter
Kontext startet angehalten und lässt sich ohne neue Nutzeraktion nicht mehr
starten. Bis 1.16.2 war das der Grund, warum im Hintergrund gar nichts zu hören
war.

Ob die Benachrichtigung klingelt, vibriert und den Bildschirm weckt, entscheidet
seit Android 8 der Benachrichtigungskanal und nicht die App. `vibrate` und
`silent` in den Optionen werden dort ignoriert. Kommt die Meldung lautlos an,
steht der Kanal zu niedrig, und das stellt man einmal in den Android-
Einstellungen unter Apps, HantelKladde, Benachrichtigungen ein. Der Knopf
**Signal in 5 Sekunden testen** unter Daten, Pause ist dafür da: einmal tippen,
Bildschirm sperren, hinhören.

Was auch das nicht löst: ist die Seite eingefroren, läuft kein Code mehr, der
etwas melden könnte. Die Benachrichtigung hilft bei "versteckt, aber am Leben",
und das ist bei anderthalb Minuten Pause der Normalfall. Der Bildschirmwächter
bleibt daneben bestehen, er ist nur nicht mehr die einzige Grundlage.

### Akku-Optimierung

Kommt bei ausgeschaltetem Bildschirm gar nichts und beim Einschalten alles auf
einmal, hat Android das Gerät schlafen gelegt. Dann läuft überhaupt kein
Programm mehr, weder der Timer noch der ServiceWorker; der fällige Tick wird
beim Aufwachen nachgeholt.

Das ist keine Regel des Browsers und keine feste Grenze, sondern die Nachlaufzeit
des Geräts, bis es wirklich suspendiert, auf einem Testgerät rund eine Minute.
Pausen von 30 und 60 Sekunden enden noch davor und funktionieren, 90 Sekunden
nicht mehr. Auf einem anderen Handy liegt die Grenze woanders.

Abhilfe: Android-Einstellungen, Apps, **Chrome**, Akku, auf **uneingeschränkt**
stellen. Die Einstellung hängt an Chrome und nicht an HantelKladde, auch bei der
installierten App, und ist auf einem neuen Gerät wieder zu setzen. Damit lief im
Test auch eine Pause von 90 Sekunden mit Ton und Vibration durch.

Schläft das Gerät mehr als zwei Minuten über das Pausenende hinaus, verwirft die
App den Timer beim Aufwachen, statt verspätet zu piepsen, siehe `tickRest()`.

Alle Meldungen tragen denselben `tag`, weil bis zu drei Mal im Abstand von fünf
Sekunden signalisiert wird: so wird eine Meldung dreimal erneuert, statt drei
Meldungen zu stapeln. Beim Zurückkommen und beim Beenden der Pause wird sie
weggeräumt. Ein Tipp darauf holt das laufende Fenster nach vorne, dafür sitzt
ein `notificationclick`-Handler in `sw.js`.

## Aufbau des Daten-Reiters

Die Reihenfolge folgt dem, was am häufigsten gebraucht wird: Darstellung,
Speicher, Backup, Pause, danach die selteneren Einstellungen und ganz unten die
Fassung.

Zwei Abschnitte sind lang und starten deshalb zugeklappt, die Übungen mit allen
Gruppen und die Muskelgruppen mit jeder Übung einzeln. Zusammen machen sie den
Reiter doppelt so lang: 4757 statt 2386 Pixel. Der Zustand liegt in `S.secOpen`
und nicht in den Einstellungen, sie sollen bei jedem Besuch wieder zu sein, wie
die einzelnen Gruppen darin (`S.dataClosed`) und die Plankarten
(`S.planCardsFold`), siehe `secFold()`.

## Wochenstreifen

Die Zeile mit den Tagen über der Planauswahl im Trainingsreiter. Sie reichte bis
1.23.1 genau 14 Tage zurück und endete am heutigen Tag. Seit die Planung Pläne auf
kommende Tage legt, gehört auch der Blick nach vorn dazu: das Fenster steht jetzt
auf 13 Tagen zurück und 7 nach vorn (`STRIP_BACK`, `STRIP_FWD`). Weiter nach vorn
bringt wenig, die Zuweisung reicht ohnehin nur zwei Wochen, und jede Zelle mehr
rückt den heutigen Tag weiter aus dem Bild. Beim Aufbau steht der gewählte Tag am
rechten Rand, die kommenden Tage liegen also eine Wischbewegung entfernt. Ein
gewählter Tag außerhalb des Fensters nimmt das ganze Fenster mit, statt beliebig
viele Zellen entstehen zu lassen.

Das Feld zum freien Wählen eines Datums ist seit 1.25.0 weg. Es saß als
Kalendersymbol in der Datumszeile und führte an Tage, an denen ohnehin nichts
nachgetragen wird; was zählt, steht im Streifen und in der Übersicht. Zurück zum
laufenden Tag führt weiter der Knopf **Heute** daneben.

Rechts daneben, außerhalb des Scrollbereichs und damit beim Wischen an Ort und
Stelle, führt ein Knopf in die **Wochenübersicht**: die beiden vergangenen
Kalenderwochen, die laufende und die beiden kommenden, Montag bis Sonntag, je
Woche die Zahl der trainierten und der noch geplanten Tage.

Ein Tipp auf einen Tag ab heute **weist ihm einen Plan zu**, mit derselben Auswahl
wie im Reiter Planung (`assignPanel()`) und direkt unter seiner Woche. Bis 1.24.0
öffnete der Tipp den Tag im Training; das kann der Streifen darunter schon, und
zum Nachsehen taugt die Übersicht auch ohne. Zur Wahl stehen die im Training
eingeblendeten Pläne, dazu ein bereits zugewiesener, der nicht mehr darunter ist,
sonst ließe er sich nur noch auf Frei setzen. Vergangene Tage sind dort kein Knopf,
eine Zuweisung von gestern gibt es nicht. Den Tag am Knopf mitzugeben ist der Grund,
warum sich Planung und Übersicht denselben `planassign`-Zweig teilen und trotzdem
jede ihre eigene Auswahl behält.

Sie ist ein eigener Bildschirm im Trainingsreiter wie die Übungsauswahl, hängt
aber wie der Fokus-Modus im History-Stapel (`navOpen("weekovr")`), damit die
Zurück-Geste sie schließt und nicht die ganze App. Deshalb geht sie überall über
`closeWeekOverview()` zu, nie über `S.weekOverview` von Hand. Gemerkt wird sie
nicht, sie startet immer zu.

Streifen und Übersicht bauen ihre Zellen aus derselben Funktion (`dayCell()`):
gefüllter Punkt in der Planfarbe für einen absolvierten Tag, leerer Ring für einen
in der Planung zugewiesenen, matter Ring für einen angefangenen. Wer die Zeichen
einmal lernt, kennt sie in beiden Ansichten.

## Planung

Der fünfte Reiter, seit 1.23.0. Der Pläne-Reiter zeigt die Sätze je
Muskelgruppe für das, was gespeichert ist. Wer wissen wollte, wie ein anderer Mix
aussähe, musste dort die Wochenziele umstellen und **Neues Wochenziel speichern**
drücken, also einen Eintrag in die Historie schreiben, nur um nachzusehen. Die
Planung rechnet stattdessen auf einem Entwurf: welche Pläne wie oft pro Woche,
dazu einzelne Übungen außerhalb der Pläne mit eigener Satzzahl und Häufigkeit.
Gezählt wird wie überall (Primärmuskel voll, Sekundärmuskel halb), anders als im
Pläne-Reiter stehen Gruppen ohne einen Satz rot mit dabei, und ein
Gegenspieler-Paar wird rot, sobald eine Seite mindestens anderthalb mal so viele
Sätze hat wie die andere oder ganz leer ausgeht (`DRAFT_PAIR_RATIO`).

Der Entwurf liegt unter `kraftlog:entwurf`, nicht in den Einstellungen und nicht
im Backup: er ist eine Überlegung, kein Datenbestand. Anders als die Sitzung
verfällt er nicht, wer abends plant, findet ihn morgens wieder. Ein leerer Entwurf
bedeutet die aktuellen Wochenziele, siehe `draftEntry()`. **Als Wochenziel
übernehmen** schreibt die Häufigkeiten in die Wochenziele und in die Historie, wie
der Knopf im Pläne-Reiter, und leert den Entwurf; die einzelnen Übungen bleiben
stehen, in den Wochenzielen haben sie keinen Platz. **Entwurf verwerfen** setzt
alles auf die Wochenziele zurück.

### Wochen getrennt planen

Seit 1.26.0 trennt ein Schalter im Kopf des Entwurfs die Wochen. Ist er an,
erscheint darunter ein Reiter je angezeigter Kalenderwoche, und Entwurf, einzelne
Übungen und Sätze je Muskelgruppe zeigen die gewählte Woche; ihre Überschriften
tragen die Kalenderwoche mit.

Im Speicher liegt der obere Stand (`plans`, `extras`) für die erste angezeigte
Woche, `weeks` hält je Montag die Abweichung einer späteren. Eine Woche ohne
eigenen Eintrag zeigt die erste mit; erst die erste Änderung legt ihre Abweichung
an, mit dem Stand, der bis dahin galt (`weekDraft()`, `weekDraftEdit()`). Beim
Laden fallen vergangene Wochen weg, und rutscht eine geplante Woche nach vorn,
zieht ihre Abweichung in den oberen Stand um, sonst wäre sie mit dem Wochenwechsel
verloren. Der Schalter aus nimmt die Unterschiede heraus, das sagt sein Titel.

**Als Wochenziel übernehmen** bezieht sich auf die angezeigte Woche und heißt dann
„KW 39 als Wochenziel“: die Wochenziele kennen nur einen Wert je Plan, also muss
eine Woche den Ausschlag geben. **Entwurf verwerfen** setzt alle Wochen zurück und
hebt die Trennung auf.

### Zuweisen

Das Raster zeigt die **nächsten zwei vollen Kalenderwochen** (`PLAN_WEEKS`),
Montag bis Sonntag. Eine Woche, in der schon ein Tag vergangen ist, lässt sich
nicht mehr ganz planen und zählt deshalb nicht mit; nur montags ist die laufende
noch voll. Die restlichen Tage der laufenden Woche lassen sich über die
Wochenübersicht im Trainingsreiter belegen. Bis 1.25.1 waren es die 14 Tage ab
heute, was je nach Wochentag über drei Kalenderwochen reichte, die letzte davon
mit einem einzigen Tag.

Ein Tag trägt höchstens einen Plan, gespeichert wird beim Antippen, wie bei jeder
Änderung an den Plänen. Die Auswahl unter der Woche zeigt die Pläne aus dem
Entwurf genau dieser Woche, und ein Tag aus einer anderen Woche schaltet die
Reiter oben mit um, damit beide dasselbe meinen. Das landet als `planDays` in den
Einstellungen und damit im Backup; beim Laden und beim Import fällt weg, was älter
als vier Wochen ist (`PLAN_DAYS_KEEP`). Im Wochenstreifen des Trainings steht ein
zugewiesener Tag als leerer Ring in der Planfarbe, bis der Plan dort als voll
absolviert gilt und der Ring zum Punkt wird. Eine Tabelle unter dem Raster stellt
je Kalenderwoche die zugewiesenen Tage der Häufigkeit aus dem Entwurf gegenüber,
bei getrennten Wochen also je Spalte gegen eine andere Zahl.

Seit 1.23.1 ist der zugewiesene Plan im Trainingsreiter schon gewählt, sobald der
Tag dort offen ist: beim Start ohne gemerkte Sitzung, bei jedem Datumswechsel und
beim Zuweisen für den gerade angezeigten Tag (`preselectPlan()`). Wechseln geht
wie immer über die Planauswahl, und wer den Plan abwählt, bekommt ihn nicht beim
nächsten Neuaufbau wieder vorgesetzt, erst beim nächsten Datumswechsel. Ein im
Training ausgeblendeter Plan wird nicht vorgewählt.

## Timer und Datum

Der Pausentimer startet nur für den heutigen Tag. Wer einen zurückliegenden Tag
nachträgt, will nicht dabei sitzen und warten, und ein Datum in der Zukunft ist
ohnehin eine Planung.

Das passierte bis 1.17.2 stillschweigend. Seit `restoreSession()` auch das
zuletzt betrachtete Datum zurückholt, kam man nach Mitternacht mit dem Datum von
gestern hoch und wunderte sich über einen Timer, der nach dem Speichern nicht
mehr angeht. Seit 1.17.3 steht der Grund als roter Hinweis über der Planliste und
im Fokus-Modus über der Übung, siehe `restOffNote()`.

## Neue Version ausrollen

`index.html` austauschen und in `sw.js` die Zeile `APP_VERSION` auf die neue
Nummer setzen. Dieselbe Nummer steht in `index.html`, sie wird dort angezeigt.
Der alte Cache wird beim Aktivieren verworfen. Die Trainingsdaten im
`localStorage` bleiben davon unberührt.

Vor dem Push, in dieser Reihenfolge:

```
tools/check-version.sh                        # beide Nummern gleich?
tools/lint.sh                                 # formale Fehler im JavaScript
NODE_PATH=$(npm root -g) node tools/test-pwa.js   # Offline, Update, Signal, Teilen
```

Jeder Schritt meldet Erfolg mit Rückgabewert 0, und der nächste lohnt sich erst,
wenn der vorige durch ist: eine abweichende Versionsnummer macht den Update-Test
sinnlos, ein Tippfehler im Skript den Browsertest. Was die drei im Einzelnen tun
und was sie brauchen, steht unter **Prüfen**. Die beiden ersten laufen in unter
einer Sekunde, der dritte braucht unter einer halben Minute.

Die neue Fassung wird im Hintergrund geladen und wartet dann. Die laufende App
zeigt oben **Ein Update ist vorhanden** mit einem Knopf; ohne einen Tipp darauf
übernimmt sie beim nächsten Start, sobald kein Fenster mehr offen ist.
Bewusst kein sofortiges Neuladen, damit nicht mitten im Satz die Seite wechselt.

Unter **Daten → App Version** steht, welche Fassung die App meldet und welche
der ServiceWorker tatsächlich ausliefert. Laufen beide auseinander, ist im Cache
etwas anderes als das, was die Versionsnummer behauptet.

### Name des Caches

Der Cache-Speicher gilt pro Origin, nicht pro Pfad. Auf `agentk42.github.io`
liegen alle Projekte auf derselben Adresse, eine zweite Fassung der App in einem
anderen Verzeichnis teilt sich den Speicher also mit dieser hier. Bis 1.16.0 hieß
der Cache schlicht `hantelkladde-<version>-<build>`, und beim Aktivieren wurde
alles gelöscht, was nicht genau so hieß. Jede Fassung riss damit den
Offline-Speicher jeder anderen mit, auch den fremder Projekte auf derselben
Adresse.

Seit 1.16.1 ist der Name der eigene Pfad (`SCOPE_ID` in `sw.js`), aus
`/HantelKladde-pwa/` wird `HantelKladde-pwa-<version>-<build>`, und aufgeräumt
wird nur, was mit genau diesem Präfix beginnt. Die beiden früheren Namensformen
werden einmalig mitgelöscht, sonst blieben sie auf bereits installierten Geräten
für immer liegen: `hantelkladde-<version>-<build>` von bis 1.16.0 und
`hantelkladde-<pfad>-<version>-<build>` aus der kurzlebigen 1.16.1, die den
Projektnamen noch doppelt trug.

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

`tools/lint.sh` lässt ESLint über das JavaScript laufen, mit den Grundregeln, die
formal gültigen Code melden, der trotzdem fast immer ein Versehen ist: ein
unbekannter Name, eine doppelte Deklaration, Code hinter einem `return`. Der
Browser meldet nichts davon. Das Skript der App steckt in `index.html`, ESLint
liest aber nur `.js`-Dateien; deshalb zieht das Skript den `<script>`-Block in
eine Hilfsdatei, mit so vielen Leerzeilen davor, dass die gemeldeten
Zeilennummern denen in `index.html` entsprechen. Die Regeln stehen in
`tools/eslint.config.js`. Braucht `npm i -g eslint`, sonst nichts.

Offline-Betrieb, Update-Weg, Zurück-Geste, Speicherzusage, Kurzbefehle und das
Entgegennehmen eines geteilten Backups lassen sich nicht durch Hinsehen prüfen.
`tools/test-pwa.js` fährt sie in Chromium durch. Das Skript startet den Server
selbst und braucht außer Playwright nichts. Es startet den vollen Browser
(`channel: "chromium"`), nicht die Headless-Shell: die kennt keine
Benachrichtigungen, dort steht `Notification.permission` fest auf `denied`.

```
npm i -g playwright && npx playwright install chromium
NODE_PATH=$(npm root -g) node tools/test-pwa.js
```

Es hebt dabei kurzfristig die Version in `sw.js` an, um den Update-Weg
auszulösen, und setzt die Datei danach wieder zurück.
