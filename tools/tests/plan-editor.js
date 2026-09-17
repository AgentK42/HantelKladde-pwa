/* Planliste im Pläne-Reiter: ein Übungsname steht vollständig da, bis zu drei
   Zeilen lang, ohne Tipp und ohne Schalter. Kurze Namen bleiben einzeilig. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.evaluate(() => {
    S.plans = { T:[
      { name:"Flys", sets:2, reps:10, weight:20 },
      { name:"Trizepsdrücken über Kopf", sets:2, reps:10, weight:20 },
      { name:"Shoulderpress Maschine", sets:2, reps:10, weight:20 }
    ] };
    S.view = "plaene"; S.planCardsFold = false; persist(); render();
  });
  check("kein Schalter für den Zeilenumbruch mehr", await p.locator('[data-act="wraptoggle"]').count() === 0);
  check("der Name ist kein Knopf mehr", await p.locator('.prow [data-act="prownm"]').count() === 0);

  const rows = await p.evaluate(() => Array.from(document.querySelectorAll(".prow .nm")).map(function (el) {
    var lh = parseFloat(getComputedStyle(el).lineHeight);
    return { text: el.textContent, lines: Math.round(el.getBoundingClientRect().height / lh),
      full: el.scrollHeight <= el.clientHeight + 1 };
  }));
  const short = rows.find(r => r.text === "Flys"), long = rows.find(r => r.text.indexOf("Trizeps") === 0);
  check("kurzer Name auf einer Zeile", !!short && short.lines === 1, JSON.stringify(short));
  check("langer Name auf höchstens drei Zeilen, vollständig", !!long && long.lines <= 3 && long.full, JSON.stringify(long));
  check("Text steht vollständig im Element", !!long && long.text === "Trizepsdrücken über Kopf");
  check("die Zeile bleibt in der Karte", await p.evaluate(() => {
    var row = document.querySelectorAll(".prow")[1], card = row.closest(".card") || row.parentNode;
    return row.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1;
  }));
});
