/* Backupgröße unter Daten: sie folgt jeder Änderung, die ins Backup gehört,
   auch einer Tagesnotiz, die beim Tippen nur ihren eigenen Schlüssel schreibt. */
const { suite, tab, pickPlan, saveSet } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  const size = async () => {
    await tab(p, "daten");
    const t = await p.locator(".card p", { hasText: "Backupgröße" }).first().innerText();
    return (t.match(/Backupgröße ([^\n]+)\./) || [])[1];
  };
  await tab(p, "tag");
  await pickPlan(p, "Push Day");
  await saveSet(p);
  const before = await size();
  check("die Größe steht da", !!before, before);

  await tab(p, "tag");
  await p.click('button[data-act="noteopen"]'); await p.waitForTimeout(150);
  await p.fill("#dayNote", "Bank besetzt, auf die Maschine ausgewichen. ".repeat(80));
  const after = await size();
  check("nach einer langen Tagesnotiz ist das Backup größer", after && after !== before,
    before + " / " + after);
});
