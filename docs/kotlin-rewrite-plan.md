# Rewrite nach Kotlin: Arbeitsplan

Referenzfassung der PWA: **1.35.0**.

## Warum überhaupt

Zwei Anforderungen lassen sich im Browser nicht lösen.

**Der Pausentimer fällt in rund 59 Prozent der Fälle aus.** `tickRest()` läuft als
`setInterval` und ruft `showNotification()` erst, wenn der Tick den Ablauf
bemerkt. Friert Android den Renderer ein, tickt nichts mehr. Die Notification
Triggers API, die das gelöst hätte, hat Chrome 2023 entfernt. Die Lösung heißt
in jedem Fall: den Countdown in einem Prozess führen, den das System am Leben
lässt.

**Health Connect** ist ohne native Brücke nicht erreichbar.

Alles andere an der PWA funktioniert. Dieser Plan ist deshalb kein Aufräumen,
sondern das Auswechseln des Unterbaus unter einer Anwendung, die im Betrieb ist.

## Leitgedanke

### Die vorhandenen Suiten sind die Spezifikation

Unter `tools/tests/` liegen 17 Themen mit zusammen **401 Prüfungen**, und zwar
bewusst als Verhalten formuliert, nicht als Implementierung (`CLAUDE.md`: "was
sich verhält, bekommt einen Test, der das Verhalten beschreibt"). Das ist die
wertvollste Vorarbeit für einen Port, die es gibt: **jedes Arbeitspaket der
Oberfläche bekommt seine Abnahmekriterien aus einer benannten Suite.**

Die Zahlen stammen aus einem Lauf von `tools/test-app.sh`, nicht aus einer
Schätzung:

| Suite | Prüfungen | | Suite | Prüfungen |
|---|---|---|---|---|
| pause | 45 | | eingaben | 20 |
| planung | 45 | | vorwahl | 17 |
| wochenstreifen | 41 | | volumen | 17 |
| wochen-trennen | 39 | | gewichtsrad | 17 |
| progression | 35 | | rekorde | 13 |
| aufwaermen | 22 | | stile | 12 |
| einstellungen | 22 | | plan-editor | 7 |
| uebungsverlauf | 22 | | farbschema | 7 |
| plan-kopie | 20 | | | |

Dazu prüft `tools/test-pwa.js` die App-Schicht: ServiceWorker, Offline, Update,
Zurück-Geste, Speicherzusage, Shortcuts, geteiltes Backup.

### Der Korpus deckt ab, was die Suiten nicht erreichen

Die Suiten fahren Chromium gegen die echte `index.html`. Sie sind damit an den
Browser gebunden und laufen nicht gegen Kotlin. Und 35 Prüfungen für die
Progression decken den Zustandsraum von `suggestFor()` nicht ab:
Rep-zuerst-Regel an und aus, Range vorhanden und nicht, Senkung nach zwei
verfehlten Einheiten, RPE-Filter, abgebrochene Einheiten, Deload unter Planziel,
Schrittweiten aller Katalogübungen. Das sind Tausende Kombinationen.

Deshalb ein Referenzkorpus: die bestehende JS-Logik wird kopflos ausgeführt und
erzeugt Ein- und Ausgabepaare, die der Kotlin-Port exakt reproduzieren muss. Der
Rahmen dafür ist schon geschrieben. `tools/tests/progression.js` enthält in
`window.seed()` genau das Muster, das der Generator braucht: Historie aufbauen,
`suggestFor()` rufen, Ergebnisobjekt zurückgeben.

### Gates vor der Fachlogik

Die Prüfkette dieses Repos ist das Vorbild: vier Schritte, je ein eigener Schritt
im Workflow, nach jedem Push. Das Kotlin-Projekt bekommt dieselbe Form, nicht
eine neue Philosophie. Insbesondere die **Ratsche** aus `CLAUDE.md` wird
übernommen: Schwellen liegen knapp über dem, was heute durchgeht, und wer eine
Funktion verkleinert, zieht die Schwelle nach unten. Hochsetzen, damit eine
Warnung verschwindet, entwertet die Regel.

## Wo gearbeitet wird

**Alles wird lokal auf dem Entwicklungsrechner gebaut.** Ab WP 0.1 braucht jeder
Schritt Android Studio und Gradle, und der Meilenstein aus Phase 1 braucht ein
angeschlossenes Telefon. Es gibt in diesem Plan keinen Arbeitsschritt, der
sinnvoll woanders läuft.

Was der Rechner mitbringen muss:

| | |
|---|---|
| Android Studio | aktuelle stabile Fassung, bringt SDK, Platform-Tools und Emulator mit |
| JDK 17 | Android Studio liefert ein passendes JBR mit, ein eigenes JDK geht auch |
| Android SDK Platform | die Ziel-API des Projekts, plus Build-Tools |
| `adb` | für Gerätebetrieb, Doze-Tests und das Messprotokoll |
| Node 20 oder neuer | nur für Phase 2, der Korpus läuft ohne SDK |
| Git | Klon dieses Repos, der Android-Teil liegt unter `android/` |
| Ein Android-Telefon per USB | für Phase 1 nicht ersetzbar, siehe unten |

Der Emulator reicht für den Meilenstein aus Phase 1 **nicht**. Gemessen wird, ob
Android den Prozess unter echten Bedingungen wegräumt, und genau das tut ein
Emulator nicht wie ein Telefon: Doze, Akkuoptimierung und die Eigenheiten von
Xiaomi, Samsung oder Huawei sind dort nicht abgebildet. Der Emulator taugt für
die Oberfläche in Phase 5, nicht für die Frage, die den Rewrite auslöst.

Phase 2 ist die einzige Ausnahme von der SDK-Pflicht: der Referenzkorpus läuft in
Node gegen die PWA und braucht weder Android Studio noch Gradle. Er kann deshalb
beginnen, bevor die Einrichtung fertig ist.

Am Telefon selbst hängen: der Doze-Test aus WP 1.2, das Messprotokoll aus WP 1.4,
der Seite-an-Seite-Vergleich gegen die PWA in Phase 5 und die Signatur in WP 7.1.
Alles andere läuft am Rechner, Emulator eingeschlossen.

## Querschnittsregeln, gültig ab WP 0.4

- Ein Paket ist ein Branch. Länger als zwei Tage offen heißt: zu groß
  geschnitten.
- **Vor jedem Push läuft die Prüfkette lokal durch**, wie im PWA-Teil dieses
  Repos: `ktlintCheck`, `detekt`, `lint` (mit `warningsAsErrors`), `test`,
  `koverVerify`, `verifyRoborazziDebug`. Ein Skript, ein Befehl, je Schritt eine
  Zeile Ausgabe, siehe WP 0.4.
- Was die Kette rot macht, wird behoben, bevor gepusht wird. Nicht danach.
- Neuer Code in `:core:domain` ohne Test senkt die Abdeckung und bricht
  `koverVerify`. Das Gate erzwingt, was sonst Disziplin wäre.
- Umbau und Feature sind getrennte Commits, wie im PWA-Repo.
- Detekt-Schwellen für Komplexität und Funktionslänge sind eine Ratsche.
- Kommentare auf Deutsch, sie erklären das Warum. Keine Emojis, keine
  Gedankenstriche, keine Symbolzeichen.
- **Die PWA bleibt während des gesamten Rewrites in Betrieb und ist die
  Referenz**, bis Parität nachgewiesen ist.

## Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache | Kotlin, JDK 17 | |
| UI | Jetpack Compose, Material 3 | |
| Persistenz | Room mit exportiertem Schema | Migrationstests ab Tag eins |
| Timer | Foreground Service | siehe Phase 1 |
| DI | manuell (Konstruktor-Injektion) | eine Person, eine App |
| Tests JVM | JUnit 5, Kotest Property, Turbine | |
| Tests UI | Robolectric plus Roborazzi | Screenshot-Gates ohne Emulator |
| Abdeckung | Kover, 85 Prozent in `:core:domain` | |
| Statik | ktlint, detekt, Android Lint | |

Modulschnitt:

```
:core:model     reine Datentypen, keine Android-Abhaengigkeit
:core:domain    Progression, Verlauf, Planung, Backup. Reines Kotlin
:core:data      Room, Repositories
:core:designsystem
:feature:training  :feature:plans  :feature:planning
:feature:history   :feature:data
:app
```

`:core:domain` darf nicht von Android abhängen. Nur so läuft der riskanteste Code
ohne Emulator in Sekunden.

---

## Phase 0: Fundament und Qualitätsnetz

Summe 3,5 Tage, dazu ein optionales halbes. Vor der ersten Zeile Fachlogik.

### WP 0.1 Rechner einrichten und Projektskelett (1 Tag)
Android Studio, SDK und JDK nach der Liste unter "Wo gearbeitet wird", dazu der
Klon dieses Repos. Dann Verzeichnis `android/` im Repo, Gradle mit Version
Catalog, der Modulschnitt oben, alle Module leer.

Der Gradle Wrapper wird mit eingecheckt, damit die Gradle-Fassung am Projekt
hängt und nicht am Rechner.
**Gate:** `./gradlew assembleDebug` erzeugt eine startbare, leere App, und sie
startet per `adb install` auf dem Telefon. Das prüft die Werkzeugkette einmal
vollständig durch, bevor Fachlogik darauf gebaut wird.

### WP 0.2 Statische Analyse (0,5 Tage)
ktlint, detekt, Android Lint mit `warningsAsErrors`. Schwellen als Ratsche.
**Gate:** Ein absichtlich eingebauter Verstoß bricht den Build. Einmal
gegenprüfen, dann zurücknehmen.

### WP 0.3 Testinfrastruktur (1 Tag)
JUnit 5, Kotest, Turbine, Robolectric, Roborazzi. Je Ebene ein Dummy-Test, damit
das Gerüst belegt ist und nicht erst beim ersten echten Test auffällt.
**Gate:** `./gradlew test` grün, Screenshot-Referenz wird erzeugt und verglichen.

### WP 0.4 Prüfkette als lokales Skript (0,5 Tage)
`android/pruefkette.sh`, Vorbild ist `tools/test-app.sh` im PWA-Teil: ein Befehl,
je Schritt eine Zeile, die Ausgabe eines Schritts erscheint nur, wenn er nicht
grün ist. Rückgabewert 0 nur, wenn alles durchläuft.

Ein einzelner Schritt muss sich einzeln aufrufen lassen, `pruefkette.sh test`
etwa, sonst wird unterwegs nicht geprüft, sondern erst am Ende.
**Gate:** Ein absichtlich eingebauter Verstoß macht die Kette rot und nennt den
Schritt, der gekippt ist.

### WP 0.5 Abdeckungsschwelle (0,5 Tage)
Kover, 85 Prozent für `:core:domain`, keine Schwelle für UI-Module.
**Gate:** `koverVerify` bricht bei Unterschreitung.

### WP 0.6 Prüfkette auch auf GitHub (0,5 Tage, empfohlen, nicht eingerechnet)
Nicht nötig für die Arbeit, aber dieselbe Überlegung wie im PWA-Teil. Dort steht
im Kopf von `pruefkette.yml`: "Warum überhaupt, wenn die Kette lokal in einer
Minute durch ist: weil nichts sonst sicherstellt, dass sie vor dem Push auch
gelaufen ist, und weil der Runner nichts von der Sitzung weiß, in der geändert
wurde." Das gilt hier genauso. Die GitHub-Runner bringen das Android SDK mit,
der Workflow ist eine YAML-Datei und kostet danach nichts.

**Ein Vorbehalt, falls doch:** Roborazzi vergleicht gerenderte Bilder, und
Schriftrasterung unterscheidet sich zwischen deinem Rechner und einem
Linux-Runner. Entweder werden die Referenzbilder auf derselben Plattform erzeugt,
auf der CI sie prüft, oder `verifyRoborazziDebug` bleibt der lokalen Kette
vorbehalten und CI fährt die übrigen Schritte. Das Zweite ist der kleinere
Aufwand.

Dieses Paket steht bewusst außerhalb der Summe. Wer lokal baut und die Kette vor
jedem Push fährt, kommt ohne aus.

---

## Phase 1: Timer und Messung

Summe 5 Tage, plus 1 bedingter Tag.

**Diese Phase steht bewusst ganz vorn, direkt hinter dem Fundament.** Sie ist der
Grund für den ganzen Umbau, und sie braucht fast nichts von dem, was danach
kommt: kein Room, keinen Domänenkern, keine Oberfläche. Nach achteinhalb
Arbeitstagen, also gut anderthalb Wochen, steht eine App, die nur eine Pause
starten kann, und damit lässt sich messen, ob das Problem gelöst ist. Erst danach
werden die restlichen 53 Tage investiert.

### Foreground Service, nicht AlarmManager

**AlarmManager ist für Ereignisse gedacht, die feuern sollen, wenn die App gar
nicht läuft.** Eine Satzpause läuft in einer vom Nutzer gerade gestarteten
Sitzung. Genau dafür sieht Android Foreground Services vor. Ein Foreground
Service hält den Prozess am Leben, wird von Doze nicht eingefroren, und der
Countdown läuft im Service statt im eingefrorenen Renderer. Damit ist die Ursache
der 59 Prozent direkt adressiert, ohne Sonderberechtigung.

Die beiden Alarm-Berechtigungen scheiden als Hauptweg aus. Die Play-Richtlinie
"Permissions and APIs that Access Sensitive Information" zählt die zulässigen
Fälle für `USE_EXACT_ALARM` abschließend auf: die App **ist** eine Wecker- oder
Timer-App, oder eine Kalender-App mit Terminbenachrichtigungen. Maßgeblich ist
die Kernfunktionalität, ausgelegt als Hauptzweck, prominent beworben, ohne den
die App unbrauchbar wäre. Eine Trainings-App mit Übungsdatenbank, Plänen und
Verlauf fällt darunter nicht, auch wenn der Pausentimer sichtbar ist.
`USE_EXACT_ALARM` ist eine restricted permission; wer die Kriterien nicht
erfüllt, wird von der Veröffentlichung ausgeschlossen.

| Ansatz | Genehmigung | Play-Risiko | Eignung hier |
|---|---|---|---|
| `USE_EXACT_ALARM` | automatisch bei Installation | hoch, Ausschluss im Review | nur als beworbene Timer-App |
| `SCHEDULE_EXACT_ALARM` | Special App Access, ab Android 14 bei Neuinstallation verweigert | gering | funktioniert, aber Opt-in-Hürde beim Nutzer |
| **Foreground Service** (`shortService`) | keine Sonderberechtigung, keine Deklaration | keins | **der vorgesehene Weg für eine laufende Sitzung** |
| WorkManager, inexakte Alarme | keine | keins | ungeeignet, Toleranz zu groß |

### Der Service-Typ ist `shortService`, weil die Pause gedeckelt ist

Apps ab Ziel-API 34 müssen einen `foregroundServiceType` deklarieren.
`FOREGROUND_SERVICE_TYPE_SHORT_SERVICE` braucht weder Deklaration noch
Play-Review, hat aber eine harte Grenze von drei Minuten.
`FOREGROUND_SERVICE_TYPE_SPECIAL_USE` kennt die Grenze nicht, verlangt dafür eine
Deklaration in der Play Console samt Review.

Die PWA deckelt seit **1.35.0** jede Pause bei 150 Sekunden (`REST_MAX`). Das
Auswahlfeld endet bei 120, der Regler unter Daten bleibt bei 150 stehen, und der
Plus-Knopf während der laufenden Pause verlängert bis dorthin und nicht weiter.
Gedeckelt wird in `exRest()` und `addRest()`, also dort, wo eine Pausenlänge
entsteht. Begründung und Literatur stehen in der README unter "Pausenlänge,
Obergrenze".

Damit bleiben 30 Sekunden Luft unter der Drei-Minuten-Grenze, `shortService`
genügt, und es bleibt **keine Berechtigungsfrage offen**. Der Deckel gehört in
der Kotlin-Fassung in die Timer-Domäne aus WP 1.1, nicht in den Service: er ist
eine fachliche Regel, keine Eigenheit von Android.

Ein Backup oder ein älterer Speicherstand darf weiterhin bis 600 Sekunden je
Übung tragen, `cleanExmeta()` lehnt das nicht ab. Der Wert wird gelesen und erst
bei der Verwendung begrenzt. Der Kotlin-Parser muss das genauso halten, sonst
scheitert WP 4.4 an einem echten Backup.

### WP 1.1 Timer-Domäne (1 Tag)
Zustandsautomat: gestartet, verlängert, abgebrochen, abgelaufen,
wiederhergestellt nach Prozessende. Dazu die Pause je Übung (`exRest`), die kurze
Pause nach dem Aufwärmen (`warmRest`, nie länger als die der Übung) und der
Deckel `REST_MAX`.

Das ist der einzige Teil des Domänenkerns, der hier vorgezogen wird, und er ist
klein: die Pause einer Übung, sonst die aus den Einstellungen, gedeckelt, und für
den Aufwärmsatz das Minimum aus 60 Sekunden und beidem. Phase 3 nimmt ihn später
in den vollständigen Kern auf und prüft ihn dort gegen den Korpus.
**Gate:** Unit-Tests mit virtueller Zeit über `TestCoroutineScheduler`,
einschließlich Property-Test: keine Folge von Verlängerungen führt über 150.

### WP 1.2 Foreground Service mit Countdown (2 Tage)
Pausenstart startet den Service, die Benachrichtigung trägt den laufenden
Countdown über `setUsesChronometer(true)` mit `setChronometerCountDown(true)`.
Abbruch ist `stopSelf()`, Verlängerung setzt die Restzeit neu.

Enthält den Sperrbildschirm: die PWA legt die laufende Pause seit 1.31 dorthin,
nativ wird daraus ein echter Countdown statt einer stehenden Zahl.

**Gate:** Instrumentierter Test mit vorgestellter Uhr, dazu
`adb shell dumpsys deviceidle force-idle`. Dazu der Randfall: eine Pause von
150 Sekunden läuft vollständig durch, ohne dass `onTimeout()` greift.

### WP 1.3 Messgerüst (1 Tag)
Ein nackter Bildschirm mit Übungsauswahl und Startknopf, dazu ein Protokoll, das
jede Pause mit Soll- und Ist-Zeitpunkt des Signals mitschreibt. Muss vor WP 1.4
stehen, denn dessen Abnahme hängt daran. Wird in Phase 5 durch die echte
Oberfläche ersetzt.
**Gate:** Das Protokoll lässt sich als CSV ausleiten.

### WP 1.4 Berechtigungen und Herstellerfallen (1 Tag)
`POST_NOTIFICATIONS` ab Android 13, Akkuoptimierung, Xiaomi, Samsung, Huawei.
**Gate:** Protokoll über mindestens 50 Pausen auf dem eigenen Gerät, aufgenommen
mit dem Gerüst aus WP 1.3.

### Meilenstein: die Messung

Die App läuft parallel zur PWA auf demselben Gerät. **Hier wird gemessen, ob aus
59 Prozent Ausfall nahe null wird, bevor die restlichen 53 Tage investiert
sind.**

Das ist die wichtigste Stelle des ganzen Plans. Fällt die Messung gut aus, ist
die Anforderung erfüllt und alles Weitere ist eine Frage des Komforts. Fällt sie
schlecht aus, ist der Rest gegenstandslos, und das nach anderthalb statt nach
dreizehn Wochen.

### WP 1.5 Exakter Alarm als Rückfallebene (1 Tag, nur bei Bedarf)

**Nur bauen, wenn die Messung Lücken zeigt.** Der Fall, den ein Foreground
Service nicht abdeckt, ist das Wegwischen der App aus den zuletzt verwendeten.
Das ist eine bewusste Nutzerhandlung und etwas anderes als ein still
eingefrorener Hintergrundtab, also möglicherweise hinnehmbar. Die Messung
entscheidet das, nicht die Vermutung.

Falls doch nötig: `SCHEDULE_EXACT_ALARM` mit Prüfung über
`canScheduleExactAlarms()`, In-App-Erklärung, Deeplink nach
`ACTION_REQUEST_SCHEDULE_EXACT_ALARM` und Listener auf
`ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED`. Bei verweigerter
Berechtigung bleibt es bei der Service-Variante, ohne Funktionsverlust im
Normalfall.

---

## Phase 2: Referenzkorpus aus der PWA

Summe 7 Tage. Passiert noch in JavaScript.

### WP 2.1 Harness (0,5 Tage)
`tools/extract-logic.js`, aufbauend auf dem `window.seed()`-Muster aus
`tools/tests/progression.js`. Läuft kopflos in Node statt in Chromium.
**Gate:** `suggestFor()` liefert ohne Browser dasselbe wie in der Suite.

### WP 2.2 Korpus Progression (2 Tage)
Voller Zustandsraum: `suggestWithinRange()`, Senkung nach zwei verfehlten
Einheiten am selben Gewicht, RPE-Filter (bis 7 keine Senkung, ab 8 ausbelastet),
Reihe nur am selben Gewicht, Range vorhanden und nicht, abgebrochene Einheiten,
Deload unter Planziel, alle Katalogschrittweiten. Auch die Textfelder `hint` und
`why`, denn die Suite prüft sie und der Nutzer liest sie.
**Gate:** `c8` weist für `suggestFor`, `suggestWithinRange`, `repFirstOn`,
`repRange`, `mainWorkBlock`, `blockHits` volle Zweigabdeckung nach.

### WP 2.3 Korpus Backup und Merge (1 Tag)
`mergeBackup()`, dazu die Reparaturpfade für beschädigten Speicher. Die
`untouched`-Regel für Pläne, unbekannte Kategorien, abgeschnittenes JSON.
**Gate:** Zweigabdeckung.

### WP 2.4 Korpus Verlauf (1 Tag)
Volumen nach Satz und Gewicht, Rekorde inklusive der Regel "ein Rekord braucht
einen Vorher-Wert", e1RM, Wochenziele.
**Gate:** Zweigabdeckung.

### WP 2.5 Korpus Muskelgruppen und Entwurf (1,5 Tage)
`muscleOf()` mit `MUSCLE_ALIAS` (Schulter auf Schulter vorn), `muscleTally()`,
`muscleBars()`, `DRAFT_PAIR_RATIO`, `draftSources()`, `weekDraft()` und die
Wochentrennung.
**Gate:** Zweigabdeckung.

### WP 2.6 Korpus Wochenstreifen und Zuweisung (1 Tag)
`weekStrip()`, `weekTally()`, `dayCell()`, `planDays` mit `PLAN_DAYS_KEEP` und
`PLAN_WEEKS`.
**Gate:** Zweigabdeckung.

### Die Fassung, gegen die der Korpus erzeugt wurde, steht im Korpus

Die Fixtures landen unter `android/core/domain/src/test/resources/` und tragen
die `APP_VERSION`, aus der sie erzeugt wurden, im Kopf. Ändert sich danach in der
PWA etwas an einem der abgedeckten Bereiche, wird der Korpus neu erzeugt und die
betroffenen Pakete aus Phase 3 laufen erneut. Das ist kein Sonderfall, sondern
der normale Weg: der Korpus ist eine Ableitung der PWA, keine eigene Wahrheit.

Praktisch heißt das: Änderungen an Progression, Verlauf, Planung oder Backup
gehören während Phase 3 in einen Rutsch und nicht einzeln, sonst wird häufiger
neu erzeugt als gebaut.

---

## Phase 3: Domänenkern in Kotlin

Summe 13 Tage. Reines Kotlin, keine UI, keine Datenbank.

| WP | Inhalt | Gate | Tage |
|---|---|---|---|
| 3.1 | Datentypen, Gewicht als eigener Typ mit Einheit | Korpus lädt vollständig | 0,5 |
| 3.2 | Gewichtsarithmetik, Scheiben, `stepOf`, Komma-Parsing | Property-Test: nie unter Stangengewicht, immer darstellbar | 1 |
| 3.3 | Satzblöcke, `isWork()`, Aufwärmsätze zählen nirgends | Teilkorpus 2.2 | 1 |
| 3.4 | Rep-zuerst-Regel, Schwelle und Range | Teilkorpus, inklusive der dokumentierten Grenzfälle | 0,5 |
| 3.5 | `suggestWithinRange`, Rückkehr in die Range, Senkung | Teilkorpus, `hint` und `why` zeichengenau | 1,5 |
| 3.6 | `suggestFor` komplett | **Voller Progressionskorpus, jede Abweichung ist ein Fehlschlag** | 1,5 |
| 3.7 | Muskelgruppen inklusive Alias-Übersetzung | Korpus 2.5 | 1 |
| 3.8 | Verlauf, Volumen, Rekorde, e1RM | Korpus 2.4 | 1,5 |
| 3.9 | Planung: Entwurf, Wochenziele, Wochentrennung | Korpus 2.5 | 2 |
| 3.10 | Wochenstreifen und Zuweisung | Korpus 2.6 | 1 |
| 3.11 | Backup-Parser und Merge, Pausenwerte bis 600 lesen ohne zu deckeln | Korpus 2.3, plus Fuzzing ohne Absturz | 1,5 |

WP 3.6 ist der Beweis, dass der Rewrite tragfähig ist. Nach Phase 3 existiert
noch keine App, aber der teuerste Teil des Risikos ist abgetragen.

---

## Phase 4: Persistenz

Summe 5 Tage.

### WP 4.1 Room-Schema (1 Tag)
**Gate:** Schema exportiert und eingecheckt, Migrationstest-Gerüst ab Version 1
aktiv.

### WP 4.2 Repository mit Flow-API (1 Tag)
**Gate:** Robolectric gegen In-Memory-Datenbank, Flows mit Turbine.

### WP 4.3 Sitzungszustand getrennt halten (0,5 Tage)
`CLAUDE.md` verlangt: Pause, Sitzung und Entwurf liegen unter eigenen Schlüsseln
(`kraftlog:rest`, `kraftlog:session`, `kraftlog:entwurf`), nicht in den
Einstellungen, und gehören nicht ins Backup. Diese Trennung wandert mit.
**Gate:** Ein Export enthält keinen Sitzungszustand. Test, nicht Konvention.

### WP 4.4 Import eines echten PWA-Backups (1,5 Tage)
**Gate:** Der Abnahmetest für den Umstieg. Ein Backup aus der laufenden PWA wird
importiert, danach liefern die Kotlin-Rechnungen für dieselben Daten dieselben
Zahlen. Abweichung gleich null.

### WP 4.5 Export und Round-Trip (1 Tag)
**Gate:** Export, Import, Export ist stabil, und **die PWA kann den Export wieder
einlesen**. Damit bleibt der Rückweg offen.

---

## Phase 5: Oberfläche

Summe 22,5 Tage. Ein Thema je Paket. Jedes Paket bringt einen Compose-UI-Test für
die Interaktion und einen Roborazzi-Screenshot-Test für die Darstellung mit,
beide im JVM-Lauf.

| WP | Inhalt | Abnahme gegen Suite | Tage |
|---|---|---|---|
| 5.1 | Designsystem, Theme, hell und dunkel | `farbschema`, `stile` | 1,5 |
| 5.2 | Navigation, fünf Reiter, Zurück-Verhalten | `test-pwa.js` | 1 |
| 5.3 | Training, Satzeingabe, Gewichtsrad | `eingaben`, `gewichtsrad` | 2,5 |
| 5.4 | Übungsauswahl, Vorwahl, Muskelgruppen | `vorwahl` | 1,5 |
| 5.5 | Fokus-Modus | Teil von `aufwaermen` | 1,5 |
| 5.6 | Übungsverlauf, aufklappbar, auch im Fokus | `uebungsverlauf` | 1 |
| 5.7 | Aufwärmsätze, Pause je Übung | `aufwaermen`, `pause` | 1,5 |
| 5.8 | Pläne, Editor, Duplizieren | `plan-editor`, `plan-kopie` | 2 |
| 5.9 | Planung: Entwurf, Wochentrennung | `planung`, `wochen-trennen` | 2,5 |
| 5.10 | Planung: Zuweisen, Wochenübersicht | `planung` | 1,5 |
| 5.11 | Wochenstreifen | `wochenstreifen` | 1 |
| 5.12 | Verlauf, Diagramme, Volumen, Rekorde | `volumen`, `rekorde` | 2,5 |
| 5.13 | Daten, Backup, Einstellungen | `einstellungen` | 2 |
| 5.14 | Share-Target als Intent-Filter | `test-pwa.js` | 0,5 |

**Gate je Paket:** UI-Test grün, Screenshot bestätigt, und der Reiter zeigt für
den importierten Echtdatensatz aus WP 4.4 dieselben Zahlen wie die PWA. Die
Prüfungen der genannten Suite werden als Compose-Tests nachgebaut, eine Prüfung
je Prüfung. Die Suite ist damit nicht nur Vorbild, sondern Checkliste.

---

## Phase 6: Health Connect

Summe 3,5 Tage plus Wartezeit.

- **WP 6.1** Anbindung, Berechtigungen, Rationale-Activity, Datenschutzerklärung
  als Intent-Filter (1,5 Tage)
- **WP 6.2** `ExerciseSessionRecord` schreiben (1,5 Tage). **Gate:**
  instrumentierter Test gegen die Health-Connect-Testfassung
- **WP 6.3** Play-Console-Deklaration einreichen (0,5 Tage Arbeit, Tage bis Wochen
  Wartezeit). **Spätestens zu Beginn von Phase 5 anstoßen**, sonst wartet der
  fertige Code auf die Freigabe

---

## Phase 7: Release

Summe 2 Tage.

- **WP 7.1** Signatur, Play App Signing, Keystore-Sicherung (0,5 Tage)
- **WP 7.2** Store-Eintrag, Data Safety, Altersfreigabe (1 Tag)
- **WP 7.3** Umstiegsanleitung im README: Backup aus der PWA, Import in die App
  (0,5 Tage)

---

## Aufwand

| Phase | Tage | kumuliert |
|---|---|---|
| 0 Fundament | 3,5 | 3,5 |
| 1 Timer und Messung | 5 | **8,5** |
| 2 Referenzkorpus | 7 | 15,5 |
| 3 Domänenkern | 13 | 28,5 |
| 4 Persistenz | 5 | 33,5 |
| 5 Oberfläche | 22,5 | 56 |
| 6 Health Connect | 3,5 | 59,5 |
| 7 Release | 2 | **61,5** |

Rund 61,5 Personentage, mit Puffer dreizehn bis vierzehn Wochen für eine Person.
Nicht eingerechnet: 1 bedingter Tag für WP 1.5, falls die Messung ihn verlangt,
und ein halber für WP 0.6, falls die Kette zusätzlich auf GitHub laufen soll.

Die Einrichtung des Rechners steckt in WP 0.1. Wer Android Studio und das SDK
schon hat, ist dort in einem halben statt einem ganzen Tag durch.

Die fett gesetzte Zahl in der Mitte ist die wichtigere: **nach 8,5 Tagen steht
die Messung**, und erst dann entscheidet sich, ob die übrigen 53 Tage überhaupt
sinnvoll sind.

Der größte Posten ist die Oberfläche, und das ist kein Schätzfehler: fünf Reiter,
darunter die Planung mit Entwurf, Wochentrennung und Zuweisung, sind in Compose
genauso viel Arbeit wie in der PWA, nur ohne die 8421 Zeilen, die dort schon
stehen.

## Was dieser Plan bewusst nicht tut

- **Kein iOS.** Fällt mit der Entscheidung für Kotlin weg.
- **Keine Cloud, keine Anmeldung.** Daten bleiben auf dem Gerät.
- **Kein Funktionszuwachs während des Ports.** Erst Parität, dann Neues.
- **Kein Abschalten der PWA.** Sie bleibt Referenz, und die Trainingsdaten der
  Nutzer hängen an ihrer Adresse. Ohne sie käme niemand mehr an ein Backup, um es
  in die App zu importieren.

## Abbruchpunkte

Zwei Stellen, an denen sauber Schluss sein kann, ohne dass die Arbeit verloren
ist.

**Nach Phase 1, also nach 8,5 Tagen.** Der Timer ist gelöst und läuft als
Begleit-App neben der PWA. Das ist der Punkt, der die eigentliche Anforderung
erfüllt. Wer nur den ausfallenden Pausentimer loswerden will, ist hier fertig und
hat 53 Tage gespart. Die Trainingsdaten bleiben dabei in der PWA, die
Begleit-App kennt nur Übungsnamen und Pausenlängen.

**Nach Phase 3.** Der Domänenkern ist portiert und gegen den Korpus bewiesen. Er
ließe sich über Kotlin/JS auch in der PWA weiterverwenden, falls die Entscheidung
doch noch auf Capacitor fällt.
