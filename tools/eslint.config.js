/* Regeln fuer tools/lint.sh. Bewusst nur die Grundregeln, die formal gueltiges
   JavaScript melden, das trotzdem fast immer ein Versehen ist: unbekannte
   Namen, doppelte Deklarationen, unerreichbarer Code, Vergleiche mit ==.
   Stilfragen bleiben aussen vor, die Datei hat ihren eigenen Stil.

   Die Globals stehen hier ausgeschrieben statt aus einem Paket zu kommen,
   damit das Skript ausser ESLint nichts braucht. */

function names(list) {
  var out = {};
  list.forEach(function (n) { out[n] = "readonly"; });
  return out;
}

var std = ["Date", "Math", "JSON", "Object", "Array", "String", "Number", "Boolean",
  "RegExp", "Error", "TypeError", "Promise", "Set", "Map", "Symbol", "Infinity", "NaN",
  "undefined", "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent",
  "decodeURIComponent", "setTimeout", "setInterval", "clearTimeout", "clearInterval",
  "console", "URL", "Blob", "Response", "Request", "Headers", "fetch", "FormData",
  "TextEncoder", "TextDecoder", "performance"];

var browser = std.concat(["window", "document", "navigator", "localStorage",
  "sessionStorage", "history", "location", "screen", "matchMedia", "getComputedStyle",
  "requestAnimationFrame", "File", "FileReader", "AudioContext", "webkitAudioContext",
  "Notification", "MessageChannel", "Event", "CustomEvent", "alert", "confirm",
  "prompt", "caches"]);

var worker = std.concat(["self", "caches", "clients"]);

var node = std.concat(["require", "module", "exports", "process", "__dirname",
  "__filename", "Buffer"]);

var rules = {
  "no-undef": "error",
  "no-redeclare": "error",
  "no-dupe-keys": "error",
  "no-dupe-args": "error",
  "no-duplicate-case": "error",
  "no-unreachable": "error",
  "no-self-assign": "error",
  "no-func-assign": "error",
  "no-unsafe-negation": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
  "no-constant-condition": "warn",
  "no-empty": ["warn", { allowEmptyCatch: true }],
  "no-unused-vars": ["warn", { vars: "all", args: "none", caughtErrors: "none" }],
  "eqeqeq": ["warn", "always", { null: "ignore" }],

  /* Zwei Regeln gegen Strukturwuchs, seit 1.30.0. Anlass war der Klick-Verteiler:
     in rund 40 Sitzungen um je ein else-if gewachsen, am Ende 843 Zeilen und eine
     zyklomatische Komplexitaet von 334, ohne dass es je eine Stelle gab, fuer die
     der 60. Zweig teurer war als der 59. Diese beiden sind diese Stelle.

     Bewusst Warnungen, keine Fehler: die Pruefkette bleibt gruen, aber die Zahl
     steht bei jedem Lauf im Terminal. Die Schwellen sind eine Ratsche. Sie
     liegen knapp ueber dem, was heute durchgeht, und wer eine der genannten
     Funktionen verkleinert, zieht die Schwelle nach unten. Hochsetzen, damit
     eine Warnung verschwindet, ist der eine Weg, der die Regel entwertet.

     Stand 1.30.0 ueber der Schwelle: complexity 40 trifft viewTag (70), load (68),
     viewFocus (50), suggestFor (47) und den input-Verteiler; max-lines 150
     trifft viewTag (224) und viewData (254). */
  "complexity": ["warn", 40],
  "max-lines-per-function": ["warn", { max: 150, skipComments: true, skipBlankLines: true }]
};

module.exports = [
  { files: ["tools/.lint-app.js"],
    languageOptions: { ecmaVersion: 2020, sourceType: "script", globals: names(browser) },
    rules: rules },
  { files: ["sw.js"],
    languageOptions: { ecmaVersion: 2020, sourceType: "script", globals: names(worker) },
    rules: rules },
  /* test-pwa.js und die Suiten unter tools/tests mischen zwei Laufzeiten: der
     Rahmen laeuft in Node, die Rueckrufe in page.evaluate() laufen im Browser
     und greifen auf S, render() und die anderen Globals der App zu. ESLint kann
     das nicht auseinanderhalten, deshalb hier kein no-undef. Alle anderen
     Regeln gelten. */
  { files: ["tools/*.js", "tools/tests/*.js"],
    ignores: ["tools/.lint-app.js", "tools/eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs", globals: names(node) },
    rules: Object.assign({}, rules, { "no-undef": "off",
      /* Die Pruefskripte sind absichtlich ein einziger langer Ablauf */
      "complexity": "off", "max-lines-per-function": "off" }) }
];
