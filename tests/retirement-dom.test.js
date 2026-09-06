const test = require("node:test");
const assert = require("node:assert/strict");
const { page } = require("./dom-helpers.js");
const key = "dual-fers-retirement-planner-v01";

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}
async function firstSalaryField(p) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const label = [...p.document.querySelectorAll("label")].find(
      (label) => label.textContent === "Current basic salary",
    );
    if (label) return p.document.getElementById(label.htmlFor);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.fail("Salary field did not mount");
}
function inputValue(p, input, value) {
  Object.getOwnPropertyDescriptor(
    p.window.HTMLInputElement.prototype,
    "value",
  ).set.call(input, value);
  input.dispatchEvent(new p.window.Event("input", { bubbles: true }));
}
function inputFor(p, labelText) {
  const label = [...p.document.querySelectorAll("label")].find(
    (label) => label.textContent === labelText,
  );
  assert.ok(label, `Missing label: ${labelText}`);
  return p.document.getElementById(label.htmlFor);
}

test("the built retirement UI survives denied storage and keeps edits with a visible recovery option", async (t) => {
  const p = page("fers-retirement/index.html", {
    blockedRead: true,
    blockedWrite: true,
  });
  t.after(() => p.dom.window.close());
  await flush();
  assert.match(p.document.querySelector("h1").textContent, /Dual-FERS/);
  assert.match(
    p.document.querySelector(".save-status").textContent,
    /original saved copy is preserved/,
  );
  inputValue(p, inputFor(p, "Name"), "Unsaved person");
  await flush();
  assert.equal(inputFor(p, "Name").value, "Unsaved person");
  assert.match(
    p.document.querySelector(".save-status").textContent,
    /Download your current inputs/,
  );
  assert.equal(p.storage.has(key), false);
  assert.ok(
    [...p.document.querySelectorAll("button")].some(
      (button) => button.textContent === "Download current inputs",
    ),
  );
});

test("invalid chronology suppresses built UI results and preserves the last saved scenario", async (t) => {
  const p = page("fers-retirement/index.html");
  t.after(() => p.dom.window.close());
  await flush();
  inputValue(p, inputFor(p, "Name"), "Test person");
  await flush();
  const saved = p.storage.get(key);
  const retirement = inputFor(p, "Planned retirement");
  const validDate = retirement.value;
  inputValue(p, retirement, "2190-01-01");
  await flush();
  assert.match(
    p.document.querySelector('[role="alert"]').textContent,
    /planning horizon/i,
  );
  assert.equal(p.document.querySelector(".projection-card").hidden, true);
  assert.equal(p.document.querySelector(".summary-card").hidden, true);
  assert.equal(p.storage.get(key), saved);
  inputValue(p, retirement, validDate);
  await flush();
  assert.equal(p.document.querySelector('[role="alert"]'), null);
  assert.equal(p.document.querySelector(".projection-card").hidden, false);
});

test("incomplete numeric drafts stay editable without entering the calculation or saved data", async (t) => {
  const p = page("fers-retirement/index.html");
  t.after(() => p.dom.window.close());
  await flush();
  const salary = inputFor(p, "Current basic salary");
  const originalIncome = p.document.querySelector(".hero-number").textContent;
  inputValue(p, salary, "");
  await flush();
  assert.equal(salary.value, "");
  assert.equal(salary.getAttribute("aria-invalid"), "true");
  assert.equal(
    p.document.querySelector(".hero-number").textContent,
    originalIncome,
  );
  assert.equal(p.storage.has(key), false);
  inputValue(p, salary, "180000");
  await flush();
  assert.equal(salary.getAttribute("aria-invalid"), "false");
  assert.equal(JSON.parse(p.storage.get(key)).people[0].currentSalary, 180000);
});

test("an edit immediately after mount survives initialization and later sample reloads update the field", async (t) => {
  const p = page("fers-retirement/index.html");
  t.after(() => p.dom.window.close());
  // Edit on the first rendered frame, before deferred mount effects can settle.
  const salary = await firstSalaryField(p);
  const originalSalary = salary.value;
  inputValue(p, salary, "");
  await flush();
  assert.equal(salary.value, "");
  assert.equal(salary.getAttribute("aria-invalid"), "true");
  assert.equal(p.storage.has(key), false);

  inputValue(p, salary, "180000");
  await flush();
  assert.equal(JSON.parse(p.storage.get(key)).people[0].currentSalary, 180000);
  [...p.document.querySelectorAll("button")]
    .find((button) => button.textContent.trim() === "Reload sample household")
    .click();
  await flush();
  assert.equal(salary.value, originalSalary);
  assert.equal(salary.getAttribute("aria-invalid"), "false");
});
