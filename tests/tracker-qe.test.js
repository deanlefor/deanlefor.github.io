const test = require("node:test");
const assert = require("node:assert/strict");
const Data = require("../tracker-data.js");
const { page } = require("./dom-helpers.js");

const key = "phd-tracker-v2";
const foundation = ["f1", "f2", "f3", "f4", "f5", "f6"];
const readyCourses = [...foundation, "m1", "m2"];
const fixture = (patch = {}) => Data.validate({ ...Data.initial, ...patch });
const read = (p) => JSON.parse(p.window.stateData());
const share = (data) =>
  "#view=" +
  Buffer.from(encodeURIComponent(JSON.stringify(data))).toString("base64");
function open(t, options) {
  const p = page("tracker.html", options);
  t.after(() => p.dom.window.close());
  return p;
}
function choose(p, value) {
  p.window.selectTab("qe");
  const select = p.document.getElementById("qe-constellation");
  select.value = value;
  select.dispatchEvent(new p.window.Event("change", { bubbles: true }));
}

test("each fixed constellation requires its own courses, five foundations, Cornerstone and Inquiry", () => {
  for (const [constellation, omitted] of [
    ["I", "f2"],
    ["II", "f6"],
    ["III", "f4"],
  ]) {
    const data = fixture({ constellation, done: readyCourses });
    assert.equal(Data.qeReadiness(data).ready, true, constellation);
    // Five foundations alone are insufficient if the missing one is in the constellation.
    const missing = Data.qeReadiness({
      ...data,
      done: readyCourses.filter((id) => id !== omitted),
    });
    assert.equal(missing.foundationCount, 5);
    assert.equal(missing.ready, false, constellation);
    assert.deepEqual(missing.missingCourses, [omitted]);
    for (const method of ["m1", "m2"]) {
      assert.equal(
        Data.qeReadiness({
          ...data,
          done: readyCourses.filter((id) => id !== method),
        }).ready,
        false,
      );
    }
  }
  assert.equal(
    Data.qeReadiness(
      fixture({
        constellation: "I",
        done: readyCourses.filter((id) => id !== "f6"),
      }),
    ).ready,
    true,
  );
  const four = Data.qeReadiness(
    fixture({ constellation: "I", done: ["f1", "f2", "f3", "f5", "m1", "m2"] }),
  );
  assert.equal(
    four.foundationCount,
    4,
    "Inquiry is not a seventh foundation course",
  );
  assert.equal(four.ready, false);
});

test("custom readiness requires exactly two completed eligible courses, including Policy Inquiry when chosen", () => {
  for (const customConstellationCourses of [[], ["f1"], ["f1", "m2"]]) {
    const qe = Data.qeReadiness(
      fixture({
        constellation: "IV",
        customConstellationCourses,
        done: readyCourses,
      }),
    );
    assert.equal(qe.ready, customConstellationCourses.length === 2);
  }
  const qe = Data.qeReadiness(
    fixture({
      constellation: "IV",
      customConstellationCourses: ["f6", "m2"],
      done: readyCourses.filter((id) => id !== "f6"),
    }),
  );
  assert.equal(qe.foundationCount, 5);
  assert.equal(qe.ready, false);
  assert.deepEqual(qe.missingCourses, ["f6"]);
});

test("bad constellation backup fields are rejected, while partial custom choices can be saved", () => {
  for (const constellation of [null, 4, "V", "constructor", "<script>"]) {
    assert.throws(() => fixture({ constellation }));
  }
  for (const customConstellationCourses of [
    null,
    "f1",
    ["f1", "f1"],
    ["m1"],
    ["el1"],
    ["f1", "f2", "m2"],
  ]) {
    assert.throws(() => fixture({ customConstellationCourses }));
  }
  assert.deepEqual(
    fixture({ constellation: "IV", customConstellationCourses: ["m2"] })
      .customConstellationCourses,
    ["m2"],
  );
});

test("planned courses, completed semesters and milestone checkmarks do not grant QE readiness", () => {
  const data = fixture({
    constellation: "I",
    assign: Object.fromEntries(readyCourses.map((id) => [id, "f2026"])),
    termDone: ["f2026"],
    mdone: ["ms4", "ms9"],
  });
  assert.equal(Data.qeReadiness(data).ready, false);
  assert.equal(Data.qeReadiness(data).foundationCount, 0);
  const transferred = {
    ...data,
    assign: Object.fromEntries(readyCourses.map((id) => [id, "_transfer"])),
  };
  assert.equal(Data.qeReadiness(transferred).ready, true);
});

test("an old saved plan keeps every existing field, checkmark and credit through selection, save and reload", (t) => {
  const old = {
    done: ["f1", "f2", "m1", "el1", "d1"],
    mdone: ["ms1", "ms4", "ms9", "ms15"],
    dmp: 8,
    assign: { f1: "f2025", el1: "_transfer", d1: "s2026" },
    names: { el1: "Example elective", d1: "Example dissertation phase" },
    termDone: ["f2025"],
    startSem: "fall",
    startYear: 2025,
    darkMode: true,
    userName: "Example student",
    userEmail: "student@example.test",
  };
  const original = JSON.stringify(old);
  const p = open(t, { stored: { [key]: original } });
  assert.equal(
    p.storage.get(key),
    original,
    "loading does not rewrite the stored copy",
  );
  assert.deepEqual(read(p), fixture(old));
  const credits = p.window.totals().total;
  choose(p, "III");
  assert.equal(p.document.activeElement.id, "qe-constellation");
  for (const [field, value] of Object.entries(old))
    assert.deepEqual(read(p)[field], value, field);
  assert.equal(p.window.totals().total, credits);
  assert.equal(read(p).constellation, "III");
  const saved = p.storage.get(key);
  const reloaded = open(t, { stored: { [key]: saved } });
  assert.deepEqual(read(reloaded), read(p));
});

test("custom course controls cap selection at two, preserve it across constellation changes and recalculate readiness", (t) => {
  const p = open(t, {
    stored: { [key]: JSON.stringify(fixture({ done: readyCourses })) },
  });
  choose(p, "IV");
  assert.match(
    p.document.getElementById("qe-readiness-status").textContent,
    /not ready/,
  );
  p.document.getElementById("qe-custom-f1").click();
  assert.equal(p.document.activeElement.id, "qe-custom-f1");
  p.document.getElementById("qe-custom-m2").click();
  assert.match(
    p.document.getElementById("qe-readiness-status").textContent,
    /Coursework ready/,
  );
  assert.equal(p.document.getElementById("qe-custom-f2").disabled, true);
  assert.equal(
    read(p).mdone.includes("ms9"),
    false,
    "readiness never records an exam pass",
  );
  choose(p, "II");
  choose(p, "IV");
  assert.deepEqual(read(p).customConstellationCourses, ["f1", "m2"]);
  p.document.getElementById("qe-custom-m2").click();
  assert.equal(p.document.getElementById("qe-custom-f2").disabled, false);
  assert.match(
    p.document.getElementById("qe-readiness-status").textContent,
    /not ready/,
  );
  p.document.getElementById("qe-custom-f2").click();
  p.window.toggleCourse("f2");
  assert.match(
    p.document.getElementById("qe-readiness-status").textContent,
    /not ready/,
  );
  assert.match(
    p.document.getElementById("qe-readiness").textContent,
    /Constellation courses remaining:\s+PAPA 6114/,
  );
});

test("backups restore constellation and custom courses, and older imports keep their progress without guessing a selection", (t) => {
  const data = fixture({
    constellation: "IV",
    customConstellationCourses: ["f1", "m2"],
    done: readyCourses,
    mdone: ["ms4"],
    dmp: 6,
  });
  const imported = open(t, {
    fileText: JSON.stringify({
      app: "papa-phd-tracker",
      schemaVersion: 1,
      ...data,
    }),
  });
  imported.window.loadFromFile({ files: [{}], value: "" });
  assert.deepEqual(read(imported), data);
  const old = { ...data };
  delete old.constellation;
  delete old.customConstellationCourses;
  const restored = open(t, {
    stored: { [key]: JSON.stringify(data) },
    fileText: JSON.stringify(old),
  });
  restored.window.loadFromFile({ files: [{}], value: "" });
  assert.deepEqual(read(restored), {
    ...old,
    constellation: "",
    customConstellationCourses: [],
  });
  assert.deepEqual(JSON.parse(restored.storage.get(key)).done, readyCourses);
});

test("new shared links include constellation, remain read-only, and old links cannot inherit the viewer's choice", async (t) => {
  const data = fixture({
    constellation: "IV",
    customConstellationCourses: ["f1", "m2"],
    done: readyCourses,
  });
  const sender = open(t, { stored: { [key]: JSON.stringify(data) } });
  let url;
  Object.defineProperty(sender.window.navigator, "clipboard", {
    value: {
      writeText: async (value) => {
        url = value;
      },
    },
  });
  sender.window.toggleSettings();
  sender.window.previewShareLink();
  await sender.window.copyShareLink();
  const sharedData = JSON.parse(
    decodeURIComponent(
      Buffer.from(url.split("#view=")[1], "base64").toString(),
    ),
  );
  assert.equal(sharedData.constellation, "IV");
  assert.deepEqual(sharedData.customConstellationCourses, ["f1", "m2"]);
  const original = JSON.stringify(
    fixture({ constellation: "III", done: ["f1"] }),
  );
  const viewer = open(t, {
    hash: new URL(url).hash,
    stored: { [key]: original },
  });
  viewer.window.selectTab("qe");
  assert.equal(
    viewer.document.getElementById("qe-constellation").disabled,
    true,
  );
  assert.equal(viewer.document.getElementById("qe-custom-f1").disabled, true);
  viewer.window.setConstellation("I");
  viewer.window.toggleCustomConstellationCourse("f1");
  assert.equal(read(viewer).constellation, "IV");
  assert.deepEqual(read(viewer).customConstellationCourses, ["f1", "m2"]);
  assert.equal(viewer.storage.get(key), original);
  delete sharedData.constellation;
  delete sharedData.customConstellationCourses;
  const oldViewer = open(t, {
    hash: share(sharedData),
    stored: { [key]: original },
  });
  assert.equal(read(oldViewer).constellation, "");
  assert.deepEqual(read(oldViewer).customConstellationCourses, []);
  assert.equal(oldViewer.storage.get(key), original);
});

test("invalid new import fields and failed saves preserve the original saved plan", (t) => {
  const original = JSON.stringify(
    fixture({ constellation: "II", done: ["f1"], dmp: 3 }),
  );
  const invalid = open(t, {
    stored: { [key]: original },
    fileText: JSON.stringify(fixture({ constellation: "I" })).replace(
      '"constellation":"I"',
      '"constellation":"V"',
    ),
  });
  invalid.window.loadFromFile({ files: [{}], value: "" });
  assert.equal(invalid.storage.get(key), original);
  assert.equal(invalid.confirms.length, 0);
  assert.equal(read(invalid).constellation, "II");
  const blocked = open(t, { stored: { [key]: original }, blockedWrite: true });
  choose(blocked, "III");
  assert.equal(
    read(blocked).constellation,
    "III",
    "unsaved choice stays available for export",
  );
  assert.deepEqual(read(blocked).done, ["f1"]);
  assert.equal(blocked.storage.get(key), original);
  assert.match(
    blocked.document.getElementById("storage-status").textContent,
    /only in this tab/,
  );
});

test("full reports include the constellation and readiness while summaries omit both", (t) => {
  const p = open(t, {
    stored: {
      [key]: JSON.stringify(
        fixture({
          constellation: "IV",
          customConstellationCourses: ["f1", "m2"],
          done: readyCourses,
        }),
      ),
    },
  });
  const full = p.window.generatePrintHTML();
  assert.match(full, /Constellation IV — Custom/);
  assert.match(full, /PAPA 6014 — PA theory and context/);
  assert.match(full, /PAPA 6514 — PA and policy inquiry/);
  assert.match(full, /Coursework ready for QE/);
  const summary = p.window.generatePrintHTML(true);
  assert.doesNotMatch(summary, /Constellation|QE readiness|Coursework ready/);
});

test("an explicit reset clears constellation choices along with progress and keeps the existing profile settings", (t) => {
  const p = open(t, {
    stored: {
      [key]: JSON.stringify(
        fixture({
          constellation: "IV",
          customConstellationCourses: ["f1", "m2"],
          done: readyCourses,
          userName: "Example student",
          startYear: 2024,
        }),
      ),
    },
  });
  p.window.resetAll();
  assert.equal(read(p).constellation, "");
  assert.deepEqual(read(p).customConstellationCourses, []);
  assert.equal(read(p).userName, "Example student");
  assert.equal(read(p).startYear, 2024);
});

test("the QE tab reuses saved subject choices and synchronizes courses and exam milestones", (t) => {
  const p = open(t, {
    stored: {
      [key]: JSON.stringify(
        fixture({
          constellation: "IV",
          customConstellationCourses: ["f1", "f6"],
          mdone: ["ms5", "ms6"],
        }),
      ),
    },
  });
  p.window.selectTab("qe");
  assert.equal(p.document.getElementById("qe-constellation").value, "IV");
  assert.equal(p.document.getElementById("qe-custom-f6").checked, true);
  assert.equal(p.document.getElementById("qe-milestone-ms6").checked, true);
  assert.equal(
    p.document.getElementById("qe-paper-ready-0").checked,
    false,
    "past packet checkmarks never invent individual paper details",
  );
  p.document.getElementById("qe-course-f1").click();
  assert.deepEqual(read(p).done, ["f1"]);
  assert.equal(p.window.totals().total, 3);
  assert.equal(p.document.activeElement.id, "qe-course-f1");
  p.document.getElementById("qe-milestone-ms5").click();
  assert.deepEqual(read(p).mdone, ["ms6"]);
  p.window.selectTab("milestones");
  assert.equal(
    p.document
      .querySelector('[aria-label="QE request submitted"]')
      .getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(
    p.document
      .querySelector('[aria-label="Submitted papers ready"]')
      .getAttribute("aria-pressed"),
    "true",
  );
});

test("two required papers must match the selected courses, and optional papers are tracked separately", () => {
  const data = fixture({
    constellation: "IV",
    customConstellationCourses: ["f1", "f6"],
  });
  data.qePapers[0] = {
    title: "Example theory paper",
    courseId: "f1",
    ready: true,
  };
  data.qePapers[1] = {
    title: "Example ethics paper",
    courseId: "f6",
    ready: true,
  };
  assert.equal(Data.qePaperProgress(data).packetReady, true);
  data.qePapers[2].title = "Optional paper draft";
  assert.deepEqual(Data.qePaperProgress(data), {
    requiredReady: 2,
    optionalCount: 1,
    optionalPending: 1,
    packetReady: false,
  });
  data.qePapers[2] = {
    title: "Optional paper draft",
    courseId: "f3",
    ready: true,
  };
  assert.equal(Data.qePaperProgress(data).packetReady, true);
  assert.equal(
    Data.qePaperProgress({ ...data, constellation: "I" }).requiredReady,
    0,
  );
  assert.equal(
    data.qePapers[1].ready,
    true,
    "changing constellation does not destroy a paper checkmark",
  );
});

test("paper fields and preparation save without changing typing focus, survive reload and flag changed subject choices", (t) => {
  const p = open(t);
  choose(p, "II");
  const title = p.document.getElementById("qe-paper-title-0");
  title.focus();
  title.value = "Example paper";
  title.dispatchEvent(new p.window.Event("input", { bubbles: true }));
  assert.equal(p.document.activeElement, title);
  const course = p.document.getElementById("qe-paper-course-0");
  course.value = "f1";
  course.dispatchEvent(new p.window.Event("change", { bubbles: true }));
  p.document.getElementById("qe-paper-ready-0").click();
  p.document.getElementById("qe-prep-materialsSubmitted").click();
  assert.equal(read(p).mdone.includes("ms9"), false);
  const saved = p.storage.get(key);
  const reloaded = open(t, { stored: { [key]: saved } });
  choose(reloaded, "I");
  assert.deepEqual(read(reloaded).qePapers[0], {
    title: "Example paper",
    courseId: "f1",
    ready: true,
  });
  assert.deepEqual(read(reloaded).qePrepDone, ["materialsSubmitted"]);
  assert.match(
    reloaded.document.body.textContent,
    /outside your selected constellation/,
  );
  assert.match(
    reloaded.document.getElementById("qe-papers-status").textContent,
    /0\/2/,
  );
});

test("paper data is validated before imports can replace any saved progress", (t) => {
  const original = JSON.stringify(
    fixture({ done: ["f1"], mdone: ["ms6"], dmp: 5 }),
  );
  for (const patch of [
    { qePapers: [] },
    { qePapers: [null, ...Data.initial.qePapers.slice(1)] },
    {
      qePapers: [
        { title: "", courseId: "el1", ready: false },
        ...Data.initial.qePapers.slice(1),
      ],
    },
    {
      qePapers: [
        { title: "x".repeat(201), courseId: "f1", ready: false },
        ...Data.initial.qePapers.slice(1),
      ],
    },
    { qePrepDone: ["automaticallyPassed"] },
  ]) {
    assert.throws(() => fixture(patch));
    const p = open(t, {
      stored: { [key]: original },
      fileText: JSON.stringify({ ...fixture(), ...patch }),
    });
    p.window.loadFromFile({ files: [{}], value: "" });
    assert.equal(p.storage.get(key), original);
    assert.equal(p.confirms.length, 0);
  }
});

test("paper titles are literal text in the QE planner and full report, and summaries omit paper details", (t) => {
  const data = fixture({
    constellation: "II",
    qePrepDone: ["presentationReady"],
  });
  const title = '<img src=x onerror="window.injected=true">';
  data.qePapers[0] = { title, courseId: "f1", ready: true };
  const p = open(t, { hash: share(data) });
  p.window.selectTab("qe");
  assert.equal(p.document.getElementById("qe-paper-title-0").value, title);
  assert.equal(p.document.querySelector("img"), null);
  assert.equal(p.document.getElementById("qe-paper-ready-0").disabled, true);
  assert.equal(
    p.document.getElementById("qe-prep-presentationReady").disabled,
    true,
  );
  p.window.updateQePaper(0, "title", "changed");
  p.window.toggleQePrep("presentationReady");
  p.window.toggleQeMilestone("ms9");
  p.window.toggleQeCourse("f1");
  assert.deepEqual(read(p), data);
  const full = p.window.generatePrintHTML();
  assert.match(full, /&lt;img/);
  assert.doesNotMatch(full, /<img/);
  assert.doesNotMatch(
    p.window.generatePrintHTML(true),
    /QE papers|Untitled|presentation prepared|&lt;img/,
  );
  assert.equal(p.storage.has(key), false);
});

test("paper and preparation details round-trip through backups and sharing, and old links cannot inherit them", async (t) => {
  const data = fixture({
    constellation: "II",
    qePrepDone: ["materialsSubmitted"],
  });
  data.qePapers[0] = {
    title: "Example packet paper",
    courseId: "f1",
    ready: true,
  };
  const restored = open(t, {
    fileText: JSON.stringify({
      app: "papa-phd-tracker",
      schemaVersion: 1,
      ...data,
    }),
  });
  restored.window.loadFromFile({ files: [{}], value: "" });
  assert.deepEqual(read(restored), data);
  let copied;
  Object.defineProperty(restored.window.navigator, "clipboard", {
    value: {
      writeText: async (value) => {
        copied = value;
      },
    },
  });
  restored.window.toggleSettings();
  restored.window.previewShareLink();
  await restored.window.copyShareLink();
  const viewer = open(t, { hash: new URL(copied).hash });
  assert.deepEqual(read(viewer).qePapers, data.qePapers);
  assert.deepEqual(read(viewer).qePrepDone, data.qePrepDone);
  const old = { ...data };
  delete old.qePapers;
  delete old.qePrepDone;
  const oldViewer = open(t, {
    hash: share(old),
    stored: { [key]: JSON.stringify(data) },
  });
  assert.deepEqual(read(oldViewer).qePapers, Data.initial.qePapers);
  assert.deepEqual(read(oldViewer).qePrepDone, []);
  assert.equal(
    JSON.parse(oldViewer.storage.get(key)).qePapers[0].title,
    "Example packet paper",
  );
});
