/* Gewichtsrad im Trainingsreiter: der Wert passt bei jeder üblichen Länge in
   sein Feld und überlappt das "kg" nicht, auch bei fünf und sechs Zeichen wie
   61,25 oder 112,25. Kurze Werte behalten ihre bisherige Breite. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.evaluate(() => {
    S.view = "tag"; S.plan = "Push Day"; S.plansFold = true; S.exercise = "Flys";
    S.reps = "8"; S.source = ""; render();
  });

  /* Sichtbare Breite der Ziffern gegen den sichtbaren Kasten (.val schneidet ab, was
     über ihn hinausragt): ein Messelement mit derselben Schrift, weil scrollWidth
     bei input in Chromium den Überlauf nicht meldet. Die Messung wartet die
     Einblend-Animation des Werts ab, die das Feld kurz kleiner zeichnet. */
  const measure = async (w) => {
    await p.evaluate((val) => { S.weight = val; render(); }, w);
    await p.waitForTimeout(250);
    return p.evaluate(() => {
      var input = document.getElementById("in-weight");
      var box = input.parentNode, kg = box.nextElementSibling;
      var cs = getComputedStyle(input);
      var probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;" +
        "font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize + ";font-weight:" +
        cs.fontWeight + ";letter-spacing:" + cs.letterSpacing;
      probe.textContent = input.value;
      document.body.appendChild(probe);
      var text = probe.getBoundingClientRect().width;
      probe.remove();
      var br = box.getBoundingClientRect(), kr = kg.getBoundingClientRect();
      return { field: input.getBoundingClientRect().width, box: br.width, text: text,
        gap: kr.left - br.right };
    });
  };

  const base = await measure("65");
  check("zwei Ziffern: Feld hat die alte Breite", base.field > 100 && base.field < 108, JSON.stringify(base));
  for (const w of ["65", "100", "62,5", "61,25", "112,5", "112,25"]) {
    const m = await measure(w);
    check(w + " passt in den sichtbaren Kasten", m.text <= m.box + 0.5 && m.field <= m.box + 0.5, JSON.stringify(m));
    check(w + " überlappt das kg nicht", m.gap >= 0, JSON.stringify(m));
  }
  const five = await measure("112,5");
  const long = await measure("112,25");
  check("sechs Zeichen: Feld ist breiter als bei zwei", long.field > base.field, long.field + " vs " + base.field);
  check("sechs Zeichen: kleinere Schrift als bei fünf, damit Platz bleibt",
    long.text / 6 < five.text / 5, (long.text / 6).toFixed(1) + " je Zeichen vs " + (five.text / 5).toFixed(1));
  check("und bleibt links vom Plus-Knopf", await p.evaluate(() => {
    var kg = document.querySelector(".wdial .wnum em").getBoundingClientRect();
    var plus = document.querySelector(".wdial button.up").getBoundingClientRect();
    return kg.right <= plus.left;
  }));
});
