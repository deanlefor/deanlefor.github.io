const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { page, root } = require("./dom-helpers.js");
const Data = require("../projects/project-tracker/project-tracker-data.js");

const file = "projects/project-tracker/index.html";
const key = "project-tracker-local-v2";
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
  const migrated = Data.normalize(fixture);
  assert.deepEqual(JSON.parse(p.storage.get(key)), migrated);
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
  assert.ok(csv.startsWith('"Bucket","Project","Start (local)"'));
  assert.equal(csv.split("\r\n").length, 4);
  p.document.getElementById("exportJSON").click();
  assert.deepEqual(JSON.parse(await blobs[1].text()), migrated);

  backupText = "invalid JSON";
  input.dispatchEvent(new p.window.Event("change"));
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(p.storage.get(key)), migrated);
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

function switchBucket(p, id) {
  p.document.querySelector(`[data-bucket-id="${id}"]`).click();
}

function addBucket(p, name) {
  p.document.getElementById("addBucket").click();
  p.document.getElementById("bucketName").value = name;
  p.document
    .getElementById("bucketForm")
    .dispatchEvent(new p.window.Event("submit", { cancelable: true }));
}

async function restore(p, data) {
  const input = p.document.getElementById("fileImport");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [{ text: async () => JSON.stringify(data) }],
  });
  input.dispatchEvent(new p.window.Event("change"));
  await new Promise(setImmediate);
}

function captureDownloads(p) {
  const blobs = [];
  p.window.URL.createObjectURL = (blob) => {
    blobs.push(blob);
    return "blob:test";
  };
  p.window.URL.revokeObjectURL = () => {};
  p.window.Blob = Blob;
  p.window.HTMLAnchorElement.prototype.click = function () {};
  return blobs;
}

function bucketFixture() {
  const state = Data.freshState();
  const now = midday.getTime();
  state.people = [
    { id: "job", name: "Work item", hidden: false, bucketId: "work" },
    { id: "study", name: "School item", hidden: false, bucketId: "school" },
    { id: "old-study", name: "Hidden study", hidden: true, bucketId: "school" },
    { id: "hobby", name: "Personal item", hidden: false, bucketId: "personal" },
  ];
  state.sessions = [
    { id: "w", personId: "job", start: now - 120000, end: now },
    { id: "s", personId: "study", start: now - 180000, end: now },
    { id: "h", personId: "old-study", start: now - 60000, end: now },
    { id: "p", personId: "hobby", start: now - 240000, end: now },
  ];
  return state;
}

test("bucket tabs isolate totals, rankings, history, hidden projects, CSV, and clearing", (t) => {
  const fixture = bucketFixture();
  const p = app(t, { stored: { [key]: JSON.stringify(fixture) } });
  p.window.Date.now = () => midday.getTime();
  switchBucket(p, "work");
  assert.equal(p.document.getElementById("summaryTime").textContent, "2m");
  p.document.querySelector('[data-bucket-id="school"]').focus();
  switchBucket(p, "school");
  assert.equal(p.document.activeElement.dataset.bucketId, "school");
  assert.equal(p.document.getElementById("summaryTime").textContent, "4m");
  assert.equal(p.document.getElementById("summaryVisits").textContent, "2");
  assert.equal(p.document.getElementById("summaryAverage").textContent, "2m");
  assert.deepEqual(
    [...p.document.querySelectorAll(".person-name")].map((e) => e.textContent),
    ["School item"],
  );
  assert.deepEqual(
    [...p.document.querySelectorAll(".rank-name")].map((e) => e.textContent),
    ["School item", "Hidden study"],
  );
  assert.equal(p.document.querySelectorAll(".entry").length, 2);
  p.document.getElementById("toggleHidden").click();
  assert.equal(
    p.document.querySelector(".hidden-row span").textContent,
    "Hidden study",
  );
  const blobs = captureDownloads(p);
  p.document.getElementById("exportCSV").click();
  assert.equal(blobs.length, 1);
  p.document.getElementById("clearHistory").click();
  const remaining = JSON.parse(p.storage.get(key));
  assert.deepEqual(
    remaining.sessions.map((s) => s.id),
    ["w", "p"],
  );
  assert.match(p.confirms[0], /2 completed sessions in School/);
  assert.equal(p.document.getElementById("summaryVisits").textContent, "0");
  switchBucket(p, "work");
  assert.equal(p.document.getElementById("summaryTime").textContent, "2m");
  switchBucket(p, "personal");
  assert.equal(p.document.getElementById("summaryTime").textContent, "4m");
});

test("bucket CSV contains only that bucket and JSON round-trips all buckets", async (t) => {
  const fixture = bucketFixture();
  const p = app(t, { stored: { [key]: JSON.stringify(fixture) } });
  switchBucket(p, "school");
  const blobs = captureDownloads(p);
  p.document.getElementById("exportCSV").click();
  const csv = await blobs[0].text();
  assert.equal(csv.split("\r\n").length, 3);
  assert.match(csv, /"School","School item"/);
  assert.match(csv, /"School","Hidden study"/);
  assert.doesNotMatch(csv, /Work item|Personal item/);
  p.document.getElementById("exportJSON").click();
  const backup = JSON.parse(await blobs[1].text());
  assert.equal(backup.buckets.length, 3);
  assert.equal(backup.sessions.length, 4);
  const other = app(t);
  await restore(other, backup);
  assert.deepEqual(JSON.parse(other.storage.get(key)), backup);
  assert.equal(
    other.document.getElementById("overviewTitle").textContent,
    "School overview",
  );
});

test("changing buckets keeps a global timer running; starting elsewhere saves only one session", (t) => {
  const p = app(t);
  let now = midday.getTime();
  p.window.Date.now = () => now;
  addProject(p, "Work item");
  p.document.querySelector(".person-action").click();
  now += 5 * 60000;
  switchBucket(p, "school");
  let saved = JSON.parse(p.storage.get(key));
  assert.equal(saved.sessions.length, 0);
  assert.equal(saved.active.personId, saved.people[0].id);
  assert.equal(p.document.getElementById("summaryTime").textContent, "0m");
  assert.equal(p.document.getElementById("viewActiveBucket").hidden, false);
  assert.match(
    p.document.getElementById("activeBucketLabel").textContent,
    /Work/,
  );
  addProject(p, "School item");
  p.document.querySelector(".person-action").click();
  saved = JSON.parse(p.storage.get(key));
  assert.equal(saved.sessions.length, 1);
  assert.equal(saved.sessions[0].end - saved.sessions[0].start, 5 * 60000);
  assert.equal(saved.active.personId, saved.people[1].id);
  now += 3 * 60000;
  p.document.getElementById("finishActive").click();
  assert.equal(p.document.getElementById("summaryTime").textContent, "3m");
  switchBucket(p, "work");
  assert.equal(p.document.getElementById("summaryTime").textContent, "5m");
  assert.equal(p.document.getElementById("summaryVisits").textContent, "1");
});

test("custom buckets can be added and renamed, reject duplicate names, and escape markup", (t) => {
  const p = app(t);
  const attack = '<img src=x onerror="alert(1)">';
  addBucket(p, attack);
  addProject(p, "New item");
  const state = JSON.parse(p.storage.get(key));
  assert.equal(state.buckets.length, 4);
  assert.equal(state.people[0].bucketId, state.selectedBucketId);
  assert.equal(p.document.querySelector("#bucketTabs img"), null);
  p.document.getElementById("renameBucket").click();
  p.document.getElementById("bucketName").value = "Volunteering";
  p.document
    .getElementById("bucketForm")
    .dispatchEvent(new p.window.Event("submit", { cancelable: true }));
  assert.equal(
    p.document.getElementById("overviewTitle").textContent,
    "Volunteering overview",
  );
  assert.equal(
    JSON.parse(p.storage.get(key)).people[0].bucketId,
    state.selectedBucketId,
  );
  addBucket(p, "work");
  assert.equal(JSON.parse(p.storage.get(key)).buckets.length, 4);
  assert.match(
    p.document.getElementById("bucketError").textContent,
    /already in use/,
  );
});

test("moving a project transfers its full history and keeps other projects separate", (t) => {
  const fixture = bucketFixture();
  const p = app(t, { stored: { [key]: JSON.stringify(fixture) } });
  p.window.Date.now = () => midday.getTime();
  p.document.querySelector(".person-foot button").click();
  p.document.getElementById("personBucket").value = "school";
  p.document
    .getElementById("personForm")
    .dispatchEvent(new p.window.Event("submit", { cancelable: true }));
  const moved = JSON.parse(p.storage.get(key));
  assert.deepEqual(moved.sessions, fixture.sessions);
  assert.equal(moved.people[0].bucketId, "school");
  assert.equal(moved.selectedBucketId, "school");
  assert.equal(p.document.getElementById("summaryTime").textContent, "6m");
  switchBucket(p, "work");
  assert.equal(p.document.getElementById("summaryTime").textContent, "0m");
});

test("a running project can be renamed but cannot be moved to another bucket", (t) => {
  const p = app(t);
  addProject(p, "Work item");
  p.document.querySelector(".person-action").click();
  p.document.querySelector(".person-foot button").click();
  assert.equal(p.document.getElementById("personBucket").disabled, true);
  p.document.getElementById("personBucket").value = "school";
  p.document
    .getElementById("personForm")
    .dispatchEvent(new p.window.Event("submit", { cancelable: true }));
  assert.equal(JSON.parse(p.storage.get(key)).people[0].bucketId, "work");
  assert.match(
    p.document.getElementById("toast").textContent,
    /Stop the timer/,
  );
});

test("failed restore leaves persisted and in-memory bucket data unchanged", async (t) => {
  const original = bucketFixture();
  const p = app(t, {
    stored: { [key]: JSON.stringify(original) },
    blockedWrite: true,
  });
  const incoming = Data.freshState();
  incoming.buckets[0].name = "Replacement";
  await restore(p, incoming);
  assert.deepEqual(JSON.parse(p.storage.get(key)), original);
  assert.equal(
    p.document.getElementById("overviewTitle").textContent,
    "Work overview",
  );
  assert.match(
    p.document.getElementById("storageWarning").textContent,
    /previous data is unchanged/,
  );
});

test("unreadable stored data is preserved until a valid restore succeeds", async (t) => {
  const p = app(t, { stored: { [key]: "unreadable original" } });
  addProject(p, "Unsaved work");
  switchBucket(p, "school");
  assert.equal(p.storage.get(key), "unreadable original");
  assert.match(
    p.document.getElementById("storageWarning").textContent,
    /has been preserved/,
  );
  await restore(p, Data.freshState());
  assert.deepEqual(JSON.parse(p.storage.get(key)), Data.freshState());
  assert.equal(
    p.document.getElementById("storageWarning").classList.contains("visible"),
    false,
  );
});

test("legacy migration retains hidden projects, history, and an active timer in Work", () => {
  const fixture = bucketFixture();
  const legacy = {
    version: 1,
    people: fixture.people.map(({ bucketId, ...person }) => person),
    sessions: fixture.sessions,
    active: { personId: "job", start: midday.getTime() - 120000 },
  };
  const migrated = Data.normalize(legacy);
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.sessions, legacy.sessions);
  assert.deepEqual(migrated.active, legacy.active);
  assert.equal(
    migrated.people.every((person) => person.bucketId === "work"),
    true,
  );
  assert.equal(
    migrated.people.find((person) => person.id === "old-study").hidden,
    true,
  );
  assert.deepEqual(Data.normalize(migrated), migrated);
});

test("legacy browser storage migrates without changing the old saved copy", (t) => {
  const fixture = bucketFixture();
  const legacy = {
    version: 1,
    people: fixture.people.map(({ bucketId, ...person }) => person),
    sessions: fixture.sessions,
    active: { personId: "job", start: midday.getTime() - 120000 },
  };
  const raw = JSON.stringify(legacy);
  const p = app(t, { stored: { "talk-timer-local-v1": raw } });
  assert.equal(p.document.querySelectorAll(".person-action").length, 3);
  switchBucket(p, "school");
  const migrated = JSON.parse(p.storage.get(key));
  assert.deepEqual(migrated.sessions, legacy.sessions);
  assert.deepEqual(migrated.active, legacy.active);
  assert.equal(p.storage.get("talk-timer-local-v1"), raw);
  const reload = app(t, {
    stored: { [key]: p.storage.get(key), "talk-timer-local-v1": raw },
  });
  assert.equal(
    reload.document.getElementById("overviewTitle").textContent,
    "School overview",
  );
  assert.equal(reload.document.querySelectorAll(".person-action").length, 0);
});

test("invalid backup references and unsupported versions are rejected instead of dropping records", () => {
  const fixture = bucketFixture();
  const changes = [
    (state) => {
      state.version = 3;
    },
    (state) => {
      state.buckets = [];
    },
    (state) => {
      state.people[0].bucketId = "missing";
    },
    (state) => {
      state.people[1].id = state.people[0].id;
    },
    (state) => {
      state.sessions[0].personId = "missing";
    },
    (state) => {
      state.sessions[0].end = state.sessions[0].start - 1;
    },
    (state) => {
      state.active = { personId: "missing", start: midday.getTime() };
    },
  ];
  for (const change of changes) {
    const broken = structuredClone(fixture);
    change(broken);
    assert.throws(() => Data.normalize(broken), /Invalid/);
  }
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
        "project-tracker-v2",
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
  assert.deepEqual(deleted, ["project-tracker-v0", "project-tracker-v1"]);
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
