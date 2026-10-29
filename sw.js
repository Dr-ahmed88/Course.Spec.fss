const CACHE_NAME = "course-spec-fss-v1";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./cloud-config.js", "./manifest.json", "./icons/qaciu-logo.jpg"];
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => undefined)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("course-spec-fss-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(fetch(request).then(response => {
    if (response && response.ok && (request.mode === "navigate" || ["style", "script", "image"].includes(request.destination))) {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => caches.match(request).then(cached => cached || (request.mode === "navigate" ? caches.match("./index.html") : undefined))));
});
