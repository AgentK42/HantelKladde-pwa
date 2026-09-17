/* Progression unterhalb der Range (Issue 2): eine vollständige Einheit unter dem
   unteren Rand ist keine Steigerung, sondern "zurück in die Range"; die zweite in
   Folge am selben Gewicht senkt das Gewicht um eine Schrittweite, außer die
   Einheiten waren nicht ausbelastet (RPE bis 7). Dazu die Darstellung: Hinweis
   ohne Knöpfe, Senkung mit Annehmen und Verwerfen. */
const { suite } = require("./lib");

suite(async ({ open, check }) => {
  const p = await open();

  /* Flys: Schrittweite 3,75 kg, bei 65 kg greift die Rep-zuerst-Regel (3,75/65 > 5 %),
     Planziel 2x10 gibt die Range 8 bis 12. Die Einheiten liegen 3, 6 und 9 Tage zurück. */
  await p.evaluate(() => {
    window.seed = function (list) {
      var entries = [], i = 0;
      list.forEach(function (s, si) {
        var d = shiftISO(todayISO(), -(s.ago != null ? s.ago : 3 * (si + 1)));
        s.r.forEach(function (r, k) {
          entries.push({ id:"e" + (i++), date:d, exercise:"Flys", set:k + 1, weight:s.w,
            reps:r, rpe:s.rpe == null ? null : s.rpe, ts:Date.parse(d + "T10:00:00") + k * 60000 });
        });
      });
      S.entries = entries; S.plans = { T:[{ name:"Flys", sets:2, reps:10, weight:65 }] };
      S.plan = "T"; S.exercise = "Flys"; S.date = todayISO(); S.view = "tag";
      S.settings.autoProgress = true; S.settings.repFirst = true; S.settings.repSpan = 2;
      S.suggestionHandled = {}; S.source = "";
      persist(); render();
      return suggestFor("Flys");
    };
  });
  const run = (list) => p.evaluate((l) => window.seed(l), list);

  // 1. Das Beispiel aus dem Issue: 8x und 6x bei Range ab 8 ist keine Steigerung
  let s = await run([{ w:65, r:[8,6] }, { w:65, r:[10,10] }]);
  check("unter der Range: Vorschlag ist der untere Rand", s.reps === 8 && s.weight === 65, JSON.stringify(s));
  check("unter der Range: keine Steigerung", s.up === false, JSON.stringify(s));
  check("unter der Range: Hinweis nennt den schwächsten Satz und das Ziel",
    typeof s.hint === "string" && s.hint.indexOf("6x") > 0 && s.hint.indexOf("ab 8") > 0, s.hint);

  // 2. Zweite verfehlte Einheit in Folge am selben Gewicht: eine Schrittweite weniger
  s = await run([{ w:65, r:[8,6] }, { w:65, r:[7,6] }, { w:65, r:[10,10] }]);
  check("zweite verfehlte Einheit: Gewicht sinkt um eine Schrittweite", s.weight === 61.25 && s.reps === 8, JSON.stringify(s));
  check("zweite verfehlte Einheit: mit Entscheidung", s.up === true && !s.hint, JSON.stringify(s));
  check("Begründung nennt Schritt und Einheiten",
    /3,75 kg/.test(s.why) && /2 Einheiten/.test(s.why) && /6x/.test(s.why), s.why);

  // 3. Dritte in Folge: weiter senken, nicht stapeln
  s = await run([{ w:65, r:[7,6] }, { w:65, r:[7,6] }, { w:65, r:[7,6] }]);
  check("dritte verfehlte Einheit: eine Schrittweite, nicht zwei", s.weight === 61.25 && s.up === true, JSON.stringify(s));

  // 4. RPE-Filter: nicht ausbelastet, dann nur der Hinweis
  s = await run([{ w:65, r:[8,6], rpe:7 }, { w:65, r:[7,6], rpe:7 }]);
  check("zwei Einheiten bei RPE 7: kein Gewichtsvorschlag", s.weight === 65 && s.up === false && !!s.hint, JSON.stringify(s));
  s = await run([{ w:65, r:[8,6], rpe:9 }, { w:65, r:[7,6], rpe:7 }]);
  check("eine der beiden nicht ausbelastet: kein Gewichtsvorschlag", s.weight === 65 && !!s.hint, JSON.stringify(s));
  s = await run([{ w:65, r:[8,6], rpe:9 }, { w:65, r:[7,6], rpe:9 }]);
  check("zwei Einheiten bei RPE 9: Gewicht sinkt", s.weight === 61.25 && s.up === true, JSON.stringify(s));
  check("Begründung nennt den RPE", /RPE 9/.test(s.why), s.why);
  s = await run([{ w:65, r:[8,6], rpe:8 }, { w:65, r:[7,6], rpe:8 }]);
  check("RPE 8 gilt als ausbelastet", s.weight === 61.25, JSON.stringify(s));

  // 5. Die Reihe zählt nur am selben Gewicht
  s = await run([{ w:65, r:[8,6] }, { w:60, r:[6,6] }]);
  check("Vorgänger an anderem Gewicht unterbricht die Reihe", s.weight === 65 && !!s.hint, JSON.stringify(s));

  // 6. Unverändert: innerhalb der Range klettert eine Wiederholung
  s = await run([{ w:65, r:[9,8] }, { w:65, r:[10,10] }]);
  check("innerhalb der Range: eine Wiederholung mehr, als Steigerung", s.reps === 9 && s.up === true && /\+1 Rep/.test(s.why), JSON.stringify(s));
  check("innerhalb der Range: kein Hinweis", !s.hint, JSON.stringify(s));

  // 7. Unverändert: eine abgebrochene Einheit peilt den unteren Rand an, ohne alles
  s = await run([{ w:65, r:[6] }, { w:65, r:[10,10] }]);
  check("abgebrochene Einheit: unterer Rand, keine Steigerung, kein Hinweis", s.reps === 8 && !s.up && !s.hint, JSON.stringify(s));

  // 8. Ohne RPE-zuerst-Regel gibt es keine Range und damit nichts davon
  s = await p.evaluate(() => { S.settings.repFirst = false; var r = suggestFor("Flys"); S.settings.repFirst = true; return r; });
  check("ohne Range: alter Weg, Planziel", s.reps === 10 && !s.hint && !s.up, JSON.stringify(s));

  // 9. Darstellung: Hinweis ohne Knöpfe
  await run([{ w:65, r:[8,6] }, { w:65, r:[10,10] }]);
  await p.evaluate(() => { applySuggestion("Flys"); render(); });
  check("Hinweis steht in der Karte", await p.locator(".suggestion.hint").count() === 1);
  check("Hinweis ohne Annehmen und Verwerfen", await p.locator(".suggestion.hint button").count() === 0);
  check("Hinweis nennt die Rückkehr", /Zurück in die Range/.test(await p.locator(".suggestion.hint").innerText()));
  check("Felder stehen auf 8 x 65", await p.evaluate(() => S.reps === "8" && S.weight === "65"));

  // 10. Darstellung: Senkung mit Entscheidung, Annehmen senkt das Planziel
  await run([{ w:65, r:[8,6] }, { w:65, r:[7,6] }]);
  await p.evaluate(() => { applySuggestion("Flys"); render(); });
  check("Senkung als Vorschlag mit Gewicht", /Vorschlag: 61,25 kg/.test(await p.locator(".suggestion").innerText()));
  check("Senkung mit Annehmen und Verwerfen", await p.locator(".suggestion button").count() === 2);
  await p.click('[data-act="suggestaccept"]'); await p.waitForTimeout(150);
  check("Annehmen übernimmt das Gewicht ins Planziel", await p.evaluate(() => S.plans.T[0].weight === 61.25 && S.weight === "61,25"));
  check("nach dem Annehmen kein Vorschlag mehr", await p.locator(".suggestion").count() === 0);

  // 11. Verwerfen stellt die letzte Einheit wieder her
  await run([{ w:65, r:[8,6] }, { w:65, r:[7,6] }]);
  await p.evaluate(() => { applySuggestion("Flys"); render(); });
  await p.click('[data-act="suggestreject"]'); await p.waitForTimeout(150);
  check("Verwerfen behält 65 kg", await p.evaluate(() => S.weight === "65" && S.plans.T[0].weight === 65));

  // 12. Steht heute schon ein Satz, gibt es weder Hinweis noch Vorschlag
  await run([{ w:65, r:[8,8], ago:0 }, { w:65, r:[8,6], ago:3 }, { w:65, r:[7,6], ago:6 }]);
  await p.evaluate(() => { applySuggestion("Flys"); render(); });
  check("mit Satz von heute kein Hinweis", await p.locator(".suggestion").count() === 0);
});
