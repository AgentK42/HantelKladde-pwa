/* Farbschema beim Start: ohne Wahl dunkel, eine gemerkte Wahl gilt vor dem
   System, und "System" folgt dem Handy, auch beim Umschalten in den Nachtmodus
   bei offener App (der Beobachter aus readTheme()). Jeder Fall bekommt seinen
   eigenen Browserkontext, weil colorScheme nur dort einstellbar ist. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  async function start(scheme, stored) {
    const p = await open({ colorScheme: scheme });
    if (stored === null) await p.evaluate(() => localStorage.removeItem(THEME_KEY));
    else await p.evaluate((v) => localStorage.setItem(THEME_KEY, v), stored);
    await p.reload({ waitUntil: "load" }); await p.waitForTimeout(250);
    const r = await p.evaluate(() => ({
      theme: document.documentElement.getAttribute("data-theme"), auto: S.themeAuto }));
    r.page = p;
    return r;
  }
  let r;
  r = await start("light", null);
  check("ohne Wahl startet die App dunkel, auch bei hellem System", r.theme === "dark" && r.auto === false, r.theme);
  await r.page.context().close();
  r = await start("dark", "light");
  check("gemerkt hell bleibt hell, auch bei dunklem System", r.theme === "light" && r.auto === false);
  await r.page.context().close();
  r = await start("light", "dark");
  check("gemerkt dunkel bleibt dunkel", r.theme === "dark" && r.auto === false);
  await r.page.context().close();
  r = await start("light", "auto");
  check("System folgt dem hellen Handy", r.theme === "light" && r.auto === true);
  await r.page.emulateMedia({ colorScheme: "dark" }); await r.page.waitForTimeout(200);
  check("System folgt dem Umschalten in den Nachtmodus",
    await r.page.evaluate(() => document.documentElement.getAttribute("data-theme")) === "dark");
  await r.page.context().close();
  r = await start("dark", "auto");
  check("System folgt dem dunklen Handy", r.theme === "dark" && r.auto === true);
  await r.page.context().close();
});
