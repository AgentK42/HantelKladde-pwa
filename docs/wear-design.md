# Wear OS: Gestaltung

Ausgelesen aus den Skizzen auf der Design-Fläche
https://claude.ai/artifact/4wZM2u6AojvrRqvPtVJufe, Stand 28.09.2026, acht
Bildschirme. Die Werte stammen per Skript aus den Dateien der Fläche, nicht aus
dem Augenmaß. Grundlage für WP 8.3 in `docs/kotlin-rewrite-plan.md`.

Wo die Skizzen gegen eine Pflichtanforderung verstießen und wie das behoben
ist, steht im Abschnitt "Stand der Skizzen" am Ende. **Für die Umsetzung gilt diese Datei. Die Skizzen
sind an sie angeglichen, im Zweifel gilt trotzdem die Datei.**

## Maßstab

| | |
|---|---|
| Zielgerät | Galaxy Watch 8, 40 mm, Wear OS 6 |
| Display | 438 x 438 px, 327 ppi, rund |
| Dichte | 2, also 219 dp Durchmesser |
| Umrechnung | 1 dp = 2 px, 1 sp = 2 px bei Schriftskalierung 1,0 |
| 44 mm | 480 x 480 px, 240 dp, rund 10 Prozent mehr Platz |

Entworfen wird für die 40 mm. Was dort passt, passt auf der 44 mm. Alle
Angaben unten in dp beziehungsweise sp, in Klammern die Pixel der Skizze.

## Farben

Abgeleitet aus dem dunklen Farbschema der PWA (`index.html`, `:root` unter
`prefers-color-scheme: dark`). Der Grund `#151816` entfällt, weil WO-V13
Schwarz verlangt; die Akzente bleiben.

| Token | Wert | Rolle | Kontrast auf Schwarz |
|---|---|---|---|
| `background` | `#000000` | Grund, Pflicht nach WO-V13 | |
| `surface` | `#1E2320` | Karten, Kennzahlen, Tile | |
| `surfaceRaised` | `#262C28` | Knöpfe, Wertfelder, Fokus-Eintrag | |
| `surfaceDim` | `#1A1E1C` | Listeneintrag neben dem Fokus, Ringspur Pause | |
| `surfaceFaint` | `#16191A` | Listeneinträge am Rand | |
| `outline` | `#333A36` | offener Punkt im Wochenziel | |
| `onBackground` | `#ECEEE9` | Haupttext | 17,97:1 |
| `onBackgroundVariant` | `#98A099` | Nebentext | 7,82:1 |
| `onBackgroundMuted` | `#737B75` | Leisetext, Uhrzeit oben | 4,82:1 |
| `primary` | `#5B93F5` | Akzent, Hauptknopf, Ringe | 6,94:1 |
| `onPrimary` | `#0B1220` | Text und Symbol auf `primary` | 6,18:1 auf `primary` |
| `success` | `#5CC48D` | erledigt, Vorschlag nach oben, Haken | 9,74:1 |
| `record` | `#F0637A` | Rekord, Puls | 6,77:1 |
| `extra` | `#3FB7C2` | Nebenkennzahl | 8,76:1 |

`onBackgroundMuted` ist gegenüber der Skizze geändert: dort steht `#6E7670`,
das liegt mit 4,49:1 knapp unter AA. `#737B75` hat denselben Farbton und 4,82:1.

Weitere geprüfte Paare: `onBackground` auf `surfaceRaised` 12,20:1,
`onBackgroundVariant` auf `surfaceRaised` 5,31:1 und auf `surface` 5,94:1,
`onPrimary` auf `success` 8,68:1, `primary` auf `surfaceRaised` 4,71:1.

Der Akzent ist in den Skizzen austauschbar (`#5B93F5`, `#5CC48D`, `#3FB7C2`,
`#F0637A`). Festgelegt ist `#5B93F5`, wie in der PWA.

## Schrift

Roboto Flex, die Systemschrift von Wear OS 6. Ziffern, die sich während der
Anzeige ändern, mit Tabellenziffern (`tnum`), damit nichts springt: Countdown,
Gewicht, Uhrzeit.

WO-V14 verlangt mindestens **12 sp für wesentlichen** und **10 sp für
nebensächlichen** Text. Die Skizzen verwenden 34 verschiedene
Größen-Gewicht-Paare zwischen 8,5 und 58 sp und halten die Untergrenzen nicht
ein, siehe unten. Für die Umsetzung gilt stattdessen diese Skala:

| Rolle | sp | Gewicht | Laufweite | Einsatz |
|---|---|---|---|---|
| `displayLarge` | 52 | 800 | -0,05 em | Countdown der Pause |
| `displayMedium` | 45 | 800 | -0,04 em | Wert am Drehkranz |
| `headlineLarge` | 28 | 800 | -0,02 em | Planname auf Heute |
| `headlineMedium` | 24 | 800 | -0,03 em | Zahlen in Wertfeldern |
| `headlineSmall` | 18 | 800 | 0 | Kennzahlen auf Fertig, dort reicht die Breite für 24 sp nicht |
| `titleLarge` | 15 | 700 | -0,01 em | Übungsname, Überschrift Fertig |
| `labelLarge` | 14 | 700 | 0 | Beschriftung der Knöpfe |
| `bodyLarge` | 12 | 500 | 0 | wesentlicher Text: Satz, Vorschlag, Übungszeile |
| `labelMedium` | 12 | 600 | 0,06 em, Versalien | Abschnittsmarke: HEUTE, PAUSE, GEWICHT |
| `labelSmall` | 10 | 500 | 0,06 em, Versalien | Einheit unter einer Zahl: REPS, KG |
| `caption` | 10 | 400 | 0 | Nebensächliches: zuletzt vor, danach, Schritt |

Wesentlich heißt hier: was man braucht, um den nächsten Satz richtig zu machen.
"Satz 3 von 3", der Vorschlag "+1 Rep, Range 8 bis 12" und das Ziel einer
Übung sind wesentlich, "zuletzt vor 3 Tagen" und "danach Trizeps" nicht.

## Formen und Maße

| Element | Höhe | Radius | Anmerkung |
|---|---|---|---|
| Knopf unten, Edge-Position | 48 dp (96) | voll, 24 dp | Hauptaktion je Bildschirm |
| Knopf auf Ringbildschirmen | 48 dp (96) | voll | schmaler, siehe Geometrie |
| Wertfeld Reps, Gewicht | 52 dp (104) | 14 dp (28) | Gewicht 1,35-mal so breit wie Reps |
| Listeneintrag im Fokus | 50 dp (100) | voll | 184 dp breit |
| Kennzahl-Karte | 43 dp (86) | 12 dp (24) | drei nebeneinander, mittlere 1,4-fach |
| Karte nächste Übung im Tile | 45 dp (90) | 13 dp (26) | zwei Zeilen |
| Akzentstrich in Karten | 22 bis 23 dp hoch, 3,5 bis 4 dp breit | 2 dp | markiert die aktuelle Übung |
| Fortschrittsring Pause | Strich 8 dp (16) | rund | Mittellinie bei 102 dp vom Zentrum |
| Fortschrittsring Gewicht | Strich 7 dp (14) | rund | Mittellinie bei 101,5 dp, Knopf am Ring 6 dp |
| Scroll-Anzeige Liste | Strich 3,5 dp (7) | rund | rechter Rand |

Abstände zwischen Elementen einer Reihe: 5 dp (10). Innenabstand in Karten und
Einträgen: 11 bis 14 dp (22 bis 28). Symbole: 10 bis 14 dp, als Strichgrafik
mit gerundeten Enden, Strichstärke rund 1,2 dp.

## Die Kreisregel

Kein Rechteck, keine Pille darf über den runden Rand ragen, und das wird
gerechnet, nicht geschätzt. Für jede abgerundete Box zählt der weiteste Punkt
ihrer Eckbögen vom Mittelpunkt: Abstand Mittelpunkt zu Bogenmitte plus
Bogenradius.

| Grenze | Wert |
|---|---|
| Abstand zur Displaykante | mindestens 6 dp (12) |
| Abstand zur Innenkante eines Fortschrittsrings | mindestens 6 dp (12) |
| Tippfläche | mindestens 48 x 48 dp (WO-V2) |

Gemessen am Stand der Skizzen:

| Bildschirm | Element | Abstand |
|---|---|---|
| Heute, Satz, Fertig, Tile | Knopf unten, 138 dp breit | 6,05 dp zur Kante |
| Gewicht, Pause | Knöpfe, 115 dp breit | 7,45 dp zur Innenkante des Rings |
| Übungen | Fokus-Eintrag | 16,9 dp zur Kante |
| Übungen | unterster Eintrag | 6,75 dp zur Kante |
| Satz | Wertfelder | 13,5 dp zur Kante |

Der Knopf unten liegt 20 dp über dem unteren Rand und ist 138 dp breit. Breiter
geht bei 48 dp Höhe an dieser Stelle nicht. Folge für die Beschriftung: höchstens
rund zehn Zeichen in `labelLarge`, deshalb "Starten" statt "Training starten"
und "Fortsetzen" statt "Weiter trainieren".

Listeneinträge am Rand erscheinen gestaucht, 25 und 27 dp hoch. Das ist das
Verhalten der scrollenden Liste, die 48 dp gelten für den Eintrag in voller
Größe in der Mitte.

## Bildschirme

| Bildschirm | Inhalt von oben nach unten | Hauptaktion |
|---|---|---|
| Heute | Uhrzeit, Marke HEUTE mit Akzentpunkt, Planname, Umfang, zuletzt vor | Starten |
| Übungen | Uhrzeit, Planname, Liste mit Stand je Übung, erledigt in `success` | Eintrag antippen |
| Satz eintragen | Uhrzeit, Übung, Satz x von y, Wertfelder Reps und Gewicht, Vorschlag | Speichern |
| Gewicht am Kranz | Ring als Position im Bereich, GEWICHT, Kranz drehen, Wert, kg, Schritt | Fertig |
| Pause läuft | Ring als Restzeit, PAUSE, Countdown, Übung und Satz, danach | +15 s, Weiter |
| Pause am Zifferblatt | vom System gezeichnet, die App liefert Symbol, Text, Status | Chip antippen |
| Einheit fertig | Haken, Überschrift, drei Kennzahlen, Wochenziel als Punkte | Schließen |
| Tile | Marke, Planname, Karte mit Übung, Satz, Gewicht und Ziel | Fortsetzen |

Das Gewichtsfeld auf "Satz eintragen" hat einen Rand in `primary`, weil das
Gewicht häufiger geändert wird als die Wiederholungen. Der Vorschlag steht in
`success` mit Pfeil nach oben, wenn er eine Steigerung ist.

Auf "Gewicht am Kranz" braucht es einen Weg ohne Drehen, weil offen ist, ob der
Touch-Kranz der Watch 8 ohne Classic bei Apps als Drehereignis ankommt.

## Stand der Skizzen

Die Skizzen sind am 28.09.2026 an diese Datei angeglichen. Vorher wichen sie an
drei Stellen ab, festgehalten, weil genau das die Kreis- und Schriftprüfung in
WP 8.3 finden soll:

**Schrift unter WO-V14.** Zehn Beschriftungen lagen unter 10 sp, darunter REPS
und KG unter den Wertfeldern und die Einheiten der Kennzahlen auf Fertig mit
8,5 sp. Wesentliche Texte wie "Satz 3 von 3", der Vorschlag und die Übungszeile
lagen bei 10 sp. Jetzt: Nebensächliches mindestens 10 sp, Wesentliches
mindestens 12 sp, Knöpfe 14 sp.

**Leisetext knapp unter AA.** `#6E7670` ist durch `#737B75` ersetzt.

**Tile zu eng.** Mit 12 sp für das Gewicht blieb dem Übungsnamen rechnerisch
ein Pixel Luft. Die Karte hat deshalb zwei Zeilen, Übung mit Satz oben,
Gewicht und Ziel darunter, statt des Gewichts am rechten Rand; die Marke
"Als Nächstes" entfällt, der Kopf des Tiles sagt das schon.

Weiterhin ausgenommen:

- Die Randeinträge der Übungsliste bleiben gestaucht. Das ist das Verhalten
  der scrollenden Liste, Größe und Tippfläche gelten für den Eintrag in der
  Mitte.
- Der Chip auf "Pause am Zifferblatt" ist beispielhaft, das System zeichnet
  ihn. Kreisregel und Schriftskala gelten dort nicht.
- Ob alles auch mit großer Systemschrift passt (WO-V1), zeigt erst die
  Umsetzung. Die Skizzen stehen auf Schriftskalierung 1,0.

## Für Compose

```kotlin
object WearTokens {
    val Background = Color(0xFF000000)
    val Surface = Color(0xFF1E2320)
    val SurfaceRaised = Color(0xFF262C28)
    val SurfaceDim = Color(0xFF1A1E1C)
    val SurfaceFaint = Color(0xFF16191A)
    val Outline = Color(0xFF333A36)
    val OnBackground = Color(0xFFECEEE9)
    val OnBackgroundVariant = Color(0xFF98A099)
    val OnBackgroundMuted = Color(0xFF737B75)
    val Primary = Color(0xFF5B93F5)
    val OnPrimary = Color(0xFF0B1220)
    val Success = Color(0xFF5CC48D)
    val Record = Color(0xFFF0637A)
    val Extra = Color(0xFF3FB7C2)

    val MinTouch = 48.dp
    val EdgeMarginMin = 6.dp
    val RingStrokePause = 8.dp
    val RingStrokeValue = 7.dp
}
```

Die Farben gehören in das `ColorScheme` von Wear Material 3, die Skala in die
`Typography`. Eigene Komponenten nur dort, wo die Bibliothek nichts hat, etwa
für die Wertfelder.
