// Offline-Cache für die App-Hülle. Bei Änderungen an der App VERSION hochzählen.
const VERSION = "trainingslog-v5";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "fonts").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Schriften: aus dem Cache, im Hintergrund aktualisieren
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open("fonts").then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Nur eigene Dateien; Anfragen an Google (Apps Script) laufen immer direkt übers Netz
  if (url.origin !== self.location.origin) return;

  // Seite: erst Netz (damit Updates ankommen), offline aus dem Cache
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Übrige Dateien: Cache zuerst
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
