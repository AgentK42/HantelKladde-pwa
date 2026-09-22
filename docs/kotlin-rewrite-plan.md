# Rewrite nach Kotlin: Arbeitsplan

Stand: 2026-09-22. Referenzfassung der PWA: **1.34.3** (`origin/main`, c3f99d7).

## Was sich gegenüber der ersten Planung geändert hat

Die erste Fassung dieses Plans stand auf dem Stand 1.19.1 und hatte eine
Annahme, die heute falsch ist: dass die Fachlogik keine Testabdeckung hat. Das
stimmt nicht mehr.

| | 1.19.1 | 1.34.3 |
|---|---|---|
| `index.html` | 6899 Zeilen | 8388 Zeilen |
| Verhaltenstests | keine | 17 Suiten, 445 Prüfungen |
| Prüfkette | nur `test-pwa.js` lokal | GitHub-Workflow nach jedem Push |
| Lint | keiner | ESLint mit Komplexitätsratsche |
| Arbeitsregeln | keine | `CLAUDE.md` |
| Reiter | 4 | 5, Planung ist dazugekommen |
| Muskelgruppen | Kategorien als Rechengrundlage | 15 Gruppen, Kategorie nur noch Ordner |

Das ändert den Plan an drei Stellen, die unten ausgeführt sind: der
Referenzkorpus bekommt eine andere Rolle, die Oberflächenphase wächst deutlich,
und der Aufwand steigt von 45 auf rund 60 Personentage.

## Warum überhaupt

Zwei Anforderungen lassen sich im Browser nicht lösen:

1. **Der Pausentimer fällt in rund 59 Prozent der Fälle aus.** `tickRest()` läuft
   als `setInterval` und ruft `showNotification()` erst, wenn der Tick den Ablauf
   bemerkt. Friert Android den Renderer ein, tickt nichts mehr. Die Notification
   Triggers API, die das gelöst hätte, hat Chrome 2023 entfernt. Die Lösung heißt
   in jedem Fall: die Meldung beim Start der Pause **beim System einplanen**.
2. **Health Connect** ist ohne native Brücke nicht erreichbar.

## Leitgedanke

### Die vorhandenen Suiten sind die Spezifikation

`tools/tests/` beschreibt heute 445 Prüfungen in 17 Themen, und zwar bewusst als
Verhalten, nicht als Implementierung (`CLAUDE.md`: "was sich verhält, bekommt
einen Test, der das Verhalten beschreibt"). Das ist die wertvollste Vorarbeit für
einen Port, die es gibt: **jedes Kotlin-Arbeitspaket bekommt seine
Abnahmekriterien aus einer benannten Suite.**

| Suite | Prüfungen | | Suite | Prüfungen |
|---|---|---|---|---|
| planung | 44 | | plan-kopie | 19 |
| wochenstreifen | 40 | | eingaben | 19 |
| wochen-trennen | 38 | | vorwahl | 16 |
| progression | 34 | | volumen | 16 |
| pause | 29 | | rekorde | 12 |
| uebungsverlauf | 21 | | plan-editor | 6 |
| einstellungen | 21 | | gewichtsrad | 6 |
| aufwaermen | 21 | | farbschema | 6 |
| | | | stile | 2 |

### Der Korpus ergänzt sie, er ersetzt sie nicht mehr

Die Suiten fahren Chromium gegen die echte `index.html`. Sie sind damit an den
Browser gebunden und laufen nicht gegen Kotlin. Und 34 Prüfungen für die
Progression decken den Zustandsraum von `suggestFor()` nicht ab: Rep-zuerst-Regel
an und aus, Range vorhanden und nicht, Senkung nach zwei verfehlten Einheiten,
RPE-Filter, abgebrochene Einheiten, Deload unter Planziel, Schrittweiten aller
Katalogübungen. Das sind Tausende Kombinationen.

Also weiterhin ein Referenzkorpus, aber mit zwei Änderungen gegenüber der ersten
Planung:

- **Der Rahmen ist schon geschrieben.** `tools/tests/progression.js` enthält in
  `window.seed()` genau das Muster, das der Generator braucht: Historie
  aufbauen, `suggestFor()` rufen, Ergebnisobjekt zurückgeben. Der Harness ist
  damit eine halbe statt einer ganzen Tagesleistung.
- **Der Korpus deckt jetzt auch die Bereiche ab, die 1.19.1 noch nicht hatte:**
  Muskelgruppen mit Alias-Übersetzung, Entwurf und Wochenziele, Zuweisung und
  Wochentrennung.

### Gates vor der Fachlogik, wie im PWA-Repo

Die Prüfkette dieses Repos ist das Vorbild: vier Schritte, je ein eigener Schritt
im Workflow, nach jedem Push. Das Kotlin-Projekt bekommt dieselbe Form, nicht
eine neue Philosophie. Insbesondere die **Ratsche** aus `CLAUDE.md` wird
übernommen: Schwellen liegen knapp über dem, was heute durchgeht, und wer eine
Funktion verkleinert, zieht die Schwelle nach unten. Hochsetzen, damit eine
Warnung verschwindet, entwertet die Regel.

## Querschnittsregeln, gültig ab WP 0.4

- Ein Paket ist ein Branch und ein PR. Länger als zwei Tage offen heißt: zu groß
  geschnitten.
- Merge nur bei grüner Kette. CI läuft bei jedem Push:
  `ktlintCheck`, `detekt`, `lint` (mit `warningsAsErrors`), `test`, `koverVerify`,
  `verifyRoborazziDebug`.
- Lokal derselbe Befehl: `./gradlew check`. Was in CI bricht, muss vorher lokal
  brechen.
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
| Timer | AlarmManager, Foreground Service | siehe Phase 4 |
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

Summe 3,5 Tage. Vor der ersten Zeile Fachlogik.

### WP 0.1 Projektskelett (1 Tag)
Verzeichnis `android/` im bestehenden Repo. Gradle mit Version Catalog, der
Modulschnitt oben, alle Module leer.
**Gate:** `./gradlew assembleDebug` erzeugt eine startbare, leere App.

### WP 0.2 Statische Analyse (0,5 Tage)
ktlint, detekt, Android Lint mit `warningsAsErrors`. Schwellen als Ratsche.
**Gate:** Ein absichtlich eingebauter Verstoß bricht den Build. Einmal
gegenprüfen, dann zurücknehmen.

### WP 0.3 Testinfrastruktur (1 Tag)
JUnit 5, Kotest, Turbine, Robolectric, Roborazzi. Je Ebene ein Dummy-Test.
**Gate:** `./gradlew test` grün, Screenshot-Referenz wird erzeugt und verglichen.

### WP 0.4 CI (0,5 Tage)
GitHub Actions, je Schritt ein eigener Workflow-Schritt, wie `pruefkette.yml`.
Auslöser `push`, `concurrency` mit `cancel-in-progress`, gleiche Form.
**Gate:** Ein PR mit roter Kette lässt sich nicht mergen.

### WP 0.5 Abdeckungsschwelle (0,5 Tage)
Kover, 85 Prozent für `:core:domain`, keine Schwelle für UI-Module.
**Gate:** `koverVerify` bricht bei Unterschreitung.

---

## Phase 1: Referenzkorpus aus der PWA

Summe 7 Tage. Passiert noch in JavaScript, auf dem eingefrorenen Stand 1.34.3.

### WP 1.1 Harness (0,5 Tage)
`tools/extract-logic.js`, aufbauend auf dem `window.seed()`-Muster aus
`tools/tests/progression.js`. Läuft kopflos in Node statt in Chromium.
**Gate:** `suggestFor()` liefert ohne Browser dasselbe wie in der Suite.

### WP 1.2 Korpus Progression (2 Tage)
Voller Zustandsraum: `suggestWithinRange()`, Senkung nach zwei verfehlten
Einheiten am selben Gewicht, RPE-Filter (bis 7 keine Senkung, ab 8 ausbelastet),
Reihe nur am selben Gewicht, Range vorhanden und nicht, abgebrochene Einheiten,
Deload unter Planziel, alle Katalogschrittweiten. Auch die Textfelder `hint` und
`why`, denn die Suite prüft sie und der Nutzer liest sie.
**Gate:** `c8` weist für `suggestFor`, `suggestWithinRange`, `repFirstOn`,
`repRange`, `mainWorkBlock`, `blockHits` volle Zweigabdeckung nach.

### WP 1.3 Korpus Backup und Merge (1 Tag)
`mergeBackup()`, dazu die Reparaturpfade für beschädigten Speicher. Die
`untouched`-Regel für Pläne, unbekannte Kategorien, abgeschnittenes JSON.
**Gate:** Zweigabdeckung.

### WP 1.4 Korpus Verlauf (1 Tag)
Volumen nach Satz und Gewicht, Rekorde inklusive der Regel "ein Rekord braucht
einen Vorher-Wert", e1RM, Wochenziele.
**Gate:** Zweigabdeckung.

### WP 1.5 Korpus Muskelgruppen und Entwurf (1,5 Tage)
Neu gegenüber der ersten Planung. `muscleOf()` mit `MUSCLE_ALIAS` (Schulter auf
Schulter vorn), `muscleTally()`, `muscleBars()`, `DRAFT_PAIR_RATIO`,
`draftSources()`, `weekDraft()` und die Wochentrennung.
**Gate:** Zweigabdeckung.

### WP 1.6 Korpus Wochenstreifen und Zuweisung (1 Tag)
`weekStrip()`, `weekTally()`, `dayCell()`, `planDays` mit `PLAN_DAYS_KEEP` und
`PLAN_WEEKS`.
**Gate:** Zweigabdeckung.

Die Fixtures liegen danach unter
`android/core/domain/src/test/resources/` und sind die Wahrheit. **Ab hier ist
1.34.3 eingefroren**, siehe Abschnitt "Das bewegliche Ziel".

---

## Phase 2: Domänenkern in Kotlin

Summe 13 Tage. Reines Kotlin, keine UI, keine Datenbank.

| WP | Inhalt | Gate | Tage |
|---|---|---|---|
| 2.1 | Datentypen, Gewicht als eigener Typ mit Einheit | Korpus lädt vollständig | 0,5 |
| 2.2 | Gewichtsarithmetik, Scheiben, `stepOf`, Komma-Parsing | Property-Test: nie unter Stangengewicht, immer darstellbar | 1 |
| 2.3 | Satzblöcke, `isWork()`, Aufwärmsätze zählen nirgends | Teilkorpus 1.2 | 1 |
| 2.4 | Rep-zuerst-Regel, Schwelle und Range | Teilkorpus, inklusive der dokumentierten Grenzfälle | 0,5 |
| 2.5 | `suggestWithinRange`, Rückkehr in die Range, Senkung | Teilkorpus, `hint` und `why` zeichengenau | 1,5 |
| 2.6 | `suggestFor` komplett | **Voller Progressionskorpus, jede Abweichung ist ein Fehlschlag** | 1,5 |
| 2.7 | Muskelgruppen inklusive Alias-Übersetzung | Korpus 1.5 | 1 |
| 2.8 | Verlauf, Volumen, Rekorde, e1RM | Korpus 1.4 | 1,5 |
| 2.9 | Planung: Entwurf, Wochenziele, Wochentrennung | Korpus 1.5 | 2 |
| 2.10 | Wochenstreifen und Zuweisung | Korpus 1.6 | 1 |
| 2.11 | Backup-Parser und Merge, Pausenwerte bis 600 lesen ohne zu deckeln | Korpus 1.3, plus Fuzzing ohne Absturz | 1,5 |

WP 2.6 ist der eigentliche Beweis, dass der Rewrite tragfähig ist. Nach Phase 2
existiert noch keine App, aber der teuerste Teil des Risikos ist abgetragen.

---

## Phase 3: Persistenz

Summe 5 Tage.

### WP 3.1 Room-Schema (1 Tag)
**Gate:** Schema exportiert und eingecheckt, Migrationstest-Gerüst ab Version 1
aktiv.

### WP 3.2 Repository mit Flow-API (1 Tag)
**Gate:** Robolectric gegen In-Memory-Datenbank, Flows mit Turbine.

### WP 3.3 Sitzungszustand getrennt halten (0,5 Tage)
`CLAUDE.md` verlangt: Pause, Sitzung und Entwurf liegen unter eigenen Schlüsseln,
nicht in den Einstellungen, und gehören nicht ins Backup. Diese Trennung wandert
in die Kotlin-Fassung mit.
**Gate:** Ein Export enthält keinen Sitzungszustand. Test, nicht Konvention.

### WP 3.4 Import eines echten PWA-Backups (1,5 Tage)
**Gate:** Der Abnahmetest für den Umstieg. Ein Backup aus der laufenden PWA wird
importiert, danach liefern die Kotlin-Rechnungen für dieselben Daten dieselben
Zahlen. Abweichung gleich null.

### WP 3.5 Export und Round-Trip (1 Tag)
**Gate:** Export, Import, Export ist stabil, und **die PWA kann den Export wieder
einlesen**. Damit bleibt der Rückweg offen.

---

## Phase 4: Timer

Summe 4 Tage, plus 1 bedingter Tag. Früh, weil es der Grund für den Umbau ist.

### Der Mechanismus ist entschieden: Foreground Service, nicht AlarmManager

Die erste Fassung dieses Plans ließ offen, ob `USE_EXACT_ALARM` oder
`SCHEDULE_EXACT_ALARM` der Weg ist. Die Frage ist beantwortet, und die Antwort
ist: keins von beidem als Hauptmechanismus.

Die Play-Richtlinie "Permissions and APIs that Access Sensitive Information"
zählt die zulässigen Fälle für `USE_EXACT_ALARM` abschließend auf: die App **ist**
eine Wecker- oder Timer-App, oder sie ist eine Kalender-App mit
Terminbenachrichtigungen. Maßgeblich ist die Kernfunktionalität, die Google an
anderer Stelle derselben Richtlinie als Hauptzweck auslegt, prominent beworben,
ohne den die App unbrauchbar wäre. Eine Trainings-App mit Übungsdatenbank,
Plänen und Verlauf fällt darunter nicht, auch wenn der Pausentimer sichtbar ist.
`USE_EXACT_ALARM` ist eine restricted permission; wer die Kriterien nicht
erfüllt, wird von der Veröffentlichung ausgeschlossen. Das ist kein Risiko, das
für einen Pausentimer einzugehen wäre.

Der eigentliche Punkt ist aber ein technischer: **AlarmManager ist für Ereignisse
gedacht, die feuern sollen, wenn die App gar nicht läuft.** Eine Satzpause läuft
in einer vom Nutzer gerade gestarteten Sitzung. Genau dafür sieht Android
Foreground Services vor. Ein Foreground Service hält den Prozess am Leben, wird
von Doze nicht eingefroren, und der Countdown läuft im Service statt im
eingefrorenen Renderer. Damit ist die Ursache der 59 Prozent direkt adressiert,
ohne Sonderberechtigung.

| Ansatz | Genehmigung | Play-Risiko | Eignung hier |
|---|---|---|---|
| `USE_EXACT_ALARM` | automatisch bei Installation | hoch, Ausschluss im Review | nur als beworbene Timer-App |
| `SCHEDULE_EXACT_ALARM` | Special App Access, ab Android 14 bei Neuinstallation verweigert | gering | funktioniert, aber Opt-in-Hürde beim Nutzer |
| **Foreground Service** (`shortService`) | keine Sonderberechtigung, keine Deklaration | keins | **der vorgesehene Weg für eine laufende Sitzung** |
| WorkManager, inexakte Alarme | keine | keins | ungeeignet, Toleranz zu groß |

### Die Pause wird bei 150 Sekunden gedeckelt, damit shortService reicht

Apps ab Ziel-API 34 müssen einen `foregroundServiceType` deklarieren.
`FOREGROUND_SERVICE_TYPE_SHORT_SERVICE` braucht keine Deklaration und keinen
Play-Review, hat aber eine harte Grenze von drei Minuten, nach denen
`onTimeout()` kommt und der Service sich beenden muss.
`FOREGROUND_SERVICE_TYPE_SPECIAL_USE` kennt diese Grenze nicht, verlangt dafür
eine Deklaration in der Play Console samt Review.

**Entscheidung: die Pause wird hart auf 150 Sekunden gedeckelt, damit
`shortService` genügt.** Damit entfällt die letzte offene Berechtigungsfrage
dieses Plans vollständig.

Das ist keine Einschränkung gegen die App, sondern die Umsetzung dessen, was die
README ohnehin sagt. Dort steht die Begründung der Stufen: der ACSM Position
Stand nennt zwei bis drei Minuten für Mehrgelenksübungen, und die
Bayes-Metaanalyse von Singer u.a. (2024) findet unterhalb von 60 Sekunden einen
Nachteil, oberhalb von 90 aber keinen weiteren Vorteil. `REST_COMPOUND` steht
entsprechend bei 120 Sekunden, die Voreinstellung bei 90. Die Werte 150 und 180
in `REST_CHOICES` sind schon heute die Ausreißer der eigenen Systematik, nicht
ihr Kern.

Drei Wege führen heute über 180 Sekunden und müssen in der Kotlin-Fassung alle
drei begrenzt werden. Nur einen zu schließen, reicht nicht:

| Weg | heute | in der Kotlin-Fassung |
|---|---|---|
| `REST_CHOICES` | endet bei 180, also genau auf der Grenze | endet bei 120 |
| `addRest()` über `restplus` | unbegrenzt, je Tipp 15 Sekunden | Deckel bei 150 gesamt |
| Import über `cleanExmeta` | erlaubt bis 600 Sekunden je Übung | siehe unten |

Der Deckel liegt bei 150 und nicht bei 120, damit der Plus-Knopf während einer
laufenden Pause seinen Sinn behält: wer bei einer schweren Übung mit 120
Sekunden startet, kann noch zweimal nachlegen. 150 Sekunden lassen zugleich 30
Sekunden Luft unter der Drei-Minuten-Grenze, und genau diese Luft fehlt bei den
heutigen 180.

**Wichtig für den Import:** Bestehende Backups können bis zu 600 Sekunden je
Übung tragen, `cleanExmeta()` lässt das zu. Der Kotlin-Parser muss solche Werte
weiterhin **annehmen** und darf sie nicht als ungültig zurückweisen, sonst
scheitert WP 3.4 an einem echten Backup. Gedeckelt wird erst bei der Verwendung,
nicht beim Lesen. Ein importierter Wert über 150 wird also gelesen, gespeichert
und beim Starten der Pause auf 150 begrenzt.

### WP 4.1 Timer-Domäne (1 Tag)
Zustandsautomat: gestartet, verlängert, abgebrochen, abgelaufen,
wiederhergestellt nach Prozessende. Dazu die Pause je Übung (`exRest`), die kurze
Pause nach dem Aufwärmen (`warmRest`, nie länger als die der Übung) und der
Deckel von 150 Sekunden aus dem Abschnitt oben.
**Gate:** Unit-Tests mit virtueller Zeit über `TestCoroutineScheduler`,
einschließlich Property-Test: keine Folge von Verlängerungen führt über 150.

### WP 4.2 Foreground Service mit Countdown (2 Tage)
Pausenstart startet den Service, die Benachrichtigung trägt den laufenden
Countdown über `setUsesChronometer(true)` mit `setChronometerCountDown(true)`.
Abbruch ist `stopSelf()`, Verlängerung setzt die Restzeit neu. Die Storno- und
Neuplanungslogik der AlarmManager-Variante entfällt damit.

Enthält zugleich den Sperrbildschirm: die PWA legt die laufende Pause seit 1.31
dorthin, nativ wird daraus ein echter Countdown statt einer stehenden Zahl. Die
Pakete 4.2 und 4.3 der ersten Fassung fallen deshalb zusammen.

Der Service läuft als `shortService`, ohne Play-Deklaration, siehe Abschnitt
oben. Der Deckel bei 150 Sekunden gehört in die Timer-Domäne aus WP 4.1, nicht
in den Service: er ist eine fachliche Regel, keine Eigenheit von Android.

**Gate:** Instrumentierter Test mit vorgestellter Uhr, dazu
`adb shell dumpsys deviceidle force-idle`. Dazu zwei Randfälle: eine Pause von
150 Sekunden läuft vollständig durch, und zwanzig Tipps auf den Plus-Knopf
verlängern nicht über 150 hinaus.

### WP 4.3 Berechtigungen und Herstellerfallen (1 Tag)
`POST_NOTIFICATIONS` ab Android 13, Akkuoptimierung, Xiaomi, Samsung, Huawei.
**Gate:** Messprotokoll über mindestens 50 Pausen auf deinem Gerät.

### Meilenstein nach Phase 4

Eine minimale App, die nur den Timer kann, läuft parallel zur PWA. **Hier wird
gemessen, ob aus 59 Prozent Ausfall nahe null wird, bevor die restlichen gut 25
Tage investiert sind.** Fällt die Messung schlecht aus, ist der Rest des Plans
gegenstandslos, und du hast es nach etwa vier statt nach zwölf Wochen erfahren.

### WP 4.4 Exakter Alarm als Rückfallebene (1 Tag, nur bei Bedarf)

**Dieses Paket wird nur gebaut, wenn die Messung aus 4.3 Lücken zeigt.** Der Fall,
den ein Foreground Service nicht abdeckt, ist das Wegwischen der App aus den
zuletzt verwendeten. Das ist eine bewusste Nutzerhandlung und etwas anderes als
ein still eingefrorener Hintergrundtab, also möglicherweise hinnehmbar. Die
Messung entscheidet das, nicht die Vermutung.

Falls doch nötig: `SCHEDULE_EXACT_ALARM` mit Prüfung über
`canScheduleExactAlarms()`, In-App-Erklärung, Deeplink nach
`ACTION_REQUEST_SCHEDULE_EXACT_ALARM` und Listener auf
`ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED`. Bei verweigerter
Berechtigung bleibt es bei der Service-Variante, ohne Funktionsverlust im
Normalfall.

---

## Phase 5: Oberfläche

Summe 21 Tage. Ein Thema je Paket. Jedes Paket bringt einen Compose-UI-Test für
die Interaktion und einen Roborazzi-Screenshot-Test für die Darstellung mit.

| WP | Inhalt | Abnahme gegen Suite | Tage |
|---|---|---|---|
| 5.1 | Designsystem, Theme, hell und dunkel | `farbschema`, `stile` | 1,5 |
| 5.2 | Navigation, fünf Reiter, Zurück-Verhalten | `test-pwa.js` (Zurück-Geste) | 1 |
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
| 5.14 | Share-Target als Intent-Filter | `test-pwa.js` (geteiltes Backup) | 0,5 |

**Gate je Paket:** UI-Test grün, Screenshot bestätigt, und der Reiter zeigt für
den importierten Echtdatensatz aus WP 3.4 dieselben Zahlen wie die PWA. Die
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
  Wartezeit). **Spätestens zu Beginn von Phase 5 anstoßen.**

---

## Phase 7: Release

Summe 2 Tage.

- **WP 7.1** Signatur, Play App Signing, Keystore-Sicherung (0,5 Tage)
- **WP 7.2** Store-Eintrag, Data Safety, Altersfreigabe (1 Tag)
- **WP 7.3** Umstiegsanleitung im README (0,5 Tage)

---

## Aufwand

| Phase | Tage | gegenüber erster Planung |
|---|---|---|
| 0 Fundament | 3,5 | unverändert |
| 1 Referenzkorpus | 7 | plus 2,5 (Muskelgruppen, Planung, Zuweisung) |
| 2 Domänenkern | 13 | plus 5 (Planung, Muskelgruppen, Senkungslogik) |
| 3 Persistenz | 5 | plus 0,5 (Sitzungszustand) |
| 4 Timer | 4 | minus 0,5, dazu 1 bedingter Tag |
| 5 Oberfläche | 21 | plus 6,5 (Planung, Wochenstreifen, Übungsverlauf) |
| 6 Health Connect | 3,5 | unverändert |
| 7 Release | 2 | unverändert |
| **Summe** | **59** | **plus 14** |

Rund 59 Personentage, mit Puffer zwölf bis dreizehn Wochen für eine Person. Der
Aufschlag gegenüber den 45 Tagen der ersten Planung ist kein Nachschätzen
derselben Arbeit, sondern Arbeit, die es 1.19.1 noch nicht gab: ein ganzer Reiter,
fünfzehn Muskelgruppen als Rechengrundlage statt Kategorien, die Senkungslogik,
der Wochenstreifen, der Übungsverlauf.

## Das bewegliche Ziel

Zwischen 1.19.1 und 1.34.3 liegen gut 50 Commits in wenigen Tagen. Bei dieser
Geschwindigkeit wächst die PWA während des Rewrites um mehr, als der Rewrite
aufholen kann. Das ist das größte Risiko dieses Plans, größer als jede einzelne
technische Frage.

Drei mögliche Umgangsweisen, eine ist zu wählen, bevor Phase 1 beginnt:

1. **Feature-Stopp auf der PWA ab Phase 1.** Nur noch Fehlerbehebungen. Sauberste
   Variante, verlangt aber Verzicht für drei Monate.
2. **Die Kotlin-App zieht bewusst hinterher.** Sie erreicht Parität mit 1.34.3 und
   holt danach auf, was seither dazugekommen ist. Realistisch, aber der Rückstand
   wächst, solange die PWA weiterläuft.
3. **Schnitt bei Phase 4.** Der Timer wird nativ gelöst, die PWA bleibt die App.
   Kein Paritätsproblem, weil es keine zweite App gibt. Kostet vier statt zwölf
   Wochen und löst die Anforderung, die diesen Plan überhaupt ausgelöst hat.

Nach dem, was auf `main` zu sehen ist, würde ich Variante 3 zumindest ernsthaft
prüfen, bevor 60 Tage gebunden werden. Die PWA ist in den letzten Wochen nicht
stehengeblieben, sondern deutlich besser geworden, und sie hat inzwischen eine
Prüfkette, die ein neues Projekt erst aufbauen müsste.

## Was dieser Plan bewusst nicht tut

- **Kein iOS.** Fällt mit der Entscheidung für Kotlin weg.
- **Keine Cloud, keine Anmeldung.** Daten bleiben auf dem Gerät.
- **Kein Funktionszuwachs während des Ports.** Ein bewegliches Ziel macht den
  Korpusvergleich wertlos.

## Abbruchpunkte

1. **Nach Phase 4.** Der Timer ist gelöst und läuft als Begleit-App neben der PWA.
2. **Nach Phase 2.** Der Domänenkern ist portiert und bewiesen. Er ließe sich über
   Kotlin/JS auch in der PWA weiterverwenden, falls die Entscheidung doch noch auf
   Capacitor fällt.
