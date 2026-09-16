/* Mix der mitgelieferten Pläne: über Push, Pull und Leg zusammen liegt jedes
   Gegenspielerpaar unter 15 Prozent auseinander, keine Gruppe geht im Zyklus
   leer aus, und die Reihenfolge in jedem Plan hält die beiden harten Regeln
   ein (kein Primärmuskel zweimal hintereinander, Rumpf am Schluss). Gezählt
   wird mit muscleTally() der App, nicht mit einer zweiten Rechnung daneben,
   damit der Test dem folgt, was die App anzeigt. */
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

  /* Reihenfolge, harte Regel 1: nie zweimal derselbe Primärmuskel am Stück.
     Zwei Bizeps- oder zwei Trizepsübungen nacheinander wären der Fall, den die
     Regel meint, sie gilt aber für jede Gruppe. */
  const doppelt = await p.evaluate((plans)=>{
    var hits = [];
    plans.forEach(function (n) {
      DEFAULT_PLANS[n].forEach(function (i, k) {
        if (!k) return;
        var a = muscleOf(DEFAULT_PLANS[n][k-1].name), b = muscleOf(i.name);
        if (a && b && a.primary === b.primary) {
          hits.push(n + ": " + DEFAULT_PLANS[n][k-1].name + " und " + i.name);
        }
      });
    });
    return hits;
  }, PPL);
  check("kein Primärmuskel steht zweimal hintereinander", doppelt.length === 0,
    doppelt.join(" | "));

  /* Harte Regel 2: der Rumpf steht am Schluss, ein müder Rumpf fehlt unter
     jeder schweren Übung davor. */
  const rumpf = await p.evaluate((plans)=>{
    var hits = [];
    plans.forEach(function (n) {
      var gesehen = false;
      DEFAULT_PLANS[n].forEach(function (i) {
        var mo = muscleOf(i.name);
        var ist = mo && (mo.primary === "Bauch" || mo.primary === "Unterer Rücken");
        if (ist) gesehen = true;
        else if (gesehen) hits.push(n + ": " + i.name + " steht hinter dem Rumpf");
      });
    });
    return hits;
  }, PPL);
  check("der Rumpf steht am Schluss", rumpf.length === 0, rumpf.join(" | "));

  /* Rangfolge: vorn die mehrgelenkige Übung. Geprüft wird die erste Stelle,
     weil dort die Last am höchsten und die Ermüdung am geringsten ist. */
  const erste = await p.evaluate((plans)=>plans.map(function (n) {
    return n + ": " + DEFAULT_PLANS[n][0].name;
  }), PPL);
  check("jeder Plan beginnt mit einer Grundübung",
    erste.join(" | ") === "Push Day: Benchpress Maschine | Pull Day: Latzug Maschine | " +
      "Leg Day (PPL): Squats", erste.join(" | "));

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
