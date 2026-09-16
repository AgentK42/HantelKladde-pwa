/* Verlauf dieser Übung: derselbe Block im Trainingsreiter und im Fokus-Modus,
   je ein eigener Schalter unter Daten, und ohne frühere Einheit kein Block. */
const { suite } = require("./lib");

const EX = "Benchpress Maschine";

suite(async ({ open, check }) => {
  const p = await open();

  /* Drei frühere Einheiten mit je drei Sätzen, damit der Block etwas zu zeigen
     hat. Der heutige Tag bleibt leer: der Verlauf zeigt nur Früheres. */
  await p.evaluate((ex)=>{
    var iso=function (back) {
      var d=new Date(); d.setDate(d.getDate()-back);
      return d.toISOString().slice(0,10);
    };
    S.entries=[];
    [7,4,2].forEach(function (back, di) {
      for (var s=1; s<=3; s++) {
        S.entries.push({ id:"t"+di+"-"+s, date:iso(back), exercise:ex, set:s,
          weight:60+di, reps:8, rpe:8, ts:Date.now()-back*864e5, plan:"Push Day" });
      }
    });
    persist();
  }, EX);

  await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(150);
  await p.click('.plans button[data-act="plan"][data-v="Push Day"]'); await p.waitForTimeout(200);
  await p.evaluate((ex)=>{ S.exercise=ex; render(); }, EX);

  const head = ()=>p.locator('[data-act="exhist"]').count();
  const rows = ()=>p.locator('.exhist .hset').count();
  const fxHead = ()=>p.locator('.fx [data-act="exhist"]').count();
  const toData = async ()=>{
    await p.click('.seg button[data-v="daten"]'); await p.waitForTimeout(250);
  };
  const toDay = async ()=>{
    await p.click('.seg button[data-v="tag"]'); await p.waitForTimeout(250);
  };
  const enterFocus = async ()=>{
    await p.click('button[data-act="focuson"]'); await p.waitForTimeout(250);
  };
  const leaveFocus = async ()=>{
    await p.click('.fx [data-act="focusoff"]'); await p.waitForTimeout(250);
  };

  // 1. Trainingsreiter: zugeklappt eine Zeile, aufgeklappt die Sätze
  check("im Trainingsreiter steht der Verlauf", await head() === 1);
  check("zugeklappt zeigt er keine Sätze", await rows() === 0);
  await p.click('[data-act="exhist"]'); await p.waitForTimeout(200);
  check("aufgeklappt stehen drei Einheiten mit je drei Sätzen", await rows() === 9,
    "Zeilen: " + await rows());
  check("die früheren Gewichte stehen darin",
    (await p.locator('.exhist').innerText()).indexOf("62") > 0);

  // 2. Fokus-Modus zeigt denselben Block
  await enterFocus();
  check("der Fokus-Modus ist offen", await p.locator('.fx').count() === 1);
  check("auch im Fokus steht der Verlauf", await fxHead() === 1);
  /* Aufgeklappt wird nicht je Ansicht gemerkt, sondern je Übung (S.exHistFor):
     im Trainingsreiter aufgeklappt heißt im Fokus derselben Übung aufgeklappt. */
  check("aufgeklappt stehen dieselben neun Sätze",
    await p.locator('.fx .exhist .hset').count() === 9);
  await p.click('.fx [data-act="exhist"]'); await p.waitForTimeout(200);
  check("im Fokus lässt er sich wieder zuklappen",
    await p.locator('.fx .exhist').count() === 0);

  // 3. Beim Wechsel der Übung klappt er wieder zu
  await p.evaluate(()=>{ S.exercise="Seitheben"; render(); });
  await p.waitForTimeout(200);
  check("eine Übung ohne frühere Einheit zeigt gar keinen Block", await fxHead() === 0);
  await p.evaluate((ex)=>{ S.exercise=ex; render(); }, EX);
  await p.waitForTimeout(200);
  check("zurück bei der alten Übung steht er wieder zugeklappt da",
    await fxHead() === 1 && await p.locator('.fx .exhist').count() === 0);

  // 4. Der Schalter unter Daten gilt nur für den Fokus
  await leaveFocus();
  await toData();
  const toggle = p.locator('[data-act="focushisttoggle"]');
  check("unter Daten steht der Schalter für den Fokus", await toggle.count() === 1);
  check("er steht auf an", /: an$/.test((await toggle.innerText()).trim()),
    await toggle.innerText());
  await toggle.click(); await p.waitForTimeout(250);
  check("nach dem Tippen steht er auf aus",
    /: aus$/.test((await p.locator('[data-act="focushisttoggle"]').innerText()).trim()));
  check("der Schalter für den Trainingsreiter bleibt auf an",
    /: an$/.test((await p.locator('[data-act="exhisttoggle"]').innerText()).trim()));

  await toDay();
  check("im Trainingsreiter steht der Verlauf weiter", await head() === 1);
  await enterFocus();
  check("im Fokus ist er weg", await fxHead() === 0);

  // 5. Umgekehrt: der Trainingsreiter aus, der Fokus wieder an
  await leaveFocus();
  await toData();
  await p.click('[data-act="focushisttoggle"]'); await p.waitForTimeout(250);
  await p.click('[data-act="exhisttoggle"]'); await p.waitForTimeout(250);
  await toDay();
  check("ohne exHist ist er im Trainingsreiter weg", await head() === 0);
  await enterFocus();
  check("im Fokus steht er trotzdem", await fxHead() === 1);
  await leaveFocus();

  // 6. Beide Schalter überstehen einen Neustart und liegen im Backup
  const kept = await p.evaluate(()=>JSON.parse(localStorage.getItem("kraftlog:settings")));
  check("focusHist ist gespeichert", kept.focusHist === true && kept.exHist === false,
    JSON.stringify({ f:kept.focusHist, e:kept.exHist }));
  await p.reload({ waitUntil:"load" }); await p.waitForTimeout(300);
  check("nach dem Neustart stehen beide noch so",
    await p.evaluate(()=>S.settings.focusHist === true && S.settings.exHist === false));
  check("focusHist geht durch den Import",
    await p.evaluate(()=>cleanSettings({ focusHist:false }).focusHist === false));
});
