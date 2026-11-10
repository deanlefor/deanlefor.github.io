/* Employee allocation math. No network, no DOM, no external dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StaffingLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MODES = ["balanced", "priority", "headcount", "utilization"];
  const LOCKS = ["none", "headcount", "spend"];
  const MAX_TYPES = 30;
  const MAX_COUNT = 1000000;
  const MAX_BUDGET = 1000000000000;

  function integer(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const r = a % b; a = b; b = r; }
    return a;
  }
  function money(value) { return Math.round(Number(value) || 0); }
  function countFor(type) {
    if (type.lock === "spend") {
      return type.cost > 0 ? Math.floor(type.lockedSpend / type.cost) : 0;
    }
    return type.count;
  }
  function committedFor(type) {
    return type.lock === "spend" ? type.lockedSpend : countFor(type) * type.cost;
  }
  function defaultPlan() {
    return {
      budget: 32500000,
      types: [
        { id: "accountants", name: "Accountants", cost: 200000, baseline: 63, count: 63, min: 0, max: null, priority: 4, lock: "none", lockedSpend: 0 },
        { id: "officers", name: "Police officers", cost: 300000, baseline: 65, count: 65, min: 0, max: null, priority: 5, lock: "none", lockedSpend: 0 }
      ]
    };
  }
  function normalizePlan(input) {
    if (!input || !Array.isArray(input.types) || input.types.length < 1 || input.types.length > MAX_TYPES) throw new Error("Use between 1 and 30 employee types.");
    const budget = integer(input.budget, NaN);
    if (!Number.isSafeInteger(budget) || budget < 0 || budget > MAX_BUDGET) throw new Error("Enter a valid total budget.");
    const ids = new Set();
    const types = input.types.map(function (item, index) {
      const name = String(item.name == null ? "" : item.name).trim().slice(0, 64);
      const id = String(item.id == null ? "type-" + index : item.id).slice(0, 100);
      const cost = integer(item.cost, NaN);
      const count = integer(item.count, NaN);
      const baseline = integer(item.baseline, NaN);
      const min = integer(item.min == null ? 0 : item.min, NaN);
      const max = item.max == null || item.max === "" ? null : integer(item.max, NaN);
      const priority = integer(item.priority, NaN);
      const lock = LOCKS.includes(item.lock) ? item.lock : "none";
      const lockedSpend = integer(item.lockedSpend == null ? 0 : item.lockedSpend, NaN);
      if (!name) throw new Error("Each employee type needs a name.");
      if (!id || ids.has(id)) throw new Error("Employee types must have unique identifiers.");
      ids.add(id);
      if (!Number.isSafeInteger(cost) || cost < 1 || cost > MAX_BUDGET) throw new Error(name + ": cost per employee must be positive.");
      if (![count, baseline, min].every(function (n) { return Number.isSafeInteger(n) && n >= 0 && n <= MAX_COUNT; })) throw new Error(name + ": headcounts must be nonnegative whole numbers.");
      if (max !== null && (!Number.isSafeInteger(max) || max < min || max > MAX_COUNT)) throw new Error(name + ": maximum must be at least the minimum.");
      if (!Number.isInteger(priority) || priority < 1 || priority > 10) throw new Error(name + ": priority must be 1–10.");
      if (!Number.isSafeInteger(lockedSpend) || lockedSpend < 0 || lockedSpend > MAX_BUDGET) throw new Error(name + ": reserved funds are invalid.");
      return { id, name, cost, baseline, count, min, max, priority, lock, lockedSpend };
    });
    return { budget, types };
  }
  function summarize(plan) {
    let payroll = 0, committed = 0, baselinePayroll = 0, totalCount = 0, baselineCount = 0, reservedRemainder = 0;
    const rows = plan.types.map(function (type) {
      const count = countFor(type);
      const rowPayroll = count * type.cost;
      const obligation = committedFor(type);
      const remainder = obligation - rowPayroll;
      payroll += rowPayroll;
      committed += obligation;
      baselinePayroll += type.baseline * type.cost;
      totalCount += count;
      baselineCount += type.baseline;
      reservedRemainder += remainder;
      return { id: type.id, name: type.name, count, payroll: rowPayroll, commitment: obligation, reservedRemainder: remainder, delta: count - type.baseline };
    });
    const issues = [];
    for (let i = 0; i < plan.types.length; i++) {
      const type = plan.types[i], count = rows[i].count;
      if (count < type.min || (type.max !== null && count > type.max)) issues.push(type.name + " is outside its minimum/maximum limits.");
    }
    if (committed > plan.budget) issues.push("This allocation exceeds the budget.");
    return { rows, payroll, committed, baselinePayroll, totalCount, baselineCount, reservedRemainder, remaining: plan.budget - committed, issues };
  }
  function candidateTypes(types, available) {
    return types.map(function (type, index) {
      const maxExtra = type.max === null ? MAX_COUNT - type.min : type.max - type.min;
      return { index, cost: type.cost, priority: type.priority, maxExtra: Math.max(0, Math.min(maxExtra, Math.floor(available / type.cost))) };
    }).filter(function (t) { return t.maxExtra > 0; });
  }
  function exactAllocate(candidates, available, mode) {
    const divisor = candidates.reduce(function (a, t) { return gcd(a, t.cost); }, 0);
    if (!divisor) return { counts: {}, exact: true };
    const capacity = Math.floor(available / divisor);
    const chunks = [];
    candidates.forEach(function (t) {
      let n = t.maxExtra, power = 1;
      while (n > 0) {
        const qty = Math.min(power, n);
        chunks.push({ index: t.index, qty, cost: (t.cost / divisor) * qty, priority: t.priority * qty });
        n -= qty;
        power *= 2;
      }
    });
    if (capacity > 60000 || capacity * chunks.length > 4500000) return null;
    const primary = new Float64Array(capacity + 1);
    const secondary = new Float64Array(capacity + 1);
    const trace = new Int32Array(capacity + 1);
    primary.fill(-Infinity);
    secondary.fill(-Infinity);
    trace.fill(-1);
    primary[0] = 0;
    secondary[0] = 0;
    // Immutable linked traces avoid invalid backtracking after a DP state is overwritten.
    const parents = [], selected = [];
    let tooMany = false;
    for (let j = 0; j < chunks.length && !tooMany; j++) {
      const item = chunks[j];
      const pValue = mode === "priority" ? item.priority : mode === "headcount" ? item.qty : item.cost;
      const sValue = mode === "utilization" ? item.priority : item.cost;
      for (let b = capacity; b >= item.cost; b--) {
        if (primary[b - item.cost] === -Infinity) continue;
        const p = primary[b - item.cost] + pValue;
        const s = secondary[b - item.cost] + sValue;
        if (p > primary[b] || (p === primary[b] && s > secondary[b])) {
          if (parents.length >= 1000000) { tooMany = true; break; }
          parents.push(trace[b - item.cost]);
          selected.push(j);
          trace[b] = parents.length - 1;
          primary[b] = p;
          secondary[b] = s;
        }
      }
    }
    if (tooMany) return null;
    let best = 0;
    for (let b = 1; b <= capacity; b++) {
      if (primary[b] > primary[best] || (primary[b] === primary[best] && secondary[b] > secondary[best])) best = b;
    }
    const counts = {};
    let node = trace[best];
    while (node !== -1) {
      const chunk = chunks[selected[node]];
      counts[chunk.index] = (counts[chunk.index] || 0) + chunk.qty;
      node = parents[node];
    }
    return { counts, exact: true };
  }
  function greedyAllocate(candidates, available, mode) {
    const counts = {};
    let left = available;
    const list = candidates.slice();
    if (mode === "utilization") list.sort(function (a, b) { return b.cost - a.cost; });
    else list.sort(function (a, b) {
      const aa = (mode === "priority" ? a.priority : 1) / a.cost;
      const bb = (mode === "priority" ? b.priority : 1) / b.cost;
      return bb - aa || a.cost - b.cost;
    });
    list.forEach(function (t) {
      const count = Math.min(t.maxExtra, Math.floor(left / t.cost));
      counts[t.index] = count;
      left -= count * t.cost;
    });
    return { counts, exact: false };
  }
  function balancedAllocate(candidates, available) {
    const counts = {};
    let left = available;
    const totalWeight = candidates.reduce(function (sum, t) { return sum + t.priority; }, 0);
    candidates.forEach(function (t) {
      const budgetShare = available * (t.priority / totalWeight);
      const qty = Math.min(t.maxExtra, Math.floor(budgetShare / t.cost));
      counts[t.index] = qty;
      left -= qty * t.cost;
    });
    let iterations = 0;
    while (iterations++ < 50000) {
      const choices = candidates.filter(function (t) { return counts[t.index] < t.maxExtra && t.cost <= left; });
      if (!choices.length) break;
      choices.sort(function (a, b) {
        const ratioA = counts[a.index] * a.cost / a.priority;
        const ratioB = counts[b.index] * b.cost / b.priority;
        return ratioA - ratioB || b.priority - a.priority || a.cost - b.cost;
      });
      const item = choices[0];
      counts[item.index] += 1;
      left -= item.cost;
    }
    return { counts, exact: false };
  }
  function optimize(plan, mode) {
    if (!MODES.includes(mode)) throw new Error("Choose a valid optimization goal.");
    const p = normalizePlan(plan);
    let fixed = 0;
    const unlocked = [];
    p.types.forEach(function (t, index) {
      if (t.lock !== "none") {
        const n = countFor(t);
        if (n < t.min || (t.max !== null && n > t.max)) throw new Error(t.name + ": locked staffing conflicts with its minimum or maximum.");
        fixed += committedFor(t);
        t.count = n;
      } else {
        t.count = t.min;
        fixed += t.min * t.cost;
        unlocked.push(Object.assign({ index }, t));
      }
    });
    if (fixed > p.budget) throw new Error("Locked funds and minimum staffing exceed the budget. Release a lock or reduce a minimum.");
    const available = p.budget - fixed;
    const candidates = candidateTypes(unlocked, available).map(function (entry) {
      return Object.assign(entry, { index: unlocked[entry.index].index });
    });
    let allocation;
    if (mode === "balanced") allocation = balancedAllocate(candidates, available);
    else allocation = exactAllocate(candidates, available, mode) || greedyAllocate(candidates, available, mode);
    Object.keys(allocation.counts).forEach(function (index) {
      p.types[Number(index)].count += allocation.counts[index];
    });
    return { plan: p, summary: summarize(p), exact: allocation.exact, mode };
  }
  return { MODES, LOCKS, MAX_TYPES, defaultPlan, normalizePlan, countFor, committedFor, summarize, optimize, money, clamp };
});
