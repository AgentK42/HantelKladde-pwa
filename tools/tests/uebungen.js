/* Eigene Übungen anlegen, umbenennen, zusammenführen, löschen, und jedes davon
   rückgängig. Dazu Satz und Plan löschen samt Rückgängig. Angelegt wird im
   Wähler des Trainings und unter Daten, mit Startwerten und Muskelgruppe. */
const { suite, tab } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.evaluate(() => {
    window.confirm = function () { return window.__yes !== false; };
    S.entries = [
      { id:"t1", date:"2026-01-05", exercise:"Trizeps", set:1, weight:20, reps:10, rpe:8, ts:Date.parse("2026-01-05T18:00:00") },
      { id:"t2", date:"2026-01-05", exercise:"Trizeps", set:2, weight:20, reps:9, rpe:8, ts:Date.parse("2026-01-05T18:05:00") },
      { id:"d1", date:"2026-01-05", exercise:"Dips", set:1, weight:10, reps:8, rpe:8, ts:Date.parse("2026-01-05T18:02:00") }
    ];
    S.exmeta = { "Dips":{ note:"Griff breit" }, "Trizeps":{ note:"Seil" } };
    persist(); render();
  });

  // 1. Anlegen im Wähler: Kategorie, Startwerte, Muskelgruppe, gleich gewählt
  await p.click('[data-act="pickopen"]'); await p.waitForTimeout(150);
  await p.fill("#newName", " Kabelrudern ");
  await p.selectOption("#newCat", "Pull");
  await p.fill("#newSets", "4"); await p.fill("#newReps", "12"); await p.fill("#newWeight", "32,5");
  await p.selectOption("#newMusclePrimary", "Rücken");
  await p.selectOption("#newMuscleSecondary", "Bizeps");
  await p.click('[data-act="addex"]'); await p.waitForTimeout(150);
  const made = await p.evaluate(() => ({ cat:catOf("Kabelrudern"), meta:JSON.stringify(S.exmeta.Kabelrudern),
    ex:S.exercise, reps:S.reps, weight:S.weight, open:S.pickOpen, sets:targetSets("Kabelrudern"),
    mo:JSON.stringify(muscleOf("Kabelrudern")) }));
  check("neue Übung steht in ihrer Kategorie", made.cat === "Pull");
  check("Startwerte und Muskeln liegen an der Übung",
    made.meta === '{"sets":4,"reps":12,"weight":32.5,"musclePrimary":"Rücken","muscleSecondary":"Bizeps"}', made.meta);
  check("sie ist gleich gewählt, mit den Startwerten", made.ex === "Kabelrudern" && made.reps === "12" &&
    made.weight === "32,5" && !made.open && made.sets === 4, JSON.stringify(made));
  check("sie zählt für ihre Muskeln", made.mo === '{"primary":"Rücken","secondary":["Bizeps"]}', made.mo);

  // 2. Anlegen unter Daten: Meldung, gleiche Sekundär- wie Primärgruppe fällt weg
  await tab(p, "daten");
  await p.click('[data-act="secfold"][data-v="uebungen"]'); await p.waitForTimeout(150);
  await p.fill("#dataNewName", "Beinschwinger");
  await p.selectOption("#dataNewCat", "Legs");
  await p.selectOption("#dataNewMusclePrimary", "Gesäß");
  await p.evaluate(() => { var s = document.getElementById("dataNewMuscleSecondary"); s.disabled = false; s.value = "Gesäß"; });
  await p.click('[data-act="addexdata"]'); await p.waitForTimeout(150);
  const data = await p.evaluate(() => ({ note:S.note, meta:JSON.stringify(S.exmeta.Beinschwinger), ex:S.exercise }));
  check("unter Daten meldet das Anlegen", data.note === "Beinschwinger angelegt.", data.note);
  check("dieselbe Gruppe als Sekundär fällt weg", data.meta.indexOf('"muscleSecondary":""') > 0, data.meta);
  check("unter Daten wird keine Übung gewählt", data.ex === "Kabelrudern");
  await p.fill("#dataNewName", "Flys");
  await p.click('[data-act="addexdata"]'); await p.waitForTimeout(150);
  check("einen vorhandenen Namen legt es nicht doppelt an", await p.evaluate(() =>
    S.note === "Flys gibt es schon." && customNames().indexOf("Flys") < 0));

  // 3. Umbenennen: Sätze, Pläne, Übungsdaten ziehen mit, Rückgängig holt alles zurück
  await p.evaluate(() => { S.exOpen = "Trizeps"; render(); });
  await p.fill("#ren-name", "Trizepsdrücken");
  await p.click('[data-act="rendo"]'); await p.waitForTimeout(150);
  const ren = await p.evaluate(() => ({ ex:S.entries.filter(function (e) { return e.id[0] === "t"; }).map(function (e) { return e.exercise; }).join(),
    plan:S.plans["Push Day"].some(function (i) { return i.name === "Trizepsdrücken"; }),
    meta:S.exmeta["Trizepsdrücken"] && S.exmeta["Trizepsdrücken"].note, old:!!S.exmeta.Trizeps,
    hidden:S.settings.hiddenEx.indexOf("Trizeps") >= 0, label:S.undo && S.undo.label }));
  check("umbenannt: Sätze, Plan und Einstellung ziehen mit",
    ren.ex === "Trizepsdrücken,Trizepsdrücken" && ren.plan && ren.meta === "Seil" && !ren.old, JSON.stringify(ren));
  check("der alte mitgelieferte Name ist ausgeblendet", ren.hidden);
  check("Rückgängig wird angeboten", ren.label === "Trizeps heißt jetzt Trizepsdrücken.", ren.label);
  await p.click('[data-act="undo"]'); await p.waitForTimeout(150);
  check("Rückgängig stellt den alten Namen her", await p.evaluate(() =>
    S.entries.filter(function (e) { return e.exercise === "Trizeps"; }).length === 2 &&
    S.plans["Push Day"].some(function (i) { return i.name === "Trizeps"; }) && S.exmeta.Trizeps.note === "Seil" &&
    S.settings.hiddenEx.indexOf("Trizeps") < 0 && S.note === "Wiederhergestellt."));

  // 4. Zusammenführen mit Nachfrage: Sätze gemeinsam nummeriert, Einstellung des Ziels bleibt
  await p.evaluate(() => { window.__yes = false; S.exOpen = "Trizeps"; render(); });
  await p.fill("#ren-name", "Dips");
  await p.click('[data-act="rendo"]'); await p.waitForTimeout(150);
  check("ohne Zustimmung bleibt alles", await p.evaluate(() =>
    S.entries.filter(function (e) { return e.exercise === "Trizeps"; }).length === 2 && !S.undo));
  await p.evaluate(() => { window.__yes = true; });
  await p.click('[data-act="rendo"]'); await p.waitForTimeout(150);
  const mg = await p.evaluate(() => ({
    sets:S.entries.filter(function (e) { return e.exercise === "Dips"; }).sort(function (a, b) { return a.ts - b.ts; })
      .map(function (e) { return e.id + e.set; }).join(), note:S.exmeta.Dips.note, label:S.undo.label }));
  check("zusammengeführt und neu nummeriert", mg.sets === "t11,d12,t23", mg.sets);
  check("die Einstellung des Ziels bleibt", mg.note === "Griff breit");
  check("die Meldung sagt zusammengeführt", mg.label === "Trizeps mit Dips zusammengeführt.", mg.label);
  await p.click('[data-act="undo"]'); await p.waitForTimeout(150);
  check("Rückgängig trennt wieder und nummeriert beide", await p.evaluate(() =>
    S.entries.map(function (e) { return e.exercise + e.set; }).join() === "Trizeps1,Trizeps2,Dips1"));

  // 5. Löschen einer eigenen Übung, nur ohne Sätze und Plan
  const del = await p.evaluate(() => {
    S.entries.push({ id:"k1", date:"2026-01-06", exercise:"Kabelrudern", set:1, weight:30, reps:10, rpe:null, ts:Date.parse("2026-01-06T18:00:00") });
    var used = ACTIONS.exdel("Kabelrudern") === false && customNames().indexOf("Kabelrudern") >= 0;
    S.entries.pop();
    S.exmeta.Beinschwinger.note = "Polster";
    S.cats.Beinschwinger = "Core";
    ACTIONS.exdel("Beinschwinger"); render();
    return { used:used, gone:customNames().indexOf("Beinschwinger") < 0 && !S.exmeta.Beinschwinger,
      label:S.undo && S.undo.label, preset:removable("Flys") };
  });
  check("mitgelieferte Übungen lassen sich nicht löschen", del.preset === false);
  check("eine Übung mit Sätzen lässt sich nicht löschen", del.used);
  check("eine unbenutzte eigene Übung wird gelöscht", del.gone && del.label === "Beinschwinger gelöscht.", JSON.stringify(del));
  await p.click('[data-act="undo"]'); await p.waitForTimeout(150);
  check("Rückgängig bringt sie samt Einstellung zurück", await p.evaluate(() =>
    customNames().indexOf("Beinschwinger") >= 0 && S.exmeta.Beinschwinger.note === "Polster"));
  check("und in ihrer Gruppe", await p.evaluate(() => catOf("Beinschwinger") === "Core"));

  // 6. Satz löschen: Nummern rücken nach, Rückgängig setzt ihn an seinen Platz
  await tab(p, "tag");
  await p.evaluate(() => { S.date = "2026-01-05"; render(); });
  await p.click('[data-act="del"][data-v="t1"]'); await p.waitForTimeout(150);
  check("gelöscht, der Rest rückt nach", await p.evaluate(() =>
    S.entries.map(function (e) { return e.id + e.set; }).join() === "t21,d11" && S.undo.label === "Satz 1 bei Trizeps gelöscht."));
  await p.click('[data-act="undo"]'); await p.waitForTimeout(150);
  check("Rückgängig setzt den Satz an seinen Platz", await p.evaluate(() =>
    S.entries.map(function (e) { return e.id + e.set; }).join() === "t11,t22,d11"));

  // 7. Plan löschen: Farbe, Wochenziel, Historie, Sichtbarkeit, und zurück
  await p.evaluate(() => {
    S.colors["Pull Day"] = "#123456"; S.settings.weekGoals["Pull Day"] = 2;
    S.settings.weekGoalLog["Pull Day"] = [{ since:"2026-01-05", value:2 }];
    S.settings.hiddenPlans.push("Pull Day"); S.settings.lockedPlans.push("Pull Day"); S.plan = "Pull Day";
  });
  await tab(p, "plaene");
  await p.click('[data-act="delplan"][data-v="Pull Day"]'); await p.waitForTimeout(150);
  check("Plan gelöscht, mit allem, was an ihm hing", await p.evaluate(() =>
    !S.plans["Pull Day"] && !S.colors["Pull Day"] && S.settings.weekGoals["Pull Day"] == null &&
    !S.settings.weekGoalLog["Pull Day"] && S.settings.hiddenPlans.indexOf("Pull Day") < 0 &&
    S.settings.lockedPlans.indexOf("Pull Day") < 0 && S.plan === ""));
  await p.click('[data-act="undo"]'); await p.waitForTimeout(150);
  check("Rückgängig bringt Plan, Farbe, Ziel und Historie", await p.evaluate(() =>
    S.plans["Pull Day"].length === 8 && S.colors["Pull Day"] === "#123456" &&
    S.settings.weekGoals["Pull Day"] === 2 && S.settings.weekGoalLog["Pull Day"].length === 1));
  check("Rückgängig bringt auch Ausblendung und Sperre", await p.evaluate(() =>
    planHidden("Pull Day") && planLocked("Pull Day")));
  await p.click('[data-act="delplan"][data-v="Push Day"]'); await p.waitForTimeout(150);
  await p.click('[data-act="undo"]'); await p.waitForTimeout(150);
  check("ein sichtbarer, offener Plan kommt sichtbar und offen zurück", await p.evaluate(() =>
    !!S.plans["Push Day"] && !planHidden("Push Day") && !planLocked("Push Day")));

  // 8. Namen, die ein gewöhnliches Objekt schon kennt, werden nirgends angenommen
  await p.evaluate(() => { S.pickOpen = true; S.view = "tag"; render(); });
  for (const bad of ["__proto__", "toString"]) {
    await p.fill("#newName", bad);
    await p.click('[data-act="addex"]'); await p.waitForTimeout(150);
    check("Übung " + bad + " wird abgelehnt", await p.evaluate((n) =>
      S.note === "„" + n + "“ ist als Name nicht möglich." && customNames().indexOf(n) < 0 &&
      ({}).sets === undefined && typeof Object.prototype.toString === "function" &&
      Object.prototype.toString.step === undefined, bad));
    await p.evaluate(() => { S.pickOpen = true; render(); });
  }
  await tab(p, "plaene");
  await p.fill("#newPlan", "constructor");
  await p.click('[data-act="addplan"]'); await p.waitForTimeout(150);
  check("ein Plan constructor wird abgelehnt", await p.evaluate(() =>
    S.note === "„constructor“ ist als Name nicht möglich." &&
    Object.keys(S.plans).indexOf("constructor") < 0));
  await tab(p, "daten");
  await p.evaluate(() => { S.secOpen.uebungen = true; S.exOpen = "Dips"; render(); });
  await p.fill("#ren-name", "valueOf");
  await p.click('[data-act="rendo"]'); await p.waitForTimeout(150);
  check("umbenennen in valueOf wird abgelehnt", await p.evaluate(() =>
    S.note === "„valueOf“ ist als Name nicht möglich." &&
    S.entries.every(function (e) { return e.exercise !== "valueOf"; })));
  check("ein Backup mit einem solchen Namen wird abgelehnt", await p.evaluate(() => {
    var d = JSON.parse(backupText()); d.exmeta = { "toString":{ note:"x" } };
    try { prepareBackup(d); return false; }
    catch (e) { return e.message.indexOf("nicht erlaubten Namen") > 0; }
  }));
  check("eine alte Übung mit geerbtem Namen bekommt einen eigenen Eintrag", await p.evaluate(() => {
    ownMeta("hasOwnProperty").note = "Sitz 2";
    return Object.prototype.hasOwnProperty.call(S.exmeta, "hasOwnProperty") &&
      noteOf("hasOwnProperty") === "Sitz 2" && typeof Object.prototype.hasOwnProperty === "function";
  }));
});
