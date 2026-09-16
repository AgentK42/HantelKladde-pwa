/* Wochen getrennt planen: zwei volle Kalenderwochen, eine Abweichung je Woche,
   Chips und Tabelle je Woche, Übernehmen nimmt die angezeigte Woche. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.click('.seg button[data-v="planung"]'); await p.waitForTimeout(120);

  // Wochenregel: genau zwei volle KW, erster Tag ist ein Montag in der Zukunft (oder heute)
  const w = await p.evaluate(()=>planWeeks().map(x=>x.monday));
  check("zwei Wochen", w.length===2, w.join(" / "));
  check("erster Montag ab heute", await p.evaluate(([m])=>{
    const td=todayISO(); return m>=td && m===mondayOf(m) && (mondayOf(td)===td ? m===td : m===shiftISO(mondayOf(td),7));
  },[w[0]]));
  check("zweite Woche folgt", w[1]===await p.evaluate(([m])=>shiftISO(m,7),[w[0]]));
  check("kein gesperrter Tag", await p.locator(".cal .wday:disabled").count()===0);
  check("Auswahl startet am ersten Tag", await p.evaluate(([m])=>S.planDaySel===m,[w[0]]));

  // Ohne Trennung: keine Reiter, ein Entwurf
  check("keine Reiter ohne Trennung", await p.locator(".seg2").count()===0);
  await p.click('.tog[data-v="Push Day"]');
  await p.click('.step button[data-act="draftstep"][data-v="Push Day"][data-d="1"]');
  check("Push 2x im Entwurf", await p.evaluate(()=>draftEntry("Push Day").times===2));

  // Trennen
  await p.click(".wksplit"); await p.waitForTimeout(120);
  check("getrennt", await p.evaluate(()=>S.draft.split===true));
  check("zwei Reiter", await p.locator(".seg2 button").count()===2);
  check("erste Woche aktiv", await p.evaluate(([m])=>selWeek()===m,[w[0]]));
  check("beide Wochen zunaechst gleich", await p.evaluate(([a,b])=>
    draftEntry("Push Day",a).times===2 && draftEntry("Push Day",b).times===2,[w[0],w[1]]));
  check("Ueberschrift nennt die KW", (await p.locator(".sect span").allInnerTexts()).some(t=>t.startsWith("KW ")));

  // Zweite Woche aendern
  await p.click('.seg2 button[data-v="'+w[1]+'"]'); await p.waitForTimeout(120);
  check("zweite Woche gewaehlt", await p.evaluate(([m])=>selWeek()===m,[w[1]]));
  await p.click('.step button[data-act="draftstep"][data-v="Push Day"][data-d="1"]');
  await p.waitForTimeout(100);
  check("KW2 jetzt 3x", await p.evaluate(([b])=>draftEntry("Push Day",b).times===3,[w[1]]));
  check("KW1 unveraendert 2x", await p.evaluate(([a])=>draftEntry("Push Day",a).times===2,[w[0]]));
  check("Abweichung nur fuer die zweite Woche", await p.evaluate(([b])=>Object.keys(S.draft.weeks).length===1 && !!S.draft.weeks[b],[w[1]]));

  // Unberuehrte Woche folgt der ersten
  await p.click('.seg2 button[data-v="'+w[0]+'"]');
  await p.click('.tog[data-v="Pull Day"]'); await p.waitForTimeout(100);
  check("Pull in KW1 an", await p.evaluate(([a])=>draftEntry("Pull Day",a).on,[w[0]]));
  check("KW2 folgt nicht mehr (eigener Stand)", await p.evaluate(([b])=>draftEntry("Pull Day",b).on===false,[w[1]]));

  // Einzelne Uebung landet nur in der gewaehlten Woche
  await p.click('.seg2 button[data-v="'+w[1]+'"]');
  await p.click('button[data-act="pickmulti"]'); await p.waitForTimeout(120);
  await p.fill("#searchEx","Lower Back"); await p.waitForTimeout(150);
  await p.click('.excard[data-v="Lower Back Crunch"]');
  await p.click('button[data-act="pickmultidone"]'); await p.waitForTimeout(120);
  check("Uebung in KW2", await p.evaluate(([b])=>weekDraft(b).extras.length===1,[w[1]]));
  check("KW1 ohne Uebung", await p.evaluate(([a])=>weekDraft(a).extras.length===0,[w[0]]));
  check("Balken rechnen je Woche", await p.evaluate(([a,b])=>
    muscleTally(draftSources(b)).by["Unterer Rücken"].total===2 &&
    muscleTally(draftSources(a)).by["Unterer Rücken"].total===0,[w[0],w[1]]));

  // Zuweisen: Chips kommen aus dem Entwurf des Tages
  const d1 = w[0], d2 = w[1];
  await p.click('.cal .wday[data-v="'+d1+'"]'); await p.waitForTimeout(120);
  check("Tag schaltet den Reiter", await p.evaluate(([a])=>selWeek()===a,[w[0]]));
  const chips1 = await p.locator('.assign .chips button').allInnerTexts();
  check("KW1 bietet Push und Pull", chips1.join(",").includes("Push Day") && chips1.join(",").includes("Pull Day"), chips1.join(","));
  await p.click('.assign .chips button[data-act="planassign"][data-v="Push Day"]');
  await p.waitForTimeout(120);
  check("zugewiesen", await p.evaluate(([a])=>S.settings.planDays[a]==="Push Day",[d1]));
  await p.click('.cal .wday[data-v="'+d2+'"]'); await p.waitForTimeout(120);
  const chips2 = await p.locator('.assign .chips button').allInnerTexts();
  check("KW2 ohne Pull", !chips2.join(",").includes("Pull Day"), chips2.join(","));
  // Tabelle je Woche
  const sums = await p.locator(".wsum .c").allInnerTexts();
  check("Tabelle vergleicht je Woche", sums[0]==="1 / 2" && sums[1]==="0 / 3", sums.join(" | "));

  // Uebernehmen nimmt die angezeigte Woche
  await p.click('button[data-act="drafttake"]'); await p.waitForTimeout(150);
  check("Wochenziel aus KW2", await p.evaluate(()=>S.settings.weekGoals["Push Day"]===3 && !S.settings.weekGoals["Pull Day"]));
  check("Hinweis nennt die KW", (await p.locator(".notice").first().innerText()).includes("KW"));
  check("KW1 behaelt seinen Stand", await p.evaluate(([a])=>draftEntry("Push Day",a).times===2 && draftEntry("Pull Day",a).on,[w[0]]));

  // Neustart: Trennung und Abweichung ueberleben
  await p.reload({waitUntil:"load"}); await p.waitForTimeout(250);
  check("Trennung ueberlebt", await p.evaluate(()=>S.draft.split===true));
  check("Abweichung ueberlebt", await p.evaluate(([b])=>draftEntry("Push Day",b).times===3 && weekDraft(b).extras.length===1,[w[1]]));
  check("Backup ohne Entwurf", await p.evaluate(()=>JSON.stringify(JSON.parse(backupText())).indexOf("split")<0));

  // Trennung aufheben
  await p.click('.seg button[data-v="planung"]'); await p.waitForTimeout(120);
  await p.click(".wksplit"); await p.waitForTimeout(120);
  check("wieder gemeinsam", await p.evaluate(()=>S.draft.split===false && Object.keys(S.draft.weeks).length===0));
  check("Reiter weg", await p.locator(".seg2").count()===0);
  // Verwerfen
  await p.click('button[data-act="draftreset"]'); await p.waitForTimeout(120);
  check("verworfen", await p.evaluate(()=>Object.keys(S.draft.plans).length===0 && S.draft.extras.length===0));

  // Schreiben trifft die angezeigte Liste: liegt fuer die erste Woche schon eine
  // Abweichung vor, etwa nach dem Wochenwechsel bei offener App, muss das
  // Bearbeiten dieselbe Liste treffen wie das Anzeigen.
  const r2 = await p.evaluate(()=>{
    S.draft = { split:true, plans:{}, extras:[{ name:"Flys", sets:3, times:1 }], weeks:{} };
    var first = planWeeks()[0].monday;
    S.draft.weeks[first] = { plans:{}, extras:[{ name:"Dips", sets:2, times:1 }] };
    var lesen = weekDraft(first), schreiben = weekDraftEdit(first);
    return { gleich: lesen === schreiben, name: schreiben.extras[0].name };
  });
  check("Lesen und Schreiben treffen dieselbe Liste", r2.gleich && r2.name==="Dips", JSON.stringify(r2));
  check("ohne Abweichung bleibt die erste Woche der Basisentwurf", await p.evaluate(()=>{
    S.draft = { split:true, plans:{}, extras:[], weeks:{} };
    return weekDraftEdit(planWeeks()[0].monday) === S.draft;
  }));
  check("eine spätere Woche bekommt weiter ihre eigene Kopie", await p.evaluate(()=>{
    var w2 = planWeeks()[1].monday, e = weekDraftEdit(w2);
    return e !== S.draft && S.draft.weeks[w2] === e;
  }));
  await p.evaluate(()=>{ S.draft = { split:false, plans:{}, extras:[], weeks:{} }; saveDraft(); });
});
