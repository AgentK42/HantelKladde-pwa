/* Fokus-Modus nach einem Neustart: er kommt mit seinem Plan zurück. Fehlt der
   Plan inzwischen, öffnet die App den normalen Trainingsreiter, statt einen
   Abschluss für einen Plan anzubieten, den es nicht mehr gibt. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(150);
  await p.click('.plans button[data-act="plan"][data-v="Push Day"]'); await p.waitForTimeout(200);
  await p.click('button[data-act="focuson"]'); await p.waitForTimeout(200);
  const ex = await p.evaluate(()=>S.exercise);
  for (let i = 0; i < 2; i++) {
    await p.click('button[data-act="save"]'); await p.waitForTimeout(1100);
  }
  check("die Übung hat ihr Satzziel", await p.evaluate(()=>
    doneSets(S.exercise, S.date) >= targetSets(S.exercise)), ex);

  // 1. Mit Plan
  await p.evaluate(()=>saveSession());
  await p.reload({ waitUntil:"load" }); await p.waitForTimeout(400);
  check("nach dem Neustart steht der Fokus-Modus wieder da",
    await p.evaluate(()=>S.focus && S.plan === "Push Day"));

  // 2. Plan inzwischen weg
  await p.evaluate(()=>{
    var d = JSON.parse(localStorage.getItem("kraftlog:session"));
    d.plan = "Gelöschter Plan"; d.ts = Date.now();
    localStorage.setItem("kraftlog:session", JSON.stringify(d));
  });
  await p.reload({ waitUntil:"load" }); await p.waitForTimeout(400);
  check("ohne den Plan kommt der Fokus-Modus nicht zurück",
    await p.evaluate(()=>!S.focus && !S.plan));
  check("und es wird kein Plan zum Abschließen angeboten",
    await p.locator('button:has-text("Trainingsplan abschließen")').count() === 0);
  check("die Übung bleibt gewählt", await p.evaluate(()=>S.exercise) === ex);
});
