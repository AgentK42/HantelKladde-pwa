/* Planung: Entwurf je Plan und Einzelübung, Muskelbilanz, Zuweisen auf Tage,
   Übernehmen als Wochenziel, Backup ohne Entwurf, Neustart und Adresse. */
const { suite } = require("./lib");

suite(async ({ open, check, errs, url }) => {
  const page = await open();
  check("Seite laeuft ohne Fehler", errs.length === 0, errs.join(" | "));
  check("fuenf Reiter", await page.locator(".seg button").count() === 5);
  await page.click('.seg button[data-v="planung"]');
  await page.waitForTimeout(100);
  check("Reiter Planung aktiv", await page.evaluate(() => S.view === "planung"));
  const heads = await page.locator(".sect h2").allInnerTexts();
  check("Abschnitte", ["Entwurf","Einzelne Übungen","Sätze je Muskelgruppe","Zuweisen","Übernehmen"].every(t => heads.some(h => h.startsWith(t))), heads.join(" / "));
  // Standard: keine Wochenziele -> kein Plan im Entwurf
  check("ohne Wochenziel leerer Entwurf", await page.evaluate(() => draftPlans().length === 0));
  check("Hinweis kein Plan", (await page.locator(".notice").allInnerTexts()).some(t => t.includes("Kein Plan und keine Übung")));
  // Push Day und Pull Day einschalten, Push zweimal
  await page.click('.tog[data-v="Push Day"]');
  await page.click('.tog[data-v="Pull Day"]');
  await page.click('.step button[data-act="draftstep"][data-v="Push Day"][data-d="1"]');
  check("Entwurf Push 2x Pull 1x", await page.evaluate(() => draftEntry("Push Day").times === 2 && draftEntry("Pull Day").on && !draftEntry("Upper Body").on));
  check("Wochenziele unveraendert", await page.evaluate(() => Object.keys(S.settings.weekGoals).length === 0));
  check("Entwurf gespeichert", await page.evaluate(() => JSON.parse(localStorage.getItem("kraftlog:entwurf")).plans["Push Day"].times === 2));
  const rows = await page.locator(".volrow").count();
  check("15 Muskelgruppen mit Null-Zeilen", rows === 15, String(rows));
  const brust = await page.evaluate(() => muscleTally(draftSources()).by["Brust"].total);
  check("Brust 16 Saetze (4 Uebungen x 2 Saetze x 2)", brust === 16, String(brust));
  check("Paar Bizeps/Trizeps rot", await page.locator(".pairline b.off").count() >= 1);
  check("Ohne Satz Zeile", (await page.locator(".pairline").allInnerTexts()).some(t => t.startsWith("Ohne Satz im Entwurf")));
  // Referenzbereich: zwei Striche je Balken bei 10 und 20 Saetzen, links vom Rand
  const refs = await page.evaluate(() => {
    const rows = document.querySelectorAll(".vol.bymuscle .volrow");
    const first = rows[0].querySelectorAll(".vb .ref");
    const pos = Array.from(first).map(b => parseFloat(b.style.left));
    return { perRow: first.length, total: document.querySelectorAll(".vol.bymuscle .ref").length,
      rows: rows.length, pos, legend: document.querySelector(".planlegend").textContent };
  });
  check("zwei Striche je Balken", refs.perRow === 2 && refs.total === refs.rows * 2, JSON.stringify(refs));
  check("Striche bei 10 und 20, im Bild und in Reihenfolge", refs.pos[0] < refs.pos[1] && refs.pos[1] < 100 && Math.abs(refs.pos[0] / refs.pos[1] - 0.5) < 0.01, JSON.stringify(refs.pos));
  check("Legende nennt den Bereich", /10 und 20 Sätze je Woche/.test(refs.legend), refs.legend);
  // Einzelne Uebung ueber den Waehler
  await page.click('button[data-act="pickmulti"]');
  await page.waitForTimeout(100);
  check("Waehler fuer Entwurf", (await page.locator(".pkhead b").innerText()) === "Für den Entwurf wählen");
  await page.fill("#searchEx", "Lower Back");
  await page.waitForTimeout(150);
  await page.click('.excard[data-v="Lower Back Crunch"]');
  await page.click('button[data-act="pickmultidone"]');
  await page.waitForTimeout(100);
  check("Uebung im Entwurf", await page.evaluate(() => S.draft.extras.length === 1 && S.draft.extras[0].name === "Lower Back Crunch"));
  check("Hinweis Entwurf", (await page.locator(".notice").first().innerText()).includes("in den Entwurf"));
  check("Unterer Ruecken jetzt 2", await page.evaluate(() => muscleTally(draftSources()).by["Unterer Rücken"].total === 2));
  await page.click('.step button[data-act="draftxstep"][data-f="sets"][data-d="1"]');
  check("Saetze 3", await page.evaluate(() => S.draft.extras[0].sets === 3));
  // Zuweisen
  check("erster Tag gewaehlt", await page.evaluate(() => S.planDaySel === planWeeks()[0].days[0]));
  const ncal = await page.locator(".cal").count();
  check("2 oder 3 Wochen", ncal >= 2 && ncal <= 3, String(ncal));
  check("Auswahl unter erster Woche", await page.evaluate(() => { const c = document.querySelector(".cal"); return c && c.nextElementSibling && c.nextElementSibling.classList.contains("assign"); }));
  await page.click('.chips button[data-act="planassign"][data-v="Push Day"]');
  check("Tag zugewiesen", await page.evaluate(() => S.settings.planDays[planWeeks()[0].days[0]] === "Push Day"));
  check("gespeichert", await page.evaluate(() => JSON.parse(localStorage.getItem("kraftlog:settings")).planDays[planWeeks()[0].days[0]] === "Push Day"));
  // Tag in der letzten Woche waehlen -> Auswahl unter dieser Woche
  const lastDay = await page.evaluate(() => shiftISO(todayISO(), 13));
  await page.click('.cal .wday[data-v="' + lastDay + '"]');
  check("Auswahl unter letzter Woche", await page.evaluate(() => { const cs = document.querySelectorAll(".cal"); const c = cs[cs.length - 1]; return c.nextElementSibling && c.nextElementSibling.classList.contains("assign") && !c.nextElementSibling.classList.contains("mid"); }));
  await page.click('.chips button[data-act="planassign"][data-v="Pull Day"]');
  const sums = await page.locator(".wsum .c").allInnerTexts();
  check("Tabelle zeigt Zuweisung", sums.length >= 4 && sums[0] === "1 / 2", sums.join(","));
  // Training: Ring im Wochenstreifen
  await page.click('.seg button[data-v="tag"]');
  await page.waitForTimeout(100);
  check("Ring im Wochenstreifen", await page.evaluate(() => { const c = document.querySelector('#week .wday[data-v="' + planWeeks()[0].days[0] + '"]'); return c && c.classList.contains("plan") && c.title.includes("geplant: Push Day"); }));
  // Backup enthaelt planDays, Import liest sie
  const bk = await page.evaluate(() => JSON.parse(backupText()));
  const plannedDay = await page.evaluate(() => planWeeks()[0].days[0]);
  check("Backup traegt planDays", bk.settings.planDays[plannedDay] === "Push Day");
  check("Backup ohne Entwurf", JSON.stringify(bk).indexOf("draft") < 0 && !bk.settings.draft);
  const imp = await page.evaluate((t) => { const b = JSON.parse(backupText()); b.settings.planDays[t] = "Pull Day"; b.settings.planDays["2020-01-01"] = "Push Day"; b.settings.planDays[shiftISO(t, 5)] = "Upper Body"; mergeBackup(JSON.stringify(b)); return [S.settings.planDays[t], S.settings.planDays["2020-01-01"], S.settings.planDays[shiftISO(t, 5)]]; }, plannedDay);
  check("Import: bestehender Tag bleibt, alter faellt, freier kommt", imp[0] === "Push Day" && imp[1] === undefined && imp[2] === "Upper Body", JSON.stringify(imp));
  const bad = await page.evaluate(() => { const b = JSON.parse(backupText()); b.settings.planDays["nix"] = "Push Day"; try { mergeBackup(JSON.stringify(b)); return "durch"; } catch (e) { return e.message; } });
  check("Import lehnt kaputtes Datum ab", bad.includes("ungültiges Datum"), bad);
  // Uebernehmen
  await page.click('.seg button[data-v="planung"]');
  await page.click('button[data-act="drafttake"]');
  check("Wochenziele uebernommen", await page.evaluate(() => S.settings.weekGoals["Push Day"] === 2 && S.settings.weekGoals["Pull Day"] === 1 && S.settings.weekGoals["Upper Body"] === undefined));
  check("Historie geschrieben", await page.evaluate(() => S.settings.weekGoalLog["Push Day"].length === 1 && S.settings.weekGoalLog["Push Day"][0].value === 2));
  check("Entwurf geleert, Extras bleiben", await page.evaluate(() => Object.keys(S.draft.plans).length === 0 && S.draft.extras.length === 1));
  check("Entwurf zeigt weiter Push 2x", await page.evaluate(() => draftEntry("Push Day").on && draftEntry("Push Day").times === 2));
  check("Uebernehmen jetzt aus", await page.locator('button[data-act="drafttake"]').isDisabled());
  // Plaene-Reiter unveraendert nutzbar
  await page.click('.seg button[data-v="plaene"]');
  await page.click('button[data-act="secfold"][data-v="plansets"]');
  check("Plaene-Reiter Balken", await page.locator(".vol.bymuscle .volrow").count() > 0);
  check("Plaene-Reiter ohne Null-Zeilen", await page.locator(".volrow.zero").count() === 0);
  // Neustart: Entwurf ueberlebt, Reiter ueberlebt
  await page.click('.seg button[data-v="planung"]');
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(300);
  check("nach Neustart Reiter Planung", await page.evaluate(() => S.view === "planung"));
  check("nach Neustart Extras da", await page.evaluate(() => S.draft.extras.length === 1 && S.draft.extras[0].sets === 3));
  await page.click('button[data-act="draftreset"]');
  check("verwerfen leert", await page.evaluate(() => S.draft.extras.length === 0));
  // Adresse ?tab=planung
  await page.goto(url + "?tab=planung", { waitUntil: "load" });
  check("Shortcut-Parameter", await page.evaluate(() => S.view === "planung"));
  // Dunkel-Screenshot der Planung
  await page.evaluate(() => { setTheme("dark"); });
  await page.click('.seg button[data-v="planung"]');
});
