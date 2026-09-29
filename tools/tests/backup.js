/* Backupgröße unter Daten: sie folgt jeder Änderung, die ins Backup gehört,
   auch einer Tagesnotiz, die beim Tippen nur ihren eigenen Schlüssel schreibt. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  const size = async () => {
    await p.click('.seg button[data-v="daten"]'); await p.waitForTimeout(150);
    const t = await p.locator(".card p", { hasText: "Backupgröße" }).first().innerText();
    return (t.match(/Backupgröße ([^\n]+)\./) || [])[1];
  };
  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(150);
  await p.click('.plans button[data-act="plan"][data-v="Push Day"]'); await p.waitForTimeout(200);
  await p.click('button[data-act="save"]'); await p.waitForTimeout(300);
  const before = await size();
  check("die Größe steht da", !!before, before);

  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(150);
  await p.click('button[data-act="noteopen"]'); await p.waitForTimeout(150);
  await p.fill("#dayNote", "Bank besetzt, auf die Maschine ausgewichen. ".repeat(80));
  const after = await size();
  check("nach einer langen Tagesnotiz ist das Backup größer", after && after !== before,
    before + " / " + after);
});
