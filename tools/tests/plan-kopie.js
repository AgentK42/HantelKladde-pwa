/* Plan duplizieren: Name mit Zusatz und Nummer, alle Übungen, eigene Farbe,
   kein Wochenziel, keine Sperre, unabhängig vom Original, im Backup. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.click('.seg button[data-v="plaene"]'); await p.waitForTimeout(250);

  check("jeder Plan hat einen Kopierknopf",
    await p.locator('[data-act="dupplan"]').count() === await p.evaluate(()=>Object.keys(S.plans).length));

  // Ausgangslage: Wochenziel und Sperre am Original
  await p.evaluate(()=>{
    S.settings.weekGoals["Push Day"]=2;
    S.settings.lockedPlans=["Push Day"];
    S.settings.hiddenPlans=["Push Day"];
    persist(); render();
  });
  const before = await p.evaluate(()=>S.plans["Push Day"].length);
  await p.click('[data-act="dupplan"][data-v="Push Day"]'); await p.waitForTimeout(250);

  check("die Kopie heißt wie das Original mit Zusatz",
    await p.evaluate(()=>!!S.plans["Push Day Kopie"]));
  check("die Übungen kommen vollständig mit",
    await p.evaluate((n)=>S.plans["Push Day Kopie"].length===n, before));
  check("mit allen Zielwerten", await p.evaluate(()=>
    JSON.stringify(S.plans["Push Day Kopie"])===JSON.stringify(S.plans["Push Day"])));
  check("die Kopie steht am Ende der Liste", await p.evaluate(()=>{
    var k=Object.keys(S.plans); return k[k.length-1]==="Push Day Kopie";
  }));
  check("kein Wochenziel mitkopiert",
    await p.evaluate(()=>!S.settings.weekGoals["Push Day Kopie"]));
  check("die Kopie ist sichtbar und ungesperrt", await p.evaluate(()=>
    S.settings.hiddenPlans.indexOf("Push Day Kopie")<0 &&
    S.settings.lockedPlans.indexOf("Push Day Kopie")<0));
  check("die Kopie hat eine andere Farbe als das Original",
    await p.evaluate(()=>planColor("Push Day Kopie")!==planColor("Push Day")),
    await p.evaluate(()=>planColor("Push Day")+" vs "+planColor("Push Day Kopie")));
  check("keine zwei Pläne teilen sich eine Farbe", await p.evaluate(()=>{
    var c=Object.keys(S.plans).map(planColor);
    return c.length===new Set(c).size;
  }));
  check("die Meldung nennt die Zahl der Übungen",
    (await p.evaluate(()=>S.note)).indexOf(String(before))>=0,
    await p.evaluate(()=>S.note));

  // Unabhaengigkeit
  await p.evaluate(()=>{ S.plans["Push Day Kopie"][0].sets=9; persist(); });
  check("eine Änderung an der Kopie lässt das Original in Ruhe",
    await p.evaluate(()=>S.plans["Push Day"][0].sets!==9));

  // Zweite Kopie
  await p.click('[data-act="dupplan"][data-v="Push Day"]'); await p.waitForTimeout(250);
  check("die zweite Kopie wird durchnummeriert",
    await p.evaluate(()=>!!S.plans["Push Day Kopie 2"]));
  await p.click('[data-act="dupplan"][data-v="Push Day Kopie"]'); await p.waitForTimeout(250);
  check("auch eine Kopie lässt sich kopieren",
    await p.evaluate(()=>!!S.plans["Push Day Kopie Kopie"] &&
      S.plans["Push Day Kopie Kopie"][0].sets===9));

  // Im Training sichtbar
  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(250);
  check("die Kopie steht im Training zur Auswahl",
    await p.locator('.plans button[data-act="plan"][data-v="Push Day Kopie"]').count()===1);

  // Backup
  check("die Kopie liegt im Backup", await p.evaluate(()=>{
    var d=prepareBackup(JSON.parse(backupText()));
    return !!d.plans["Push Day Kopie"] && d.colors["Push Day Kopie"];
  }));

  // Ueberleben eines Neustarts
  await p.reload({waitUntil:"load"}); await p.waitForTimeout(400);
  check("die Kopie übersteht einen Neustart",
    await p.evaluate(()=>!!S.plans["Push Day Kopie"] && !!S.plans["Push Day Kopie 2"]));

  // Eingeklappte Karten bleiben ohne Kopierknopf, sonst wird der Name abgeschnitten
  await p.click('.seg button[data-v="plaene"]'); await p.waitForTimeout(200);
  await p.evaluate(()=>{ S.planCardsFold=true; render(); });
  await p.waitForTimeout(150);
  check("eingeklappt steht kein Kopierknopf da",
    await p.locator('[data-act="dupplan"]').count()===0);
  check("und der Planname bleibt vollständig", await p.evaluate(()=>{
    var e=Array.from(document.querySelectorAll(".phead h3 .nm"))
      .filter(function(x){ return x.textContent==="Push Day"; })[0];
    return !!e && e.scrollWidth <= e.clientWidth+1;
  }));
  await p.evaluate(()=>{ S.planCardsFold=false; render(); });
  await p.waitForTimeout(150);
  check("ausgeklappt ist er wieder da",
    await p.locator('[data-act="dupplan"]').count()>0);
});
