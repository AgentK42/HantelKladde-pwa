---
description: Änderung am Verhalten mit Test zuerst, fremder Durchsicht und belegtem Bericht
argument-hint: <was sich ändert, und woran der Nutzer merkt, dass es geht>
---

Aufgabe: $ARGUMENTS

Ist die Aufgabe leer oder fehlt, woran der Nutzer merkt, dass es geht, frag
danach, bevor du anfängst. Ohne Abnahmekriterium helfen die Schritte unten wenig.

Qualität heißt hier, in dieser Reihenfolge:
1. Das Verhalten stimmt, auch an den Rändern.
2. Wer diese Stelle als Nächster ändert, versteht sie ohne Rückfrage.
3. Der Code sieht aus wie der Code daneben.
Nicht gemeint: mehr Abstraktion, Umbau oder Kommentare, als die Aufgabe braucht.
CLAUDE.md gilt. Halte es ein, statt es zu wiederholen.

## Vor dem ersten Edit

1. Lies den README-Abschnitt zum Thema und die Funktionen, die du änderst,
   ganz, nicht nur die Fundstelle. Suche jede Stelle, die denselben Wert liest
   oder schreibt (Anzeige, Regler, Laden, Import, `mergeBackup`), und liste sie
   auf.
2. Sag in drei bis fünf Sätzen: wohin die Änderung gehört, welche vorhandenen
   Helfer du nutzt, ob eine Funktion über 100 Zeilen wächst, welche
   dokumentierte Entscheidung berührt ist. Widerspricht die Aufgabe README oder
   `docs/kotlin-rewrite-plan.md` (etwa kein Funktionszuwachs in der PWA bis
   Phase 5), halte an und frag.
3. Frag nur, wenn die Antwort das Ergebnis ändert. Sonst entscheide selbst und
   nenne die Annahme.

## Beim Bauen

4. Erst den Test unter `tools/tests/`, dann laufen lassen und rot sehen, und
   zwar am Verhalten, nicht an einem fehlenden Selektor. Einen Fehler stellst
   du zuerst im Test nach. Ist der Test vorher schon grün, prüft er nichts.
   Lässt sich etwas nicht als Verhalten testen (reine Gestaltung), sag das und
   prüfe es am Bildschirmfoto.
5. Dann die kleinste Änderung, die ihn grün macht. Braucht sie einen Umbau,
   kommt der als eigener Commit davor, mit grüner Kette.
6. Prüfe die Ränder ausdrücklich: leerer Stand, alter Stand aus einem Backup,
   Grenze genau getroffen, Aufwärmsatz, zweiter Weg zum selben Wert. Frag bei
   jeder frühen Rückkehr: was ist davor schon passiert?

## Vor dem Push

7. Ganze Prüfkette laut CLAUDE.md. Bei Oberfläche: Bildschirmfotos hell und
   dunkel bei 390 Pixel Breite erzeugen und auch ansehen.
8. Ein frischer Subagent prüft die Änderung. Er bekommt nur den Diff und die
   Aufgabe, nicht deine Begründung, und sein Auftrag ist Fehler finden, nicht
   bestätigen. Jeden Fund prüfst du am Code und sagst, warum du ihn übernimmst
   oder verwirfst.
9. Lies deinen Diff Zeile für Zeile. Was nicht zur Aufgabe gehört, fliegt raus.
   Bei gelöschten Zeilen: was stand davor und danach?

## Bericht

10. Was geändert ist, was womit geprüft ist, was ungeprüft bleibt. Keine
    Aussage ohne einen Lauf dahinter. Fertig heißt: Test vorher rot und danach
    grün, Kette grün, jeder Fund entschieden. "Sollte gehen" heißt nicht
    fertig. Was du nicht weißt, sagst du.
