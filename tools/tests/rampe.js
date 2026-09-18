/* Aufwärmrampe: jeder Rampenwert liegt auf dem Raster des Arbeitsgewichts, also
   erreichbar an einer Maschine, deren Stufen bei 5 kg beginnen und in 3,75er
   Schritten weitergehen. Langhantel und Kurzhantel wie zuvor, Untergrenze bleibt. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  const ramp = (name, w) => p.evaluate((a) => warmupPlan(a[0], a[1]).map(function (r) { return [r.weight, r.reps]; }), [name, w]);
  const onGrid = (vals, start, step) => vals.every(v => Math.abs(((v - start) / step) - Math.round((v - start) / step)) < 1e-9);

  // Flys, 3,75er Schritt, Arbeitsgewicht 65 = 5 + 16 x 3,75
  let r = await ramp("Flys", 65);
  check("Flys 65 kg: drei Stufen", r.length === 3, JSON.stringify(r));
  check("Flys 65 kg: 31,25, 46,25 und 53,75", JSON.stringify(r.map(x => x[0])) === "[31.25,46.25,53.75]", JSON.stringify(r));
  check("Flys 65 kg: alle Stufen im Raster 5 + n x 3,75", onGrid(r.map(x => x[0]), 5, 3.75), JSON.stringify(r));
  check("Flys 65 kg: 8, 5 und 3 Wiederholungen", JSON.stringify(r.map(x => x[1])) === "[8,5,3]");

  // Dasselbe für jedes Arbeitsgewicht auf dem Maschinenraster zwischen 20 und 100 kg
  const off = await p.evaluate(() => {
    var bad = [];
    for (var k = 4; k <= 26; k++) {
      var w = 5 + k * 3.75;
      warmupPlan("Benchpress Maschine", w).forEach(function (r) {
        var m = (r.weight - 5) / 3.75;
        if (Math.abs(m - Math.round(m)) > 1e-9) bad.push(w + " -> " + r.weight);
      });
    }
    return bad;
  });
  check("Maschine: kein Rampenwert neben einer Stufe, 23 Arbeitsgewichte", off.length === 0, JSON.stringify(off.slice(0, 5)));

  // Langhantel: Vielfache der Schrittweite, wie bisher, Untergrenze Stange
  r = await ramp("Squats", 100);
  check("Squats 100 kg: 50, 70, 85", JSON.stringify(r.map(x => x[0])) === "[50,70,85]", JSON.stringify(r));
  r = await ramp("Squats", 30);
  check("Squats 30 kg: nicht unter die Stange, doppelte Stufe fällt weg", JSON.stringify(r.map(x => x[0])) === "[20,25]", JSON.stringify(r));

  // Kurzhantel, 2er Schritt
  r = await ramp("Seitheben", 14);
  check("Seitheben 14 kg: 6, 10, 12", JSON.stringify(r.map(x => x[0])) === "[6,10,12]", JSON.stringify(r));

  // Ein Gewicht außerhalb jedes Rasters bekommt eine Rampe in ganzen Schritten darunter
  r = await ramp("Flys", 33);
  check("33 kg Flys: Schritte von 3,75 unter dem Arbeitsgewicht", r.every(x => Math.abs(((33 - x[0]) / 3.75) - Math.round((33 - x[0]) / 3.75)) < 1e-9), JSON.stringify(r));

  // Die Rampenknöpfe im Trainingsreiter zeigen dieselben Werte
  await p.evaluate(() => { S.view = "tag"; S.plan = "Push Day"; S.plansFold = true; S.exercise = "Flys"; S.weight = "65"; S.reps = "10"; render(); });
  const shown = await p.locator('button[data-act="warmpick"]').allInnerTexts();
  check("Rampenknöpfe zeigen 31,25, 46,25 und 53,75", shown.length === 3 && /31,25/.test(shown[0]) && /46,25/.test(shown[1]) && /53,75/.test(shown[2]), JSON.stringify(shown));

  // Der Einstieg über "Aufwärmen" im Fokus-Modus nimmt dieselbe Rechnung
  await p.evaluate(() => { S.focus = true; render(); });
  await p.click('button[data-act="warmon"]'); await p.waitForTimeout(150);
  check("Aufwärmen bei 65 kg Flys startet mit 31,25", await p.evaluate(() => S.warm && S.weight === "31,25"), await p.evaluate(() => S.weight));
  await p.click('button[data-act="warmoff"]'); await p.waitForTimeout(100);
  await p.evaluate(() => { S.focus = false; render(); });
});
