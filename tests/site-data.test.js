const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const SiteData = require("../site-data.js");
const TrackerData = require("../tracker-data.js");
const RunData = require("../projects/run-tracker-data.js");

const run = {
  id: 1,
  date: "2026-09-01",
  miles: 2,
  feeling: "ok",
  notes: "",
  w: null,
  day: null,
};
function storage(initial) {
  return {
    raw: JSON.stringify(initial),
    getItem() {
      return this.raw;
    },
    setItem(key, value) {
      this.raw = value;
    },
  };
}

test("failed run saves retain new runs in memory instead of reloading stale storage", () => {
  const disk = storage({ runs: [run], c25k: {} });
  const store = SiteData.createStore({
    key: "nd-run",
    initial: { runs: [], c25k: {} },
    validate: RunData.validate,
    storage: () => disk,
  });
  disk.setItem = () => {
    throw new Error("Quota");
  };
  const data = store.get();
  data.runs.push({ ...run, id: 2 });
  assert.equal(store.save(data), false);
  assert.equal(store.get().runs.length, 2);
  assert.equal(JSON.parse(disk.raw).runs.length, 1);
  assert.match(store.error, /only in this tab/);
});

test("imports validate fully and preserve both memory and disk when writes fail", () => {
  const disk = storage(TrackerData.initial);
  const store = SiteData.createStore({
    key: "phd-tracker-v2",
    initial: TrackerData.initial,
    validate: TrackerData.validate,
    storage: () => disk,
  });
  const before = disk.raw;
  assert.throws(() =>
    store.replace({ ...TrackerData.initial, dmp: { toString: 1 } }),
  );
  assert.equal(disk.raw, before);
  disk.setItem = () => {
    throw new Error("Quota");
  };
  assert.equal(store.replace({ ...TrackerData.initial, dmp: 5 }), false);
  assert.equal(store.get().dmp, 0);
  assert.equal(disk.raw, before);
});

test("blocked or malformed saved copies are never automatically overwritten", () => {
  let writes = 0;
  const store = SiteData.createStore({
    key: "phd-tracker-v2",
    initial: TrackerData.initial,
    validate: TrackerData.validate,
    storage: () => ({ getItem: () => "{broken", setItem: () => writes++ }),
  });
  assert.equal(store.protectedData, true);
  store.save({ ...TrackerData.initial, dmp: 1 });
  assert.equal(store.get().dmp, 1);
  assert.equal(writes, 0);
});

test("unrelated, malformed, and future-version backups are rejected without normalization to empty history", () => {
  for (const raw of [
    { unrelated: true },
    null,
    { app: "another-app", runs: [], c25k: {} },
    { app: "nd-run-tracker", version: 2, data: { runs: [], c25k: {} } },
    { runs: [{ ...run, miles: Infinity }], c25k: {} },
    { runs: [{ ...run, date: "2026-02-31" }], c25k: {} },
  ])
    assert.throws(() => RunData.validate(raw));
  for (const patch of [
    { names: { __bad: "name" } },
    { assign: { el1: "f2025');alert(1)//" } },
    { startSem: "not-a-term" },
    { done: ["unknown"] },
    { userName: 3 },
  ])
    assert.throws(() =>
      TrackerData.validate({ ...TrackerData.initial, ...patch }),
    );
});

test("legacy progress and new profile backups round-trip without losing names or assignments", () => {
  const original = {
    ...TrackerData.initial,
    done: ["el1"],
    mdone: ["ms1"],
    assign: { el1: "_transfer", d1: "s2027" },
    names: { el1: 'Policy & "AI"' },
    userName: "Test Person",
    userEmail: "test@example.test",
    termDone: ["f2025"],
    dmp: 5,
  };
  assert.deepEqual(
    TrackerData.validate({
      app: "papa-phd-tracker",
      schemaVersion: 1,
      ...original,
    }),
    original,
  );
  const legacy = { ...original };
  delete legacy.userName;
  delete legacy.userEmail;
  assert.equal(TrackerData.validate(legacy).names.el1, original.names.el1);
  assert.deepEqual(RunData.validate({ runs: [run], c25k: { w1d1: true } }), {
    runs: [run],
    c25k: { w1d1: true },
  });
});

test("run date follows the local calendar across UTC midnight", () => {
  const script = `const {localDate}=require(${JSON.stringify(require.resolve("../site-data.js"))});const d=new Date('2026-09-07T00:30:00Z');process.stdout.write(localDate(d));`;
  assert.equal(
    execFileSync(process.execPath, ["-e", script], {
      env: { ...process.env, TZ: "America/New_York" },
      encoding: "utf8",
    }),
    "2026-09-06",
  );
});
