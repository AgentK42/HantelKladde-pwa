/* Einstellungsfelder: SETTING_FIELDS deckt jedes Einzelfeld ab, Laden nimmt
   nur gültige Werte, der Import nennt das Feld, Zusammenführen und Rundlauf. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  // 1. Die Tabelle deckt jedes Einzelfeld der Ausgangswerte ab, und nur die
  const cover = await p.evaluate(()=>{
    var compound=["plates","descOpen","weekGoals","weekGoalLog","planDays"];
    var single=Object.keys(DEFAULT_SETTINGS).filter(k=>compound.indexOf(k)<0);
    var missing=single.filter(k=>!SETTING_FIELDS[k]);
    var extra=Object.keys(SETTING_FIELDS).filter(k=>!(k in DEFAULT_SETTINGS));
    return { n:Object.keys(SETTING_FIELDS).length, missing, extra };
  });
  check("SETTING_FIELDS nennt alle 19 Einzelfelder", cover.n===19 && !cover.missing.length && !cover.extra.length, JSON.stringify(cover));

  // 2. Laden: gueltige Werte kommen an, ungueltige behalten den Ausgangswert
  const stored = { rest:120, autoRest:false, hiddenPlans:["Push Day", 7, null], repSpan:3,
    repFirstThresh:0.08, barWeight:15, defSets:3, defReps:8, defWeight:0, notifySignal:false,
    vibeLong:true, exHist:false, focusHist:false, wrapNames:true, focusPlates:true,
    autoProgress:false, repFirst:false,
    lockedPlans:["Pull Day"], hiddenEx:["Flys"] };
  await p.evaluate((st)=>{ localStorage.setItem("kraftlog:settings", JSON.stringify(st)); }, stored);
  await p.reload({waitUntil:"load"}); await p.waitForTimeout(300);
  const got = await p.evaluate(()=>JSON.parse(JSON.stringify(S.settings)));
  check("Laden: jedes Einzelfeld kommt an", got.rest===120 && got.autoRest===false && got.repSpan===3 &&
    got.repFirstThresh===0.08 && got.barWeight===15 && got.defSets===3 && got.defReps===8 && got.defWeight===0 &&
    got.notifySignal===false && got.vibeLong===true && got.exHist===false &&
    got.focusHist===false && got.wrapNames===true &&
    got.focusPlates===true && got.autoProgress===false && got.repFirst===false &&
    got.lockedPlans.join()==="Pull Day" && got.hiddenEx.join()==="Flys", JSON.stringify(got).slice(0,200));
  check("Laden: fremde Einträge in einer Namensliste werden ausgesiebt", got.hiddenPlans.join()==="Push Day");

  await p.evaluate(()=>{ localStorage.setItem("kraftlog:settings", JSON.stringify(
    { rest:"90", repSpan:2.5, defSets:0, barWeight:-5, defWeight:-1, autoRest:"ja", hiddenPlans:"Push Day",
      repFirstThresh:Infinity, notifySignal:1 })); });
  await p.reload({waitUntil:"load"}); await p.waitForTimeout(300);
  const bad = await p.evaluate(()=>JSON.parse(JSON.stringify(S.settings)));
  check("Laden: ungültige Werte bleiben still auf dem Ausgangswert",
    bad.rest===90 && bad.repSpan===2 && bad.defSets===2 && bad.barWeight===20 &&
    bad.defWeight===20 && bad.autoRest===true && bad.hiddenPlans.length===0 && bad.repFirstThresh===0.05 &&
    bad.notifySignal===true, JSON.stringify(bad).slice(0,200));
  check("Laden: die App läuft trotzdem", await p.evaluate(()=>document.querySelectorAll(".seg button").length>=5));
  await p.evaluate(()=>{ localStorage.removeItem("kraftlog:settings"); });
  await p.reload({waitUntil:"load"}); await p.waitForTimeout(300);

  // 3. Import: cleanSettings lehnt ab, mit Feldname
  const err = (code)=>p.evaluate((c)=>{ try { eval(c); return ""; } catch (e) { return String(e.message); } }, code);
  check("Import: falscher Typ nennt das Feld", (await err('cleanSettings({ rest:"90" })')).indexOf("rest")>0);
  check("Import: Bruchzahl bei repSpan meldet ganzzahlig", (await err('cleanSettings({ repSpan:2.5 })')).indexOf("ganzzahlig")>0);
  check("Import: null bei defSets meldet ungültig", (await err('cleanSettings({ defSets:0 })')).indexOf("ungültig")>0);
  check("Import: defWeight null ist erlaubt", (await err('cleanSettings({ defWeight:0 })'))==="");
  check("Import: rest null ist nicht erlaubt", (await err('cleanSettings({ rest:0 })')).indexOf("rest")>0);
  check("Import: eine Zahl in der Namensliste lehnt ab", (await err('cleanSettings({ hiddenPlans:["a", 1] })')).indexOf("hiddenPlans")>0);
  check("Import: unsichere Schlüssel werden ausgesiebt, nicht abgelehnt",
    await p.evaluate(()=>JSON.stringify(cleanSettings({ hiddenEx:["Flys","__proto__"] }).hiddenEx)==='["Flys"]'));
  // Der bis 1.30.2 offene Fall: die Signal-Einstellungen kamen nicht durch den Import
  check("Import: notifySignal und vibeLong kommen durch",
    await p.evaluate(()=>{ var o=cleanSettings({ notifySignal:false, vibeLong:true }); return o.notifySignal===false && o.vibeLong===true; }));
  check("Import: alle 19 Felder gehen durch, wenn sie stimmen", await p.evaluate(()=>{
    var o=cleanSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    return Object.keys(SETTING_FIELDS).every(function(k){ return k in o; });
  }));

  // 4. Zusammenfuehren: nur, wo noch der Ausgangswert steht; Listen vereinigt
  const merged = await p.evaluate(()=>{
    S.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    S.settings.rest = 100;                    // hier bewusst gesetzt
    S.settings.hiddenPlans = ["Push Day"];
    mergeSettings({ rest:60, barWeight:15, vibeLong:true, notifySignal:false, repSpan:4,
      hiddenPlans:["Pull Day","Push Day", 3], defWeight:0, defSets:2.5 });
    return JSON.parse(JSON.stringify(S.settings));
  });
  check("Merge: ein gesetzter Wert bleibt", merged.rest===100);
  check("Merge: ein Ausgangswert wird übernommen", merged.barWeight===15 && merged.repSpan===4 && merged.defWeight===0);
  check("Merge: die Signal-Einstellungen kommen mit", merged.vibeLong===true && merged.notifySignal===false);
  check("Merge: Bruchzahl für eine Anzahl wird übergangen", merged.defSets===2);
  check("Merge: Namensliste wird vereinigt, Fremdes fällt weg", merged.hiddenPlans.join()==="Push Day,Pull Day");

  // 5. Rundlauf ueber ein echtes Backup
  const round = await p.evaluate(()=>{
    S.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    S.settings.notifySignal=false; S.settings.vibeLong=true; S.settings.rest=75;
    var text = backupText();
    S.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    var data = prepareBackup(JSON.parse(text));
    mergeSettings(data.settings);
    return { n:S.settings.notifySignal, v:S.settings.vibeLong, r:S.settings.rest };
  });
  check("Backup speichern und laden bringt die Signal-Einstellungen zurück", round.n===false && round.v===true && round.r===75, JSON.stringify(round));
});
