/* Backup laden ergänzt und überschreibt nicht: Sätze nach ID, Pläne nur neu oder
   unverändert, Übungsdaten je Feld, Notizen und Farben je Eintrag, dazu der
   Backup-Zeitpunkt und die Ablehnung fremder oder zu alter Dateien. */
const { suite, tab } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.evaluate(() => {
    window.fresh = function () {
      S.entries = [
        { id:"a", date:"2026-01-05", exercise:"Flys", set:1, weight:40, reps:10, rpe:8, ts:Date.parse("2026-01-05T18:00:00") },
        { id:"b", date:"2026-01-05", exercise:"Flys", set:2, weight:40, reps:9, rpe:null, ts:Date.parse("2026-01-05T18:03:00") }
      ];
      S.custom = [{ name:"Eigene", cat:"Push" }];
      S.plans = JSON.parse(JSON.stringify(DEFAULT_PLANS));
      S.plans["Push Day"][0].weight = 99;
      S.exmeta = { "Flys":{ step:5 } };
      S.notes = { "2026-01-05":"hier" };
      S.colors = { "Pull Day":"#111111" };
      S.meta = { lastBackup:"", lastCount:0, seeded:Object.keys(DEFAULT_PLANS) };
      persist();
    };
    window.backup = function () {
      var d = JSON.parse(backupText());
      d.exported = "2026-02-01T10:00:00.000Z";
      d.entries = [
        { id:"a", date:"2026-01-05", exercise:"Flys", set:1, weight:70, reps:3, rpe:8, ts:Date.parse("2026-01-05T18:00:00") },
        { id:"c", date:"2026-01-12", exercise:"Flys", set:1, weight:42.5, reps:10, rpe:8, ts:Date.parse("2026-01-12T18:00:00") }
      ];
      d.custom = [{ name:"Eigene", cat:"Legs" }, { name:"Mitgebracht", cat:"Pull" }];
      d.plans = { "Push Day":[{ name:"Flys", reps:12, weight:1, sets:2 }],
        "Pull Day":[{ name:"Shrugs", reps:12, weight:50, sets:3 }], "Neu":[{ name:"Dips", reps:8, weight:0, sets:2 }] };
      d.exmeta = { "Flys":{ step:1.25, note:"Sitz 3" }, "Mitgebracht":{ musclePrimary:"Rücken" } };
      d.notes = { "2026-01-05":"dort", "2026-01-12":"neu" };
      d.colors = { "Pull Day":"#222222", "Neu":"#333333" };
      return d;
    };
  });

  await p.evaluate(() => fresh());
  const r = await p.evaluate(() => {
    var n = mergeBackup(JSON.stringify(backup()));
    return { n:n, entries:S.entries.map(function (e) { return e.id + ":" + e.weight; }).join(),
      push:S.plans["Push Day"][0].weight, pull:S.plans["Pull Day"].map(function (i) { return i.name; }).join(),
      neu:!!S.plans["Neu"], custom:JSON.stringify(S.custom), flys:JSON.stringify(S.exmeta.Flys),
      mit:JSON.stringify(S.exmeta.Mitgebracht), notes:JSON.stringify(S.notes), colors:JSON.stringify(S.colors),
      last:S.meta.lastBackup, stored:JSON.parse(localStorage.getItem("kraftlog:v1")).length };
  });
  check("nur der neue Satz kommt dazu", r.n === 1 && r.entries === "a:40,b:40,c:42.5", r.n + " " + r.entries);
  check("die Sätze sind gespeichert", r.stored === 3);
  check("ein hier geänderter Plan bleibt", r.push === 99);
  check("ein unveränderter mitgelieferter Plan wird ersetzt", r.pull === "Shrugs", r.pull);
  check("ein neuer Plan kommt dazu", r.neu);
  check("eigene Übungen: vorhandene bleibt, neue kommt dazu",
    r.custom === '[{"name":"Eigene","cat":"Push"},{"name":"Mitgebracht","cat":"Pull"}]', r.custom);
  check("Übungsdaten je Feld: eigene Schrittweite bleibt, Geräteeinstellung kommt",
    r.flys === '{"step":5,"note":"Sitz 3"}', r.flys);
  check("Übungsdaten einer neuen Übung kommen mit", r.mit === '{"musclePrimary":"Rücken"}', r.mit);
  check("Notizen: vorhandene bleibt, neuer Tag kommt", r.notes === '{"2026-01-05":"hier","2026-01-12":"neu"}', r.notes);
  check("Farben: vorhandene bleibt, neue kommt", r.colors === '{"Pull Day":"#111111","Neu":"#333333"}', r.colors);
  check("ohne eigenes Backup gilt der Zeitpunkt der Datei", r.last === "2026-02-01T10:00:00.000Z", r.last);

  const again = await p.evaluate(() => mergeBackup(JSON.stringify(backup())));
  check("dieselbe Datei ein zweites Mal ergänzt nichts", again === 0);
  check("ein eigener Backup-Zeitpunkt bleibt", await p.evaluate(() => {
    S.meta.lastBackup = "2026-03-01T10:00:00.000Z";
    var d = backup(); d.exported = "2026-04-01T10:00:00.000Z";
    mergeBackup(JSON.stringify(d));
    return S.meta.lastBackup === "2026-03-01T10:00:00.000Z";
  }));

  const reject = await p.evaluate(() => {
    fresh();
    var out = [];
    [JSON.stringify({ app:"anders", version:BACKUP_VERSION, entries:[] }),
      JSON.stringify({ app:"kraftlog", version:5, entries:[] }),
      JSON.stringify({ app:"kraftlog", entries:[] }),
      JSON.stringify(Object.assign(backup(), { entries:[{ id:"x", date:"2026-13-01", exercise:"Flys" }] }))
    ].forEach(function (t) {
      try { mergeBackup(t); out.push("angenommen"); } catch (e) { out.push(e.message); }
    });
    return { out:out, n:S.entries.length, plans:Object.keys(S.plans).length };
  });
  check("eine fremde Datei wird abgelehnt", reject.out[0].indexOf("gehört nicht zu HantelKladde") > 0, reject.out[0]);
  check("ein zu altes Format nennt das gefundene", reject.out[1].indexOf("Format 5") > 0, reject.out[1]);
  check("ohne Formatnummer ebenso", reject.out[2].indexOf("ohne Angabe") > 0, reject.out[2]);
  check("ein kaputter Satz nennt seine Nummer", reject.out[3].indexOf("Satz 1 hat ein ungültiges Datum") > 0, reject.out[3]);
  check("nach einer Ablehnung ist nichts verändert", reject.n === 2 && reject.plans === 5, JSON.stringify(reject));

  await p.evaluate(() => { fresh(); S.out = JSON.stringify(backup()); });
  await tab(p, "daten");
  await p.click('[data-act="importtext"]'); await p.waitForTimeout(150);
  const note = await p.locator(".notice").first().innerText();
  check("Text einlesen meldet die Zahl", note.indexOf("1 Satz ergänzt, 3 insgesamt.") === 0, note);
  await p.fill("#out", "kein Backup");
  await p.click('[data-act="importtext"]'); await p.waitForTimeout(150);
  const bad = await p.locator(".notice").first().innerText();
  check("ein unlesbarer Text wird gemeldet", bad.indexOf("kein gültiges Backup") >= 0, bad);
});
