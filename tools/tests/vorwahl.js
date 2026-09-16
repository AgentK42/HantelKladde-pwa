/* Vorwahl des Plans im Training: die Zuweisung des Tages wählt den Plan, eine
   gemerkte Sitzung hat Vorrang, Abwählen bleibt, ausgeblendete Pläne nicht. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const page = await open();
  // Heute liegt seit 1.26.0 nicht mehr im Raster der Planung: Zuweisung fuer heute
  // laeuft ueber die Wochenuebersicht im Training.
  async function assignVia(day, plan) {
    await page.click('.seg button[data-v="tag"]'); await page.waitForTimeout(80);
    if (!(await page.locator('button[data-act="weekovrclose"]').count())) await page.click(".weekmore");
    await page.waitForTimeout(100);
    await page.click('.card .cal .wday[data-v="' + day + '"]'); await page.waitForTimeout(80);
    await page.click('.assign .chips button[data-act="planassign"][data-v="' + plan + '"]');
    await page.waitForTimeout(80);
    await page.click('button[data-act="weekovrclose"]'); await page.waitForTimeout(80);
  }

  check("kein Plan gewaehlt am Start", await page.evaluate(() => S.plan === ""));
  // Planung: Push und Pull einschalten, heute Push zuweisen
  const today = await page.evaluate(() => todayISO());
  await assignVia(today, "Push Day");
  check("Zuweisung heute waehlt Plan im Training", await page.evaluate(() => S.plan === "Push Day" && S.plansFold === true));
  check("erste Uebung des Plans vorgeschlagen", await page.evaluate(() => S.exercise === "Benchpress Maschine"));
  await page.click('.seg button[data-v="tag"]'); await page.waitForTimeout(100);
  check("Training zeigt eingeklappten Plan", (await page.locator(".plansel b").innerText()) === "Push Day");
  // Wechseln bleibt moeglich
  await page.click(".plansel");
  await page.click('.plans button[data-act="plan"][data-v="Pull Day"]');
  check("Wechsel auf Pull Day", await page.evaluate(() => S.plan === "Pull Day"));
  // Abwaehlen bleibt: kein erneutes Vorwaehlen beim Neuaufbau
  await page.click(".plansel");
  await page.click('.plans button[data-act="plan"][data-v="Pull Day"]');
  check("abgewaehlt", await page.evaluate(() => S.plan === ""));
  await page.evaluate(() => render());
  check("Neuaufbau waehlt nicht wieder vor", await page.evaluate(() => S.plan === ""));
  // Morgen Pull zuweisen, dann Datumswechsel im Streifen
  const tomorrow = await page.evaluate(() => shiftISO(todayISO(), 1));
  const free = await page.evaluate(() => shiftISO(todayISO(), 2));
  await assignVia(tomorrow, "Pull Day");
  check("Zuweisung fuer anderen Tag aendert Wahl nicht", await page.evaluate(() => S.plan === ""));
  await page.click('.seg button[data-v="tag"]');
  // Der Streifen endet heute, solange kein spaeteres Datum gewaehlt ist: morgen
  // also ueber das Datumsfeld, danach steht er im Streifen.
  const setDate = (d) => page.click('#week .wday[data-v="' + d + '"]');
  await setDate(tomorrow);
  check("Streifen morgen waehlt Pull Day", await page.evaluate(() => S.plan === "Pull Day" && S.date === shiftISO(todayISO(), 1)));
  await page.click('#week .wday[data-v="' + (await page.evaluate(() => todayISO())) + '"]');
  check("Streifen heute waehlt Push Day", await page.evaluate(() => S.plan === "Push Day"));
  await setDate(free);
  check("Tag ohne Zuweisung behaelt Wahl", await page.evaluate(() => S.plan === "Push Day"));
  await page.click('button[data-act="today"]');
  check("Heute waehlt Push Day", await page.evaluate(() => S.plan === "Push Day"));
  // Start ohne Sitzung: Plan des Tages vorgewaehlt
  await page.evaluate(() => localStorage.removeItem("kraftlog:session"));
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(200);
  check("Start ohne Sitzung waehlt heutigen Plan", await page.evaluate(() => S.plan === "Push Day" && S.date === todayISO()));
  // Start mit Sitzung: gemerkter Plan hat Vorrang
  await page.click(".plansel");
  await page.click('.plans button[data-act="plan"][data-v="Upper Body"]');
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(200);
  check("Sitzung hat Vorrang", await page.evaluate(() => S.plan === "Upper Body"));
  // Ausgeblendeter Plan wird nicht vorgewaehlt
  await page.click('.seg button[data-v="plaene"]');
  await page.click('button[data-act="planvis"][data-v="Push Day"]');
  await page.click('.seg button[data-v="tag"]');
  await setDate(tomorrow);
  await page.click('button[data-act="today"]');
  check("ausgeblendeter Plan nicht vorgewaehlt", await page.evaluate(() => S.plan === "Pull Day"));
  // Neustart mit gemerkter Sitzung ohne Plan: heute ist ein Plan zugewiesen, aber
  // der Nutzer hat ihn abgewaehlt und eine andere Uebung mit eigenen Werten
  // eingestellt, mitten im Aufwaermen. Der Start darf das nicht ueberschreiben.
  await page.evaluate(() => {
    S.settings.planDays[todayISO()] = "Push Day"; S.plan = "";
    S.exercise = "Squats"; S.weight = "80"; S.reps = "5"; S.rpe = "9";
    S.warm = true; S.warmBase = 80; S.warmReps = "5"; S.warmRpe = "9";
    persist(); saveSession();
  });
  await page.reload({ waitUntil: "load" }); await page.waitForTimeout(400);
  const st1 = await page.evaluate(() => ({ plan:S.plan, ex:S.exercise, w:S.weight, r:S.reps, warm:S.warm }));
  check("Neustart laesst die gemerkte Uebung ohne Plan in Ruhe",
    st1.plan === "" && st1.ex === "Squats" && st1.w === "80" && st1.r === "5" && st1.warm === true,
    JSON.stringify(st1));
});
