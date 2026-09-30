/* Fokus-Modus nach einem Neustart: er kommt mit seinem Plan zurück. Fehlt der
   Plan inzwischen, öffnet die App den normalen Trainingsreiter, statt einen
   Abschluss für einen Plan anzubieten, den es nicht mehr gibt. */
const { suite, tab, pickPlan, startFocus, saveSet } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await tab(p, "tag");
  await pickPlan(p, "Push Day");
  await startFocus(p);
  const ex = await p.evaluate(()=>S.exercise);
  for (let i = 0; i < 2; i++) {
    await saveSet(p);
  }
  check("die Übung hat ihr Satzziel", await p.evaluate(()=>
    doneSets(S.exercise, S.date) >= targetSets(S.exercise)), ex);

  // 1. Mit Plan
  await p.reload({ waitUntil:"load" }); await p.waitForTimeout(400);
  check("nach dem Neustart steht der Fokus-Modus wieder da",
    await p.evaluate(()=>S.focus && S.plan === "Push Day"));

  // 2. Plan inzwischen weg
  await p.evaluate(()=>{
    var d = readJson(SESSION_KEY, null);
    d.plan = "Gelöschter Plan";
    localStorage.setItem(SESSION_KEY, JSON.stringify(d));
  });
  await p.reload({ waitUntil:"load" }); await p.waitForTimeout(400);
  check("ohne den Plan kommt der Fokus-Modus nicht zurück",
    await p.evaluate(()=>!S.focus && !S.plan));
  check("und es wird kein Plan zum Abschließen angeboten",
    await p.locator('button:has-text("Trainingsplan abschließen")').count() === 0);
  check("die Übung bleibt gewählt", await p.evaluate(()=>S.exercise) === ex);
});
