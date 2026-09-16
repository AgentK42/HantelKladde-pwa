/* Volumen im Diagramm: ein Balken je Training unter dem Gewichtsdiagramm,
   Achse ab null, Beschriftung nur für Maximum und letzten Balken, Fußzeile. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  // Dieselben Zahlen wie im Mockup: acht Einheiten, 40 auf 45 kg,
  // am 05.09. ein dritter Satz, Volumeneinbruch bei jeder Gewichtsstufe.
  await p.evaluate(()=>{
    var plan = [
      ["-24",40,[8,7]], ["-20",40,[9,8]], ["-17",40,[10,9]],
      ["-13",42.5,[8,7]], ["-10",42.5,[9,8,8]], ["-6",42.5,[10,9]],
      ["-3",45,[8,7]], ["0",45,[9,8]]
    ];
    var list=[], i=0;
    plan.forEach(function (row) {
      var d = shiftISO(todayISO(), parseInt(row[0],10));
      row[2].forEach(function (r, k) {
        list.push({ id:"v"+(i++), date:d, exercise:"Benchpress Maschine", set:k+1,
          weight:row[1], reps:r, rpe:8, ts:Date.parse(d+"T10:00:00")+k*60000 });
      });
    });
    S.entries = list; S.volRange = 30; S.openEx = "Benchpress Maschine";
    S.view = "verlauf"; persist(); render();
  });
  await p.waitForTimeout(250);

  check("zwei Diagramme in der Karte", await p.locator(".card .chart").count()===2);
  check("beide tragen eine Überschrift", await p.evaluate(()=>{
    var l=Array.from(document.querySelectorAll(".chart .clab")).map(e=>e.textContent);
    return l.length===2 && l[0]==="Gewicht" && l[1].indexOf("Volumen")===0;
  }), await p.evaluate(()=>Array.from(document.querySelectorAll(".chart .clab")).map(e=>e.textContent).join(" | ")));
  check("Volumen steht unter dem Gewicht", await p.evaluate(()=>{
    var c=document.querySelectorAll(".card .chart");
    return c[1].getBoundingClientRect().top > c[0].getBoundingClientRect().top;
  }));
  check("acht Balken, einer je Training",
    await p.locator('.chart svg path[fill="var(--extra)"]').count()===8);

  // Werte
  const vols = await p.evaluate(()=>{
    var g={}; S.entries.forEach(function(e){ g[e.date]=(g[e.date]||0)+e.weight*e.reps; });
    return Object.keys(g).sort().map(function(k){ return g[k]; });
  });
  check("die Rechnung stimmt mit dem Mockup überein",
    JSON.stringify(vols)===JSON.stringify([600,680,760,637.5,1062.5,807.5,675,765]),
    JSON.stringify(vols));
  const fuss = await p.evaluate(()=>
    document.querySelectorAll(".card .chart")[1].querySelector("p:last-child").textContent);
  check("die Fußzeile nennt Summe, Sätze und Schnitt",
    fuss.indexOf("5.987,5 kg")>0 && fuss.indexOf("17 Sätzen")>0 && fuss.indexOf("748 kg")>0,
    fuss);

  // Achse
  const achse = await p.evaluate(()=>
    Array.from(document.querySelectorAll(".card .chart")[1].querySelectorAll("text"))
      .map(e=>e.textContent));
  check("die Achse beginnt bei null und endet rund",
    achse[0]==="0" && achse[1]==="600" && achse[2]==="1.200", JSON.stringify(achse.slice(0,3)));
  check("höchster und letzter Balken sind beschriftet, sonst keiner",
    achse.filter(t=>t==="1.062,5").length===1 && achse.filter(t=>t==="765").length===1 &&
    achse.filter(t=>t==="600").length===1, JSON.stringify(achse));

  // Nichts läuft aus dem Bild
  check("alle Beschriftungen liegen im viewBox", await p.evaluate(()=>{
    var svg=document.querySelectorAll(".card .chart")[1].querySelector("svg");
    return Array.from(svg.querySelectorAll("text")).every(function (t) {
      var bb=t.getBBox(); return bb.x >= -0.5 && bb.x+bb.width <= 320.5 &&
        bb.y >= -0.5 && bb.y+bb.height <= 150.5;
    });
  }));
  check("kein Balken ragt unter die Grundlinie", await p.evaluate(()=>{
    var svg=document.querySelectorAll(".card .chart")[1].querySelector("svg");
    return Array.from(svg.querySelectorAll('path[fill="var(--extra)"]')).every(function (b) {
      var bb=b.getBBox(); return bb.y >= 15.9 && bb.y+bb.height <= 128.1;
    });
  }));

  // Körpergewichtsübung mit 0 kg: kein Volumendiagramm
  await p.evaluate(()=>{
    var d1=shiftISO(todayISO(),-4), d2=todayISO();
    S.entries=[
      { id:"b1", date:d1, exercise:"Dips", set:1, weight:0, reps:8, rpe:null, ts:Date.parse(d1+"T10:00:00") },
      { id:"b2", date:d2, exercise:"Dips", set:1, weight:0, reps:10, rpe:null, ts:Date.parse(d2+"T10:00:00") }
    ];
    S.openEx="Dips"; persist(); render();
  });
  await p.waitForTimeout(200);
  check("ohne Gewicht bleibt es beim Gewichtsdiagramm",
    await p.locator(".card .chart").count()===1);
  check("und das behält seine Fußzeile",
    (await p.locator(".card .chart p:last-child").textContent()).indexOf("Trainings")>0);

  // Ein einzelner Trainingstag zeigt gar kein Diagramm, wie bisher
  await p.evaluate(()=>{
    S.entries=[{ id:"s1", date:todayISO(), exercise:"Flys", set:1, weight:30, reps:10,
      rpe:null, ts:Date.now() }];
    S.openEx="Flys"; persist(); render();
  });
  await p.waitForTimeout(200);
  // Der Knopf "Verlauf anzeigen" fehlt bei nur einem Trainingstag. Steht die Übung
  // aus einem früheren Besuch trotzdem offen, muss beides fehlerfrei zeichnen.
  check("ein einzelner Trainingstag bietet keinen Verlauf an",
    await p.locator('[data-act="openex"]').count()===0);
  check("gezeichnet wird er trotzdem sauber, mit genau einem Balken",
    await p.locator('.chart svg path[fill="var(--extra)"]').count()===1);
  check("der eine Balken steht im Bild", await p.evaluate(()=>{
    var b=document.querySelector('.chart svg path[fill="var(--extra)"]').getBBox();
    return b.x >= 0 && b.x+b.width <= 320 && b.height > 0;
  }));

  // Große Zahlen bleiben lesbar
  await p.evaluate(()=>{
    var list=[];
    for (var i=0;i<6;i++) {
      var d=shiftISO(todayISO(), -i*4);
      for (var k=0;k<3;k++) list.push({ id:"g"+i+k, date:d, exercise:"Beinpresse", set:k+1,
        weight:180+i*5, reps:12, rpe:null, ts:Date.parse(d+"T10:00:00")+k*60000 });
    }
    S.entries=list; S.openEx="Beinpresse"; persist(); render();
  });
  await p.waitForTimeout(200);
  check("auch vierstellige Achsenwerte bleiben im Bild", await p.evaluate(()=>{
    var svg=document.querySelectorAll(".card .chart")[1].querySelector("svg");
    return Array.from(svg.querySelectorAll("text")).every(function (t) {
      var bb=t.getBBox(); return bb.x >= -0.5 && bb.x+bb.width <= 320.5;
    });
  }), await p.evaluate(()=>Array.from(document.querySelectorAll(".card .chart")[1]
      .querySelectorAll("text")).map(e=>e.textContent).slice(0,3).join(", ")));
});
