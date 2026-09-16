/* Rekorde: eine erste Aufzeichnung ist keiner, eine Steigerung braucht einen
   Vorher-Wert, Zusammenfassung, Block Neue Rekorde und Toast beim Speichern. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  // Saetze setzen: Helfer im Seitenkontext
  await p.evaluate(() => {
    window.seed = function (list) {
      S.entries = list.map(function (x, i) {
        return { id:"t"+i, date:x.d, exercise:x.n, set:x.s || 1, weight:x.w, reps:x.r,
          rpe:null, ts:Date.parse(x.d + "T10:0" + (i % 6) + ":00") + i * 60000 };
      });
      persist(); render();
    };
  });

  const td = await p.evaluate(()=>todayISO());
  const day = (n) => p.evaluate((k)=>shiftISO(todayISO(), k), n);

  // 1. Uebung heute zum ersten Mal: kein Rekord
  await p.evaluate((t)=>seed([{d:t,n:"Flys",w:40,r:10}]), td);
  check("erste Aufzeichnung ist kein Rekord in der Zusammenfassung",
    await p.evaluate((t)=>trainingSummary(t).records.length===0, td));
  check("erste Aufzeichnung steht nicht unter Neue Rekorde",
    await p.evaluate(()=>recordBlock().indexOf("Flys")<0));
  check("Hinweis statt Liste", await p.evaluate(()=>recordBlock().indexOf("keine")>0));

  // 2. Zweites Training schwerer: Rekord mit Vorher-Wert
  const d3 = await day(-3);
  await p.evaluate(([t,a])=>seed([{d:a,n:"Flys",w:40,r:10},{d:t,n:"Flys",w:45,r:10}]), [td,d3]);
  const recs = await p.evaluate((t)=>trainingSummary(t).records, td);
  check("Verbesserung ist ein Rekord", recs.length===1 && recs[0].prevWeight===40 && recs[0].weight===45, JSON.stringify(recs));
  check("Zusammenfassung zeigt den Vorher-Wert", await p.evaluate(()=>{
    S.showSummary=true; S.summaryData=trainingSummary(todayISO());
    var h=viewSummary(); S.showSummary=false; S.summaryData=null;
    return h.indexOf("vorher 40 kg")>0 && h.indexOf("erste Aufzeichnung")<0;
  }));
  check("Neue Rekorde listet die Steigerung", await p.evaluate(()=>{
    var h=recordBlock(); return h.indexOf("Flys")>0 && h.indexOf("+5 kg")>0;
  }));

  // 3. Neue Uebung, zwei Tage im Zeitraum, Steigerung dazwischen: zaehlt
  const d5 = await day(-5), d1 = await day(-1);
  await p.evaluate(([a,c])=>seed([{d:a,n:"Dips",w:30,r:8},{d:c,n:"Dips",w:35,r:8}]), [d5,d1]);
  check("Steigerung innerhalb des Zeitraums zaehlt", await p.evaluate(()=>{
    var h=recordBlock(); return h.indexOf("Dips")>0 && h.indexOf("+5 kg")>0;
  }));
  // 4. Neue Uebung, nur ein Tag im Zeitraum: zaehlt nicht
  await p.evaluate(([a])=>seed([{d:a,n:"Dips",w:30,r:8},{d:a,n:"Dips",w:32.5,r:8,s:2}]), [d5]);
  check("nur ein Tag, auch mit zwei Saetzen: kein Rekord",
    await p.evaluate(()=>recordBlock().indexOf("Dips")<0));
  // 5. Vor dem Zeitraum bekannt, im Zeitraum schwerer: unveraendert
  const d20 = await day(-20);
  await p.evaluate(([o,t])=>seed([{d:o,n:"Squats",w:80,r:10},{d:t,n:"Squats",w:85,r:10}]), [d20,td]);
  check("alte Uebung mit neuem Hoechstgewicht bleibt Rekord",
    await p.evaluate(()=>recordBlock().indexOf("Squats")>0 && recordBlock().indexOf("+5 kg")>0));

  // 6. Toast beim ersten Satz einer Uebung
  await p.evaluate(()=>seed([]));
  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(150);
  await p.click('.plans button[data-act="plan"][data-v="Push Day"]'); await p.waitForTimeout(150);
  await p.click('button[data-act="save"]'); await p.waitForTimeout(250);
  let toast = await p.locator(".toast").innerText().catch(()=>"");
  check("erster Satz meldet keinen Rekord", !toast.includes("Neuer Rekord"), toast.replace(/\n/g," "));
  // Zweiter Satz mit mehr Gewicht meldet einen Rekord. Die App sperrt ein
  // zweites Speichern innerhalb von 900 ms, deshalb die Pause.
  await p.evaluate(()=>{ S.weight = String(deci(S.weight) + 5); render(); });
  await p.waitForTimeout(1000);
  await p.click('button[data-act="save"]'); await p.waitForTimeout(250);
  check("zweiter Satz gespeichert", await p.evaluate(()=>S.entries.length===2));
  toast = await p.locator(".toast").innerText().catch(()=>"");
  check("schwererer Satz meldet einen Rekord", toast.includes("Neuer Rekord"), toast.replace(/\n/g," "));
});
