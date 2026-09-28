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
| Android SDK Platform | die Ziel-API des Projekts, also 36, plus Build-Tools |
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
| Ziel-API | 36 (Android 16) | Pflicht für neue Handy-Apps seit 31.08.2026, belegt in Phase 8 |
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

## Phase 8: Wear OS (optional)

Summe 13 Tage plus Wartezeit auf den Wear-Review. **Optional und außerhalb der
Summe**, wie WP 0.6. Die Tage sind Personentage für einen Menschen, dieselbe
Einheit wie im übrigen Plan, damit die Zahlen vergleichbar bleiben.

Zielgerät ist die Galaxy Watch 8 mit Wear OS 6. Die 40 mm hat 438 x 438 px, die
44 mm 480 x 480 px, beide bei 327 ppi, also rund 219 und 240 dp bei Dichte 2.
Entworfen wird für die 40 mm, sie ist die engere. Die Skizzen der acht
Bildschirme liegen als Entwurfsfläche vor und sind die Vorlage für WP 8.3.

### Warum die Uhr zum Kernproblem passt

Die Vibration am Handgelenk kommt auch an, wenn das Telefon in der Tasche oder im
Spind liegt. Damit greift die Uhr die 59 Prozent ausgefallener Pausensignale von
einer zweiten Seite an: Phase 1 sorgt dafür, dass das Signal ausgelöst wird,
die Uhr dafür, dass es bemerkt wird.

### Warum eine eigene Phase

:core:model und :core:domain laufen unverändert auf der Uhr, genau dafür sind sie
ohne Android-Abhängigkeit geschnitten. Die Oberfläche dagegen ist nicht
wiederverwendbar: Wear Compose (`androidx.wear.compose.material3`) ist eine
eigene Bibliothek, Phase 5 bringt für die Uhr nichts.

Daraus folgt die Reihenfolge. Phase 8 hängt an Phase 3 und 4 sowie an WP 1.1,
für die Veröffentlichung an WP 7.1. **Nicht an Phase 5.** Das ist der Grund,
warum die Uhr eine eigene Phase ist und kein Paket am Ende der Oberfläche.

**Technisch unabhängig heißt aber nicht sofort nützlich.** Solange die PWA die
Trainingsdaten führt, landen Sätze von der Uhr in einer App, die niemand liest.
Sinnvoll ist Phase 8 parallel zu Phase 5 oder danach. Wer früher beginnt,
gewinnt Vorlauf für den Wear-Review, nicht Nutzen im Training.

### Datenhaltung: die Uhr führt die heutige Einheit selbst

Die Uhr kennt die heutige Einheit und den Plan, schreibt Sätze mit und gleicht
über die Data Layer API ab, sobald das Telefon erreichbar ist. Im Manifest steht
`com.google.android.wearable.standalone` auf `true`. Verlauf, Pläne und Entwurf
werden **nicht** abgeglichen.

| Modell | Uhr als | standalone | Am Rack ohne Telefon | Abgleich |
|---|---|---|---|---|
| 1 | Fernbedienung | `false` | nein, Bluetooth reicht rund 10 m | keiner |
| **2** | **Mitschreiber für heute** | **`true`** | **ja** | **Einheit hin, Sätze zurück** |
| 3 | vollwertige App | `true` | ja | alles, mit Konflikten |

Modell 1 scheitert an WO-P5: bei `standalone=false` muss die Begleit-App
zuverlässig verbinden, und das tut sie nicht, wenn das Telefon im Spind liegt.
Modell 3 macht aus einem Abgleich in eine Richtung pro Datenart ein verteiltes
System. Modell 2 ist am Rack ohne Telefon nutzbar und hält den Abgleich klein.

Ausstehende Sätze auf der Uhr sind Sitzungszustand im Sinne von WP 4.3: sie
liegen getrennt, gehören nicht ins Backup und verschwinden erst, wenn das
Telefon den Empfang bestätigt hat.

### Qualitätsanforderungen, die diese App direkt treffen

| Kennung | Anforderung | Folge hier |
|---|---|---|
| WO-V2 | Tippflächen mindestens 48 x 48 dp | bei Dichte 2 also 96 px |
| WO-V3 | Wischen zum Schließen fast überall | ausgenommen die laufende Pause als Ongoing Activity |
| WO-V4 | langlaufende Vorgänge als Ongoing Activity | der Pausentimer, Bibliothek `androidx.wear.ongoing` |
| WO-V13 | schwarzer Hintergrund | das App-Dunkelgrau `#151816` fällt weg, die Akzentfarben `#5B93F5`, `#5CC48D`, `#F0637A`, `#3FB7C2` bleiben |
| WO-V16 | Inhalt innerhalb des runden Displays | Mindestkreis 192 dp |
| WO-P5 | Begleit-App verbindet zuverlässig | trifft nur Modell 1, siehe oben |

### Ziel-API: geklärt am 28.09.2026

Die Qualitätsseite verweist unter WO-P1 auf die Play-Anforderungen und nennt in
ihrer Terminliste noch API 34 zum 31.08.2025. Das ist überholt. Maßgeblich ist
die Play-Hilfeseite "Target API level requirements" (answer/11926878), und die
Entwicklerseite `developer.android.com/google/play/requirements/target-sdk`
sagt dasselbe:

- **Wear OS, neue Apps und Updates: mindestens API 35 (Android 15)**, seit
  31.08.2026.
- **Handy, neue Apps und Updates: mindestens API 36 (Android 16)**, seit
  31.08.2026.
- Die Verlängerung bis 01.11.2026 gilt für bestehende Apps, nicht für eine
  neue.

Beide Module zielen deshalb auf **API 36**. Für die Uhr ist das mehr als
verlangt, aber Wear OS 6 auf der Watch 8 beruht ohnehin auf Android 16, und zwei
Module mit derselben Ziel-API sind eine Testmatrix weniger.

Die übrigen Stichtage 2026 auf der Qualitätsseite betreffen Zifferblätter
(Watch Face Format, Icon-Richtlinie WO-G4) und damit diese App nicht.

### WP 8.1 Modul `:wear`, Manifest und Signatur (1 Tag)
Eigenes Modul mit eigenem Manifest. Darin
`<uses-feature android:name="android.hardware.type.watch" />` **ohne**
`required="false"`: mit `required="false"` entsteht ein gemeinsames APK für
Handy und Uhr, und das wird nicht unterstützt. Dazu die Meta-Data `standalone`
aus dem Abschnitt oben.

`applicationId` und Signaturschlüssel sind identisch mit der Handy-App (WO-G7).
Die Data Layer API verbindet ohnehin nur Apps mit gleichem Namen und gleicher
Signatur, in der Entwicklung reicht deshalb der gemeinsame Debug-Schlüssel des
Rechners. Die Version Codes sind eigenständig und von denen des Handys
verschieden, das Schema wird hier einmal festgelegt und im Build geprüft.

64 Bit und 16 KB Page Size sind seit 15.09.2026 Pflicht. Reines Kotlin ohne
native Bibliotheken erfüllt beides, aber jede neue Abhängigkeit kann `.so`-Dateien
mitbringen.
**Gate:** Die leere Wear-App startet per `adb` über WLAN auf der Uhr. Die
Prüfkette aus WP 0.4 bekommt einen Schritt, der das Release-APK von `:wear`
öffnet und rot wird, sobald eine `.so`-Datei ohne `arm64-v8a` oder ohne
16-KB-Ausrichtung darin liegt.

### WP 8.2 Data Layer: Einheit hin, Sätze zurück (3 Tage)
Die heutige Einheit und der Plan gehen als DataItem auf die Uhr, jeder Satz als
eigenes DataItem mit fester Kennung zurück. DataItems statt Nachrichten, weil
die Data Layer API sie nach einem Verbindungsabbruch selbst nachliefert; eine
Nachricht wäre verloren. Die feste Kennung macht den Import auf dem Handy
wiederholbar: derselbe Satz zweimal empfangen ist ein Satz.

Auf dem Handy ein Dienst ohne Oberfläche, der empfangene Sätze über das
Repository aus WP 4.2 schreibt und den Empfang bestätigt. Erst dann löscht die
Uhr ihren ausstehenden Satz.
**Gate:** Ein Satz auf der Uhr erscheint auf dem Handy, auch wenn die
Verbindung beim Speichern getrennt war und erst danach wiederkommt. Doppelte
Zustellung erzeugt keinen zweiten Satz. Beides als Test, nicht als Beobachtung.

### WP 8.3 Oberfläche in Wear Compose (4,5 Tage)
Die Bildschirme der Skizzen: Heute, Übungen, Satz eintragen, Gewicht am Kranz,
Pause, Einheit fertig. Die Übungsliste staucht Einträge zum Rand hin, wie
`TransformingLazyColumn` es tut.

Das Gewicht wird in den Skizzen über den Kranz gedreht. Ob die Lünette der
Watch 8 ohne Classic als Drehereignis ankommt, wird am Gerät geprüft, nicht
vorausgesetzt. Der Bildschirm braucht in jedem Fall einen Weg ohne Drehen.

**Die Geometrie wird gerechnet, nicht geschätzt.** Im ersten Entwurf ragten die
Knöpfe am unteren Rand bis zu 18 px über den Kreis, bei der Korrektur wären sie
fast unter 48 dp gerutscht. Deshalb ein Skript: für jede abgerundete Box der
weiteste Punkt vom Mittelpunkt, verglichen mit Radius 219.

Nachgerechnet am 28.09.2026 gegen den aktuellen Stand der Skizzen:

| Bildschirm | Element | Höhe | Abstand zur Kante | Abstand zum Ring |
|---|---|---|---|---|
| Heute, Satz, Fertig, Tile | Knopf unten | 48 dp | 12,1 px | |
| Gewicht am Kranz | Fertig | 48 dp | 34,8 px | 11,8 px zur Innenkante |
| Pause | +15 s, Weiter | 48 dp | 34,8 px | 11,8 px zur Innenkante |
| Übungen | Randeinträge | 25 und 27 dp | 13,5 px | |

Daraus zwei Festlegungen für das Gate. Erstens wird der Abstand zum
Fortschrittsring **zur Innenkante des Strichs** gemessen, nicht zu seiner
Mittellinie; dann fehlen den Knöpfen auf Pause und Gewicht 0,2 px, und genau
solche Fälle soll die Rechnung finden. Zweitens gilt die 48-dp-Grenze für einen
Listeneintrag in voller Größe in der Mitte. Gestaucht am Rand ist er kleiner,
das ist das Verhalten der Bibliothek; ob der Wear-Review das genauso sieht,
zeigt erst WP 8.6.

Die Ongoing Activity auf dem Zifferblatt zeichnet das System. Die App liefert
Symbol, Statustext und Ziel beim Antippen, das Gate prüft diesen Bildschirm
deshalb nicht.
**Gate:** Das Geometrie-Skript läuft in der Prüfkette: jede Box mindestens
12 px zur Kante, auf Bildschirmen mit Fortschrittsring mindestens 12 px zur
Innenkante des Rings, jede Tippfläche mindestens 48 x 48 dp. Roborazzi-Screenshots
aller Bildschirme in rund, schwarzer Hintergrund, 40 und 44 mm.

### WP 8.4 Pause als Ongoing Activity mit Haptik (2 Tage)
Die Timer-Domäne aus WP 1.1 läuft unverändert, das Service-Muster aus WP 1.2
wird übertragen, samt `shortService` und dem Deckel von 150 Sekunden. Neu ist
die Ongoing Activity aus `androidx.wear.ongoing`, damit die laufende Pause auf
dem Zifferblatt und in der Übersicht erscheint (WO-V4), und die Vibration zum
Ende.
**Gate:** Protokoll über mindestens 50 Pausen am Handgelenk, das Telefon dabei
außer Reichweite, aufgenommen wie in WP 1.3 und bewertet wie in WP 1.4.

### WP 8.5 Tile (1,5 Tage)
Die Tile zeigt die heutige Einheit und den nächsten Satz, Fortsetzen öffnet die
App an dieser Stelle. Tiles werden mit ProtoLayout gebaut, nicht mit Compose;
auch hier nützt Phase 5 nichts.
**Gate:** Nach dem Speichern eines Satzes zeigt die Tile den nächsten. Geprüft
mit einem Vorschautest der Tile und einmal am Gerät.

### WP 8.6 Play: Formfaktor, Track, Review (1 Tag plus Wartezeit)
Hängt an WP 7.1 wegen des gemeinsamen Schlüssels und an WP 7.2 wegen des
Store-Eintrags.

- In der Play Console unter Test and release, Advanced Settings, Form factors
  Wear OS hinzufügen.
- Eigene Wear-OS-Release-Tracks sind Pflicht.
- Mindestens ein Wear-Screenshot, 1:1, ohne Geräterahmen. Die Bilder aus
  WP 8.3 taugen dafür.
- Die Beschreibung nennt "Wear OS" ausdrücklich.
- Erst geschlossener Test und Pre-Launch-Report, dann opt-in und Rollout.

Google prüft die Wear-App zusätzlich gegen die Qualitätsanforderungen, in einem
eigenen Review mit unbekannter Dauer. Wie bei WP 6.3 gilt: früh anstoßen.
**Gate:** Wear-Review bestanden, die App lässt sich auf der Uhr aus Play
installieren.

| WP | Inhalt | Tage |
|---|---|---|
| 8.1 | Modul, Manifest, Signatur, Version Codes | 1 |
| 8.2 | Data Layer | 3 |
| 8.3 | Oberfläche | 4,5 |
| 8.4 | Pause als Ongoing Activity | 2 |
| 8.5 | Tile | 1,5 |
| 8.6 | Play | 1 plus Wartezeit |

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
ein halber für WP 0.6, falls die Kette zusätzlich auf GitHub laufen soll, und
13 Tage für die optionale Phase 8, falls die App auch auf die Uhr soll, dazu die
Wartezeit auf den Wear-Review.

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
- **Kein Funktionszuwachs in der PWA, bis der Port mit Phase 5 abgeschlossen
  ist.** Erst Parität, dann Neues: sonst läuft das Ziel davon, gegen das die
  Parität geprüft wird.
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
