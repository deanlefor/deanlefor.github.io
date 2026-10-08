const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { page, root } = require("./dom-helpers.js");

const file = "projects/project-tracker/index.html";
const key = "talk-timer-local-v1";
const midday = new Date();
midday.setHours(12, 0, 0, 0);

function app(t, options) {
  const p = page(file, options);
  t.after(() => p.dom.window.close());
  p.window.console.warn = () => {};
  // jsdom does not implement native dialog presentation.
  p.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  p.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  return p;
}

function addProject(p, name) {
  p.document.getElementById("addPersonTop").click();
  p.document.getElementById("personName").value = name;
  p.document
    .getElementById("personForm")
    .dispatchEvent(
      new p.window.Event("submit", { bubbles: true, cancelable: true }),
    );
}

test("project buttons start, switch, stop, and retain timers across reloads", (t) => {
  const p = app(t);
  let now = midday.getTime();
  p.window.Date.now = () => now;
  addProject(p, "Planning");
  addProject(p, "Research");
  p.document.querySelectorAll(".person-action")[0].click();
  assert.equal(
    p.document.getElementById("activePerson").textContent,
    "Planning",
  );
  now += 5 * 60000;
  p.document.querySelectorAll(".person-action")[1].click();
  const switched = JSON.parse(p.storage.get(key));
  assert.equal(switched.sessions.length, 1);
  assert.equal(
    switched.sessions[0].end - switched.sessions[0].start,
    5 * 60000,
  );
  assert.equal(switched.active.personId, switched.people[1].id);

  const reloaded = app(t, { stored: { [key]: p.storage.get(key) } });
  reloaded.window.Date.now = () => now + 2 * 60000;
  assert.equal(
    reloaded.document.getElementById("activePerson").textContent,
    "Research",
  );
  reloaded.document.querySelectorAll(".person-action")[1].click();
  const stopped = JSON.parse(reloaded.storage.get(key));
  assert.equal(stopped.active, null);
  assert.equal(stopped.sessions.length, 2);
  assert.equal(
    reloaded.document.getElementById("summaryTime").textContent,
    "7m",
  );
  assert.equal(
    reloaded.document.getElementById("summaryVisits").textContent,
    "2",
  );
  assert.equal(
    reloaded.document.getElementById("summaryAverage").textContent,
    "3m 30s",
  );
});

test("legacy backups restore names safely and preserve time filters, sorting, and exports", async (t) => {
  const p = app(t);
  const now = midday.getTime();
  p.window.Date.now = () => now;
  const attack = '<img src="missing" onerror="alert(1)">';
  const fixture = {
    version: 1,
    people: [
      { id: "planning", name: attack, hidden: false },
      { id: "research", name: "Research", hidden: false },
    ],
    sessions: [
      { id: "a", personId: "planning", start: now - 3 * 60000, end: now },
      {
        id: "b",
        personId: "research",
        start: now - 86400000 - 6 * 60000,
        end: now - 86400000,
      },
      {
        id: "c",
        personId: "research",
        start: now - 8 * 86400000 - 60000,
        end: now - 8 * 86400000,
      },
    ],
    active: null,
  };
  const input = p.document.getElementById("fileImport");
  let backupText = JSON.stringify(fixture);
  Object.defineProperty(input, "files", {
    value: [{ text: async () => backupText }],
  });
  input.dispatchEvent(new p.window.Event("change"));
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(p.storage.get(key)), fixture);
  assert.equal(p.document.querySelector("#peopleGrid img"), null);
  assert.equal(p.document.getElementById("summaryTime").textContent, "3m");
  p.document.querySelector('[data-range="week"]').click();
  assert.equal(p.document.getElementById("summaryTime").textContent, "9m");
  assert.equal(p.document.getElementById("summaryVisits").textContent, "2");
  p.document.querySelector('[data-range="all"]').click();
  assert.equal(p.document.getElementById("summaryTime").textContent, "10m");
  const select = p.document.getElementById("breakdownSort");
  select.value = "count";
  select.dispatchEvent(new p.window.Event("change"));
  assert.equal(p.document.querySelector(".rank-name").textContent, "Research");

  const blobs = [];
  p.window.URL.createObjectURL = (blob) => {
    blobs.push(blob);
    return "blob:test";
  };
  p.window.URL.revokeObjectURL = () => {};
  p.window.Blob = Blob;
  p.window.HTMLAnchorElement.prototype.click = function () {};
  p.document.getElementById("exportCSV").click();
  const csv = await blobs[0].text();
  assert.deepEqual(
    [...new Uint8Array(await blobs[0].arrayBuffer()).slice(0, 3)],
    [239, 187, 191],
  );
  assert.ok(csv.startsWith('"Project","Start (local)"'));
  assert.equal(csv.split("\r\n").length, 4);
  p.document.getElementById("exportJSON").click();
  assert.deepEqual(JSON.parse(await blobs[1].text()), fixture);

  backupText = "invalid JSON";
  input.dispatchEvent(new p.window.Event("change"));
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(p.storage.get(key)), fixture);
  assert.equal(p.alerts.length, 1);
});

test("blocked saving warns while retaining the running timer in this tab", (t) => {
  const p = app(t, { blockedWrite: true });
  addProject(p, "Planning");
  p.document.querySelector(".person-action").click();
  assert.ok(
    p.document.getElementById("storageWarning").classList.contains("visible"),
  );
  assert.ok(
    p.document.getElementById("activePanel").classList.contains("visible"),
  );
  assert.equal(p.storage.has(key), false);
});

test("Home Screen assets exist and offline caching leaves other tools alone", async () => {
  const directory = path.join(root, "projects/project-tracker");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, "manifest.webmanifest"), "utf8"),
  );
  assert.equal(manifest.name, "Project Tracker");
  assert.equal(manifest.scope, "./");
  for (const icon of manifest.icons)
    assert.ok(fs.existsSync(path.join(directory, icon.src)));
  const handlers = {},
    deleted = [],
    assets = [],
    cached = [];
  const scope = "https://site.test/projects/project-tracker/";
  const offlinePage = new Response("offline app");
  let online = false;
  const context = vm.createContext({
    URL,
    Response,
    self: {
      location: { origin: "https://site.test" },
      registration: { scope },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
    },
    caches: {
      open: async () => ({
        addAll: async (list) => {
          assets.push(...list);
        },
        put: async (request) => {
          cached.push(request.url);
        },
        match: async (request) =>
          request === "./index.html" ? offlinePage : undefined,
      }),
      keys: async () => [
        "project-tracker-v0",
        "project-tracker-v1",
        "other-tool-v1",
      ],
      delete: async (name) => {
        deleted.push(name);
      },
    },
    fetch: async () => {
      if (!online) throw new Error("Offline");
      return new Response("online app");
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(directory, "sw.js"), "utf8"),
    context,
  );
  let work;
  handlers.install({
    waitUntil: (promise) => {
      work = promise;
    },
  });
  await work;
  for (const asset of assets)
    assert.ok(fs.existsSync(path.resolve(directory, asset)));
  handlers.activate({
    waitUntil: (promise) => {
      work = promise;
    },
  });
  await work;
  assert.deepEqual(deleted, ["project-tracker-v0"]);
  const request = { url: scope, method: "GET", mode: "navigate" };
  let response;
  const event = {
    request,
    respondWith: (promise) => {
      response = promise;
    },
    waitUntil: (promise) => {
      work = promise;
    },
  };
  handlers.fetch(event);
  assert.equal(await (await response).text(), "offline app");
  online = true;
  handlers.fetch(event);
  assert.equal(await (await response).text(), "online app");
  await work;
  assert.deepEqual(cached, [scope]);
  for (const url of [
    "https://site.test/projects/run-tracker.html",
    "https://other.test/",
  ]) {
    handlers.fetch({
      request: { ...request, url },
      respondWith: () => assert.fail("another tool must not use this worker"),
    });
  }
});
