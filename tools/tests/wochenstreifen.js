/* Wochenstreifen und Wochenübersicht: Fenster von 13 Tagen zurück bis 7 vor,
   Ringe für geplante Tage, Zuweisen aus der Übersicht, Zurück-Geste. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const page = await open();
  // Streifen: 21 Zellen, 13 zurueck bis 7 vor
  check("21 Tage im Streifen", await page.locator("#week .wday").count() === 21);
  const first = await page.locator("#week .wday").first().getAttribute("data-v");
  const last = await page.locator("#week .wday").last().getAttribute("data-v");
  check("Fenster 13 zurueck bis 7 vor", await page.evaluate(([f, l]) => f === shiftISO(todayISO(), -13) && l === shiftISO(todayISO(), 7), [first, last]), first + " .. " + last);
  check("kuenftige Tage matt", await page.evaluate(() => { const c = document.querySelector('#week .wday[data-v="' + shiftISO(todayISO(), 1) + '"]'); return c && c.classList.contains("future"); }));
  check("heute nicht matt", await page.evaluate(() => !document.querySelector('#week .wday[data-v="' + todayISO() + '"]').classList.contains("future")));
  // Scrollposition: heute am rechten Rand, Zukunft rechts daneben
  const scr = await page.evaluate(() => { const w = document.getElementById("week"); return { l: w.scrollLeft, max: w.scrollWidth - w.clientWidth }; });
  check("Streifen scrollt, heute nicht am Ende", scr.l > 0 && scr.l < scr.max, JSON.stringify(scr));
  // Knopf oeffnet die Uebersicht
  check("Knopf am Streifen", await page.locator(".weekrow .weekmore").count() === 1);
  await page.click(".weekmore"); await page.waitForTimeout(150);
  check("Uebersicht offen", await page.evaluate(() => S.weekOverview === true));
  check("Titel", (await page.locator(".pkhead b").innerText()) === "Wochenübersicht");
  check("5 Wochen", await page.locator(".card .cal").count() === 5);
  check("35 Tage", await page.locator(".card .cal .wday").count() === 35);
  const kws = await page.locator(".kw").allInnerTexts();
  check("laufende Woche benannt", kws.some(t => t.toLowerCase().includes("diese woche")), kws.map(t => t.replace(/\n/g, " ")).join(" | "));
  check("Legende", await page.locator(".dotleg span").count() === 3);
  check("Streifen liegt nicht daneben", await page.locator("#week").count() === 0);
  // Zurueck-Geste schliesst die Uebersicht, nicht die App
  await page.goBack(); await page.waitForTimeout(150);
  check("Zurueck schliesst Uebersicht", await page.evaluate(() => S.weekOverview === false));
  check("Streifen wieder da", await page.locator("#week .wday").count() === 21);
  // In der Uebersicht wird zugewiesen, nicht geoeffnet
  await page.click(".weekmore"); await page.waitForTimeout(100);
  check("heute vorgewaehlt", await page.evaluate(() => S.ovrDay === todayISO()));
  check("Auswahl unter der laufenden Woche", await page.evaluate(() => {
    const cals = [...document.querySelectorAll(".card .cal")];
    return cals[2] && cals[2].nextElementSibling && cals[2].nextElementSibling.classList.contains("assign");
  }));
  const past = await page.evaluate(() => shiftISO(todayISO(), -9));
  check("vergangener Tag ist kein Knopf", await page.evaluate((d) => {
    const c = document.querySelector('.card .cal [data-v="' + d + '"]');
    return c === null && !!document.querySelector(".card .cal span.wday");
  }, past));
  const soon = await page.evaluate(() => shiftISO(todayISO(), 3));
  await page.click('.card .cal .wday[data-v="' + soon + '"]');
  await page.waitForTimeout(100);
  check("kuenftiger Tag waehlbar, Datum unveraendert", await page.evaluate((d) => S.ovrDay === d && S.date === todayISO(), soon));
  check("Uebersicht bleibt offen", await page.evaluate(() => S.weekOverview === true));
  check("Auswahl zeigt den Tag", (await page.locator(".assign .lab").innerText()).includes("frei"));
  await page.click('.assign .chips button[data-act="planassign"][data-v="Push Day"]');
  await page.waitForTimeout(100);
  check("Plan zugewiesen", await page.evaluate((d) => S.settings.planDays[d] === "Push Day", soon));
  check("gespeichert", await page.evaluate((d) => JSON.parse(localStorage.getItem("kraftlog:settings")).planDays[d] === "Push Day", soon));
  check("Ring in der Uebersicht", await page.evaluate((d) => document.querySelector('.card .cal .wday[data-v="' + d + '"]').classList.contains("plan"), soon));
  check("Trainingstag unveraendert", await page.evaluate(() => S.date === todayISO()));
  await page.click('.assign .chips button[data-act="planassign"][data-v=""]');
  await page.waitForTimeout(100);
  check("Frei nimmt die Zuweisung weg", await page.evaluate((d) => S.settings.planDays[d] === undefined, soon));
  // Zuweisung fuer heute waehlt den Plan im Training vor
  await page.click('.card .cal .wday[data-v="' + (await page.evaluate(() => todayISO())) + '"]');
  await page.click('.assign .chips button[data-act="planassign"][data-v="Pull Day"]');
  await page.waitForTimeout(100);
  check("heute zugewiesen waehlt den Plan vor", await page.evaluate(() => S.plan === "Pull Day"));
  await page.evaluate(() => { delete S.settings.planDays[todayISO()]; persist(); render(); });
  // Reiterwechsel schliesst die Uebersicht und laesst den Stapel sauber
  const closeOvr = async () => { if (await page.locator('button[data-act="weekovrclose"]').count()) { await page.click('button[data-act="weekovrclose"]'); await page.waitForTimeout(80); } };
  await closeOvr();
  await page.click(".weekmore"); await page.waitForTimeout(100);
  await page.click('.seg button[data-v="daten"]'); await page.waitForTimeout(150);
  check("Reiterwechsel schliesst Uebersicht", await page.evaluate(() => S.weekOverview === false && S.view === "daten"));
  check("History-Stapel leer nach Reiterwechsel", await page.evaluate(() => navStack.length === 0));
  // Weit entferntes Datum nimmt das Fenster mit (kommt nur noch aus der Sitzung)
  await page.click('.seg button[data-v="tag"]'); await page.waitForTimeout(100);
  await closeOvr();
  await page.evaluate(() => { S.date = shiftISO(todayISO(), -120); render(); });
  await page.waitForTimeout(100);
  check("Fenster wandert mit, weiter 21 Zellen", await page.locator("#week .wday").count() === 21);
  check("gewaehlter Tag im Streifen", await page.locator("#week .wday.on").count() === 1);
  await page.click('button[data-act="today"]');
  check("kein Kalenderfeld mehr", await page.locator('input[data-act="date"]').count() === 0);
  // Geplanter Tag traegt den Ring, in Streifen und Uebersicht
  await page.click(".weekmore"); await page.waitForTimeout(120);
  await page.click('.card .cal .wday[data-v="' + (await page.evaluate(() => todayISO())) + '"]');
  await page.click('.assign .chips button[data-act="planassign"][data-v="Push Day"]');
  await page.click('button[data-act="weekovrclose"]'); await page.waitForTimeout(100);
  check("Ring im Streifen", await page.evaluate(() => document.querySelector('#week .wday[data-v="' + todayISO() + '"]').classList.contains("plan")));
  await page.click(".weekmore"); await page.waitForTimeout(150);
  check("Ring in der Uebersicht", await page.evaluate(() => document.querySelector('.card .cal .wday[data-v="' + todayISO() + '"]').classList.contains("plan")));
  const now = (await page.locator(".kw .now").innerText());
  check("Bilanz der laufenden Woche", (await page.locator(".kw.now, .kw").filter({ hasText: /diese woche/i }).first().innerText()).includes("geplant"), now);

  // Eine Zelle fuer alle drei Orte: Streifen, Uebersicht und Planung zeichnen
  // denselben Tag, je Ort mit eigenem Verhalten fuer vergangene und kuenftige Tage
  const cells = await page.evaluate(() => {
    var td=todayISO(), d=shiftISO(td,-1);
    S.entries=[{ id:"a", date:d, exercise:"Flys", set:1, weight:30, reps:10, rpe:null, ts:Date.parse(d+"T10:00:00") }];
    /* persist() verwirft den Tagesindex aus dem letzten Neuaufbau, siehe entriesOn() */
    persist();
    var strip=dayCell(d, td, "pickday", td), ovr=dayCell(d, td, "ovrday", td), plan=dayCell(td, td, "planday", td);
    S.entries=[]; persist();
    return { strip:strip, ovr:ovr, plan:plan, fut:dayCell(shiftISO(td,3), td, "pickday", td) };
  });
  check("Streifen: angefangener Tag trägt den matten Ring", /class="wday part"/.test(cells.strip) && /data-act="pickday"/.test(cells.strip));
  check("Übersicht: vergangener Tag ist ein span", cells.ovr.indexOf("<span class=\"wday part\"")===0);
  check("Planung: heute markiert, kein future", /today/.test(cells.plan) && !/future/.test(cells.plan) && /data-act="planday"/.test(cells.plan));
  check("Streifen: künftiger Tag ist matt", /future/.test(cells.fut));
  // Die Uebersicht rechnet den Plan je Tag genau einmal, nicht einmal je Merkmal
  const calls = await page.evaluate(() => {
    var orig=dayPlan, n=0; dayPlan=function(d){ n+=1; return orig(d); };
    viewWeekOverview(); dayPlan=orig; return n;
  });
  check("35 Tage, 35 Aufrufe von dayPlan()", calls===35, String(calls));
});
