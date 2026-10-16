const CACHE = 'market-register-shell-v25';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './styles.css?v=1.04',
  './app.js',
  './app.js?v=1.04',
  './db.js',
  './db.js?v=1.04',
  './data.js?v=1.04',
  './reports.js?v=1.04',
  './guide.js?v=1.04',
  './vendor/pdfmake.min.js?v=0.3.11',
  './vendor/vfs_fonts.js?v=0.3.11',
  './vendor/xlsx.mini.min.js?v=0.20.3',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './output/pdf/market-register-user-guide-v1.04.pdf',
];
self.addEventListener('install', (event) => {
  const requests = FILES.map(
    (file) =>
      new Request(new URL(file, self.registration.scope), { cache: 'reload' }),
  );
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(requests))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith('market-register-shell-') && name !== CACHE,
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = async () =>
        (await cache.match(event.request)) ||
        (event.request.mode === 'navigate' &&
          ['', 'index.html'].includes(
            url.pathname.slice(
              new URL(self.registration.scope).pathname.length,
            ),
          ) &&
          (await cache.match('./index.html')));
      try {
        const response = await fetch(event.request, { cache: 'no-cache' });
        // Cache only the static app files, and keep updates available online.
        if (
          response.ok &&
          FILES.some(
            (file) => new URL(file, self.registration.scope).href === url.href,
          )
        ) {
          event.waitUntil(
            cache.put(event.request, response.clone()).catch(() => {}),
          );
        }
        // An HTTP outage can still resolve fetch(). Keep the installed app usable
        // without replacing a good cached file with an error page.
        if (!response.ok) return (await cached()) || response;
        return response;
      } catch {
        return (await cached()) || Response.error();
      }
    })(),
  );
});
