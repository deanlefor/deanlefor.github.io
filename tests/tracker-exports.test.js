const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { page, root } = require("./dom-helpers.js");
const { initial } = require("../tracker-data.js");
const example = require("./fixtures/tracker-example.json");
const key = "phd-tracker-v2";

function open(t, options) {
  const p = page("tracker.html", options);
  t.after(() => p.dom.window.close());
  return p;
}

test("the reviewed share URL round-trips the complete current plan and preserves the viewer's saved progress", async (t) => {
  const original = JSON.stringify(example);
  const sender = open(t, { stored: { [key]: original } });
  let copied;
  Object.defineProperty(sender.window.navigator, "clipboard", {
    value: {
      writeText: async (url) => {
        copied = url;
      },
    },
  });
  sender.window.toggleSettings();
  sender.document.getElementById("preview-share-button").click();
  sender.document.querySelector('button[onclick="copyShareLink()"]').click();
  // The Clipboard API is asynchronous; wait for the copy handler's continuation.
  await Promise.resolve();
  const url = new URL(copied);
  const version = sender.document
    .querySelector(".topbar")
    .textContent.match(/v(\d+\.\d+)/)[1];
  assert.equal(url.searchParams.get("v"), version);
  const payload = JSON.parse(
    decodeURIComponent(Buffer.from(url.hash.slice(6), "base64").toString()),
  );
  const { userName, userEmail, ...expected } = example;
  assert.deepEqual(payload, expected);
  const privatePlan = JSON.stringify({
    ...initial,
    done: ["f4"],
    dmp: 12,
    names: { c1: "Viewer private study" },
  });
  const viewer = open(t, { hash: url.hash, stored: { [key]: privatePlan } });
  viewer.window.selectTab("qe");
  assert.equal(viewer.document.getElementById("qe-constellation").value, "IV");
  assert.equal(viewer.document.getElementById("qe-custom-f1").checked, true);
  assert.equal(viewer.document.getElementById("qe-custom-m2").checked, true);
  assert.equal(viewer.document.getElementById("qe-course-m2").checked, false);
  assert.equal(
    viewer.document.getElementById("qe-paper-title-1").value,
    example.qePapers[1].title,
  );
  assert.equal(
    viewer.document.getElementById("qe-prep-presentationReady").checked,
    true,
  );
  assert.equal(
    viewer.document.getElementById("qe-prep-materialsSubmitted").checked,
    false,
  );
  for (const control of viewer.document.querySelectorAll("[data-edit]"))
    assert.equal(control.disabled, true);
  viewer.window.selectTab("courses");
  viewer.window.toggleBucket("conc");
  for (const name of [
    example.names.m3,
    example.names.c1,
    example.names.c2,
    example.names.c3,
  ])
    assert.ok(viewer.document.body.textContent.includes(name), name);
  viewer.document
    .querySelector('[aria-controls="requirement-info-conc"]')
    .click();
  assert.equal(
    viewer.document.getElementById("requirement-info-conc").hidden,
    false,
  );
  assert.ok(
    viewer.window.generatePrintHTML().includes(example.qePapers[0].title),
  );
  assert.equal(sender.storage.get(key), original);
  assert.equal(viewer.storage.get(key), privatePlan);
  assert.ok(!viewer.document.body.textContent.includes("Viewer private study"));
});

test("the print button opens a report containing current QE status, renamed entries and all requirement explanations", (t) => {
  const original = JSON.stringify(example);
  const p = open(t, { stored: { [key]: original } });
  let html,
    closed = false;
  p.window.open = () => ({
    document: {
      write: (value) => {
        html = value;
      },
      close: () => {
        closed = true;
      },
    },
  });
  p.window.toggleSettings();
  p.document.querySelector('button[onclick="openPrintView()"]').click();
  assert.equal(closed, true);
  const printed = new JSDOM(html);
  t.after(() => printed.window.close());
  const doc = printed.window.document;
  const text = doc.body.textContent;
  for (const name of Object.values(example.names))
    assert.ok(text.includes(name), name);
  for (const paper of example.qePapers.filter((p) => p.title))
    assert.ok(text.includes(paper.title));
  assert.match(text, /Constellation IV — Custom/);
  assert.match(text, /QE coursework not ready/);
  assert.match(
    text,
    /1\/2 required papers ready.*1 optional.*0 optional pending/,
  );
  assert.match(text, /Written materials submitted: pending/);
  assert.match(text, /Oral presentation prepared: yes/);
  const pendingInquiry = [...doc.querySelectorAll(".qe-print-courses li")].find(
    (li) => li.textContent.includes("PAPA 6514"),
  );
  assert.match(
    pendingInquiry.textContent,
    /Pending:.*PAPA 6514.*Constellation/,
  );
  assert.equal(doc.querySelectorAll("[data-requirement-note]").length, 8);
  assert.match(text, /Advanced Topics courses do not automatically satisfy/);
  assert.match(text, /nine study credits and three lecture credits separately/);
  assert.match(text, /at least six other participants/);
  assert.equal(
    doc.querySelectorAll("[data-requirement-info], input, select").length,
    0,
  );
  assert.equal(p.storage.get(key), original);
});

test("blocked report windows explain the popup setting without changing the plan", (t) => {
  const p = open(t);
  const before = p.window.stateData();
  p.window.open = () => null;
  p.window.openPrintView();
  assert.equal(p.window.stateData(), before);
  assert.deepEqual(p.alerts, ["Allow popups to open the printable report."]);
});

test("printed requirement notes match the Courses explanations without popup markup", (t) => {
  const p = open(t);
  p.window.selectTab("courses");
  const printed = new JSDOM(p.window.generatePrintHTML());
  t.after(() => printed.window.close());
  for (const note of printed.window.document.querySelectorAll(
    "[data-requirement-note]",
  )) {
    const popup = p.document.getElementById(
      `requirement-info-${note.dataset.requirementNote}`,
    );
    assert.equal(
      note.querySelector("h3").textContent,
      popup.querySelector(".requirement-popover-heading span").textContent,
    );
    assert.deepEqual(
      [...note.querySelectorAll("p")].map((p) => p.textContent),
      [...popup.querySelectorAll(".requirement-popover-paragraph")].map(
        (p) => p.textContent,
      ),
    );
  }
  assert.equal(
    printed.window.document.querySelectorAll(
      '[role="dialog"], [data-requirement-info]',
    ).length,
    0,
  );
});

test("summary printing still excludes the individual plan and new reference sections", (t) => {
  const p = open(t, { stored: { [key]: JSON.stringify(example) } });
  const summary = p.window.generatePrintHTML(true);
  const text = new JSDOM(summary);
  t.after(() => text.window.close());
  assert.match(text.window.document.body.textContent, /Progress summary/);
  for (const value of [
    "QE coursework checklist",
    "Requirement reference",
    "Constellation IV",
    example.userName,
    ...Object.values(example.names),
    ...example.qePapers.map((p) => p.title).filter(Boolean),
  ])
    assert.ok(!text.window.document.body.textContent.includes(value), value);
});

test("tracker script and guide release URLs match the displayed version", (t) => {
  const p = open(t);
  const version = p.document
    .querySelector(".topbar")
    .textContent.match(/v(\d+\.\d+)/)[1];
  const source = new JSDOM(
    fs.readFileSync(path.join(root, "tracker.html"), "utf8"),
    { url: "https://website.test/tracker.html" },
  );
  t.after(() => source.window.close());
  for (const script of source.window.document.querySelectorAll("script[src]")) {
    if (new URL(script.src).origin === "https://website.test")
      assert.equal(new URL(script.src).searchParams.get("v"), version);
  }
  assert.equal(
    new URL(
      p.document.querySelector('a[href^="tracker-guide.html"]').href,
    ).searchParams.get("v"),
    version,
  );
});
