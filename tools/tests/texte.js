/* Texte der App: bei einer Übung, einem Satz, einem Plan steht die Einzahl, in
   Summenzeile, Tagesstreifen, Meldungen und Rückfragen. Die Beschreibungen
   unter Daten versprechen nichts, was es nicht gibt. */
const { suite, tab } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.evaluate(() => {
    window.asked = [];
    window.confirm = function (m) { asked.push(m); return false; };
    var td = todayISO();
    S.entries = [{ id:"a", date:td, exercise:"Flys", set:1, weight:40, reps:10, rpe:8,
      ts:Date.now() - 60000, plan:"Solo" }];
    S.plans = { "Solo":[{ name:"Flys", reps:10, weight:40, sets:1 }] };
    S.meta.seeded = ["Upper Body", "Leg Day (UL)", "Push Day", "Pull Day", "Leg Day (PPL)"];
    persist(); render();
  });

  const totals = await p.locator(".totals").innerText();
  check("Summenzeile: 1 Übung, 1 Satz", /^1 Übung\b/.test(totals) && /\b1 Satz\b/.test(totals) &&
    totals.indexOf("Übungen") < 0 && totals.indexOf("Sätze") < 0, totals.replace(/\n/g, " "));
  const tip = await p.locator('#week .wday.on').getAttribute("title");
  check("Tagesstreifen: 1 Übung", tip === "Solo, 1 Übung", tip);

  await tab(p, "plaene");
  const head = await p.evaluate(() => {
    var sect = [].filter.call(document.querySelectorAll(".sect"), function (x) {
      return x.querySelector("h2").textContent.indexOf("Pläne bearbeiten") === 0;
    })[0];
    return sect ? sect.querySelector(":scope > span").textContent : "";
  });
  check("Pläne bearbeiten: 1 Plan", head === "1 Plan", head);
  await p.click('[data-act="delplan"][data-v="Solo"]'); await p.waitForTimeout(150);
  const del = await p.evaluate(() => asked[asked.length - 1]);
  check("Rückfrage vor dem Löschen: mit 1 Übung", del === "Plan Solo mit 1 Übung wirklich löschen?", del);

  await p.evaluate(() => {
    S.entries.push({ id:"b", date:shiftISO(todayISO(), -2), exercise:"Dips", set:1, weight:0,
      reps:8, rpe:null, ts:Date.now() - 2 * 86400000 });
    S.entries = S.entries.filter(function (e) { return e.id !== "a"; });
    S.custom = [{ name:"Nur einmal", cat:"Push" }];
    persist();
  });
  await tab(p, "daten");
  await p.evaluate(() => { S.secOpen.uebungen = true; S.exOpen = "Nur einmal"; render(); });
  await p.fill("#ren-name", "Dips");
  await p.click('[data-act="rendo"]'); await p.waitForTimeout(150);
  const merge = await p.evaluate(() => asked[asked.length - 1]);
  check("Rückfrage beim Zusammenführen: ergibt 1 Satz", merge.indexOf("ergibt 1 Satz unter „Dips“") > 0,
    merge.replace(/\n/g, " "));

  // Übungen unter Daten: die Gruppe hängt am Namen, verschieben lässt sie sich nicht
  const ex = await p.evaluate(() => {
    S.settings.descOpen.uebungen = true; S.exOpen = "Flys"; render();
    var desc = document.querySelector(".sect + .notice").textContent;
    var box = document.querySelector(".exbox");
    var catChoice = [].some.call(box.querySelectorAll("option"), function (o) {
      return CATLIST.indexOf(o.value) >= 0;
    });
    return { desc:desc, catChoice:catChoice };
  });
  check("Übungen: kein Wahlfeld für die Gruppe", !ex.catChoice);
  check("Übungen: die Beschreibung verspricht kein Verschieben", ex.desc.indexOf("verschieben") < 0, ex.desc);
});
