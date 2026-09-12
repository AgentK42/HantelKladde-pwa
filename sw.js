/* HantelKladde ServiceWorker
   Aufgabe: die App vollständig offline verfügbar halten.

   Strategie: stale-while-revalidate. Der Start kommt immer sofort aus dem
   Cache, auch ohne Netz und auch bei schlechtem Empfang im Studio. Parallel
   wird im Hintergrund nach einer neueren Fassung gesehen. Die liegt dann beim
   nächsten Start bereit. Bewusst kein automatisches Neuladen: ein Reload
   mitten im Satz wäre störender als eine Version, die einen Start später kommt.

   Beim Anheben von APP_VERSION wird der alte Cache verworfen. Die Trainings-
   daten liegen im localStorage und sind davon nicht berührt. */

var APP_VERSION = "1.14.7";

/* BUILD hochzaehlen, wenn sich ausgelieferte Dateien aendern, ohne dass die App
   selbst eine neue Versionsnummer bekommt, etwa bei einer Korrektur am Manifest.
   Ohne das behalten bereits installierte Geraete die alten Dateien im Cache. */
var BUILD = 4;

var CACHE = "hantelkladde-" + APP_VERSION + "-" + BUILD;

var PRECACHE = [
  "./",
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
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (ev) {
  var req = ev.request;

  /* Nur eigene GET-Anfragen. Die App ruft von sich aus nichts Fremdes ab,
     das hier ist die Absicherung dagegen, dass der Cache etwas einsammelt,
     das nicht zur App gehört. */
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  ev.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {

        var net = fetch(req).then(function (res) {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(function () {
          return null;
        });

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
