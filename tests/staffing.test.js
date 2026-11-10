const test = require("node:test");
const assert = require("node:assert/strict");
const { defaultPlan, normalizePlan, summarize, optimize, countFor } = require("../employees/logic.js");

test("starter scenario preserves whole-person staffing arithmetic", () => {
  const plan = normalizePlan(defaultPlan());
  const sum = summarize(plan);
  assert.equal(sum.totalCount, 128);
  assert.equal(sum.payroll, 32100000);
  assert.equal(sum.remaining, 400000);
});

test("locked headcounts remain fixed through optimization", () => {
  const plan = defaultPlan();
  plan.types[0].lock = "headcount";
  const result = optimize(plan, "headcount");
  assert.equal(result.plan.types[0].count, 63);
  assert.ok(result.summary.committed <= plan.budget);
  assert.equal(result.summary.totalCount, 129);
});

test("funding locks reserve the entire amount, not just payroll", () => {
  const plan = defaultPlan();
  plan.types[0].lock = "spend";
  plan.types[0].lockedSpend = 12900000;
  const result = optimize(plan, "utilization");
  assert.equal(countFor(result.plan.types[0]), 64);
  assert.equal(result.summary.reservedRemainder, 100000);
  assert.ok(result.summary.committed <= plan.budget);
});

test("role minimums, maximums and exact optimizer are respected", () => {
  const plan = {
    budget: 35,
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
  const plan = defaultPlan();
  plan.budget = 100;
  assert.throws(() => optimize(plan,"balanced"), /exceed the budget/);
  plan.types[0].min = 500;
  assert.throws(() => optimize(plan,"headcount"), /exceed the budget/);
});

test("rejects duplicate types and invalid inputs", () => {
  const plan = defaultPlan();
  plan.types[1].id=plan.types[0].id;
  assert.throws(() => normalizePlan(plan), /unique identifiers/);
  plan.types[1].id="officers";
  plan.types[0].cost = 0;
  assert.throws(() => normalizePlan(plan), /cost per employee/);
});
