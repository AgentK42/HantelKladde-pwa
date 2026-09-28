# Wear OS: Gestaltung, Variante B "Kranz"

Ausgelesen aus der Reihe "Variante B, Kranz" auf der Design-Fläche
https://claude.ai/artifact/4wZM2u6AojvrRqvPtVJufe, Stand 28.09.2026, fünf
Bildschirme: Heute, Übungen, Satz, Pause, Fertig. Die Maße stammen per Skript
aus den Dateien der Fläche.

Diese Datei beschreibt nur, worin Variante B von `docs/wear-design.md`
abweicht. Maßstab, Farbtoken, Schriftskala, Kreisregel und die Ausnahmen dort
gelten unverändert weiter. Sie ist eine Variante zur Auswahl: sie gilt für WP
8.3, wenn B gewählt wird, und ersetzt dann die Abschnitte "Formen und Maße" und
"Bildschirme" der Hauptdatei.

## Die Idee

Der Rand der Uhr zeigt immer den Fortschritt. Ein Ring aus Segmenten läuft um
den ganzen Bildschirm, ein Segment je Satz der Einheit. Wer auf die Uhr
schaut, sieht ohne Lesen, wie weit die Einheit ist.

Weil der Rand dem Ring gehört, sitzen alle Knöpfe als Kreise in der Mitte. Sie
kommen dem Rand nie nahe, die Kreisprüfung fällt deshalb nirgends knapp aus.
Der Preis: die Knöpfe tragen nur ein Symbol, keine Beschriftung.

## Farbregel für den Stand

Auf allen Bildschirmen gilt dieselbe Zuordnung, im Ring wie in der Liste:

| Stand | Token | Wert |
|---|---|---|
| erledigt | `success` | `#5CC48D` |
| aktuell | `primary` | `#5B93F5` |
| offen | `surfaceRaised` | `#262C28` |

In der Übungsliste zeigt allein der Zähler in `success` (zum Beispiel 3/3),
dass eine Übung fertig ist. Kein Rahmen, kein Haken, der Eintrag wird nicht
ausgegraut. So ist es auf der Fläche nach Rückmeldung festgelegt.

Offener Punkt: `success` und `primary` haben nur 1,40:1 Kontrast
zueinander, sie unterscheiden sich fast nur im Farbton. Im Ring hilft die
Lage, das aktuelle Segment folgt immer direkt auf das letzte erledigte. Bei
eingeschränktem Farbsehen ist die Grenze trotzdem schwer zu erkennen. Zu klären in WP
8.3, etwa mit einem helleren aktuellen Segment in `onBackground`. Deshalb darf
der Akzent in dieser Variante auch nicht auf Grün gestellt werden, sonst sind
erledigt und aktuell gleich.

## Ringe

| Ring | Mittellinie | Strich | Enden | Aufteilung |
|---|---|---|---|---|
| Einheit, auf Heute, Übungen, Satz | 102 dp (204) vom Zentrum | 6 dp (12) | gerade | ein Segment je Satz, Lücke 5,4 dp (10,8) Bogenlänge |
| Wochenziel, auf Fertig | 102 dp (204) | 6 dp (12) | gerade | ein Segment je geplanter Einheit der Woche, Lücke 7,2 dp (14,4) |
| Pause, auf Pause | 102 dp (204) | 6 dp (12) | rund | durchgehend, Spur `surfaceDim`, Füllung `primary` als Restzeit |

Das erste Segment beginnt oben in der Mitte, die Lücke liegt dabei zur Hälfte
links und zur Hälfte rechts der Zwölf. Bei 12 Sätzen ist ein Segment 48 dp
(96) lang. Die Segmentlänge ergibt sich aus dem Umfang durch die Satzzahl
minus Lücke, sie ist nicht fest.

Die Pause zeigt bewusst keine Segmente: dort zählt die Restzeit, nicht der
Stand der Einheit.

Die Innenkante des Rings liegt bei 99 dp (198) vom Zentrum. Die Kreisregel aus
der Hauptdatei gilt hier gegen diese Kante: mindestens 6 dp (12) Abstand.

## Knöpfe

Alle Aktionen sind runde Knöpfe mit einem Symbol. Die Beschriftung steht als
`contentDescription` im Code, damit TalkBack sie vorliest.

| Bildschirm | Aktion | Durchmesser | Füllung | Symbol | Vorlesetext |
|---|---|---|---|---|---|
| Heute | Starten | 60 dp (120) | `primary` | Dreieck, 24 dp | Starten |
| Satz | Speichern | 56 dp (112) | `primary` | Haken, 23 dp | Speichern |
| Pause | Zeit verlängern | 48 dp (96) | `surfaceRaised` | Text "+15", 14 sp | 15 Sekunden mehr |
| Pause | Pause beenden | 48 dp (96) | `surfaceRaised` | Dreieck mit Strich, 18 dp | Pause beenden |
| Fertig | Schließen | 48 dp (96) | `surfaceRaised` | Kreuz, 17 dp | Schließen |

Die Hauptaktion eines Bildschirms ist größer und in `primary`, Nebenaktionen
48 dp in `surfaceRaised`. Die beiden Pausenknöpfe stehen nebeneinander mit
8 dp (16) Abstand.

## Bildschirme

| Bildschirm | Inhalt von oben nach unten | Ring | Aktion |
|---|---|---|---|
| Heute | Uhrzeit, Marke HEUTE, Planname, Umfang ("12 Sätze, 5 Übungen") | alle Segmente offen | Starten |
| Übungen | Planname als Marke, Liste mit Stand je Übung | erledigte Sätze grün, aktueller Satz im Akzent | Eintrag antippen |
| Satz | Übung, Satz x von y, Reps und kg als große Zahlen, Vorschlag | wie Übungen | Speichern |
| Pause | Marke PAUSE, Countdown, danach | Restzeit | +15, Pause beenden |
| Fertig | Haken in `success`, Überschrift, Wochenziel als Text, drei Kennzahlen | Wochenziel | Schließen |

Unterschiede zu den Bildschirmen der Hauptdatei:

- **Übungen** zeigt keine Uhrzeit, der Ring belegt den Rand, die
  Scroll-Anzeige der Hauptdatei entfällt deshalb. Ohne Scroll-Anzeige
  zeigen nur die gestauchten Randeinträge, dass die Liste weitergeht.
- **Satz** hat keine Wertfelder als Karten. Reps und kg stehen als große
  Zahlen nebeneinander, je 65 dp (130) breit und 56 dp (112) hoch, 10 dp (20)
  Abstand. Nur die kg-Zahl hat eine Fläche in `surface`, und die Zahl selbst
  steht in `primary`: das Gewicht wird häufiger geändert. Ein Tipp auf eine
  Zahl öffnet "Gewicht am Kranz" aus der Hauptdatei.
- **Pause** trägt nicht mehr Übung und Satz, nur "danach Trizeps". Welcher
  Satz gerade war, zeigt der Satz-Bildschirm davor.
- **Fertig** zeigt die Kennzahlen ohne Karten in drei gleich breiten
  Spalten. Das Wochenziel steht als Text in `success` unter der Überschrift
  und zusätzlich im Ring, die Punkte der Hauptdatei entfallen.

Gewicht am Kranz, Pause am Zifferblatt und Tile gibt es in Variante B nicht
eigens. Sie gelten wie in der Hauptdatei. Für "Gewicht am Kranz" heißt das:
dort ist der Ring die Position im Wertebereich, nicht der Stand der Einheit.
Der Wechsel der Bedeutung ist gewollt, weil der Bildschirm nur kurz offen ist.

## Kreisregel, gemessen

Abstand des jeweils weitesten Punkts zur Innenkante des Rings, verlangt sind
6 dp:

| Bildschirm | Element | Abstand |
|---|---|---|
| Heute | Starten | 28,5 dp |
| Übungen | oberster Eintrag | 6,48 dp |
| Übungen | Fokus-Eintrag | 6,33 dp |
| Übungen | Eintrag darunter | 6,26 dp |
| Übungen | unterster Eintrag | 6,37 dp |
| Satz | kg-Fläche | 16,3 dp |
| Satz | Speichern | 14,5 dp |
| Pause | beide Knöpfe | 21,6 dp |
| Fertig | Haken | 19,5 dp |
| Fertig | Schließen | 15,5 dp |

Die Übungsliste ist die knappe Stelle. Ihre Einträge sind gegenüber der
Hauptdatei schmaler, besonders unten: der unterste ist nur noch 103 dp (206)
breit statt 139 dp. Beim Scrollen werden sie in der Mitte breiter, dort ist
Platz.

## Schrift

Es gilt die Skala der Hauptdatei. Neu ist eine Rolle für die großen Zahlen auf
dem Satz-Bildschirm, weil sie dort ohne Karte stehen und die Karte der
Hauptdatei ersetzen:

| Rolle | sp | Gewicht | Laufweite | Einsatz |
|---|---|---|---|---|
| `valueLarge` | 29 | 800 | -0,04 em | Reps und kg auf Satz, Tabellenziffern |

Die Skizzen der Variante halten die Skala an mehreren Stellen nicht ein, wie
vor dem Angleichen die Skizzen der Hauptdatei. Für die Umsetzung gilt die
Skala, nicht die Skizze:

| Stelle | Skizze | Umsetzung |
|---|---|---|
| "Satz 3 von 3", Vorschlag auf Satz | 11 sp | `bodyLarge`, 12 sp |
| Wochenziel auf Fertig | 11 sp | `bodyLarge`, 12 sp |
| Marken HEUTE, PAUSE | 11 sp | `labelMedium`, 12 sp |
| Uhrzeit auf Heute | 11 sp | vom System gezeichnet (`TimeText`) |
| Countdown | 54 sp | `displayLarge`, 52 sp |
| Kennzahlen auf Fertig | 17 sp | `headlineSmall`, 18 sp |
| Einträge der Übungsliste am Rand | 10,5 bis 11,5 sp | gestaucht durch die Liste, ausgenommen wie in der Hauptdatei |

Ob "+1 Rep, Range 8 bis 12" mit 12 sp noch in eine Zeile passt, ist in der
Umsetzung zu prüfen, in der Skizze ist die Zeile 11 sp groß.

## Kontraste

Zusätzlich zu den Paaren der Hauptdatei geprüft:

| Paar | Kontrast |
|---|---|
| `primary` auf `surface` (kg-Zahl) | 5,27:1 |
| `onBackground` auf `surfaceFaint` (erledigter Eintrag) | 15,13:1 |
| `success` auf `surfaceFaint` (Zähler 3/3) | 8,19:1 |
| `success` gegen `surfaceRaised` (erledigtes gegen offenes Segment) | 6,61:1 |
| `primary` gegen `surfaceRaised` (aktuelles gegen offenes Segment) | 4,71:1 |
| `success` gegen `primary` (erledigt gegen aktuell) | 1,40:1, siehe Farbregel |

## Für Compose

```kotlin
object WearTokensKranz {
    val RingRadius = 102.dp        // Mittellinie
    val RingStroke = 6.dp
    val RingGapSession = 5.4.dp    // Bogenlänge je Lücke
    val RingGapWeek = 7.2.dp
    val RingInnerMargin = 6.dp     // Kreisregel gegen die Innenkante

    val ButtonPrimaryStart = 60.dp
    val ButtonPrimarySave = 56.dp
    val ButtonSecondary = 48.dp
}
```

Der Ring der Einheit braucht drei Farben je Segment. `SegmentedCircularProgressIndicator`
aus Wear Compose Material 3 kennt, soweit bekannt, nur erledigt und offen,
deshalb vermutlich eine eigene Zeichnung mit `drawArc` auf einem `Canvas`. Vor
dem Bauen gegen die verwendete Bibliotheksfassung prüfen. Die Knöpfe sind
`FilledIconButton` und `IconButton` mit fester Größe über `Modifier.size`,
`contentDescription` ist Pflicht.
