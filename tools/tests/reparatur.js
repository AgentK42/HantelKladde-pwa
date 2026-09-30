/* Beschädigter Speicher beim Start: unlesbare Sätze fallen weg, fehlende Werte
   werden ergänzt, Planeinträge berichtigt, und die App sagt, was sie getan hat,
   statt still zu reparieren oder gar nicht zu starten. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  async function start(store) {
    await p.evaluate((st) => {
      localStorage.clear();
      Object.keys(st).forEach(function (k) { localStorage.setItem(k, JSON.stringify(st[k])); });
    }, store);
    await p.reload({ waitUntil:"load" }); await p.waitForTimeout(250);
  }
  const ok = { id:"ok", date:"2026-01-05", exercise:"Flys", set:1, weight:40, reps:10, rpe:8, ts:1767632400000 };

  await start({
    "kraftlog:v1":[ok, null, { id:"", date:"2026-01-05", exercise:"Flys" },
      { id:"d", date:"2026-02-30", exercise:"Flys" }, { id:"e", date:"2026-01-05", exercise:" " },
      { id:"f", date:"2026-01-06", exercise:"Squats", set:0, weight:-5, reps:"x", rpe:11, warm:1 }],
    "kraftlog:plans":{ "Push Day":[{ name:"Flys", reps:"12", weight:"40,5", sets:"x" },
      { name:"Dips", reps:0, weight:-1, sets:2 }, { name:"" }, 7], "Leer":[], "Kaputt":{} }
  });
  const s = await p.evaluate(() => ({
    ids:S.entries.map(function (e) { return e.id; }).join(),
    fixed:(function (e) { return [e.set, e.weight, e.reps, e.rpe, e.ts === Date.parse("2026-01-06T12:00:00"), e.warm].join(); })(
      S.entries.filter(function (e) { return e.id === "f"; })[0]),
    push:JSON.stringify(S.plans["Push Day"]), plans:Object.keys(S.plans).join(),
    note:S.note, shown:document.querySelector(".notice") ? document.querySelector(".notice").textContent : "",
    stored:JSON.parse(localStorage.getItem("kraftlog:plans"))["Push Day"].length
  }));
  check("unlesbare Sätze fallen weg, lesbare bleiben", s.ids === "ok,f", s.ids);
  check("fehlende Werte werden ergänzt", s.fixed === "1,0,1,,true,true", s.fixed);
  check("Planeinträge: Zahlen aus Text, Standard für Unbrauchbares",
    s.push === '[{"name":"Flys","reps":12,"weight":40.5,"sets":2},{"name":"Dips","reps":10,"weight":20,"sets":2}]', s.push);
  check("ein Plan, der keine Liste ist, fällt weg", s.plans.indexOf("Kaputt") < 0 && s.plans.indexOf("Leer") >= 0, s.plans);
  check("die Meldung nennt alle drei Arten",
    s.note === "Beim Laden repariert: 4 unlesbare Sätze entfernt, 1 Satz mit fehlenden Werten ergänzt, " +
      "4 Planeinträge berichtigt. Prüfe deine Daten und lege unter Daten ein frisches Backup an.", s.note);
  check("die Meldung steht auf dem Schirm", s.shown.indexOf("Beim Laden repariert") === 0, s.shown);
  check("die berichtigten Pläne sind gespeichert", s.stored === 2);

  await start({ "kraftlog:v1":[ok], "kraftlog:plans":{ "Push Day":[{ name:"Flys", reps:10, weight:20, sets:2 }] },
    "kraftlog:meta":{ seeded:["Upper Body", "Leg Day (UL)", "Push Day", "Pull Day", "Leg Day (PPL)"] } });
  const clean = await p.evaluate(() => ({ note:S.note, n:S.entries.length, plans:Object.keys(S.plans).join() }));
  check("ohne Schaden keine Meldung", clean.note === "" && clean.n === 1, JSON.stringify(clean));
  check("ein gelöschter mitgelieferter Plan kommt nicht zurück", clean.plans === "Push Day", clean.plans);

  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("kraftlog:v1", "{kaputt"); });
  await p.reload({ waitUntil:"load" }); await p.waitForTimeout(250);
  const broken = await p.evaluate(() => ({ n:S.entries.length, plans:Object.keys(S.plans).length,
    tabs:document.querySelectorAll(".seg button").length }));
  check("ein unlesbarer Schlüssel lässt die App trotzdem starten", broken.n === 0 && broken.plans === 5 && broken.tabs === 5,
    JSON.stringify(broken));
});
