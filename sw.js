// Offline cache: the app shell and city data are kept and refreshed in the background.
const CACHE = "traveling-v22";
const SHELL = ["./", "index.html", "assets/style.css?v=22", "assets/app.js?v=22", "data/cities.json", "manifest.webmanifest", "assets/icons/icon-192.png", "assets/icons/favicon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  // The page itself and the manifest always come from the network first, so a new app id or icon is
  // seen at once (the browser decides whether the app is installed from this manifest); cache is the offline fallback.
  if (r.mode === "navigate" || u.pathname.endsWith(".webmanifest")) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r).then(hit => hit || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
