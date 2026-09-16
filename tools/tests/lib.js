/* Gemeinsamer Rahmen der Verhaltenstests unter tools/tests. Jede Suite ist ein
   Ablauf in Chromium gegen die echte index.html: Server auf einem freien Port,
   ein Browser, eine Seite bei 390 Pixel Breite, am Ende die Bilanz und der
   Rückgabewert für das Startskript tools/test-app.sh.

   Was hier steht, stand vorher am Kopf jeder einzelnen Suite. Die Suiten
   beschreiben Verhalten (eine Pause, ein Rekord, ein Plan), nicht den Aufbau
   dieser Kulisse, deshalb bekommen sie nur vier Dinge in die Hand:

     open(opts)   eine geladene Seite, opts gehen an newContext (etwa colorScheme)
     check(name, ok, extra)   eine Prüfung mit Namen, extra steht bei Fehlschlag dabei
     errs         Fehler aus Konsole und Seite, aller Seiten dieser Suite
     url          die Adresse der App, falls eine Suite selbst navigiert

   Rückgabewert: 0 alles grün, 1 mindestens eine Prüfung schlug fehl, 2 die Suite
   selbst ist abgestürzt, etwa an einem Selektor, den es nicht mehr gibt. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".png":"image/png",
  ".webmanifest":"application/manifest+json", ".json":"application/json" };

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

async function suite(body) {
  const fails = [], errs = [];
  function check(name, ok, extra) {
    console.log((ok ? "OK   " : "FEHL ") + name + (extra ? "  " + extra : ""));
    if (!ok) fails.push(name);
  }
  const srv = await serve();
  const url = "http://127.0.0.1:" + srv.address().port + "/";
  /* channel: "chromium" nimmt den vollen Browser, wie in test-pwa.js. Er liegt
     dort, wo Playwright ihn installiert hat, ohne einen Pfad in den Suiten. */
  const browser = await chromium.launch({ channel: "chromium" });

  async function open(opts) {
    const ctx = await browser.newContext(Object.assign(
      { viewport: { width: 390, height: 844 } }, opts || {}));
    const page = await ctx.newPage();
    page.on("pageerror", e => errs.push(String(e)));
    page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
    await page.goto(url, { waitUntil: "load" });
    /* Der erste Neuaufbau und die Sitzungswiederherstellung brauchen einen
       Augenblick, bevor die Suite hineingreift. */
    await page.waitForTimeout(250);
    return page;
  }

  let crashed = false;
  try {
    await body({ open, check, errs, url });
  } catch (e) {
    crashed = true;
    console.error(e);
  }
  check("keine Fehler in Konsole und Seite", errs.length === 0, errs.join(" | "));
  await browser.close();
  srv.close();
  if (crashed) console.log("ABBRUCH: die Suite ist nicht bis zum Ende gelaufen");
  else console.log(fails.length ? "FEHLER: " + fails.join(", ") : "alles gruen");
  process.exit(crashed ? 2 : (fails.length ? 1 : 0));
}

module.exports = { suite };
