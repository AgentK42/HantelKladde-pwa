# Rewrite nach Kotlin: Arbeitsplan

Stand: 2026-09-22. Referenzfassung der PWA: **1.19.1**.

## Warum ueberhaupt

Zwei Anforderungen lassen sich im Browser nicht loesen:

1. **Der Pausentimer faellt in rund 59 Prozent der Faelle aus.** Ursache ist nicht
   Chrome, sondern die Architektur: `tickRest()` laeuft als `setInterval` und ruft
   `showNotification()` erst, wenn der Tick den Ablauf bemerkt. Sobald Android den
   Renderer einfriert oder wegraeumt, tickt nichts mehr. Die Notification Triggers
   API, die das geloest haette, hat Chrome 2023 entfernt. Die Loesung heisst in
   jedem Fall: die Meldung beim Start der Pause **beim System einplanen**, nicht
   zur Laufzeit feuern.
2. **Health Connect** ist ohne native Bruecke nicht erreichbar.

## Leitgedanke des Plans

Die PWA ist 6100 Zeilen Vanilla-JS mit 242 Funktionen und **ohne Testabdeckung der
Fachlogik**. `tools/test-pwa.js` prueft nur die App-Schicht (ServiceWorker, Offline,
Update, Share-Target), nicht die Progression, nicht den Verlauf, nicht den
Backup-Merge. Genau diese drei sind aber der riskante Teil des Rewrites.

Deshalb steht am Anfang nicht Kotlin, sondern ein **Referenzkorpus**: die bestehende
JS-Logik wird kopflos ausgefuehrt und erzeugt einige tausend Ein-/Ausgabepaare. Der
Kotlin-Port muss sie exakt reproduzieren. Damit wird aus "1:1 nachbauen" eine
messbare Bedingung statt einer Hoffnung.

Zweiter Leitgedanke: **jedes Arbeitspaket bringt seine eigene Pruefung mit.** Die
Gates stehen vor der ersten Zeile Fachlogik (Phase 0), nicht am Ende. Kein Paket
gilt als fertig, bevor sein Gate gruen ist.

## Querschnittsregeln, gueltig ab WP 0.4

Fuer **jedes** Arbeitspaket, ohne Ausnahme:

- Ein Paket ist ein Branch und ein PR. Ein PR, der laenger als zwei Tage offen ist,
  war zu gross geschnitten.
- Merge nur bei gruenem CI. CI laeuft bei jedem Push und fuehrt aus:
  `ktlintCheck`, `detekt`, `lint` (mit `warningsAsErrors`), `test`, `koverVerify`,
  `verifyRoborazziDebug`.
- Lokal gilt derselbe Befehl: `./gradlew check`. Was in CI bricht, muss vorher
  lokal brechen.
- Neuer Code in `:core:domain` ohne Test senkt die Abdeckung und bricht damit
  `koverVerify`. Das Gate ist die Durchsetzung, nicht die Disziplin.
- Kein `TODO`, kein auskommentierter Code, keine unterdrueckte Lint-Regel ohne
  Begruendung im gleichen PR.
- Die PWA bleibt waehrend des gesamten Rewrites in Betrieb und unveraendert. Sie
  ist die Referenz, bis Paritaet nachgewiesen ist.

## Stack

| Bereich | Wahl | Begruendung |
|---|---|---|
| Sprache | Kotlin, JDK 17 | |
| UI | Jetpack Compose, Material 3 | |
| Persistenz | Room mit exportiertem Schema | Migrationstests ab Tag eins |
| Timer | AlarmManager, Foreground Service | siehe Phase 4 |
| DI | manuell (Konstruktor-Injektion) | eine Person, eine App, Hilt waere Overhead |
| Tests JVM | JUnit 5, Kotest Property, Turbine | |
| Tests UI | Robolectric plus Roborazzi | Screenshot-Gates ohne Emulator |
| Abdeckung | Kover | Schwelle 85 Prozent in `:core:domain` |
| Statik | ktlint, detekt, Android Lint | |

Modulschnitt, wichtig fuer schnelle Gates:

```
:core:model     reine Datentypen, keine Android-Abhaengigkeit
:core:domain    Progression, Verlauf, Backup. Reines Kotlin, JVM-Tests in Sekunden
:core:data      Room, Repositories
:core:designsystem
:feature:training  :feature:plans  :feature:history  :feature:data
:app
```

`:core:domain` darf nicht von Android abhaengen. Das ist die Bedingung dafuer, dass
der riskanteste Code ohne Emulator und ohne UI geprueft werden kann.

---

## Phase 0: Fundament und Qualitaetsnetz

Vor der ersten Zeile Fachlogik. Summe 3,5 Tage.

### WP 0.1 Projektskelett (1 Tag)
Verzeichnis `android/` im bestehenden Repo. Gradle mit Version Catalog, der
Modulschnitt oben, alle Module leer.
**Gate:** `./gradlew assembleDebug` erzeugt eine startbare, leere App.

### WP 0.2 Statische Analyse (0,5 Tage)
ktlint, detekt mit eigenem Regelsatz, Android Lint mit `warningsAsErrors = true`.
**Gate:** `./gradlew ktlintCheck detekt lint` gruen auf dem leeren Projekt. Ein
absichtlich eingebauter Verstoss bricht den Build (einmal gegenpruefen, dann
zuruecknehmen).

### WP 0.3 Testinfrastruktur (1 Tag)
JUnit 5, Kotest, Turbine, Robolectric, Roborazzi. Je Ebene ein Dummy-Test, damit
das Geruest belegt ist und nicht erst beim ersten echten Test auffaellt.
**Gate:** `./gradlew test` gruen, Screenshot-Referenz wird erzeugt und verglichen.

### WP 0.4 CI (0,5 Tage)
GitHub Actions, derselbe Befehlssatz wie lokal. Branch Protection auf dem
Zielbranch.
**Gate:** Ein PR mit rotem CI laesst sich nicht mergen. Einmal praktisch pruefen.

### WP 0.5 Abdeckungsschwelle (0,5 Tage)
Kover, 85 Prozent Zeilenabdeckung fuer `:core:domain`, keine Schwelle fuer UI-Module.
**Gate:** `koverVerify` bricht den Build bei Unterschreitung.

---

## Phase 1: Referenzkorpus aus der PWA

Der Kern der Risikominderung. Summe 4,5 Tage. Passiert noch in JavaScript.

### WP 1.1 JS-Harness (1 Tag)
`tools/extract-logic.js` schneidet den Script-Block aus `index.html` (Zeilen 783
bis 6897), stubbt `document`, `window`, `localStorage` und `navigator` und macht
die reinen Funktionen in Node aufrufbar.
**Gate:** `suggestFor()` laeuft ohne Browser und liefert fuer einen handgerechneten
Fall das erwartete Ergebnis.

### WP 1.2 Korpus Progression (1,5 Tage)
Deterministischer Generator ueber den Zustandsraum: Historie (kein Satz, ein Satz,
vollstaendiger Block, abgebrochener Block, Deload unter Planziel), Planziel
vorhanden oder nicht, `repFirst` an und aus, `repFirstThresh` und `repSpan` in
Varianten, RPE unter und ueber 9, Schrittweiten aller Katalog-Uebungen. Ergebnis:
`fixtures/progression.json`.
**Gate:** `c8` auf dem Harness weist fuer `suggestFor`, `repFirstOn`, `repRange`,
`mainWorkBlock`, `blockHits` volle Zweigabdeckung nach. Ein Zweig ohne Fall im
Korpus ist ein Zweig, den der Port still brechen kann.

### WP 1.3 Korpus Backup-Merge (1 Tag)
Gleiches Verfahren fuer `mergeBackup()` ab Zeile 5753, einschliesslich der
Reparaturpfade fuer beschaedigten Speicher ab Zeile 1113: fehlende Felder, doppelte
IDs, unbekannte Kategorien, Plaene mit und ohne lokale Aenderung (die
`untouched`-Regel), abgeschnittenes JSON.
**Gate:** Zweigabdeckung wie oben.

### WP 1.4 Korpus Verlauf (1 Tag)
Volumen nach Satz und nach Gewicht, Wochenziel und `weekGoalLog`, Bestwerte, e1RM,
Muskelgruppenverteilung ueber `muscleOf()`.
**Gate:** Zweigabdeckung wie oben.

Nach Phase 1 liegen die Fixtures fest und werden in `android/core/domain/src/test/resources/`
eingecheckt. Ab hier ist die PWA-Fassung 1.19.1 eingefroren; spaetere Aenderungen an
der PWA erfordern einen neuen Korpuslauf.

---

## Phase 2: Domaenenkern in Kotlin

Reines Kotlin, keine UI, keine Datenbank. Jedes Paket wird gegen den Korpus
geprueft. Summe 8 Tage.

### WP 2.1 Datentypen (0,5 Tage)
`Entry`, `PlanItem`, `Settings`, `ExMeta`, `Category`, `Muscle`. Gewicht als
eigener Typ mit Einheit, damit kg und Prozent sich nicht vermischen koennen.
**Gate:** Korpus-JSON laedt und deserialisiert vollstaendig.

### WP 2.2 Gewichtsarithmetik (1 Tag)
Hantelscheiben, `stepOf()`, Rundung, Komma-Parsing (`deci`, `comma`). Grundlage
jedes Vorschlags.
**Gate:** Unit-Tests plus Property-Test: ein gerundetes Gewicht faellt nie unter das
Stangengewicht und ist immer aus den verfuegbaren Scheiben darstellbar.

### WP 2.3 Satzblock-Erkennung (1 Tag)
`lastSession()`, `mainWorkBlock()`, `blockHits()`. Warmup-Saetze und unvollstaendige
Bloecke sind hier die Stolperfallen.
**Gate:** Teilkorpus aus 1.2, 100 Prozent Uebereinstimmung.

### WP 2.4 Rep-zuerst-Regel (0,5 Tage)
`repFirstOn()`, `repRange()`, `spanAroundTarget()`. Achtung auf den strikten
Vergleich, der historisch schon einmal Grenzfaelle auf die falsche Seite gelegt hat
(siehe Kommentar ab Zeile 982).
**Gate:** Teilkorpus, insbesondere die dokumentierten Grenzfaelle Latzug Maschine
und Reverse Flys.

### WP 2.5 suggestFor komplett (2 Tage)
Der Zusammenbau, inklusive Deload-Schutz, RPE-Deckel bei 9 und der
Mehrfach-Rep-Steigerung aus 1.17.0.
**Gate:** **Voller Progressionskorpus, jede Abweichung ist ein Fehlschlag.** Dieses
Gate ist der eigentliche Beweis, dass der Rewrite tragfaehig ist.

### WP 2.6 Verlaufsrechnungen (1,5 Tage)
**Gate:** Korpus aus 1.4.

### WP 2.7 Backup-Parser und Merge (1,5 Tage)
Format `app:"kraftlog"` mit `BACKUP_VERSION`, additiver Merge, Reparatur
beschaedigter Eingaben.
**Gate:** Korpus aus 1.3, plus Fuzzing gegen abgeschnittenes und manipuliertes JSON
ohne Absturz.

Nach Phase 2 existiert noch keine App, aber der teuerste Teil des Risikos ist
abgetragen.

---

## Phase 3: Persistenz

Summe 4,5 Tage.

### WP 3.1 Room-Schema (1 Tag)
Entities, DAOs, exportiertes Schema eingecheckt.
**Gate:** Migrationstest-Geruest ist ab Schema-Version 1 aktiv, nicht erst ab der
ersten Migration.

### WP 3.2 Repository mit Flow-API (1 Tag)
**Gate:** Robolectric-Tests gegen In-Memory-Datenbank, Flows mit Turbine geprueft.

### WP 3.3 Import eines echten PWA-Backups (1,5 Tage)
**Gate:** Der Abnahmetest fuer den Umstieg. Ein Backup aus der laufenden PWA wird
importiert, danach liefern die Kotlin-Verlaufsrechnungen fuer dieselben Daten
dieselben Zahlen wie die PWA. Abweichung gleich null.

### WP 3.4 Export und Round-Trip (1 Tag)
**Gate:** Export, Import, Export erzeugt identische Ausgabe. Der Export ist mit der
PWA-Fassung kompatibel, das heisst die PWA kann ihn wieder einlesen. Damit bleibt
der Rueckweg offen.

---

## Phase 4: Timer

Frueh, weil es der Grund fuer den ganzen Umbau ist. Summe 4,5 Tage.

### WP 4.1 Timer-Domaene (1 Tag)
Zustandsautomat: gestartet, verlaengert, abgebrochen, abgelaufen, wiederhergestellt
nach Prozessende. Reines Kotlin.
**Gate:** Unit-Tests mit virtueller Zeit ueber `TestCoroutineScheduler`.

### WP 4.2 Geplante Benachrichtigung (1,5 Tage)
`AlarmManager.setExactAndAllowWhileIdle()` beim Start der Pause, Storno bei
Abbruch, Neuplanung bei Verlaengerung.

**Offener Entscheidungspunkt, hier zu klaeren:** Android 12 und neuer verlangt fuer
exakte Alarme `SCHEDULE_EXACT_ALARM`, das fuer neue Apps standardmaessig verweigert
wird, oder `USE_EXACT_ALARM`, das automatisch gewaehrt wird, aber laut
Play-Richtlinie nur Apps zusteht, deren Kernfunktion Wecker oder Timer ist. Ob ein
Trainings-Pausentimer darunter faellt, ist Auslegungssache und muss vor Phase 5
geklaert sein, weil eine Ablehnung die Release-Strategie aendert.

**Gate:** Instrumentierter Test mit vorgestellter Uhr, zusaetzlich Doze-Test ueber
`adb shell dumpsys deviceidle force-idle`.

### WP 4.3 Foreground Service mit Countdown (1 Tag)
Laufender Countdown in der Benachrichtigung, das Sichtbare, was die PWA nie konnte.
**Gate:** Instrumentierter Test.

### WP 4.4 Berechtigungen und Herstellerfallen (1 Tag)
`POST_NOTIFICATIONS` ab Android 13, Akkuoptimierung, die aggressiven Hersteller
(Xiaomi, Samsung, Huawei).
**Gate:** Messprotokoll auf deinem Geraet ueber mindestens 50 Pausen.

### Meilenstein nach Phase 4

Eine minimale App, die nur den Timer kann, laeuft parallel zur PWA. **Hier wird
gemessen, ob aus 59 Prozent Ausfall nahe null wird, bevor die restlichen 20 Tage
investiert sind.** Faellt die Messung schlecht aus, ist der Rest des Plans
gegenstandslos und du hast nach etwa drei Wochen statt nach zehn davon erfahren.

---

## Phase 5: Oberflaeche

Ein Reiter je Paket. Jedes Paket bringt einen Compose-UI-Test fuer die Interaktion
und einen Roborazzi-Screenshot-Test fuer die Darstellung mit, beide im JVM-Lauf.
Summe 14,5 Tage.

| WP | Inhalt | Tage |
|---|---|---|
| 5.1 | Designsystem, Theme, dunkle Farben aus der PWA uebernommen | 1,5 |
| 5.2 | Navigation und Geruest, Reiterwechsel, Zurueck-Verhalten | 1 |
| 5.3 | Reiter Training, Satzeingabe, Vorschlagsanzeige | 2 |
| 5.4 | Uebungsauswahl, Kategorien, Muskelgruppen, Suche | 1,5 |
| 5.5 | Fokus-Modus inklusive Reps-Reihe und Wischen | 1,5 |
| 5.6 | Reiter Plaene, Zielwerte, Sperren, Ausblenden | 2 |
| 5.7 | Reiter Verlauf, Wochenziel, Volumen, Diagramme | 2,5 |
| 5.8 | Reiter Daten, Backup, Einstellungen | 2 |
| 5.9 | Share-Target als Intent-Filter | 0,5 |

**Gate je Paket:** UI-Test gruen, Screenshot-Referenz bestaetigt, und der Reiter
zeigt fuer den importierten Echtdatensatz aus WP 3.3 dieselben Zahlen wie die PWA
auf demselben Datensatz. Das laesst sich Seite an Seite auf zwei Geraeten pruefen.

---

## Phase 6: Health Connect

Summe 3,5 Tage plus Wartezeit.

### WP 6.1 Anbindung und Berechtigungen (1,5 Tage)
Abhaengigkeit, Berechtigungsdialog, Rationale-Activity, Datenschutzerklaerung als
Intent-Filter.

### WP 6.2 ExerciseSessionRecord schreiben (1,5 Tage)
**Gate:** Instrumentierter Test gegen die Health-Connect-Testfassung.

### WP 6.3 Play-Console-Deklaration (0,5 Tage, Wartezeit Tage bis Wochen)
**Frueh anstossen, spaetestens zu Beginn von Phase 5.** Ohne die Deklaration bekommt
die App in Produktion keine Health-Rechte, unabhaengig vom Code.

---

## Phase 7: Release

Summe 2 Tage.

- **WP 7.1** Signatur, Play App Signing, Keystore-Sicherung (0,5 Tage)
- **WP 7.2** Store-Eintrag, Data Safety, Altersfreigabe (1 Tag)
- **WP 7.3** Umstiegsanleitung im README: Backup aus der PWA, Import in die App
  (0,5 Tage)

---

## Aufwand

| Phase | Tage |
|---|---|
| 0 Fundament | 3,5 |
| 1 Referenzkorpus | 4,5 |
| 2 Domaenenkern | 8 |
| 3 Persistenz | 4,5 |
| 4 Timer | 4,5 |
| 5 Oberflaeche | 14,5 |
| 6 Health Connect | 3,5 |
| 7 Release | 2 |
| **Summe** | **45** |

45 Personentage, mit Puffer neun bis zehn Wochen fuer eine Person. Das liegt ueber
der frueheren Schaetzung von vier bis acht Wochen, weil Phase 1 und die Gates je
Paket darin nicht enthalten waren. Der Aufschlag von etwa einer Woche kauft die
Gewissheit, dass die portierte Progressionslogik sich wirklich wie die alte
verhaelt. Ohne sie ist die Schaetzung nicht kleiner, nur unsicherer.

## Was dieser Plan bewusst nicht tut

- **Kein iOS.** Faellt mit der Entscheidung fuer Kotlin weg.
- **Keine Cloud, keine Anmeldung.** Die Daten bleiben auf dem Geraet, wie bisher.
- **Kein Funktionszuwachs waehrend des Ports.** Neue Ideen kommen nach Paritaet.
  Ein bewegliches Ziel macht den Korpusvergleich wertlos.

## Abbruchpunkte

Zwei Stellen, an denen bewusst abgebrochen werden kann, ohne dass die Arbeit
verloren ist:

1. **Nach Phase 4.** Der Timer ist geloest. Laesst sich als eigenstaendige
   Begleit-App neben der PWA betreiben, falls der Rest zu teuer erscheint.
2. **Nach Phase 2.** Der Domaenenkern ist portiert und bewiesen. Er liesse sich
   ueber Kotlin/JS auch in der PWA weiterverwenden, falls die Entscheidung doch
   noch auf Capacitor faellt.
