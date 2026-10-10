const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const scope = 'https://site.test/market-register/';
const workerSource = fs.readFileSync(path.join(root, 'market-register/service-worker.js'), 'utf8');

function worker(network) {
  const handlers = {};
  const entries = new Map();
  const writes = [];
  const deleted = [];
  const precached = [];
  const key = request => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const cache = {
    match: async request => entries.get(key(request)),
    put: async (request, response) => { entries.set(key(request), response); writes.push(key(request)); },
    addAll: async requests => { precached.push(...requests); },
  };
  const context = vm.createContext({
    URL, Request, Response,
    fetch: network,
    caches: {
      open: async () => cache,
      keys: async () => ['market-register-shell-v9', 'market-register-shell-v10', 'project-tracker-v2'],
      delete: async name => { deleted.push(name); return true; },
    },
    self: {
      location: { origin: 'https://site.test' },
      registration: { scope },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (type, handler) => { handlers[type] = handler; },
    },
  });
  vm.runInContext(workerSource, context);
  function request(url, { method = 'GET', mode = 'cors' } = {}) {
    const pending = [];
    const event = {
      request: { url, method, mode },
      waitUntil: promise => pending.push(promise),
      respondWith: promise => { event.response = promise; },
    };
    handlers.fetch(event);
    return { event, pending };
  }
  return { handlers, entries, writes, deleted, precached, request };
}

test('Market Register stays unlisted and installs within its own directory', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'market-register/index.html'), 'utf8'));
  try {
    assert.equal(dom.window.document.querySelector('meta[name="robots"]').content, 'noindex, nofollow');
    for (const file of ['index.html', 'homepage.js', 'filesystem.js', 'sitemap.xml']) {
      assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /market-register/i, file);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'market-register/manifest.webmanifest'), 'utf8'));
    assert.equal(new URL(manifest.start_url, scope).href, scope + 'index.html');
    assert.equal(new URL(manifest.scope, scope).href, scope);
    for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(root, 'market-register', icon.src)));
  } finally {
    dom.window.close();
  }
});

test('the worker leaves other tools, outside requests, and non-GET requests alone', () => {
  const app = worker(() => assert.fail('unexpected network request'));
  for (const url of ['https://site.test/', 'https://site.test/projects/project-tracker/', 'https://other.test/market-register/', 'https://site.test/market-register-other/']) {
    assert.equal(app.request(url).event.response, undefined);
  }
  assert.equal(app.request(scope + 'app.js', { method: 'POST' }).event.response, undefined);
});

test('online app updates replace stale cached files without caching arbitrary files', async () => {
  const app = worker(async (_request, options) => {
    assert.equal(options.cache, 'no-cache', 'online fetches revalidate instead of reusing stale HTTP assets');
    return new Response('updated');
  });
  app.entries.set(scope + 'app.js', new Response('stale'));
  const { event, pending } = app.request(scope + 'app.js');
  assert.equal(await (await event.response).text(), 'updated');
  await Promise.all(pending);
  assert.equal(await app.entries.get(scope + 'app.js').text(), 'updated');
  const extra = app.request(scope + 'example-backup.json');
  await extra.event.response;
  await Promise.all(extra.pending);
  assert.deepEqual(app.writes, [scope + 'app.js']);
});

test('versioned app files and the Excel writer are cached and can load offline', async () => {
  const html = fs.readFileSync(path.join(root, 'market-register/index.html'), 'utf8');
  const dom = new JSDOM(html);
  const source = fs.readFileSync(path.join(root, 'market-register/app.js'), 'utf8');
  try {
    assert.match(source, /updateViaCache:'none'/);
    const files = [...dom.window.document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(node => node.getAttribute('src') || node.getAttribute('href'));
    assert.ok(files.includes('./app.js?v=0.7'));
    assert.ok(files.includes('./vendor/xlsx.mini.min.js?v=0.20.3'));
    for (const file of files) {
      assert.ok(workerSource.includes(`'${file}'`), `${file} is precached`);
      const app = worker(async () => { throw new Error('offline'); });
      app.entries.set(new URL(file, scope).href, new Response('cached asset'));
      assert.equal(await (await app.request(new URL(file, scope).href).event.response).text(), 'cached asset');
    }
  } finally { dom.window.close(); }
});

test('installation fetches a fresh page and app files instead of caching an older HTTP version', async () => {
  const app = worker(() => {});
  let completion;
  app.handlers.install({ waitUntil: promise => { completion = promise; } });
  await completion;
  assert.ok(app.precached.some(request => request.url === scope + 'index.html'));
  assert.ok(app.precached.some(request => request.url === scope + 'app.js?v=0.7'));
  for (const request of app.precached) assert.equal(request.cache, 'reload');
});

test('offline navigation and assets load from the app cache', async () => {
  const app = worker(async () => { throw new Error('offline'); });
  app.entries.set(scope + 'index.html', new Response('app shell'));
  app.entries.set(scope + 'app.js', new Response('app code'));
  assert.equal(await (await app.request(scope + 'app.js').event.response).text(), 'app code');
  assert.equal(await (await app.request(scope + '?launch=home', { mode: 'navigate' }).event.response).text(), 'app shell');
  assert.equal((await app.request(scope + 'missing.png').event.response).type, 'error');
});

test('activating Market Register preserves other apps offline caches', async () => {
  const app = worker(() => {});
  let completion;
  app.handlers.activate({ waitUntil: promise => { completion = promise; } });
  await completion;
  assert.deepEqual(app.deleted, ['market-register-shell-v9']);
});
