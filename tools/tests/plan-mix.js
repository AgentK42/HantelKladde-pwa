/* Mix der mitgelieferten Pläne: über Push, Pull und Leg zusammen liegt jedes
   Gegenspielerpaar unter 15 Prozent auseinander, und keine Gruppe geht im
   Zyklus leer aus. Gezählt wird mit muscleTally() der App, nicht mit einer
   zweiten Rechnung daneben, damit der Test dem folgt, was die App anzeigt. */
const { suite } = require("./lib");

const PPL = ["Push Day", "Pull Day", "Leg Day (PPL)"];
const GRENZE = 15;

suite(async ({ open, check }) => {
  const p = await open();

  const cyc = await p.evaluate((plans)=>{
    var res = muscleTally(plans.map(function (n) {
      return { key:n, items:DEFAULT_PLANS[n], times:1 };
    }));
    var out = { by:{}, unassigned:res.unassigned, pairs:[] };
    MUSCLE_LIST.forEach(function (m) { out.by[m] = res.by[m].total; });
    MUSCLE_PAIRS.forEach(function (pr) {
      var a = res.by[pr[0]].total, b = res.by[pr[1]].total;
      var hi = Math.max(a, b), lo = Math.min(a, b);
      out.pairs.push({ a:pr[0], b:pr[1], av:a, bv:b, dev:hi ? (hi - lo) / hi * 100 : 0 });
    });
    return out;
  }, PPL);

  check("jede Übung der drei Pläne hat eine Muskelgruppe",
    cyc.unassigned.length === 0, cyc.unassigned.join(", "));

  cyc.pairs.forEach(function (pr) {
    check(pr.a + " zu " + pr.b + " unter " + GRENZE + " Prozent",
      pr.av > 0 && pr.bv > 0 && pr.dev < GRENZE,
      pr.av + " : " + pr.bv + "  " + pr.dev.toFixed(1) + "%");
  });

  const leer = Object.keys(cyc.by).filter(m => !cyc.by[m]);
  check("keine Muskelgruppe bleibt im Zyklus ohne Satz", leer.length === 0, leer.join(", "));

  /* Ein einzelner Tag darf schief stehen, das ist der Sinn der Aufteilung:
     ohne diese Prüfung könnte der Zyklus auch aus drei Ganzkörpertagen
     bestehen und der Test wäre trotzdem grün. */
  const push = await p.evaluate(()=>{
    var r = muscleTally([{ key:"p", items:DEFAULT_PLANS["Push Day"], times:1 }]);
    return { brust:r.by["Brust"].total, ruecken:r.by["Rücken"].total };
  });
  check("der Push Day allein bleibt einseitig, wie gedacht",
    push.brust > 0 && push.ruecken === 0, JSON.stringify(push));

  /* Die Satzzahlen tragen das Verhältnis, deshalb hängen sie nicht am
     Ausgangswert für neue Übungen. */
  const feste = await p.evaluate((plans)=>plans.every(function (n) {
    return DEFAULT_PLANS[n].every(function (i) { return i.sets >= 1 && i.sets <= 4; });
  }), PPL);
  check("die Sätze der drei Pläne liegen zwischen 1 und 4", feste);

  /* Neu eingerichtet steht der abgestimmte Stand auch wirklich in den Plänen. */
  await p.evaluate(()=>{ localStorage.clear(); });
  await p.reload({ waitUntil:"load" }); await p.waitForTimeout(300);
  const frisch = await p.evaluate((plans)=>plans.every(function (n) {
    return JSON.stringify(S.plans[n]) === JSON.stringify(DEFAULT_PLANS[n]);
  }), PPL);
  check("ein frischer Start bekommt genau diese drei Pläne", frisch);
});
