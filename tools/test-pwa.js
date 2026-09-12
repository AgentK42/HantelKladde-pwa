/* Prüft die App-Schicht: ServiceWorker, Offline-Betrieb, Update-Weg,
   Zurück-Geste, Speicherzusage, Shortcut-Parameter und das Entgegennehmen
   eines geteilten Backups. Nichts davon lässt sich durch Hinsehen prüfen,
   deshalb dieses Skript.

   Braucht Playwright mit Chromium, sonst nichts:
     npm i -g playwright && npx playwright install chromium
     NODE_PATH=$(npm root -g) node tools/test-pwa.js

   Startet den Server selbst auf einem freien Port und räumt sw.js wieder auf,
   auch wenn unterwegs etwas schiefgeht. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const SW = path.join(ROOT, "sw.js");
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".png":"image/png",
  ".webmanifest":"application/manifest+json", ".json":"application/json" };

const fail = [];
function check(name, ok, extra) {
  console.log((ok ? "OK   " : "FEHL ") + name + (extra ? "  " + extra : ""));
  if (!ok) fail.push(name);
}

function serve() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end("nicht da"); return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

/* Ein paar Sätze über mehrere Tage, damit der Verlauf etwas zum Aufklappen hat.
   Die Tage liegen bewusst relativ zu heute: der Verlauf zeigt zuerst die
   letzten sieben Tage, und ein fest eingetragenes Datum wäre dort irgendwann
   nicht mehr dabei. */
function seed() {
  const iso = back => {
    const d = new Date();
    d.setDate(d.getDate() - back);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  const out = [];
  [0, 2, 4, 6, 9, 12].forEach((back, di) => {
    const d = iso(back);
    ["Benchpress Maschine", "Latzug Maschine"].forEach((n, xi) => {
      for (let s = 1; s <= 3; s++) {
        out.push({ id: d + "-" + xi + "-" + s, date: d, exercise: n, set: s,
          weight: 40 + xi * 10 + (5 - di) * 2.5, reps: 8, rpe: 8,
          ts: Date.parse(d + "T18:0" + s + ":00") });
      }
    });
  });
  localStorage.setItem("kraftlog:v1", JSON.stringify(out));
}

async function main() {
  const original = fs.readFileSync(SW, "utf8");
  const srv = await serve();
  const base = "http://127.0.0.1:" + srv.address().port + "/";
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width:412, height:915 },
    locale: "de-DE", hasTouch: true, isMobile: true });
  const errs = [];
  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript(seed);

  try {
    await page.goto(base, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1200);

    check("ServiceWorker steuert die Seite",
      await page.evaluate(() => !!navigator.serviceWorker.controller));
    const ver = await page.evaluate(() => ({ app: APP_VERSION, sw: S.pwa.swVersion }));
    check("Worker meldet dieselbe Version", ver.app === ver.sw, JSON.stringify(ver));
    check("Speicherzusage abgefragt",
      await page.evaluate(() => S.pwa.persisted) !== null);

    /* Zurück-Geste: aufgeklapptes Diagramm im Verlauf */
    await page.click('[data-act="tab"][data-v="verlauf"]');
    await page.waitForTimeout(300);
    await page.locator('[data-act="openex"]').first().click();
    await page.waitForTimeout(200);
    check("Aufklappen legt eine History-Ebene an",
      await page.evaluate(() => navStack.length) === 1);
    await page.goBack();
    await page.waitForTimeout(300);
    check("Zurück schließt nur das Diagramm",
      await page.evaluate(() => S.openEx === "" && navStack.length === 0));

    /* Zusammenfassung ersetzt die Fokus-Ebene, statt eine zweite anzulegen */
    const swap = await page.evaluate(() => {
      S.view = "tag"; S.focus = true; navOpen("focus");
      S.summaryData = trainingSummary(S.date);
      S.showSummary = true; S.summaryReturn = ""; S.focus = false;
      navSwap("summary"); render();
      return { depth: navStack.length, top: navStack[navStack.length - 1] };
    });
    check("Zusammenfassung ersetzt die Fokus-Ebene",
      swap.depth === 1 && swap.top === "summary", JSON.stringify(swap));
    await page.goBack();
    await page.waitForTimeout(300);
    check("Zurück verlässt die Zusammenfassung ganz",
      await page.evaluate(() => !S.showSummary && !S.focus && navStack.length === 0));

    /* Shortcut aus dem Manifest */
    await page.goto(base + "?tab=verlauf", { waitUntil: "load" });
    await page.waitForTimeout(700);
    check("Shortcut öffnet den Reiter und räumt die Adresse auf",
      await page.evaluate(() => S.view === "verlauf" && location.search === ""));

    /* Geteiltes Backup */
    const before = await page.evaluate(() => S.entries.length);
    await page.evaluate(async () => {
      const backup = JSON.stringify({ app:"kraftlog", version:6,
        exported:new Date().toISOString(),
        entries:[{ id:"geteilt-1", date:"2026-09-11", exercise:"Squats", set:1,
          weight:60, reps:5, rpe:8, ts:Date.parse("2026-09-11T18:00:00") }] });
      const fd = new FormData();
      fd.append("backup", new File([backup], "backup.txt", { type:"text/plain" }));
      await fetch("share-target", { method:"POST", body:fd });
    });
    const stash = await page.evaluate(async () => {
      const c = await caches.open("hantelkladde-geteilt");
      return (await c.keys()).map(r => new URL(r.url).pathname);
    });
    check("Worker legt die geteilte Datei ab", stash.includes("/shared-backup"), stash.join(","));
    await page.goto(base + "?geteilt=1", { waitUntil: "load" });
    await page.waitForTimeout(900);
    check("Geteiltes Backup eingelesen",
      await page.evaluate(() => S.entries.length) === before + 1);
    await page.goto(base + "?geteilt=1", { waitUntil: "load" });
    await page.waitForTimeout(900);
    check("Geteiltes Backup nur einmal",
      /bereits eingelesen/.test(await page.evaluate(() => S.note)));

    /* Offline */
    await ctx.setOffline(true);
    await page.goto(base, { waitUntil: "load" });
    await page.waitForTimeout(800);
    check("Läuft offline", await page.evaluate(() => !!document.querySelector(".brand")));
    await ctx.setOffline(false);

    const urls = await page.evaluate(async () => {
      const n = (await caches.keys()).find(k => /^hantelkladde-1\./.test(k));
      return (await (await caches.open(n)).keys()).map(r => new URL(r.url).pathname);
    });
    check("index.html liegt genau einmal im Cache",
      urls.filter(u => /index\.html$/.test(u)).length === 1 && !urls.includes("/"),
      urls.join(" "));

    /* Update-Weg */
    fs.writeFileSync(SW, original.replace('var APP_VERSION = "', 'var APP_VERSION = "9.'));
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(2500);
    check("Update wird gemeldet", await page.evaluate(() => S.pwa.updateReady === true));
    check("Alte Fassung liefert bis zum Tipp weiter aus",
      await page.evaluate(() => S.pwa.swVersion) === ver.app);
    await page.locator('[data-act="swupdate"]').first().click();
    await page.waitForTimeout(2500);
    check("Nach dem Tipp läuft die neue Fassung",
      await page.evaluate(() => S.pwa.swVersion.indexOf("9.") === 0));
    const left = await page.evaluate(() => caches.keys());
    check("Alter Cache ist geräumt",
      left.filter(c => /^hantelkladde-\d/.test(c)).length === 1, left.join(","));

    console.log("\nKonsolenfehler:", errs.length);
    errs.slice(0, 5).forEach(e => console.log("  " + e));
    if (errs.length) fail.push("Konsolenfehler");
  } finally {
    fs.writeFileSync(SW, original);
    await browser.close();
    srv.close();
  }
  console.log(fail.length ? "\nFEHLGESCHLAGEN: " + fail.join(", ") : "\nAlles bestanden");
  process.exit(fail.length ? 1 : 0);
}

main();
