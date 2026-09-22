/* Pausenlänge: 120 s für die mitgelieferten Mehrgelenksübungen, sonst die
   Einstellung, 60 s nach dem Aufwärmen, Auswahlfeld unter Daten, Backup.
   Dazu die Obergrenze REST_MAX aus 1.35.0: keine Pause wird länger, weder über
   den Regler, noch über das Auswahlfeld, noch über den Plus-Knopf während sie
   läuft, und ein älterer Wert von 180 s wirkt und erscheint gekürzt. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  // 1. Mitgelieferte Werte
  const comp = ["Squats","Deadlifts","Dips","Benchpress Maschine","Shoulderpress Maschine",
    "Latzug Maschine","Rudern Maschine","Kurzhantelrudern","Schrägbankdrücken",
    "Romanian Deadlifts","Beinpresse","Hip Thrust"];
  const iso = ["Seitheben","Trizeps","Flys","Reverse Flys","Face Pulls","Preachercurls",
    "Hammercurls","Shrugs","Beincurls","Beinstrecker","Wadenheben","Hipabduction",
    "Hipadduction","Bauch Crunch","Lower Back Crunch","Trizepsdrücken über Kopf"];
  const compVals = await p.evaluate(l=>l.map(n=>exRest(n)), comp);
  check("alle 12 Mehrgelenksübungen stehen auf 120 s",
    compVals.length===12 && compVals.every(v=>v===120), JSON.stringify(compVals));
  const isoVals = await p.evaluate(l=>l.map(n=>exRest(n)), iso);
  check("alle 16 übrigen Übungen folgen der Einstellung, also 90 s",
    isoVals.length===16 && isoVals.every(v=>v===90), JSON.stringify(isoVals));
  check("Squats und Deadlifts stehen auf 120 s, nicht auf 180 s",
    await p.evaluate(()=>exRest("Squats")===120 && exRest("Deadlifts")===120));
  check("jede der 28 mitgelieferten Übungen ist erfasst",
    await p.evaluate(([a,b])=>PRESETS.length===28 && a.concat(b).every(n=>PRESETS.indexOf(n)>=0),
      [comp,iso]));

  // 2. Aufwaermsatz
  check("Aufwärmen pausiert 60 s, auch bei einer Mehrgelenksübung",
    await p.evaluate(()=>warmRest("Squats")===60 && warmRest("Seitheben")===60));
  check("eine kürzere Übungspause zieht das Aufwärmen mit herunter",
    await p.evaluate(()=>{ S.settings.rest=45; var r=warmRest("Seitheben"); S.settings.rest=90; return r===45; }));

  // 3. Die Einstellung verschiebt nur die Uebungen ohne eigenen Wert
  check("Regler auf 60 s verschiebt die Isolationsübungen", await p.evaluate(()=>{
    S.settings.rest=60; var a=exRest("Seitheben"), c=exRest("Squats"); S.settings.rest=90;
    return a===60 && c===120;
  }));
  check("eine unbekannte Übung folgt der Einstellung",
    await p.evaluate(()=>exRest("Eigene Übung")===90 && exRest("")===90));

  // 4. Pausenlaenge beim Speichern
  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(150);
  async function saveWith(name, warm) {
    await p.evaluate(([n,w])=>{
      S.entries=[]; S.exercise=n; S.warm=!!w; S.weight="40"; S.reps="10";
      S.restEnd=0; S.restTotal=0; persist(); render();
    },[name,warm]);
    await p.waitForTimeout(1000);
    await p.click('button[data-act="save"]'); await p.waitForTimeout(250);
    return p.evaluate(()=>S.restTotal);
  }
  check("Arbeitssatz Squats startet 120 s", await saveWith("Squats",false)===120);
  check("Arbeitssatz Seitheben startet 90 s", await saveWith("Seitheben",false)===90);
  check("Aufwärmsatz Squats startet 60 s", await saveWith("Squats",true)===60);
  check("Aufwärmsatz Seitheben startet 60 s", await saveWith("Seitheben",true)===60);

  // 5. Bedienung unter Daten
  await p.evaluate(()=>{ S.entries=[]; S.restEnd=0; persist(); });
  await p.click('.seg button[data-v="daten"]'); await p.waitForTimeout(200);
  check("die zugeklappte Zeile nennt die abweichende Pause", await p.evaluate(()=>{
    S.dataClosed={}; S.secOpen.uebungen=true; render();
    var rows=Array.from(document.querySelectorAll(".cnote")).map(e=>e.innerText);
    return rows.some(t=>t.indexOf("Pause 2:00")>=0);
  }));
  check("eine Isolationsübung zeigt keine Pausenzeile", await p.evaluate(()=>{
    return catRow("Seitheben").indexOf("Pause")<0;
  }));
  await p.evaluate(()=>{ S.secOpen.uebungen=true; S.exOpen="Seitheben"; render(); });
  await p.waitForTimeout(150);
  check("das Auswahlfeld steht im aufgeklappten Kasten",
    await p.locator("#crest-in").count()===1);
  check("ohne eigenen Wert steht Wie eingestellt",
    (await p.locator("#crest-in").inputValue())==="0");
  await p.selectOption("#crest-in","120"); await p.waitForTimeout(200);
  check("die Auswahl wirkt sofort",
    await p.evaluate(()=>exRest("Seitheben")===120 && S.exmeta["Seitheben"].rest===120));
  check("der geänderte Wert übersteht einen Neuaufbau", await p.evaluate(()=>{
    render(); var el=document.getElementById("crest-in"); return el && el.value==="120";
  }));
  await p.evaluate(()=>{ S.secOpen.uebungen=true; S.exOpen="Squats"; render(); });
  await p.waitForTimeout(150);
  await p.selectOption("#crest-in","0"); await p.waitForTimeout(200);
  check("Wie eingestellt räumt auch den mitgelieferten Wert weg",
    await p.evaluate(()=>exRest("Squats")===90));
  check("und ist damit nicht mehr in der zugeklappten Zeile", await p.evaluate(()=>{
    S.exOpen=""; render(); return catRow("Squats").indexOf("Pause")<0;
  }));

  // 6. Backup
  check("die Pause liegt im Backup", await p.evaluate(()=>{
    var j=backupText();
    return j.indexOf('"rest": 120')>0 && j.indexOf('"rest": 0')>0;
  }));
  check("das eigene Backup kommt durch die Prüfung", await p.evaluate(()=>{
    try { var d=prepareBackup(JSON.parse(backupText()));
      return d.exmeta["Seitheben"].rest===120 && d.exmeta["Squats"].rest===0; }
    catch (e) { return String(e); }
  }));
  check("ein Backup mit Pause wird angenommen", await p.evaluate(()=>{
    try { cleanExmeta({ "Flys": { rest:120 }, "Dips": { rest:0 } }); return true; }
    catch (e) { return false; }
  }));
  check("eine unsinnige Pause wird abgelehnt", await p.evaluate(()=>{
    var bad=[7, -30, 900, 90.5, "90"];
    return bad.every(function (v) {
      try { cleanExmeta({ "Flys": { rest:v } }); return false; } catch (e) { return true; }
    });
  }));
  check("ein Backup ohne Pause bleibt gültig", await p.evaluate(()=>{
    try { return cleanExmeta({ "Flys": { step:2.5 } }).Flys.rest === undefined; }
    catch (e) { return false; }
  }));

  // 7. Text in den Einstellungen
  check("die Einstellung erklärt beide Sonderfälle", await p.evaluate(()=>{
    S.view="daten"; S.settings.descOpen.pause=true; var h=viewData();
    return h.indexOf("2:00")>0 && h.indexOf("1:00")>0 && h.indexOf("Aufwärmsatz")>0;
  }));

  // 8. Ein Wert, der nicht in der Liste steht, etwa 100 s aus einem Import, muss
  // im Auswahlfeld stehen und darf nicht als "Wie eingestellt" erscheinen
  await p.evaluate(()=>{ S.exmeta["Seitheben"]={ rest:100 }; S.view="daten";
    S.secOpen.uebungen=true; S.exOpen="Seitheben"; persist(); render(); });
  await p.waitForTimeout(200);
  check("100 s aus dem Import steht im Feld", (await p.locator("#crest-in").inputValue())==="100");
  check("und ist zwischen 90 und 105 einsortiert", await p.evaluate(()=>{
    var o=Array.from(document.querySelectorAll("#crest-in option")).map(x=>x.value);
    return o.join(",")==="0,60,75,90,100,105,120";
  }), await p.evaluate(()=>Array.from(document.querySelectorAll("#crest-in option")).map(x=>x.value).join(",")));
  check("ein Listenwert wird nicht verdoppelt", await p.evaluate(()=>restChoices(90).length===REST_CHOICES.length));

  // 9. Obergrenze, 1.35.0. Die Auswahl endet bei zwei Minuten, wirksam sind
  // hoechstens REST_MAX, und keiner der vier Wege darf darueber hinausfuehren.
  check("die Auswahl endet bei zwei Minuten",
    await p.evaluate(()=>REST_CHOICES[REST_CHOICES.length-1]===120 && REST_MAX===150));
  check("ein alter Wert von 180 s wirkt nur bis zur Grenze", await p.evaluate(()=>{
    S.exmeta["Seitheben"]={ rest:180 }; var r=exRest("Seitheben");
    delete S.exmeta["Seitheben"]; return r===150;
  }));
  check("eine zu hohe Einstellung wirkt nur bis zur Grenze", await p.evaluate(()=>{
    S.settings.rest=600; var r=exRest("Eigene Übung"); S.settings.rest=90; return r===150;
  }));
  check("das Auswahlfeld zeigt einen alten Wert von 180 s als 150", await p.evaluate(()=>{
    S.exmeta["Seitheben"]={ rest:180 }; S.view="daten"; S.secOpen.uebungen=true;
    S.exOpen="Seitheben"; persist(); render(); return true;
  }) && await (async()=>{ await p.waitForTimeout(200);
    return (await p.locator("#crest-in").inputValue())==="150"; })());
  check("und bietet 180 gar nicht erst an", await p.evaluate(()=>{
    var o=Array.from(document.querySelectorAll("#crest-in option")).map(x=>x.value);
    delete S.exmeta["Seitheben"]; persist();
    return o.indexOf("180")<0 && o.indexOf("150")>0;
  }));

  // Der Regler unter Daten, Pause
  await p.evaluate(()=>{ S.settings.rest=120; S.view="daten"; S.exOpen=""; persist(); render(); });
  await p.waitForTimeout(200);
  for (let i=0;i<5;i++) { await p.click('button[data-act="restlen"][data-d="15"]'); }
  await p.waitForTimeout(200);
  check("der Regler bleibt bei 150 stehen", await p.evaluate(()=>S.settings.rest===150));
  check("der Text nennt die Grenze",
    await p.evaluate(()=>{ S.settings.descOpen.pause=true; return viewData().indexOf("2:30")>0; }));

  // Der Plus-Knopf waehrend der laufenden Pause
  check("zwanzig Tipps auf Plus verlängern nicht über die Grenze", await p.evaluate(()=>{
    S.settings.rest=90; startRest(120);
    for (var i=0;i<20;i++) addRest(15);
    var t=S.restTotal; stopRest(); return t===150;
  }));
  check("von einer kurzen Pause aus geht es bis genau zur Grenze", await p.evaluate(()=>{
    startRest(60); for (var i=0;i<20;i++) addRest(15);
    var t=S.restTotal; stopRest(); return t===150;
  }));
  check("ein einzelner Tipp kurz vor der Grenze kürzt statt zu überschreiten",
    await p.evaluate(()=>{
      startRest(145); addRest(15);
      var t=S.restTotal, left=Math.round((S.restEnd-Date.now())/1000);
      stopRest(); return t===150 && left>=148 && left<=150;
    }));
});
