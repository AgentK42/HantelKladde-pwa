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

Die Einzelfelder der Einstellungen stehen seit 1.30.3 mit ihrer Regel in einer
Tabelle, `SETTING_FIELDS` in `index.html`, aus der drei Leser lesen: `load()`
beim Start übergeht ein kaputtes Feld still und behält den Ausgangswert, weil ein
Start nicht scheitern darf; `cleanSettings()` beim Import lehnt die Datei mit dem
Feldnamen ab, weil ein Backup scheitern darf; `mergeSettings()` übernimmt nur,
wo hier noch der Ausgangswert steht. Vorher stand die Liste in allen drei
ausgeschrieben, und beim Import fehlten zwei Felder: `notifySignal` und
`vibeLong` kamen aus einem Backup nicht mit. Ein neues Einstellungsfeld kommt
jetzt in die Tabelle und sonst nirgendwohin. Die Sammelfelder (Scheibensatz,
aufgeklappte Beschreibungen, Wochenziele, Historie, zugewiesene Tage) haben je
Leser eigene Regeln und bleiben dort.

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
| `tools/tests/` | Verhaltenstests in Chromium, je Thema eine Datei, siehe **Prüfen** |
| `.github/workflows/` | die Prüfkette als GitHub Action, läuft bei jedem Push |
| `CLAUDE.md` | Arbeitsregeln für Claude Code, wird zu Beginn jeder Sitzung gelesen |

## Aktionen

Jeder Tipp auf ein Element mit `data-act` landet im Klick-Verteiler am Ende von
`index.html`. Der schlägt die Aktion in der Tabelle `ACTIONS` nach, eine
Funktion je Aktion, und baut danach die Seite neu auf. Gibt die Funktion
`false` zurück, unterbleibt der Neuaufbau: entweder hat sie ihn schon selbst
erledigt (etwa nach einer Fehlermeldung), oder es gibt nichts neu aufzubauen
(Pausentimer, Update, Dateidialog).

Eine neue Aktion ist damit ein Eintrag `ACTIONS.name = function (v, el) { ... };`
mit `v` aus `data-v` und `el` als angetipptem Element. Bis 1.29.1 war der
Verteiler eine else-if-Kette mit 106 Zweigen in einer Funktion; weil `var` für
die ganze Funktion gilt, brauchte jeder Zweig Namen, die in keinem anderen
vorkamen. Eingaben beim Tippen laufen seit 1.30.5 nach demselben Muster über
`INPUT_ACTIONS`, mit einem Unterschied: dort baut der Verteiler nie von sich
aus neu auf, weil ein `render()` mitten im Tippen dem Feld den Fokus nähme. Die
beiden Suchfelder, die trotzdem neu aufbauen müssen, holen Fokus und
Schreibmarke danach selbst zurück (`searchInput()`). Auswahllisten und
Farbfelder laufen über den kleinen `change`-Verteiler darunter. Alle drei
Gruppen stehen in der Ausschlussliste am Anfang des Klick-Verteilers.

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

## Aufwärmsätze

Ein Aufwärmsatz trägt keinen RPE. Das Feld verschwindet, solange aufgewärmt
wird, im Trainingsreiter, im Fokus-Modus und beim Bearbeiten eines bereits
gespeicherten Aufwärmsatzes. Gespeichert wird `rpe: null`, auch wenn im Feld
noch ein Wert von vorher stand. Gezählt hat er ohnehin nie: Aufwärmsätze sind
über `isWork()` aus Volumen, effektiven Sätzen und Rekorden ausgenommen, die
Zahl stand nur in der Satzliste.

Beim Wechsel ins Aufwärmen merkt sich die App Gewicht, Reps und RPE des
Arbeitssatzes (`S.warmBase`, `S.warmReps`, `S.warmRpe`). `backToWork()` holt
alle drei zurück, nach jedem gespeicherten Rampensatz und beim Abbrechen über
*Doch ein Arbeitssatz*. Die drei Werte liegen auch im Sitzungszustand, ein
Neustart mitten in der Rampe verliert das Ziel also nicht.

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
Fassung. Seit 1.30.1 ist jeder Abschnitt eine eigene Funktion (`dataDisplay()`,
`dataStorage()`, ... `dataVersion()`), `viewData()` reiht sie nur noch auf.
Der Trainingsreiter ist genauso zerlegt: `tagHeader()`, `planChooser()`,
`heroBlock()` mit `editHero()`, `exerciseHero()` und `blankHero()`,
`planListBlock()`, `daySetsBlock()`. Der Fokus-Modus seit 1.30.2 ebenso:
`viewFocus()` setzt Kopf und Rahmen, `focusHero()` die Übungskarte,
`focusFoot()` den Fuß mit Speichern, und `focusRightButton()` entscheidet
allein, welcher Weg weiter rechts unten steht.

Der Block "Verlauf dieser Übung" (`exHistBlock()`, die letzten drei früheren
Einheiten mit ihren Arbeitssätzen) steht seit 1.30.6 in beiden Ansichten, im
Fokus ganz unten in der Karte, damit Gewicht und Reps oben stehen bleiben.
Aufgeklappt wird er je Übung gemerkt (`S.exHistFor`), nicht je Ansicht, also
gilt eine Entscheidung dort für beide. Abgeschaltet wird er dagegen getrennt:
`exHist` für den Trainingsreiter, `focusHist` für den Fokus. Im Fokus ist der
Platz knapper, und wer ihn dort weghaben will, will ihn im Trainingsreiter
meist behalten.

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

Streifen, Übersicht und das Zuweisen-Raster der Planung bauen ihre Zellen aus
derselben Funktion (`dayCell()`): gefüllter Punkt in der Planfarbe für einen
absolvierten Tag, leerer Ring für einen in der Planung zugewiesenen, matter Ring
für einen angefangenen. Wer die Zeichen einmal lernt, kennt sie in allen drei
Ansichten. Bis 1.29.0 hatte die Planung eine eigene Kopie der Funktion, der der
matte Ring fehlte.

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

## Volumen im Diagramm

Unter dem Gewichtsverlauf einer Übung steht ein zweites Diagramm: das
Tagesvolumen als Balken, auf derselben Zeitachse. Ein Trainingstag steht in
beiden Bildern an derselben Stelle, der Blick wandert nur senkrecht. Damit ist
zu sehen, was die Gewichtslinie allein verschweigt: Das Volumen fällt bei jeder
Gewichtssteigerung, weil die Reps wieder unten anfangen, und ein zusätzlicher
Satz bewegt die Linie oben überhaupt nicht.

Drei Entscheidungen dahinter:

- **Balken statt Linie.** Volumen ist eine Menge je Einheit. Eine Linie würde
  Werte an Tagen ohne Training behaupten.
- **Nullbasierte Achse.** Bei einer Menge verdoppelt ein abgeschnittener Sockel
  jeden Unterschied optisch. Die Gewichtslinie darf weiter zoomen, dort geht es
  um Abstände, nicht um Größen. Die Obergrenze kommt aus `niceTop()`, damit auch
  die Mittellinie einen runden Wert trägt.
- **Zwei Bilder statt Balken hinter der Linie.** Das bräuchte zwei y-Skalen in
  einem Diagramm. Die lassen sich gegeneinander beliebig verschieben, und jede
  Verschiebung zeigt einen anderen scheinbaren Zusammenhang.

Beschriftet werden nur der höchste und der letzte Balken; eine Zahl über jedem
Balken liest niemand, und bei engen Tagesabständen überlappen sie. Ist das
Volumen durchweg null, etwa bei Klimmzügen mit 0 kg, entfällt das Diagramm
ganz und der Gewichtsverlauf bleibt unverändert stehen.

## Mix der mitgelieferten Pläne

Die drei PPL-Pläne sind seit 1.30.7 als Woche abgestimmt: über Push, Pull und
Leg zusammen liegt jedes Gegenspielerpaar aus `MUSCLE_PAIRS` unter 15 Prozent
auseinander, gezählt wie `muscleTally()` zählt, also Primärmuskel voll und
Sekundärmuskel halb. Abgestimmt wird der Zyklus und nicht der einzelne Tag: an
einem Push Day steht der Brust nichts entgegen, genau dafür gibt es die
Aufteilung.

Drei Stellen gingen vorher auf. Der Rücken zählte aus Reverse Flys und Face
Pulls zwei halbe Sätze mehr als die Brust (8 zu 10). Der Trizeps bekam aus
jedem Drücken einen halben Satz dazu und stand mit zwei eigenen Übungen bei 8,
der Bizeps bei 6, weil es als Bizepsübung nur Preachercurls gibt; Hammercurls
zählen primär auf den Unterarm. Und der untere Rücken hatte im ganzen Zyklus
keinen Satz, während der Bauch zwei hatte. Dagegen stehen jetzt drei Sätze
Bankdrücken, je drei Sätze Preachercurls und Hammercurls, drei Sätze Romanian
Deadlifts und Beincurls gegen Squats, Beinpresse und Beinstrecker, und der
Lower Back Crunch am Beintag. Es bleibt bei 9 zu 10, 7,5 zu 8,5 und sonst
gleich, also höchstens 11,8 Prozent.

Die Satzzahlen stehen in `DEFAULT_PLANS` deshalb als Zahl und nicht als
`DEFAULT_SETS`: sie tragen das Verhältnis, ein geänderter Ausgangswert für neue
Übungen würde es verschieben. Die Suite `plan-mix` prüft die Grenze, wer an den
Plänen etwas ändert, lässt sie laufen. Upper Body und Leg Day (UL) sind bewusst
nicht mit abgestimmt, die beiden sind kein geschlossener Zyklus.

Geändert werden damit nur neu eingerichtete Geräte. `DEFAULT_PLANS` sät jeden
Plan einmal, gemerkt in `S.meta.seeded`; ein Plan, der schon auf dem Gerät
steht, bleibt wie er ist.

## Plan duplizieren

Das dritte Symbol in der Kopfzeile einer Plankarte legt eine Kopie an, als
Vorlage für eine Variante. Mit kommen alle Übungen samt Sätzen, Reps und
Zielgewichten. Nicht mit kommen Wochenziel, Sichtbarkeit und Sperre: ein
mitkopiertes Wochenziel würde das Wochenpensum stillschweigend verdoppeln.

Der Name ist `<Original> Kopie`, bei Bedarf durchnummeriert. Die Kopie landet
am Ende der Liste, nicht hinter dem Original. Grund ist `planColor()`: ohne
eigene Farbe bestimmt der Platz in der Reihenfolge die Farbe, ein Einschub in
der Mitte färbte alle Pläne dahinter um. Zusätzlich bekommt die Kopie die erste
Palettenfarbe, die noch kein Plan trägt, damit sie im Wochenstreifen
unterscheidbar bleibt.

Bei eingeklappten Karten fehlt der Knopf. Dort steht neben dem Namen schon die
Übungszahl, und ein drittes Symbol schnitt „Push Day“ auf „Push ...“ ab.

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
tools/test-app.sh                             # Verhalten: Pause, Planung, Rekorde, ...
```

Jeder Schritt meldet Erfolg mit Rückgabewert 0, und der nächste lohnt sich erst,
wenn der vorige durch ist: eine abweichende Versionsnummer macht den Update-Test
sinnlos, ein Tippfehler im Skript den Browsertest. Was die vier im Einzelnen tun
und was sie brauchen, steht unter **Prüfen**. Die beiden ersten laufen in unter
einer Sekunde, der dritte braucht unter einer halben Minute, der vierte rund
eine Minute.

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

Seit 1.30.0 warnt ESLint zusätzlich vor Strukturwuchs: bei einer zyklomatischen
Komplexität über 40 und bei Funktionen über 150 Zeilen. Beides sind Warnungen,
die Kette bleibt grün, aber die Funktionen stehen bei jedem Lauf im Terminal.
Anlass war der Klick-Verteiler, der in rund 40 Sitzungen um je ein `else if` auf
843 Zeilen und eine Komplexität von 334 gewachsen war, weil nichts den nächsten
Zweig teurer machte als den vorigen. Die Schwellen liegen knapp über dem heutigen
Bestand und sollen mit ihm sinken, nicht steigen.

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

Das Verhalten der App selbst, also das, was man sieht und tippt, prüfen die
Suiten unter `tools/tests/`, je Thema eine Datei und nach den Abschnitten dieser
README benannt: `pause`, `aufwaermen`, `rekorde`, `planung`, `wochen-trennen`,
`wochenstreifen`, `vorwahl`, `plan-kopie`, `volumen`, `einstellungen`,
`eingaben`, `farbschema`, `uebungsverlauf`, `plan-mix`. Jede Suite fährt in Chromium einen Ablauf gegen die
echte `index.html` und prüft Zustand, Speicher und Oberfläche: dass ein
Aufwärmsatz ohne RPE gespeichert wird, dass ein Import eine Pause von 100 s im
Auswahlfeld zeigt, dass die Suche nach dem Neuaufbau den Fokus behält. Die
Prüfungen beschreiben das Verhalten, nicht den Aufbau des Codes, damit ein
Umbau sie nicht bricht, solange die App sich gleich verhält.

```
tools/test-app.sh                    # alle Suiten
tools/test-app.sh pause aufwaermen   # nur die genannten
```

Das Skript startet jede Suite in einem eigenen Browser, damit kein Zustand von
einer in die nächste läuft, und setzt `NODE_PATH` selbst. Eine grüne Suite ist
eine Zeile mit der Zahl ihrer Prüfungen, eine rote bringt ihre ganze Ausgabe
mit. Den gemeinsamen Rahmen (Server, Browser, `check`, Bilanz) stellt
`tools/tests/lib.js`, die Suiten selbst bestehen nur aus dem Ablauf. Sie
entstanden in den Sitzungen, in denen das jeweilige Verhalten gebaut wurde, und
lagen bis 1.30.5 außerhalb des Repos, im Arbeitsverzeichnis der Sitzung. Eine
Prüfung, die nur eine Sitzung ausführen kann, ist keine; deshalb gehören sie
seitdem dazu.

Dieselbe Kette läuft nach jedem Push auch auf GitHub, als Workflow
**Prüfkette** in `.github/workflows/pruefkette.yml`: ein Ubuntu-Runner mit
Node, ESLint und Playwright, dann die vier Schritte in derselben Reihenfolge
wie oben, jeder als eigener Schritt, damit im Lauf steht, welcher gekippt ist.
Die lokale Kette bleibt der erste Weg, weil sie in einer Minute Bescheid gibt;
der Workflow ist die Sicherung dafür, dass sie nicht vergessen wird, und
prüft auf einem Rechner, der nichts von der Sitzung weiß, in der geändert
wurde. Ein Lauf braucht unter zwei Minuten: die Hälfte davon sind die
Verhaltenstests, eine halbe Minute das Laden von Chromium. Der Stand steht unter
[Actions](https://github.com/AgentK42/HantelKladde-pwa/actions/workflows/pruefkette.yml).
