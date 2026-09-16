/* Eingaben beim Tippen: jede Aktion aus INPUT_ACTIONS mit echten input-Ereignissen,
   die Suchfelder behalten den Fokus, das Textfeld ohne data-act schreibt S.out. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();

  check("alle neun Eingabe-Aktionen stehen in der Tabelle", await p.evaluate(()=>
    ["input","search","hsearch","defedit","weekgoaledit","pedit","noteinput","exnoteinput","exnoteset"]
      .every(function(k){ return typeof INPUT_ACTIONS[k]==="function"; }) &&
    INPUT_ACTIONS.exnoteset===INPUT_ACTIONS.exnoteinput));

  // 1. Gewicht tippen
  await p.evaluate(()=>{ S.view="tag"; S.plan="Push Day"; S.plansFold=true; S.exercise="Benchpress Maschine"; S.weight="40"; S.reps="10"; S.source="vorschlag"; render(); });
  await p.fill('input[data-act="input"][data-f="weight"]', "42,5");
  check("Gewicht tippen setzt S.weight und löscht die Quelle", await p.evaluate(()=>S.weight==="42,5" && S.source===""));

  // 2. Uebungssuche behaelt den Fokus
  await p.click('[data-act="pickopen"]'); await p.waitForTimeout(150);
  const before = await p.locator('button.excard').count();
  await p.fill("#searchEx", "lat"); await p.waitForTimeout(150);
  const after = await p.locator('button.excard').count();
  check("Suche filtert die Liste", await p.evaluate(()=>S.search==="lat") && after < before, before+" -> "+after);
  check("Suche behält den Fokus nach dem Neuaufbau", await p.evaluate(()=>document.activeElement && document.activeElement.id==="searchEx"));
  await p.evaluate(()=>{ S.pickOpen=false; S.search=""; });

  // 3. Standardwerte
  await p.evaluate(()=>{ S.view="plaene"; render(); });
  await p.fill("#defSets", "3");
  check("Standardwert Sätze wird übernommen und gesichert", await p.evaluate(()=>S.settings.defSets===3 && JSON.parse(localStorage.getItem("kraftlog:settings")).defSets===3));
  await p.fill("#defSets", "0");
  check("Null bei Sätzen wird übergangen", await p.evaluate(()=>S.settings.defSets===3));
  await p.fill("#defWeight", "0");
  check("Null beim Gewicht ist erlaubt", await p.evaluate(()=>S.settings.defWeight===0));

  // 4. Wochenziel
  await p.fill('input[data-act="weekgoaledit"][data-v="Push Day"]', "2");
  check("Wochenziel setzt die Zahl und weckt den Speichern-Knopf", await p.evaluate(()=>
    S.settings.weekGoals["Push Day"]===2 && document.querySelector('[data-act="weekgoalrestart"]').disabled===false));

  // 5. Planeintrag
  await p.fill('input[data-act="pedit"][data-p="Push Day"][data-i="0"][data-f="reps"]', "12");
  check("Reps im Plan-Editor werden übernommen", await p.evaluate(()=>S.plans["Push Day"][0].reps===12));
  await p.fill('input[data-act="pedit"][data-p="Push Day"][data-i="0"][data-f="sets"]', "0");
  check("Null Sätze werden auf eins gehoben", await p.evaluate(()=>S.plans["Push Day"][0].sets===1));
  await p.fill('input[data-act="pedit"][data-p="Push Day"][data-i="0"][data-f="weight"]', "37,5");
  check("Gewicht mit Komma wird zur Zahl", await p.evaluate(()=>S.plans["Push Day"][0].weight===37.5));

  // 6. Tagesnotiz
  await p.evaluate(()=>{ var d=todayISO(); S.entries=[{id:"n1",date:d,exercise:"Flys",set:1,weight:30,reps:10,rpe:null,ts:Date.parse(d+"T10:00:00")}];
    S.view="tag"; S.noteOpen=true; render(); });
  await p.fill("#dayNote", "Bank besetzt");
  check("Tagesnotiz wird gespeichert", await p.evaluate(()=>S.notes[todayISO()]==="Bank besetzt" && JSON.parse(localStorage.getItem("kraftlog:notes"))[todayISO()]==="Bank besetzt"));
  await p.fill("#dayNote", "   ");
  check("leere Notiz wird gelöscht", await p.evaluate(()=>S.notes[todayISO()]===undefined));

  // 7. Geraeteeinstellung im Training
  await p.evaluate(()=>{ S.exercise="Flys"; S.exNoteFor="Flys"; render(); });
  await p.fill("#exNote", "Sitz 4");
  check("Geräteeinstellung landet in exmeta", await p.evaluate(()=>noteOf("Flys")==="Sitz 4"));
  check("die Anzeigezeile zieht ohne Neuaufbau mit", await p.evaluate(()=>{ var l=document.querySelector(".exnote > span"); return l && l.textContent==="Sitz 4" && l.parentNode.className==="exnote"; }));
  await p.fill("#exNote", "");
  check("leer zeigt den Platzhalter und wird blank", await p.evaluate(()=>{ var l=document.querySelector(".exnote > span"); return l && l.textContent==="Geräteeinstellung notieren" && l.parentNode.className==="exnote blank"; }));

  // 8. Geraeteeinstellung unter Daten
  await p.evaluate(()=>{ S.view="daten"; S.secOpen.uebungen=true; S.exOpen="Squats"; render(); });
  await p.fill("#cnote-in", "Griff eng");
  check("Geräteeinstellung aus der Übungsliste", await p.evaluate(()=>noteOf("Squats")==="Griff eng"));

  // 9. Suche im Verlauf
  await p.evaluate(()=>{ var d=todayISO(); var names=["Flys","Squats","Deadlifts","Dips","Shrugs","Seitheben","Trizeps"];
    S.entries=names.map(function(n,i){ return {id:"h"+i,date:d,exercise:n,set:1,weight:20,reps:10,rpe:null,ts:Date.parse(d+"T10:00:00")+i*60000}; });
    S.view="verlauf"; S.hsearch=""; render(); });
  await p.fill("#histSearch", "fly"); await p.waitForTimeout(150);
  check("Verlaufssuche filtert und behält den Fokus", await p.evaluate(()=>S.hsearch==="fly" && document.activeElement.id==="histSearch" &&
    document.querySelectorAll(".card h3").length>=1));

  // 10. Textfeld ohne data-act
  await p.evaluate(()=>{ S.view="daten"; S.out="{}"; render(); });
  await p.fill("#out", '{"a":1}');
  check("das Textfeld ohne data-act schreibt S.out", await p.evaluate(()=>S.out==='{"a":1}'));
});
