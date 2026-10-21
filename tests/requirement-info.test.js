const test = require("node:test");
const assert = require("node:assert/strict");
const { page } = require("./dom-helpers.js");
const { initial } = require("../tracker-data.js");
const key = "phd-tracker-v2";

function courses(t, options) {
  const p = page("tracker.html", options);
  t.after(() => p.dom.window.close());
  p.window.selectTab("courses");
  return p;
}
function info(p, name) {
  return p.document.querySelector(`#requirement-info-${name}`)
    .previousElementSibling;
}
function panel(p, name) {
  return p.document.getElementById(`requirement-info-${name}`);
}

test("requirement explanations are labeled native buttons outside accordion controls with unique dialog IDs", (t) => {
  const p = courses(t);
  const triggers = [...p.document.querySelectorAll("[data-requirement-info]")];
  assert.equal(
    triggers.length,
    8,
    "seven existing buckets plus the Advanced Methods entry",
  );
  const ids = triggers.map((button) => button.getAttribute("aria-controls"));
  assert.equal(new Set(ids).size, ids.length);
  for (const button of triggers) {
    assert.equal(button.tagName, "BUTTON");
    assert.equal(button.type, "button");
    assert.equal(button.getAttribute("aria-haspopup"), "dialog");
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.match(button.getAttribute("aria-label"), /^About /);
    assert.equal(
      button.parentElement.closest("button"),
      null,
      "no nested buttons",
    );
    const content = p.document.getElementById(
      button.getAttribute("aria-controls"),
    );
    assert.equal(content.hidden, true);
    assert.equal(content.getAttribute("role"), "dialog");
    assert.equal(content.getAttribute("aria-modal"), "false");
    assert.ok(
      p.document.getElementById(content.getAttribute("aria-labelledby")),
    );
    assert.equal(content.tabIndex, -1);
  }
  assert.equal(p.window.RequirementInfo.render("unrelated"), "");
  assert.equal(p.window.RequirementInfo.render("constructor"), "");
});

test("opening requirement help does not toggle its bucket and supports toggle, close, outside click and Escape", (t) => {
  const p = courses(t);
  const trigger = info(p, "foundation");
  const accordion = p.document.querySelector(
    "button[onclick=\"toggleBucket('foundation')\"]",
  );
  trigger.focus();
  trigger.click();
  assert.equal(panel(p, "foundation").hidden, false);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.equal(p.document.activeElement, panel(p, "foundation"));
  assert.equal(accordion.getAttribute("aria-expanded"), "true");
  panel(p, "foundation")
    .querySelector(".requirement-popover-paragraph")
    .click();
  assert.equal(
    panel(p, "foundation").hidden,
    false,
    "clicks inside keep the explanation open",
  );
  p.document.dispatchEvent(
    new p.window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(panel(p, "foundation").hidden, true);
  assert.equal(p.document.activeElement, trigger);
  trigger.click();
  trigger.click();
  assert.equal(panel(p, "foundation").hidden, true);
  trigger.click();
  panel(p, "foundation").querySelector("[data-requirement-close]").click();
  assert.equal(p.document.activeElement, trigger);
  assert.equal(panel(p, "foundation").hidden, true);
  trigger.click();
  p.document.body.click();
  assert.equal(panel(p, "foundation").hidden, true);
  assert.equal(accordion.getAttribute("aria-expanded"), "true");
});

test("one explanation is visible at a time, and rerendering or navigation closes stale dialogs", (t) => {
  const p = courses(t);
  info(p, "foundation").click();
  info(p, "methods").click();
  assert.equal(panel(p, "foundation").hidden, true);
  assert.equal(info(p, "foundation").getAttribute("aria-expanded"), "false");
  assert.equal(panel(p, "methods").hidden, false);
  assert.equal(
    p.document.querySelectorAll(".requirement-info.is-open").length,
    1,
  );
  p.window.toggleBucket("methods");
  assert.equal(
    p.document.querySelectorAll(
      '.requirement-info-trigger[aria-expanded="true"]',
    ).length,
    0,
  );
  info(p, "conc").click();
  p.window.selectTab("planner");
  p.window.selectTab("courses");
  assert.equal(panel(p, "conc").hidden, true);
  info(p, "conc").click();
  assert.equal(
    panel(p, "conc").hidden,
    false,
    "delegated controls work after replacing the UI",
  );
});

test("popovers stay inside narrow viewport edges and reposition or close when scrolling", (t) => {
  const p = courses(t);
  Object.defineProperty(p.window, "innerWidth", { value: 375 });
  Object.defineProperty(p.window, "innerHeight", { value: 667 });
  let anchor = { left: 340, top: 620, bottom: 644 };
  const trigger = info(p, "advancedMethods");
  const content = panel(p, "advancedMethods");
  trigger.getBoundingClientRect = () => anchor;
  let measurements = 0;
  content.getBoundingClientRect = () => {
    measurements++;
    return {
      width: 320,
      height: Math.min(360, parseFloat(content.style.maxHeight) || 360),
    };
  };
  trigger.click();
  assert.equal(content.style.left, "43px");
  assert.equal(
    content.style.top,
    "254px",
    "place above the icon when there is no space below",
  );
  anchor = { left: 0, top: 5, bottom: 29 };
  p.window.dispatchEvent(new p.window.Event("scroll"));
  assert.equal(content.style.left, "12px");
  assert.equal(content.style.top, "35px");
  anchor = { left: 0, top: 300, bottom: 324 };
  p.window.dispatchEvent(new p.window.Event("resize"));
  assert.equal(content.style.maxHeight, "325px");
  assert.equal(content.style.top, "330px");
  assert.ok(
    parseFloat(content.style.top) > anchor.bottom,
    "the popup does not cover its own trigger",
  );
  const beforeScroll = measurements;
  content.dispatchEvent(new p.window.Event("scroll"));
  assert.equal(
    measurements,
    beforeScroll,
    "internal scrolling does not resize the explanation",
  );
  anchor = { left: 0, top: 700, bottom: 724 };
  p.window.dispatchEvent(new p.window.Event("scroll"));
  assert.equal(content.hidden, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
});

test("help uses distinct Advanced Methods and concentration explanations, including approval limits", (t) => {
  const p = courses(t);
  assert.match(
    panel(p, "advancedMethods").textContent,
    /Advanced Methods \(3 credits\)/,
  );
  for (const example of [
    "ethnography",
    "textual analysis",
    "historical research",
    "survey design",
    "time-series analysis",
    "simulation",
  ])
    assert.ok(panel(p, "advancedMethods").textContent.includes(example));
  assert.match(
    panel(p, "advancedMethods").textContent,
    /Advanced Topics courses do not automatically satisfy/,
  );
  assert.match(panel(p, "methods").textContent, /PAPA 6294.*PAPA 6514/);
  assert.match(panel(p, "conc").textContent, /Nine credits of focused study/);
  assert.match(
    panel(p, "conc").textContent,
    /separate three-credit Concentration Lecture/,
  );
  assert.match(
    panel(p, "conc").textContent,
    /does not have to focus on the dissertation/,
  );
  assert.match(
    panel(p, "lecture").textContent,
    /faculty advisor and an audience of at least six other participants/,
  );
  assert.match(panel(p, "dissertation").textContent, /Three of the 30 credits/);
  for (const content of p.document.querySelectorAll(".requirement-popover"))
    assert.match(
      content.textContent,
      /Confirm course eligibility and Plan of Study placement/,
    );
  assert.equal(
    p.document.querySelectorAll('[aria-controls="requirement-info-conc"]')
      .length,
    1,
  );
  assert.equal(p.document.body.textContent.includes("UAP 5464"), false);
});

test("opening and dismissing all explanations preserves saved progress, credit totals, rename and completion behavior", (t) => {
  const original = {
    ...initial,
    done: ["f1", "m3", "c1"],
    mdone: ["ms4"],
    dmp: 7,
    names: {
      m3: "Example advanced course",
      c1: "Example concentration course",
    },
    assign: { m3: "f2026", c1: "s2027", el1: "_transfer" },
  };
  const raw = JSON.stringify(original);
  const p = courses(t, { stored: { [key]: raw } });
  const before = p.window.stateData();
  const totals = JSON.stringify(p.window.totals());
  for (const button of p.document.querySelectorAll("[data-requirement-info]")) {
    button.click();
    p.window.RequirementInfo.close();
  }
  assert.equal(p.storage.get(key), raw);
  assert.equal(p.window.stateData(), before);
  assert.equal(JSON.stringify(p.window.totals()), totals);
  info(p, "advancedMethods").click();
  p.window.startRename("m3");
  p.document.getElementById("rename-inp").value = "Updated example name";
  p.window.saveRename();
  assert.equal(
    JSON.parse(p.window.stateData()).names.m3,
    "Updated example name",
  );
  assert.equal(
    info(p, "advancedMethods").getAttribute("aria-expanded"),
    "false",
  );
  p.document
    .querySelector('[aria-label="Complete Updated example name"]')
    .click();
  assert.equal(p.window.totals().total, JSON.parse(totals).total - 3);
  assert.equal(JSON.parse(p.window.stateData()).assign.m3, "f2026");
});

test("read-only shared plans expose requirement help without modifying the viewer's saved plan", (t) => {
  const original = JSON.stringify({ ...initial, dmp: 9 });
  const hash =
    "#view=" +
    Buffer.from(encodeURIComponent(JSON.stringify(initial))).toString("base64");
  const p = courses(t, { stored: { [key]: original }, hash });
  assert.equal(info(p, "advancedMethods").disabled, false);
  info(p, "advancedMethods").click();
  assert.equal(panel(p, "advancedMethods").hidden, false);
  assert.equal(p.storage.get(key), original);
  assert.equal(
    p.document.querySelector('[aria-label="Complete PA theory and context"]')
      .disabled,
    true,
  );
});
