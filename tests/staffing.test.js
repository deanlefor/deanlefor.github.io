const test = require("node:test");
const assert = require("node:assert/strict");
const { defaultPlan, normalizePlan, summarize, optimize, adjust, countFor } = require("../employees/logic.js");
// Preserve regression coverage for the original two-type example. The public
// starter now uses four generic roles, but v1 saved plans remain supported.
function legacyTwoTypePlan() {
  return {
    budget: 32500000,
    types: [
      { id: "accountants", name: "Accountants", cost: 200000, baseline: 63, count: 63, min: 0, max: null, priority: 4, lock: "none", lockedSpend: 0 },
      { id: "officers", name: "Police officers", cost: 300000, baseline: 65, count: 65, min: 0, max: null, priority: 5, lock: "none", lockedSpend: 0 }
    ]
  };
}


test("starter scenario uses four generic, equally staffed, editable types", () => {
  const plan = normalizePlan(defaultPlan());
  const sum = summarize(plan);
  assert.deepEqual(plan.types.map(t => t.name), ["Employee 1", "Employee 2", "Employee 3", "Employee 4"]);
  assert.deepEqual(plan.types.map(t => t.count), [20, 20, 20, 20]);
  assert.deepEqual(plan.types.map(t => t.cost), [100000, 150000, 200000, 250000]);
  assert.equal(plan.budget, 14500000);
  assert.equal(sum.totalCount, 80);
  assert.equal(sum.payroll, 14000000);
  assert.equal(sum.remaining, 500000);
});

test("new four-role plan trades within its budget", () => {
  const plan = defaultPlan();
  const changed = adjust(plan, "employee-1", 28, "trade");
  assert.equal(changed.plan.budget, plan.budget);
  assert.equal(changed.actual, 28);
  assert.equal(changed.plan.types[3].count, 18);
  assert.ok(changed.summary.remaining >= 0);
});

test("locked headcounts remain fixed through optimization", () => {
  const plan = legacyTwoTypePlan();
  plan.types[0].lock = "headcount";
  const result = optimize(plan, "headcount");
  assert.equal(result.plan.types[0].count, 63);
  assert.ok(result.summary.committed <= plan.budget);
  assert.equal(result.summary.totalCount, 129);
});

test("funding locks reserve the entire amount, not just payroll", () => {
  const plan = legacyTwoTypePlan();
  plan.types[0].lock = "spend";
  plan.types[0].lockedSpend = 12900000;
  const result = optimize(plan, "utilization");
  assert.equal(countFor(result.plan.types[0]), 64);
  assert.equal(result.summary.reservedRemainder, 100000);
  assert.ok(result.summary.committed <= plan.budget);
});

test("role minimums, maximums and exact optimizer are respected", () => {
  const plan = {
    budget: 33,
    types: [
      { id:"a",name:"A",cost:6,baseline:0,count:0,min:1,max:2,priority:5,lock:"none",lockedSpend:0 },
      { id:"b",name:"B",cost:10,baseline:0,count:0,min:0,max:2,priority:8,lock:"none",lockedSpend:0 },
      { id:"c",name:"C",cost:7,baseline:0,count:0,min:0,max:3,priority:1,lock:"none",lockedSpend:0 }
    ]
  };
  const r = optimize(plan, "utilization");
  assert.equal(r.exact,true);
  assert.equal(r.summary.remaining,0);
  assert.equal(r.plan.types[0].count >= 1,true);
  assert.equal(r.plan.types[0].count <= 2,true);
  assert.equal(r.plan.types[1].count <= 2,true);
});

test("priority optimization can differ from maximum headcount", () => {
  const plan = {
    budget: 60,
    types: [
      {id:"a",name:"A",cost:10,baseline:0,count:0,min:0,max:6,priority:1,lock:"none",lockedSpend:0},
      {id:"b",name:"B",cost:30,baseline:0,count:0,min:0,max:2,priority:10,lock:"none",lockedSpend:0}
    ]
  };
  assert.equal(optimize(plan,"headcount").plan.types[0].count,6);
  assert.equal(optimize(plan,"priority").plan.types[1].count,2);
});

test("impossible constraints fail clearly", () => {
  const plan = legacyTwoTypePlan();
  plan.budget = 100;
  plan.types[0].lock = "headcount";
  assert.throws(() => optimize(plan,"balanced"), /exceed the budget/);
  plan.types[0].min = 500;
  assert.throws(() => optimize(plan,"headcount"), /conflicts|exceed the budget/);
});

test("rejects duplicate types and invalid inputs", () => {
  const plan = legacyTwoTypePlan();
  plan.types[1].id=plan.types[0].id;
  assert.throws(() => normalizePlan(plan), /unique identifiers/);
  plan.types[1].id="officers";
  plan.types[0].cost = 0;
  assert.throws(() => normalizePlan(plan), /cost per employee/);
});


test("fixed-budget slider trades unlocked positions and uses existing slack first", () => {
  const plan = legacyTwoTypePlan();
  const moved = adjust(plan, "accountants", 68, "trade");
  assert.equal(moved.plan.budget, 32500000);
  assert.deepEqual(moved.plan.types.map(t => t.count), [68, 63]);
  assert.equal(moved.summary.remaining, 0);
  assert.deepEqual(moved.changes.map(c => c.delta), [5, -2]);
  assert.equal(plan.types[0].count, 63, "input plan must remain unchanged");
});

test("reducing a role can backfill a higher-priority unlocked role", () => {
  const moved = adjust(legacyTwoTypePlan(), "accountants", 62, "trade");
  assert.deepEqual(moved.plan.types.map(t => t.count), [62, 67]);
  assert.equal(moved.summary.committed, moved.plan.budget);
});

test("budget-following slider preserves other roles and unallocated funds", () => {
  const plan = legacyTwoTypePlan();
  const increase = adjust(plan, "accountants", 68, "flex");
  assert.equal(increase.plan.budget, 33500000);
  assert.equal(increase.plan.types[1].count, 65);
  assert.equal(increase.summary.remaining, 400000);
  const decrease = adjust(plan, "accountants", 60, "flex");
  assert.equal(decrease.plan.budget, 31900000);
  assert.equal(decrease.plan.types[1].count, 65);
  assert.equal(decrease.summary.remaining, 400000);
});

test("position locks and spending locks are never changed by sliders", () => {
  const plan = legacyTwoTypePlan();
  plan.types[0].lock = "headcount";
  const moved = adjust(plan, "officers", 67, "trade");
  assert.equal(moved.plan.types[0].count, 63);
  assert.equal(moved.actual, 66, "requested level must be limited");
  assert.equal(moved.summary.remaining, 100000);
  assert.throws(() => adjust(plan, "accountants", 64, "trade"), /Unlock/);

  const funding = legacyTwoTypePlan();
  funding.types[0].lock = "spend";
  funding.types[0].lockedSpend = 12500000;
  const changed = adjust(funding, "officers", 68, "trade");
  assert.equal(changed.plan.types[0].lockedSpend, 12500000);
  assert.equal(changed.plan.types[0].lock, "spend");
  assert.ok(changed.summary.committed <= funding.budget);
});

test("slider respects minimums, maximums, and whole-person counts", () => {
  const plan = legacyTwoTypePlan();
  plan.types[0].min = 62;
  plan.types[0].max = 64;
  const capped = adjust(plan, "accountants", 1000, "trade");
  assert.equal(capped.plan.types[0].count, 64);
  assert.ok(capped.summary.committed <= plan.budget);
  const floor = adjust(plan, "accountants", 0, "trade");
  assert.equal(floor.plan.types[0].count, 62);
  assert.throws(() => adjust(plan,"accountants", 63.5, "trade"), /whole number/);
});

test("public visual interface keeps assumptions collapsed and provides accessible locks", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const html = fs.readFileSync(path.join(__dirname, "../employees/index.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "../employees/app.js"), "utf8");
  assert.match(html, /<details class="panel settings-panel" id="settings-panel">/);
  assert.match(html, /id="mode-trade"/);
  assert.match(html, /id="mode-flex"/);
  assert.match(html, /id="headcount-donut"/);
  assert.match(html, /id="baseline-bars"/);
  assert.match(html, /id="budget-meter"/);
  assert.match(script, /aria-pressed/);
  assert.match(script, /pointerdown/);
  assert.match(html, /<script src="\.\/logic\.js\?v=3" defer>/);
});
