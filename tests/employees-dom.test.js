const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { page } = require("./dom-helpers.js");

const KEY = "workforce-allocation-studio:v1";

function stored(p) {
  const data = p.storage.get(KEY);
  return data ? JSON.parse(data) : null;
}
function renameFirst(p, next) {
  const button = p.document.querySelector(".card-name-button");
  button.click();
  const field = p.document.querySelector(".card-name-input:not([hidden])");
  assert.ok(field, "clicking the title opens an inline name field");
  field.value = next;
  field.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}

test("new visit starts with four compact, generic editable cards", t => {
  const p = page("employees/index.html");
  t.after(() => p.dom.window.close());
  assert.deepEqual(Array.from(p.document.querySelectorAll(".card-name-label"), n => n.textContent), [
    "Employee 1", "Employee 2", "Employee 3", "Employee 4"
  ]);
  assert.equal(p.document.querySelectorAll(".allocation-card").length, 4);
  assert.equal(p.document.getElementById("total-staff").textContent, "80");
  assert.equal(p.document.getElementById("budget-total").textContent, "$14.50M");
  assert.equal(p.document.getElementById("settings-panel").open, false);
  assert.equal(p.document.querySelectorAll(".role-visual").length, 0, "no redundant second slider bar");
  assert.equal(p.document.querySelectorAll(".card-name-button").length, 4);
  assert.equal(p.document.querySelectorAll(".lock-button").length, 4);
});

test("click title to rename inline; Enter saves across the board and storage", t => {
  const p = page("employees/index.html");
  t.after(() => p.dom.window.close());
  renameFirst(p, "Policy analysts");
  assert.equal(p.document.querySelector(".card-name-label").textContent, "Policy analysts");
  assert.match(p.document.getElementById("headcount-donut").getAttribute("aria-label"), /Policy analysts/);
  assert.equal(stored(p).plan.types[0].name, "Policy analysts");
  assert.equal(p.document.querySelectorAll(".allocation-card").length, 4);

  const reloaded = page("employees/index.html", { stored: { [KEY]: p.storage.get(KEY) } });
  t.after(() => reloaded.dom.window.close());
  assert.equal(reloaded.document.querySelector(".card-name-label").textContent, "Policy analysts");
});

test("Escape cancels inline rename; typed names stay text instead of executing HTML", t => {
  const p = page("employees/index.html");
  t.after(() => p.dom.window.close());
  const button = p.document.querySelector(".card-name-button");
  button.click();
  const field = p.document.querySelector(".card-name-input:not([hidden])");
  field.value = "Do not save";
  field.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(p.document.querySelector(".card-name-label").textContent, "Employee 1");
  renameFirst(p, '<img src=x onerror="window.bad=true">');
  assert.equal(p.window.bad, undefined);
  assert.equal(p.document.querySelector(".allocation-card img"), null);
  assert.match(p.document.querySelector(".card-name-label").textContent, /img src/);
});

test("canceling reset preserves changes; confirming deletes all local scenarios and restores four defaults", t => {
  const p = page("employees/index.html");
  t.after(() => p.dom.window.close());
  p.window.localStorage.removeItem = key => p.storage.delete(key);
  renameFirst(p, "Investigators");
  p.document.getElementById("scenario-name").value = "Extra investigators";
  p.document.getElementById("save-scenario").click();
  p.document.querySelector(".lock-button").click();
  const grow = p.document.getElementById("mode-flex");
  grow.checked = true;
  grow.dispatchEvent(new p.window.Event("change", { bubbles: true }));
  const current = p.storage.get(KEY);
  assert.equal(stored(p).scenarios.length, 1);
  let prompt = "";
  p.window.confirm = msg => { prompt = msg; return false; };
  p.document.getElementById("reset-top").click();
  assert.match(prompt, /delete.+saved scenario/i);
  assert.equal(p.storage.get(KEY), current, "cancel must preserve the saved plan");

  p.window.confirm = msg => { prompt = msg; return true; };
  p.document.getElementById("reset-all").click();
  assert.match(prompt, /cannot be undone/i);
  const restored = stored(p);
  assert.deepEqual(restored.plan.types.map(t => t.name), ["Employee 1", "Employee 2", "Employee 3", "Employee 4"]);
  assert.deepEqual(restored.plan.types.map(t => t.count), [20,20,20,20]);
  assert.ok(restored.plan.types.every(t => t.lock === "none"));
  assert.equal(restored.plan.budget, 14500000);
  assert.equal(restored.mode, "trade");
  assert.deepEqual(restored.scenarios, []);
  assert.equal(p.document.querySelectorAll(".allocation-card").length, 4);
  assert.equal(p.document.querySelectorAll(".scenario-tile").length, 0);
  assert.match(p.document.getElementById("reset-feedback").textContent, /Reset complete/);
  assert.equal(p.document.getElementById("reset-notice").hidden, false);
});

test("previously saved two-role plans remain intact until explicitly reset", t => {
  const legacyPlan = {
    budget: 32500000,
    types: [
      { id:"accountants", name:"Accountants", cost:200000, baseline:63, count:63, min:0, max:null, priority:4, lock:"none", lockedSpend:0 },
      { id:"officers", name:"Police officers", cost:300000, baseline:65, count:65, min:0, max:null, priority:5, lock:"headcount", lockedSpend:0 }
    ]
  };
  const prior = JSON.stringify({
    version: 1,
    plan: legacyPlan,
    scenarios: [{ id: "saved-1", name: "Original mix", plan: legacyPlan }],
    mode: "flex"
  });
  const p = page("employees/index.html", { stored: { [KEY]: prior } });
  t.after(() => p.dom.window.close());
  p.window.localStorage.removeItem = key => p.storage.delete(key);
  assert.equal(p.document.querySelectorAll(".allocation-card").length, 2);
  assert.equal(p.document.querySelector(".card-name-label").textContent, "Accountants");
  assert.equal(p.document.getElementById("mode-flex").checked, true);
  assert.equal(p.document.querySelectorAll(".scenario-tile").length, 1);
  assert.equal(p.storage.get(KEY), prior, "loading old data must not rewrite it");

  p.document.getElementById("reset-all").click();
  assert.equal(p.document.querySelectorAll(".allocation-card").length, 4);
  assert.deepEqual(stored(p).scenarios, []);
});

test("compact cards have four-column and two-column breakpoints", () => {
  const css = fs.readFileSync(path.join(__dirname, "../employees/styles.css"), "utf8");
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 549px\)/);
  assert.match(css, /\.card-main \.count-input::-webkit-inner-spin-button/);
  const html = fs.readFileSync(path.join(__dirname, "../employees/index.html"), "utf8");
  assert.match(html, /id="reset-all"/);
  assert.match(html, /v=3/);
});
