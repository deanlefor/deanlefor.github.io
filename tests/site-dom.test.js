const test = require("node:test");
const assert = require("node:assert/strict");
const { page } = require("./dom-helpers.js");
const { initial } = require("../tracker-data.js");

function shared(data) {
  return (
    "#view=" +
    Buffer.from(encodeURIComponent(JSON.stringify(data))).toString("base64")
  );
}
const attack = '<img src="missing.png" onerror="window.auditExecuted=true">';

test("terminal privacy navigation retains keyboard/touch access and has viewport space", (t) => {
  const p = page("terminal.html");
  t.after(() => p.dom.window.close());
  p.window.attachInputHandlers();
  const nav = p.document.getElementById("terminal-privacy");
  Object.defineProperty(nav, "offsetHeight", { value: 32 });
  p.window.handleViewportChanges();
  assert.equal(
    p.document.getElementById("terminal").style.height,
    `${p.window.innerHeight - 32}px`,
  );
  const link = nav.querySelector("a");
  link.focus();
  const enter = new p.window.KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
  });
  link.dispatchEvent(enter);
  assert.equal(enter.defaultPrevented, false);
  link.dispatchEvent(new p.window.Event("touchstart", { bubbles: true }));
  assert.equal(p.document.activeElement, link);
});

test("share preview omits profile by default and copies only the reviewed snapshot", async (t) => {
  const original = {
    ...initial,
    userName: "Private student",
    userEmail: "student@example.com",
    done: ["f1"],
    names: { el1: attack },
    assign: { el1: "f2025" },
  };
  const p = page("tracker.html", {
    stored: { "phd-tracker-v2": JSON.stringify(original) },
  });
  t.after(() => p.dom.window.close());
  const copied = [];
  Object.defineProperty(p.window.navigator, "clipboard", {
    value: {
      writeText: async (url) =>
        copied.push(
          JSON.parse(
            decodeURIComponent(
              Buffer.from(url.split("#view=")[1], "base64").toString(),
            ),
          ),
        ),
    },
  });
  p.window.toggleSettings();
  await p.window.copyShareLink();
  assert.equal(copied.length, 0, "copy requires a preview");
  p.document.getElementById("preview-share-button").click();
  const checkbox = p.document.getElementById("share-include-profile");
  assert.equal(checkbox.checked, false);
  assert.equal(p.document.activeElement, checkbox);
  assert.equal(p.document.querySelector("#share-preview-data img"), null);
  const preview = JSON.parse(
    p.document.getElementById("share-preview-data").textContent,
  );
  assert.equal(Object.hasOwn(preview, "userName"), false);
  assert.equal(Object.hasOwn(preview, "userEmail"), false);
  assert.deepEqual(preview.names, original.names);
  await p.window.copyShareLink();
  assert.deepEqual(copied[0], preview);
  const recipient = page("tracker.html", {
    hash: shared(copied[0]),
    stored: {
      "phd-tracker-v2": JSON.stringify({
        ...initial,
        userName: "Recipient private name",
      }),
    },
  });
  t.after(() => recipient.dom.window.close());
  const recipientState = JSON.parse(recipient.window.stateData());
  assert.equal(recipientState.userName, "");
  assert.equal(recipientState.userEmail, "");
  assert.deepEqual(recipientState.done, original.done);

  // New edits after preview cannot enter a snapshot without another review.
  const name = p.document.querySelector('input[aria-label="Your name"]');
  name.value = "Changed after preview";
  name.dispatchEvent(new p.window.Event("input", { bubbles: true }));
  checkbox.click();
  await p.window.copyShareLink();
  assert.equal(copied[1].userName, original.userName);
  assert.equal(copied[1].userEmail, original.userEmail);
  assert.deepEqual(
    copied[1],
    JSON.parse(p.document.getElementById("share-preview-data").textContent),
  );
  assert.equal(
    JSON.parse(p.window.stateData()).userName,
    "Changed after preview",
    "full backups retain the current profile",
  );
  p.window.previewShareLink();
  assert.equal(
    checkbox.checked,
    false,
    "every new review starts without the profile",
  );
});

test("summary reports exclude profile, custom names and individual plan details", (t) => {
  const p = page("tracker.html", {
    stored: {
      "phd-tracker-v2": JSON.stringify({
        ...initial,
        userName: "Private student",
        userEmail: "student@example.com",
        names: { el1: "Private research title" },
        assign: { el1: "f2025" },
        done: ["f1"],
      }),
    },
  });
  t.after(() => p.dom.window.close());
  const summary = p.window.generatePrintHTML(true);
  assert.match(summary, /Progress summary/);
  assert.match(summary, /Fall 2025/);
  for (const value of [
    "Private student",
    "student@example.com",
    "Private research title",
    "Semester plan",
    "Course completion",
    "Milestones",
  ])
    assert.equal(summary.includes(value), false, value);
  assert.match(p.window.generatePrintHTML(), /Private research title/);
});

test("sharing has a manual fallback when the Clipboard API is unavailable", async (t) => {
  const p = page("tracker.html");
  t.after(() => p.dom.window.close());
  const prompts = [];
  p.window.prompt = (...args) => prompts.push(args);
  p.window.toggleSettings();
  p.window.previewShareLink();
  await p.window.copyShareLink();
  assert.equal(prompts.length, 1);
  assert.match(prompts[0][1], /#view=/);
});

test("shared and printed profile/course names are literal text, never executable HTML", (t) => {
  const fixture = {
    ...initial,
    userName: attack,
    userEmail: '"&<test>',
    names: { el1: attack },
    assign: { el1: "f2025" },
  };
  const p = page("tracker.html", { hash: shared(fixture) });
  t.after(() => p.dom.window.close());
  assert.ok(p.document.body.textContent.includes(attack));
  for (const tab of ["planner", "courses", "milestones", "dashboard"]) {
    p.window.selectTab(tab);
    assert.equal(p.document.querySelector("img"), null);
  }
  p.window.toggleSettings();
  assert.equal(
    p.document.querySelector('input[aria-label="Your name"]').value,
    attack,
  );
  const print = p.window.generatePrintHTML();
  assert.ok(print.includes("&lt;img"));
  assert.ok(!print.includes("<img"));
  assert.equal(p.window.auditExecuted, undefined);
  assert.equal(p.storage.has("phd-tracker-v2"), false);
});

test("malformed shared data is rejected without exposing or changing the viewer profile", (t) => {
  const original = JSON.stringify({
    ...initial,
    userName: "Private saved person",
  });
  const p = page("tracker.html", {
    hash: shared({ ...initial, startYear: attack }),
    stored: { "phd-tracker-v2": original },
  });
  t.after(() => p.dom.window.close());
  assert.match(
    p.document.getElementById("storage-status").textContent,
    /invalid/,
  );
  assert.ok(!p.document.body.textContent.includes("Private saved person"));
  assert.equal(p.storage.get("phd-tracker-v2"), original);
});

test("a rejected PhD import never changes progress, even partially", (t) => {
  const original = JSON.stringify({ ...initial, dmp: 3 });
  const p = page("tracker.html", {
    stored: { "phd-tracker-v2": original },
    fileText: JSON.stringify({
      ...initial,
      done: ["el1"],
      dmp: { toString: 1 },
    }),
  });
  t.after(() => p.dom.window.close());
  p.window.loadFromFile({ files: [{}], value: "" });
  assert.equal(JSON.parse(p.window.stateData()).dmp, 3);
  assert.equal(p.storage.get("phd-tracker-v2"), original);
  assert.equal(p.confirms.length, 0);
  assert.equal(p.alerts.length, 1);
});

test("legacy PhD imports preserve local profile, while new backups restore supplied profile", (t) => {
  for (const includeProfile of [false, true]) {
    const raw = { ...initial, dmp: 4 };
    if (includeProfile) {
      raw.userName = "Restored person";
      raw.userEmail = "restored@example.test";
    } else {
      delete raw.userName;
      delete raw.userEmail;
    }
    const p = page("tracker.html", {
      stored: {
        "phd-tracker-v2": JSON.stringify({
          ...initial,
          userName: "Existing person",
        }),
      },
      fileText: JSON.stringify(raw),
    });
    t.after(() => p.dom.window.close());
    p.window.loadFromFile({ files: [{}], value: "" });
    const actual = JSON.parse(p.window.stateData());
    assert.equal(actual.dmp, 4);
    assert.equal(
      actual.userName,
      includeProfile ? "Restored person" : "Existing person",
    );
  }
});

test("quota failure leaves the previous PhD import target intact", (t) => {
  const p = page("tracker.html", {
    stored: { "phd-tracker-v2": JSON.stringify(initial) },
    blockedWrite: true,
    fileText: JSON.stringify({ ...initial, dmp: 9 }),
  });
  t.after(() => p.dom.window.close());
  p.window.loadFromFile({ files: [{}], value: "" });
  assert.equal(JSON.parse(p.window.stateData()).dmp, 0);
  assert.match(p.alerts[0], /previous data is unchanged/);
});

test("tracker completion and picker controls are native buttons and retain focus", (t) => {
  const p = page("tracker.html");
  t.after(() => p.dom.window.close());
  p.window.selectTab("courses");
  const button = p.document.querySelector(
    'button[aria-label="Complete PA theory and context"]',
  );
  assert.ok(button);
  button.focus();
  button.click();
  assert.equal(p.document.activeElement.getAttribute("aria-pressed"), "true");
  assert.deepEqual(JSON.parse(p.window.stateData()).done, ["f1"]);
  p.window.selectTab("planner");
  p.window.openPicker("f2025");
  assert.ok(p.document.querySelectorAll("button.pcourse").length > 0);
  assert.equal(
    p.document.querySelector(".pcourse").querySelector("button"),
    null,
  );
});

test("wrong run backup is rejected before confirmation and leaves runs intact", (t) => {
  const original = JSON.stringify({
    runs: [
      {
        id: 1,
        date: "2026-09-01",
        miles: 2,
        feeling: "ok",
        notes: "",
        w: null,
        day: null,
      },
    ],
    c25k: {},
  });
  const p = page("projects/run-tracker.html", {
    stored: { "nd-run": original },
    fileText: '{"unrelated":true}',
  });
  t.after(() => p.dom.window.close());
  p.window.importData({ target: { files: [{}], value: "" } });
  assert.equal(p.storage.get("nd-run"), original);
  assert.equal(p.confirms.length, 0);
  assert.match(
    p.document.getElementById("log-msg").textContent,
    /Invalid run backup/,
  );
});

test("run UI retains an unsaved addition and shows a persistent save warning", (t) => {
  const p = page("projects/run-tracker.html", { blockedWrite: true });
  t.after(() => p.dom.window.close());
  p.document.getElementById("f-miles").value = "2";
  p.document.getElementById("f-date").value = "2026-09-06";
  p.window.logRun();
  p.window.refresh();
  assert.equal(p.document.getElementById("sv-runs").textContent, "1");
  assert.match(
    p.document.getElementById("storage-status").textContent,
    /only in this tab/,
  );
});

test("homepage native controls expose labels, expanded state, Escape, and reduced motion", (t) => {
  const p = page("index.html");
  t.after(() => p.dom.window.close());
  const trigger = p.document.querySelector(".nav-dropdown-trigger");
  assert.equal(trigger.tagName, "BUTTON");
  trigger.click();
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  p.document.dispatchEvent(
    new p.window.KeyboardEvent("keydown", { key: "Escape" }),
  );
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(p.document.activeElement, trigger);
  const settings = p.document.getElementById("settings-btn");
  settings.click();
  assert.equal(settings.getAttribute("aria-expanded"), "true");
  const mode = p.document.getElementById("mode-toggle");
  mode.click();
  assert.equal(mode.getAttribute("aria-checked"), "true");
  assert.ok(
    [...p.document.querySelectorAll('input[type="range"]')].every(
      (input) => input.labels.length === 1,
    ),
  );
  assert.equal(p.frames.size, 0);
});

test("terminal text and reduced-motion output preserve earlier image nodes", (t) => {
  const p = page("terminal.html");
  t.after(() => p.dom.window.close());
  p.window.handleCommand("cd about");
  p.window.handleCommand("dean1.jpg");
  const image = p.document.querySelector("#output img");
  assert.ok(image);
  p.window.echoLine("C:\\Dean\\ABOUT> date");
  p.window.handleCommand("date");
  assert.equal(p.document.querySelector("#output img"), image);
  assert.match(
    p.document.getElementById("output").textContent,
    /Current date:/,
  );
  p.window.handleCommand("cls");
  assert.equal(p.document.getElementById("output").childNodes.length, 0);
});

test("terminal typing updates only the current text node and CLS cancels pending output", (t) => {
  const p = page("terminal.html", { reducedMotion: false });
  t.after(() => p.dom.window.close());
  const output = p.document.getElementById("output");
  const image = p.document.createElement("img");
  output.appendChild(image);
  // Advance the animation clock explicitly so a busy CI runner cannot affect it.
  const timers = new Map();
  let timerId = 0;
  p.window.setInterval = (callback) => {
    timers.set(++timerId, callback);
    return timerId;
  };
  p.window.clearInterval = (id) => timers.delete(id);
  p.window.enqueueLine("abc");
  for (let step = 0; step < 4; step++)
    for (const callback of [...timers.values()]) callback();
  assert.equal(output.querySelector("img"), image);
  assert.equal(output.textContent.trim(), "abc");
  p.window.enqueueLine("unfinished");
  p.window.handleCommand("cls");
  assert.equal(timers.size, 0);
  assert.equal(output.childNodes.length, 0);
});
