/* Cache only this app's public files. Records remain in localStorage. */
const CACHE = "project-tracker-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./project-tracker.css",
  "./project-tracker-v2.js",
  "./project-tracker-data.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("project-tracker-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          // A full cache must not turn a successful online request into a failure.
          event.waitUntil(
            cache.put(event.request, response.clone()).catch(() => {}),
          );
        }
        return response;
      } catch {
        return (
          (await cache.match(event.request)) ||
          (event.request.mode === "navigate" &&
            (await cache.match("./index.html"))) ||
          Response.error()
        );
      }
    })(),
  );
});
