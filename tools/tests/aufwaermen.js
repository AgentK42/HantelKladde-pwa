/* Aufwärmsätze: kein RPE-Feld, kein RPE im Satz, Reps und RPE kommen nach dem
   Speichern auf den Zielwert zurück, auch im Fokus und nach einem Neustart. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  const st=()=>p.evaluate(()=>({reps:S.reps,rpe:S.rpe,weight:S.weight,warm:S.warm}));
  const rpeFields=async()=>(await p.locator('[data-act="step"][data-f="rpe"]').count())
    + (await p.locator('[data-act="pillrpe"]').count());

  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(150);
  await p.click('.plans button[data-act="plan"][data-v="Push Day"]'); await p.waitForTimeout(200);
  await p.evaluate(()=>{ S.rpe="9"; S.reps="10"; render(); });

  // 1. Standard-Trainingsreiter
  check("beim Arbeitssatz steht das RPE-Feld da", await rpeFields() > 0);
  await p.click('button[data-act="warmpick"][data-i="0"]'); await p.waitForTimeout(200);
  check("beim Aufwärmen ist das RPE-Feld weg", await rpeFields() === 0);
  check("die Reps bleiben einstellbar",
    await p.locator('[data-act="step"][data-f="reps"]').count() === 2);
  /* 40 kg an der Maschine mit 3,75er Schritt: fünf Schritte darunter sind 21,25,
     im Raster des Arbeitsgewichts, siehe rampWeight() und die Suite rampe.js. */
  check("die Rampe setzt Gewicht und Reps", await p.evaluate(()=>S.warm && S.weight==="21,25"), await p.evaluate(()=>S.weight));

  // 2. Speichern eines Aufwaermsatzes
  await p.evaluate(()=>{ S.rpe="6"; render(); });   // haengengebliebener Wert
  await p.click('button[data-act="save"]'); await p.waitForTimeout(300);
  const e1 = await p.evaluate(()=>S.entries[0]);
  check("der Aufwärmsatz trägt keinen RPE", e1 && e1.warm === true && e1.rpe === null,
    JSON.stringify(e1));
  const a1 = await st();
  check("Reps stehen wieder auf dem Zielwert", a1.reps === "10", JSON.stringify(a1));
  check("RPE steht wieder auf dem Zielwert", a1.rpe === "9", JSON.stringify(a1));
  check("und es ist wieder ein Arbeitssatz", a1.warm === false);

  // 3. Zweiter Rampensatz gleich danach
  await p.waitForTimeout(1000);
  await p.click('button[data-act="warmpick"][data-i="1"]'); await p.waitForTimeout(200);
  await p.click('button[data-act="save"]'); await p.waitForTimeout(300);
  const a2 = await st();
  check("auch nach dem zweiten Rampensatz kommt der Zielwert zurück",
    a2.reps === "10" && a2.rpe === "9" && !a2.warm, JSON.stringify(a2));
  check("beide Aufwärmsätze ohne RPE",
    await p.evaluate(()=>S.entries.length===2 && S.entries.every(e=>e.warm && e.rpe===null)));

  // 4. Doch ein Arbeitssatz statt speichern
  await p.click('button[data-act="warmpick"][data-i="0"]'); await p.waitForTimeout(200);
  await p.evaluate(()=>{ S.rpe="6"; S.reps="3"; render(); });
  await p.click('button[data-act="warmoff"]'); await p.waitForTimeout(200);
  const a3 = await st();
  check("Abbrechen holt Reps und RPE ebenfalls zurück",
    a3.reps === "10" && a3.rpe === "9" && !a3.warm, JSON.stringify(a3));

  // 5. Der Arbeitssatz speichert den RPE weiterhin
  await p.waitForTimeout(1000);
  await p.click('button[data-act="save"]'); await p.waitForTimeout(300);
  check("der Arbeitssatz trägt seinen RPE",
    await p.evaluate(()=>{ var e=S.entries[2]; return !e.warm && e.rpe===9; }),
    JSON.stringify(await p.evaluate(()=>S.entries[2])));

  // 6. Bearbeiten
  const warmId = await p.evaluate(()=>S.entries[0].id);
  const workId = await p.evaluate(()=>S.entries[2].id);
  await p.evaluate((i)=>{ S.editId=i; S.rpe="8"; render(); }, warmId);
  await p.waitForTimeout(200);
  check("ein Aufwärmsatz wird ohne RPE-Feld bearbeitet", await rpeFields() === 0);
  await p.click('button[data-act="update"]'); await p.waitForTimeout(200);
  check("und bleibt danach ohne RPE",
    await p.evaluate((i)=>S.entries.filter(e=>e.id===i)[0].rpe===null, warmId));
  await p.evaluate((i)=>{ S.editId=i; render(); }, workId);
  await p.waitForTimeout(200);
  check("ein Arbeitssatz wird mit RPE-Feld bearbeitet", await rpeFields() > 0);
  await p.evaluate(()=>{ S.rpe="8"; render(); });
  await p.click('button[data-act="update"]'); await p.waitForTimeout(200);
  check("und übernimmt den geänderten RPE",
    await p.evaluate((i)=>S.entries.filter(e=>e.id===i)[0].rpe===8, workId));

  // 7. Fokus-Modus
  await p.evaluate(()=>{ S.editId=""; S.focus=true; S.exercise="Flys"; S.weight="30";
    S.reps="10"; S.rpe="9"; render(); });
  await p.waitForTimeout(200);
  check("im Fokus-Modus steht der RPE beim Arbeitssatz", await rpeFields() > 0);
  await p.click('button[data-act="warmon"]'); await p.waitForTimeout(200);
  check("im Fokus-Modus ist er beim Aufwärmen weg", await rpeFields() === 0);

  // 8. Neustart mitten im Aufwaermen
  check("der Zielwert übersteht einen Neustart", await p.evaluate(()=>{
    saveSession();
    var d = JSON.parse(localStorage.getItem("kraftlog:session"));
    return d.warmRpe === "9" && d.warmReps === "10";
  }));
  await p.reload({waitUntil:"load"}); await p.waitForTimeout(400);
  check("nach dem Neustart wird noch aufgewärmt", await p.evaluate(()=>S.warm===true));
  await p.evaluate(()=>{ backToWork(); render(); });
  check("und der Zielwert kommt zurück",
    await p.evaluate(()=>S.rpe==="9" && S.reps==="10"));
});
