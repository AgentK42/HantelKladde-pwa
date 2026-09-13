/* HantelKladde ServiceWorker
   Aufgabe: die App vollständig offline verfügbar halten.

   Strategie: stale-while-revalidate. Der Start kommt immer sofort aus dem
   Cache, auch ohne Netz und auch bei schlechtem Empfang im Studio. Parallel
   wird im Hintergrund nach einer neueren Fassung gesehen. Die liegt dann beim
   nächsten Start bereit. Bewusst kein automatisches Neuladen: ein Reload
   mitten im Satz wäre störender als eine Version, die einen Start später kommt.
   Ab 1.15.0 gibt die App stattdessen Bescheid, dass ein Update vorhanden ist,
   und wartet auf einen Tipp, siehe die Nachricht "skipWaiting" weiter unten.

   Beim Anheben von APP_VERSION wird der alte Cache verworfen. Die Trainings-
   daten liegen im localStorage und sind davon nicht berührt. */

var APP_VERSION = "1.20.0";

/* BUILD hochzählen, wenn sich ausgelieferte Dateien ändern, ohne dass die App
   selbst eine neue Versionsnummer bekommt, etwa bei einer Korrektur am Manifest.
   Ohne das behalten bereits installierte Geräte die alten Dateien im Cache.
   Mit einer neuen APP_VERSION beginnt die Zählung wieder bei 1. */
var BUILD = 1;

var ROOT = new URL("./", self.location);

/* Der Cache-Speicher gilt pro Origin, nicht pro Pfad. Auf github.io liegen
   alle Projekte einer Person auf derselben Adresse, eine zweite Fassung der
   App in einem anderen Verzeichnis teilt sich den Speicher also mit dieser
   hier. Deshalb ist der Name der eigene Pfad, aus /HantelKladde-pwa/ wird
   HantelKladde-pwa-<version>-<build>, und deshalb räumt activate() unten nur
   Namen mit genau diesem Präfix weg. Ohne das löschte jede Fassung beim
   Aktivieren den Offline-Speicher aller anderen. */
var SCOPE_ID = ROOT.pathname.replace(/[^A-Za-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "root";
var CACHE_PREFIX = SCOPE_ID + "-";

/* Zwei frühere Namensformen, die nicht mehr auf das Präfix passen und sonst
   für immer liegen blieben, rund 330 kB auf jedem Gerät, das die App schon
   hatte:
     bis 1.16.0   hantelkladde-<version>-<build> und hantelkladde-geteilt,
     in  1.16.1   hantelkladde-<pfad>-<version>-<build>.
   Beide sind eindeutig, ein heutiger Name beginnt mit dem Pfad. */
var LEGACY = /^hantelkladde-(\d+\.\d+\.\d+-\d+|geteilt)$/;
var LEGACY_PREFIX = "hantelkladde-" + CACHE_PREFIX;

var CACHE = CACHE_PREFIX + APP_VERSION + "-" + BUILD;

/* Eigener Ablageort für ein hereingereichtes Backup, siehe receiveShare().
   Bewusst außerhalb von CACHE: der wird bei jeder neuen Version gelöscht,
   und eine gerade geteilte Datei soll ein Update überleben. */
var SHARE_CACHE = CACHE_PREFIX + "geteilt";
/* Ziel des Teilen-Dialogs (manifest: share_target) und die Adresse, unter der
   die App die entgegengenommene Datei danach genau einmal abholt. Beide gibt
   es auf dem Server nicht, sie existieren nur hier im Worker. */
var SHARE_ACTION = new URL("share-target", ROOT).pathname;
var SHARE_STASH = new URL("shared-backup", ROOT).pathname;

/* "./" steht bewusst nicht mit drin: auf dem Server ist das dieselbe Datei wie
   index.html, und jede Navigation wird unten ohnehin auf index.html abgebildet.
   Zweimal vorladen hieße 300 kB zweimal laden, bei jedem Versionswechsel. */
var PRECACHE = [
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon-180.png"
];

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(PRECACHE);
    })
  );
  /* Kein skipWaiting: die neue Fassung wartet, bis die App sie hereinbittet
     oder bis kein Fenster mehr offen ist. Sonst würde der neue Worker dem
     laufenden Fenster mitten im Training den Cache unter den Füßen wegziehen. */
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (LEGACY.test(k) || k.indexOf(LEGACY_PREFIX) === 0) return caches.delete(k);
        /* Sonst nur eigene Namen anfassen, siehe CACHE_PREFIX. */
        if (k.indexOf(CACHE_PREFIX) !== 0) return null;
        return (k === CACHE || k === SHARE_CACHE) ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Zwei Nachrichten von der App:
   "version"     - welche Fassung wird hier ausgeliefert. Die App vergleicht das
                   mit ihrer eigenen Nummer und sagt es unter Daten, wenn beides
                   auseinanderläuft.
   "skipWaiting" - der Nutzer hat auf den Update-Hinweis getippt. */
self.addEventListener("message", function (ev) {
  var msg = ev.data || {};
  if (msg.type === "skipWaiting") { self.skipWaiting(); return; }
  if (msg.type === "version" && ev.ports && ev.ports[0]) {
    ev.ports[0].postMessage({ version: APP_VERSION, build: BUILD });
  }
});

/* Tipp auf die Meldung "Pause vorbei". Ohne diesen Handler öffnet Android je
   nach Fassung ein zweites Fenster, statt das laufende Training zu holen.
   Gesucht wird deshalb zuerst ein offenes Fenster im eigenen Verzeichnis. */
self.addEventListener("notificationclick", function (ev) {
  ev.notification.close();
  ev.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(ROOT.href) === 0 && list[i].focus) return list[i].focus();
      }
      return self.clients.openWindow ? self.clients.openWindow("./") : null;
    })
  );
});

/* Ein aus einer anderen App geteiltes Backup. Android schickt es als POST an
   SHARE_ACTION. Dort steht kein Server, der das annehmen könnte, GitHub Pages
   liefert nur Dateien aus. Also nimmt der Worker die Datei selbst entgegen,
   legt sie kurz ab und schickt das Fenster mit einer Markierung in der Adresse
   auf die App. Die holt sie sich von dort ab, siehe takeSharedBackup(). */
function receiveShare(req) {
  return req.formData().then(function (form) {
    var f = form.get("backup");
    if (!f || typeof f.text !== "function") throw new Error("keine Datei dabei");
    return f.text();
  }).then(function (text) {
    return caches.open(SHARE_CACHE).then(function (c) {
      return c.put(SHARE_STASH, new Response(text, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      }));
    });
  }).then(function () {
    return Response.redirect(new URL("./?geteilt=1", ROOT).href, 303);
  }).catch(function () {
    return Response.redirect(new URL("./?geteilt=leer", ROOT).href, 303);
  });
}

/* Genau einmal herausgeben: danach ist die Datei erledigt und hat im Cache
   nichts mehr verloren. Ein zweiter Start würde sie sonst erneut einlesen. */
function handOverShare() {
  return caches.open(SHARE_CACHE).then(function (c) {
    return c.match(SHARE_STASH).then(function (hit) {
      return c.delete(SHARE_STASH).then(function () {
        /* Nichts abgelegt heißt: schon eingelesen. Bewusst kein 404, das stünde
           nur als Fehler in der Konsole, obwohl nichts kaputt ist. */
        return hit || new Response("", {
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      });
    });
  });
}

self.addEventListener("fetch", function (ev) {
  var req = ev.request;

  /* Nur eigene Anfragen. Die App ruft von sich aus nichts Fremdes ab,
     das hier ist die Absicherung dagegen, dass der Cache etwas einsammelt,
     das nicht zur App gehört. */
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  if (req.method === "POST" && url.pathname === SHARE_ACTION) {
    ev.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== "GET") return;
  if (url.pathname === SHARE_STASH) {
    ev.respondWith(handOverShare());
    return;
  }

  /* Jede Navigation bekommt index.html, egal unter welcher Adresse sie
     ankommt. Damit laufen "./", "./?geteilt=1" und die Shortcuts aus dem
     Manifest auf denselben Cache-Eintrag, statt die Datei unter jeder
     aufgerufenen Adresse ein weiteres Mal abzulegen. Das Wurzelverzeichnis
     steht mit in der Bedingung, weil Chrome die start_url auch abseits einer
     Navigation abruft, um die Installierbarkeit zu prüfen. */
  var key = (req.mode === "navigate" || url.pathname === ROOT.pathname)
    ? "./index.html" : req;

  /* Die Revalidierung läuft neben der Antwort her. Sie muss am Ereignis
     hängen: sonst darf der Browser den Worker beenden, sobald die Antwort
     aus dem Cache draußen ist, und das cache.put käme nie an - die neue
     Fassung wäre einen weiteren Start später dran. */
  var net = fetch(req).then(function (res) {
    if (!res || !res.ok || res.type !== "basic") return res;
    var copy = res.clone();
    return caches.open(CACHE).then(function (c) {
      return c.put(key, copy);
    }).then(function () { return res; });
  }).catch(function () { return null; });
  ev.waitUntil(net);

  ev.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(key, { ignoreSearch: true }).then(function (hit) {

        /* Aus dem Cache antworten, sobald etwas da ist. Sonst aufs Netz warten.
           Ist auch das nicht erreichbar, bei einer Seitennavigation ersatzweise
           die App selbst ausliefern, damit ein Deep Link offline nicht ins
           Leere läuft. */
        if (hit) return hit;

        return net.then(function (res) {
          if (res) return res;
          if (req.mode === "navigate") return cache.match("./index.html");
          return new Response("", { status: 504, statusText: "Offline" });
        });
      });
    })
  );
});
