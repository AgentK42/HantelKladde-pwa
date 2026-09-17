/* Kein Element der App fällt auf den Browser-Standard zurück. Ein Knopf, dessen
   Regeln fehlen, etwa weil ein CSS-Kommentar offen blieb (1.33.5, .planhead), steht
   als weißer Standardknopf da; Lint sieht das nicht, weil es nur das Skript liest.
   Gemessen wird gegen einen frischen, ungestylten Knopf derselben Seite, damit die
   Prüfung nicht an einer Plattformfarbe hängt. Alle Reiter, hell und dunkel. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();
  await p.evaluate(() => {
    var list = [], i = 0;
    ["Benchpress Maschine", "Flys"].forEach(function (n, k) {
      [1, 4, 7].forEach(function (back) {
        var d = shiftISO(todayISO(), -back);
        for (var s = 0; s < 3; s++) {
          list.push({ id:"w" + (i++), date:d, exercise:n, set:s + 1, weight:40 + k * 10, reps:10,
            rpe:8, ts:Date.parse(d + "T10:00:00") + s * 60000 });
        }
      });
    });
    var d0 = todayISO();
    list.push({ id:"t1", date:d0, exercise:"Benchpress Maschine", set:1, weight:40, reps:10, rpe:8,
      ts:Date.parse(d0 + "T10:00:00") });
    S.entries = list; S.plan = "Push Day"; S.plansFold = true; S.exercise = "Benchpress Maschine";
    S.exHistFor = "Benchpress Maschine"; S.planOpen = true; S.secOpen.uebungen = true;
    S.secOpen.plansets = true; S.settings.weekGoals["Push Day"] = 2; persist();
  });
  const probe = () => p.evaluate(() => {
    var ref = document.createElement("button"); ref.textContent = "x"; document.body.appendChild(ref);
    var refBg = getComputedStyle(ref).backgroundColor, refBorder = getComputedStyle(ref).borderTopColor;
    ref.remove();
    return Array.from(document.querySelectorAll("#app button")).filter(function (b) {
      var cs = getComputedStyle(b);
      return cs.backgroundColor === refBg && cs.borderTopColor === refBorder;
    }).map(function (b) { return b.className || b.tagName; });
  });
  for (const theme of ["dark", "light"]) {
    await p.evaluate((t) => setTheme(t), theme);
    for (const tab of ["tag", "plaene", "planung", "verlauf", "daten"]) {
      await p.evaluate((t) => { S.view = t; render(); }, tab);
      await p.waitForTimeout(80);
      const bad = await probe();
      check(theme + ", " + tab + ": kein Knopf im Browser-Standard", bad.length === 0, JSON.stringify(bad.slice(0, 5)));
    }
  }
  await p.evaluate(() => { S.view = "tag"; S.focus = true; render(); });
  await p.waitForTimeout(80);
  const focusBad = await probe();
  check("Fokus-Modus: kein Knopf im Browser-Standard", focusBad.length === 0, JSON.stringify(focusBad.slice(0, 5)));
  await p.evaluate(() => { S.focus = false; render(); });
});
