(function () {
  "use strict";
  const L = window.StaffingLogic;
  const KEY = "workforce-allocation-studio:v1";
  const COLORS = ["#4bd2bd", "#8ca7ff", "#f5b96e", "#df94db", "#8fd3a4", "#e99292", "#86cde8", "#e4d17b"];
  const EXPLANATIONS = {
    balanced: "Spread flexible funding by priority weights. This is a heuristic, not a mathematical optimum.",
    priority: "Maximize the sum of employee headcounts multiplied by their priority weights.",
    headcount: "Maximize the number of people the budget can fund. This may favor less expensive roles.",
    utilization: "Minimize unallocated money, breaking ties by priority. This does not guarantee better service."
  };
  const $ = id => document.getElementById(id);
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const number = n => formatter.format(n);
  const dollars = n => "$" + formatter.format(Math.round(n));
  const shortMoney = value => {
    const sign = value < 0 ? "−" : "";
    const n = Math.abs(value);
    return sign + "$" + (n >= 1000000
      ? (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2) + "M"
      : n >= 1000
        ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K"
        : number(Math.round(n)));
  };
  const copy = x => JSON.parse(JSON.stringify(x));
  const freshId = () => "role-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  let state = { plan: L.defaultPlan(), scenarios: [], mode: "trade" };
  let lastMove = null;
  let lastRecommendation = "";
  let storageOK = true;
  const cardRefs = new Map();

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const colored = (node, color) => { node.style.setProperty("--role-color", color); return node; };
  const icon = locked => locked
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0"/><path d="M16 7V4"/></svg>';
  const roleColor = index => COLORS[index % COLORS.length];

  function storageWarning() {
    $("storage-warning").hidden = storageOK;
    $("storage-warning").textContent = storageOK ? "" : "Local storage is unavailable or full. Export a backup before leaving this page.";
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, plan: state.plan, scenarios: state.scenarios, mode: state.mode }));
      storageOK = true;
    } catch (_) {
      storageOK = false;
    }
    storageWarning();
  }
  function restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.version !== 1 || !Array.isArray(saved.scenarios) || saved.scenarios.length > 25) throw new Error("Invalid saved format.");
      const plan = L.normalizePlan(saved.plan);
      const scenarios = saved.scenarios.map(item => ({
        id: String(item.id).slice(0, 100),
        name: String(item.name).slice(0, 60),
        plan: L.normalizePlan(item.plan)
      }));
      state = { plan, scenarios, mode: saved.mode === "flex" ? "flex" : "trade" };
    } catch (_) {
      storageOK = false;
    }
    storageWarning();
  }

  function applyEdit(mutator, options = {}) {
    const previous = copy(state.plan);
    try {
      mutator(state.plan);
      state.plan = L.normalizePlan(state.plan);
      lastMove = null;
      lastRecommendation = "";
      persist();
      renderAll();
      if (options.revealSettings) $("settings-panel").open = true;
    } catch (error) {
      state.plan = previous;
      alert(error.message);
      renderAll();
    }
  }
  function edit(id, prop, input, numeric = true) {
    const raw = input.value;
    let value = numeric ? Number(raw) : raw;
    if (prop === "max" && raw.trim() === "") value = null;
    applyEdit(plan => {
      const type = plan.types.find(t => t.id === id);
      if (!type) throw new Error("Employee type not found.");
      type[prop] = value;
    });
  }
  function makeField(labelText, value, type, onChange, props = {}) {
    const label = el("label");
    label.append(el("span", "", labelText));
    const control = document.createElement(type === "select" ? "select" : "input");
    if (type === "select") {
      props.options.forEach(([v, name]) => {
        const option = el("option", "", name);
        option.value = v;
        control.append(option);
      });
    } else {
      control.type = type;
      if (props.min != null) control.min = props.min;
      if (props.max != null) control.max = props.max;
      if (props.step != null) control.step = props.step;
      if (props.placeholder) control.placeholder = props.placeholder;
      if (props.maxLength) control.maxLength = props.maxLength;
    }
    control.value = value == null ? "" : String(value);
    control.addEventListener("change", () => onChange(control));
    label.append(control);
    return label;
  }
  function renderSettings() {
    $("budget-input").value = state.plan.budget / 1000000;
    $("type-count").textContent = state.plan.types.length;
    $("add-type").disabled = state.plan.types.length >= L.MAX_TYPES;
    const root = $("settings-role-list");
    root.replaceChildren();
    state.plan.types.forEach((type, index) => {
      const item = el("div", "settings-role-card");
      const top = el("div", "settings-role-top");
      const heading = colored(el("strong", "settings-role-name", type.name), roleColor(index));
      const remove = el("button", "remove-type", "Remove");
      remove.type = "button";
      remove.disabled = state.plan.types.length === 1;
      remove.setAttribute("aria-label", "Remove " + type.name);
      remove.addEventListener("click", () => {
        if (confirm("Remove “" + type.name + "” from the current plan? Existing scenarios will be retained.")) {
          applyEdit(plan => { plan.types = plan.types.filter(t => t.id !== type.id); });
        }
      });
      top.append(heading, remove);
      const fields = el("div", "settings-fields");
      fields.append(
        makeField("Employee type", type.name, "text", input => edit(type.id, "name", input, false), { maxLength: 64 }),
        makeField("Cost per position ($)", type.cost, "number", input => edit(type.id, "cost", input), { min: 1, step: 1 }),
        makeField("Positions today", type.baseline, "number", input => edit(type.id, "baseline", input), { min: 0, step: 1 }),
        makeField("Positions now", L.countFor(type), "number", input => setCount(type.id, Number(input.value)), { min: 0, step: 1 }),
        makeField("Priority (1–10)", type.priority, "number", input => edit(type.id, "priority", input), { min: 1, max: 10, step: 1 }),
        makeField("Minimum positions", type.min, "number", input => edit(type.id, "min", input), { min: 0, step: 1 }),
        makeField("Maximum positions", type.max, "number", input => edit(type.id, "max", input), { min: 0, step: 1, placeholder: "No maximum" }),
        makeField("Constraint", type.lock, "select", input => {
          applyEdit(plan => {
            const t = plan.types.find(x => x.id === type.id);
            if (input.value === "spend" && t.lock !== "spend") t.lockedSpend = L.countFor(t) * t.cost;
            if (input.value === "headcount") t.count = L.countFor(t);
            t.lock = input.value;
          });
        }, { options: [["none","Flexible"], ["headcount","Lock positions"], ["spend","Lock dollar allocation"]] })
      );
      if (type.lock === "spend") fields.append(makeField("Reserved allocation ($)", type.lockedSpend, "number", input => edit(type.id, "lockedSpend", input), { min: 0, step: 1 }));
      item.append(top, fields);
      root.append(item);
    });
  }

  function createRoleCards() {
    const root = $("role-cards");
    root.replaceChildren();
    cardRefs.clear();
    state.plan.types.forEach((type, index) => {
      const card = colored(el("article", "allocation-card"), roleColor(index));
      const top = el("div", "card-top");
      const heading = el("div", "card-heading");
      heading.append(el("div", "card-swatch"));
      const text = el("div");
      text.append(el("h3", "card-title", type.name));
      const subtitle = el("p", "card-subtitle");
      text.append(subtitle);
      heading.append(text);
      const lock = el("button", "lock-button");
      lock.type = "button";
      lock.addEventListener("click", () => {
        applyEdit(plan => {
          const t = plan.types.find(x => x.id === type.id);
          if (t.lock !== "none") { t.lock = "none"; }
          else { t.lock = "headcount"; t.count = L.countFor(t); }
        });
      });
      top.append(heading, lock);
      const main = el("div", "card-main");
      const count = document.createElement("input");
      count.className = "count-input";
      count.type = "number";
      count.min = "0";
      count.step = "1";
      count.inputMode = "numeric";
      count.setAttribute("aria-label", type.name + " headcount");
      count.addEventListener("change", () => setCount(type.id, Number(count.value)));
      main.append(count, el("span", "count-label", "people"));
      const visual = el("div", "role-visual");
      visual.setAttribute("aria-hidden", "true");
      const fill = el("div", "role-bar");
      const marker = el("div", "baseline-mark");
      visual.append(fill, marker);
      const sliderRow = el("div", "role-slider");
      const minus = el("button", "role-step", "−");
      minus.type = "button";
      minus.setAttribute("aria-label", "Decrease " + type.name);
      const slider = document.createElement("input");
      slider.type = "range";
      slider.step = "1";
      slider.setAttribute("aria-label", "Adjust " + type.name + " positions");
      const plus = el("button", "role-step", "+");
      plus.type = "button";
      plus.setAttribute("aria-label", "Increase " + type.name);
      minus.addEventListener("click", () => setCount(type.id, L.countFor(currentType(type.id)) - 1));
      plus.addEventListener("click", () => setCount(type.id, L.countFor(currentType(type.id)) + 1));
      let dragBase = null;
      slider.addEventListener("pointerdown", () => { dragBase = copy(state.plan); });
      slider.addEventListener("input", () => {
        if (!dragBase) dragBase = copy(state.plan);
        moveFromBase(type.id, Number(slider.value), dragBase, false);
      });
      slider.addEventListener("change", () => {
        if (!dragBase) dragBase = copy(state.plan);
        moveFromBase(type.id, Number(slider.value), dragBase, true);
        dragBase = null;
      });
      slider.addEventListener("pointercancel", () => { dragBase = null; });
      sliderRow.append(minus, slider, plus);
      const footer = el("div", "role-footer");
      const delta = el("span", "delta");
      const cost = el("span");
      footer.append(delta, cost);
      const warning = el("p", "role-warning");
      card.append(top, main, visual, sliderRow, footer, warning);
      root.append(card);
      cardRefs.set(type.id, { card, subtitle, lock, count, fill, marker, slider, plus, minus, delta, cost, warning });
    });
  }
  function currentType(id) { return state.plan.types.find(t => t.id === id); }
  function setCount(id, target) {
    moveFromBase(id, target, state.plan, true);
  }
  function moveFromBase(id, requested, base, commit) {
    try {
      const result = L.adjust(base, id, requested, state.mode);
      state.plan = result.plan;
      lastMove = { ...result, source: "slider", roleId: id };
      lastRecommendation = "";
      updateBoard();
      if (commit) {
        persist();
        renderSettings();
      }
    } catch (error) {
      if (commit) alert(error.message);
      updateBoard();
    }
  }
  function syncRoleCards() {
    state.plan.types.forEach((type, index) => {
      const refs = cardRefs.get(type.id);
      if (!refs) return;
      const count = L.countFor(type);
      const locked = type.lock !== "none";
      const rangeMax = Math.min(
        type.max == null ? 1000000 : type.max,
        Math.max(count + 20, type.baseline * 2 + 10, Math.floor(state.plan.budget / type.cost) + 10, 30)
      );
      const sliderMax = Math.max(type.min, count, rangeMax);
      refs.count.value = count;
      refs.count.disabled = locked;
      refs.count.min = type.min;
      if (type.max != null) refs.count.max = type.max;
      else refs.count.removeAttribute("max");
      refs.subtitle.textContent = (locked ? "Protected · " : "") + shortMoney(type.cost) + " per position";
      refs.lock.innerHTML = icon(locked);
      refs.lock.classList.toggle("is-locked", locked);
      refs.lock.setAttribute("aria-pressed", String(locked));
      refs.lock.setAttribute("aria-label", locked ? "Unlock " + type.name + (type.lock === "spend" ? " funding" : " headcount") : "Lock " + type.name + " headcount");
      refs.lock.title = locked ? (type.lock === "spend" ? "Funding reserved · select to unlock" : "Positions locked · select to unlock") : "Lock headcount";
      refs.slider.min = String(type.min);
      refs.slider.max = String(sliderMax);
      refs.slider.value = String(count);
      refs.slider.disabled = locked;
      refs.minus.disabled = locked || count <= type.min;
      refs.plus.disabled = locked || (type.max !== null && count >= type.max) || count >= 1000000;
      const scale = Math.max(1, count, type.baseline) * 1.12;
      refs.fill.style.width = (100 * count / scale) + "%";
      refs.marker.style.left = (100 * type.baseline / scale) + "%";
      const delta = count - type.baseline;
      refs.delta.textContent = delta === 0 ? "Same as today" : (delta > 0 ? "+" : "−") + number(Math.abs(delta)) + " vs today";
      refs.cost.textContent = shortMoney(count * type.cost);
      if (type.lock === "spend") refs.warning.textContent = "Locked to " + shortMoney(type.lockedSpend) + " in funding" + (type.lockedSpend % type.cost ? " (" + shortMoney(type.lockedSpend % type.cost) + " unused)" : "");
      else if (count < type.min || (type.max !== null && count > type.max)) refs.warning.textContent = "Outside this role's staffing limits. Edit assumptions.";
      else refs.warning.textContent = "";
    });
  }
  function renderDonut() {
    const summary = L.summarize(state.plan);
    const total = summary.totalCount;
    let offset = 0;
    const stops = [];
    const labels = [];
    const legend = $("mix-legend");
    legend.replaceChildren();
    summary.rows.forEach((row, index) => {
      const color = roleColor(index);
      const portion = total ? row.count / total * 100 : 0;
      if (portion > 0) {
        stops.push(color + " " + offset + "% " + (offset + portion) + "%");
        offset += portion;
      }
      const item = el("div", "mix-legend-item");
      colored(item, color);
      item.append(el("span", "legend-dot"), el("span", "legend-name", row.name), el("strong", "", number(row.count)));
      legend.append(item);
      labels.push(row.name + ": " + row.count);
    });
    const donut = $("headcount-donut");
    donut.style.background = stops.length ? "conic-gradient(" + stops.join(",") + ")" : "#39495d";
    donut.setAttribute("aria-label", "Current staffing: " + labels.join("; "));
    $("total-staff").textContent = number(total);
    const delta = total - summary.baselineCount;
    $("staff-delta").textContent = delta === 0 ? "Same as today" : (delta > 0 ? "+" : "−") + number(Math.abs(delta)) + " vs today";
  }
  function renderBudget() {
    const summary = L.summarize(state.plan);
    $("budget-total").textContent = shortMoney(state.plan.budget);
    $("budget-balance").textContent = shortMoney(Math.abs(summary.remaining));
    $("budget-balance").style.color = summary.remaining < 0 ? "var(--danger)" : "var(--teal)";
    $("balance-caption").textContent = summary.remaining < 0 ? "Over budget" : "Still available";
    const meter = $("budget-meter"), legend = $("budget-legend");
    meter.replaceChildren();
    legend.replaceChildren();
    const scale = Math.max(1, state.plan.budget, summary.committed);
    const add = (title, value, color) => {
      if (value <= 0) return;
      const bar = el("span");
      bar.style.width = (value / scale * 100) + "%";
      bar.style.backgroundColor = color;
      bar.title = title + ": " + dollars(value);
      meter.append(bar);
      const item = el("span", "legend-item");
      const sw = el("i", "legend-swatch");
      sw.style.backgroundColor = color;
      item.append(sw, document.createTextNode(title + " " + shortMoney(value)));
      legend.append(item);
    };
    summary.rows.forEach((row, index) => add(row.name, row.payroll, roleColor(index)));
    add("Reserved, not staffed", summary.reservedRemainder, "#e8bd6f");
    add("Unallocated", Math.max(0, summary.remaining), "#657286");
    const issues = summary.issues;
    $("budget-warning").textContent = issues.length ? issues.join(" ") : "";
    const parts = summary.rows.map(row => row.name + ": " + dollars(row.payroll));
    parts.push("Unallocated: " + dollars(Math.max(0, summary.remaining)));
    meter.setAttribute("aria-label", "Budget of " + dollars(state.plan.budget) + "; " + parts.join("; "));
  }
  function renderImpact() {
    const summary = L.summarize(state.plan);
    const story = $("move-story");
    const note = $("move-note");
    if (!lastMove) {
      story.textContent = summary.totalCount === summary.baselineCount
        ? "Move a staffing slider to see exactly what changes."
        : "This mix has " + number(summary.totalCount) + " positions, compared with " + number(summary.baselineCount) + " today.";
      note.textContent = "Today's staffing is the reference for the bars below.";
    } else if (lastMove.source === "optimizer") {
      story.textContent = "Alternative generated. The workforce mix has been recalculated.";
      note.textContent = lastRecommendation;
    } else {
      const changed = lastMove.changes || [];
      story.textContent = changed.length
        ? changed.map(c => (c.delta > 0 ? "+" : "−") + number(Math.abs(c.delta)) + " " + c.name).join("  ·  ")
        : "No positions changed; available capacity or locks prevented the move.";
      note.textContent = lastMove.mode === "flex"
        ? (lastMove.budgetDelta === 0 ? "The annual budget is unchanged." : "Annual budget " + (lastMove.budgetDelta > 0 ? "increased " : "decreased ") + shortMoney(Math.abs(lastMove.budgetDelta))) + ". All other roles are unchanged."
        : "Budget held at " + shortMoney(state.plan.budget) + ". " + (lastMove.actual !== lastMove.requested ? "The requested level was limited by protected roles or minimums." : "Other unlocked positions adjust when necessary.");
    }
    const max = Math.max(1, ...state.plan.types.flatMap(t => [t.baseline, L.countFor(t)]));
    const root = $("baseline-bars");
    root.replaceChildren();
    state.plan.types.forEach((type, index) => {
      const count = L.countFor(type);
      const row = el("div", "baseline-row");
      colored(row, roleColor(index));
      row.append(el("span", "role-name", type.name));
      const track = el("div", "baseline-track");
      const today = el("div", "today-bar");
      const now = el("div", "now-bar");
      today.style.width = (type.baseline / max * 100) + "%";
      now.style.width = (count / max * 100) + "%";
      track.append(today, now);
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", type.name + ": " + number(count) + " now and " + number(type.baseline) + " today");
      row.append(track, el("strong", "role-value", number(count)));
      root.append(row);
    });
  }
  function visualSegments(parent, plan) {
    const summary = L.summarize(plan);
    const scale = Math.max(1, plan.budget, summary.committed);
    parent.replaceChildren();
    summary.rows.forEach((row, index) => {
      if (row.payroll <= 0) return;
      const part = el("span");
      part.style.width = (100 * row.payroll / scale) + "%";
      part.style.backgroundColor = roleColor(index);
      part.title = row.name + ": " + dollars(row.payroll);
      parent.append(part);
    });
    if (summary.reservedRemainder) {
      const reserved = el("span");
      reserved.style.width = (summary.reservedRemainder / scale * 100) + "%";
      reserved.style.backgroundColor = "#e8bd6f";
      parent.append(reserved);
    }
  }
  function renderScenarios() {
    const gallery = $("scenario-gallery");
    gallery.replaceChildren();
    $("scenario-empty").hidden = state.scenarios.length !== 0;
    $("save-scenario").disabled = state.scenarios.length >= 25;
    const currentTotal = L.summarize(state.plan).totalCount;
    state.scenarios.forEach(s => {
      const summary = L.summarize(s.plan);
      const tile = el("article", "scenario-tile");
      tile.append(el("div", "scenario-name", s.name));
      const amounts = el("div", "scenario-amounts");
      const people = el("span");
      people.append(el("small", "", "People"), el("strong", "", number(summary.totalCount)));
      const budget = el("span");
      budget.append(el("small", "", "Budget"), el("strong", "", shortMoney(s.plan.budget)));
      amounts.append(people, budget);
      tile.append(amounts);
      const chart = el("div", "scenario-visual");
      chart.setAttribute("role", "img");
      chart.setAttribute("aria-label", s.name + ": " + number(summary.totalCount) + " people, " + shortMoney(summary.committed) + " of " + shortMoney(s.plan.budget) + " committed");
      visualSegments(chart, s.plan);
      tile.append(chart);
      const delta = summary.totalCount - currentTotal;
      tile.append(el("div", "scenario-note", (delta === 0 ? "Same total headcount" : (delta > 0 ? "+" : "−") + number(Math.abs(delta)) + " people vs current") + (s.plan.budget !== state.plan.budget ? " · Different budget" : " · Same budget")));
      const actions = el("div", "scenario-actions");
      const load = el("button", "", "Load mix");
      load.type = "button";
      load.addEventListener("click", () => {
        state.plan = copy(s.plan);
        lastMove = null;
        lastRecommendation = "";
        persist();
        renderAll();
      });
      const remove = el("button", "delete-button", "Delete");
      remove.type = "button";
      remove.addEventListener("click", () => {
        if (confirm("Delete scenario “" + s.name + "”?")) {
          state.scenarios = state.scenarios.filter(item => item.id !== s.id);
          persist();
          renderScenarios();
          renderComparison();
        }
      });
      actions.append(load, remove);
      tile.append(actions);
      gallery.append(tile);
    });
  }
  function renderComparison() {
    const slots = [{ name: "Current mix", plan: state.plan }, ...state.scenarios];
    const root = $("comparison-table");
    root.replaceChildren();
    const allNames = [...new Set(slots.flatMap(s => s.plan.types.map(t => t.name)))];
    $("comparison-note").textContent = state.scenarios.some(s => s.plan.budget !== state.plan.budget)
      ? "Some saved scenarios have different budgets. Differences in staffing are not necessarily cost-neutral."
      : "All saved scenarios currently have the same annual budget.";
    const table = el("table");
    const thead = el("thead");
    const head = el("tr");
    head.append(el("th", "", "Metric"));
    slots.forEach((slot, index) => head.append(el("th", index === 0 ? "current-column" : "", slot.name)));
    thead.append(head);
    table.append(thead);
    const body = el("tbody");
    function row(label, f) {
      const tr = el("tr");
      tr.append(el("td", "", label));
      slots.forEach((slot, i) => tr.append(el("td", i === 0 ? "current-column" : "", f(slot.plan))));
      body.append(tr);
    }
    allNames.forEach(name => row(name, plan => {
      const type = plan.types.find(t => t.name === name);
      return type ? number(L.countFor(type)) : "—";
    }));
    row("Total people", plan => number(L.summarize(plan).totalCount));
    row("Payroll", plan => shortMoney(L.summarize(plan).payroll));
    row("Reserved, unused", plan => shortMoney(L.summarize(plan).reservedRemainder));
    row("Unallocated balance", plan => shortMoney(L.summarize(plan).remaining));
    row("Annual budget", plan => shortMoney(plan.budget));
    table.append(body);
    root.append(table);
  }
  function updateBoard() {
    syncRoleCards();
    renderDonut();
    renderBudget();
    renderImpact();
    renderScenarios();
    renderComparison();
    $("budget-input").value = state.plan.budget / 1000000;
  }
  function renderAll() {
    $("mode-" + state.mode).checked = true;
    createRoleCards();
    renderSettings();
    updateBoard();
    $("objective-explanation").textContent = EXPLANATIONS[$("objective").value];
    $("optimization-result").textContent = lastRecommendation;
    storageWarning();
  }
  function download(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function quoteCsv(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }
  function exportComparison() {
    const slots = [{ name: "Current mix", plan: state.plan }, ...state.scenarios];
    const names = [...new Set(slots.flatMap(s => s.plan.types.map(t => t.name)))];
    const rows = [["Metric", ...slots.map(s => s.name)]];
    names.forEach(name => rows.push([name, ...slots.map(s => {
      const t = s.plan.types.find(x => x.name === name);
      return t ? L.countFor(t) : "";
    })]));
    [
      ["People", p => L.summarize(p).totalCount],
      ["Payroll", p => L.summarize(p).payroll],
      ["Reserved unused", p => L.summarize(p).reservedRemainder],
      ["Unallocated", p => L.summarize(p).remaining],
      ["Annual budget", p => p.budget]
    ].forEach(([title, f]) => rows.push([title, ...slots.map(s => f(s.plan))]));
    download("workforce-comparison.csv", rows.map(row => row.map(quoteCsv).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }

  document.querySelectorAll('input[name="budget-mode"]').forEach(radio => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      state.mode = radio.value;
      lastMove = null;
      persist();
      updateBoard();
    });
  });
  $("open-settings").addEventListener("click", () => {
    const target = $("settings-panel");
    target.open = true;
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  $("budget-input").addEventListener("change", function () {
    applyEdit(plan => { plan.budget = Math.round(Number(this.value) * 1000000); });
  });
  $("add-type").addEventListener("click", () => {
    applyEdit(plan => {
      plan.types.push({ id: freshId(), name: "New employee type", cost: 100000, baseline: 0, count: 0, min: 0, max: null, priority: 5, lock: "none", lockedSpend: 0 });
    }, { revealSettings: true });
  });
  $("objective").addEventListener("change", () => {
    $("objective-explanation").textContent = EXPLANATIONS[$("objective").value];
  });
  $("optimize-btn").addEventListener("click", () => {
    try {
      const before = state.plan;
      const result = L.optimize(state.plan, $("objective").value);
      state.plan = result.plan;
      const changes = state.plan.types.map(t => {
        const prior = before.types.find(x => x.id === t.id);
        return { id: t.id, name: t.name, delta: L.countFor(t) - L.countFor(prior) };
      }).filter(c => c.delta !== 0);
      lastRecommendation = (result.exact ? "Exact optimum for this objective. " : "Approximate recommendation, not a guaranteed optimum. ") +
        number(result.summary.totalCount) + " people and " + shortMoney(Math.abs(result.summary.remaining)) + " unallocated.";
      lastMove = { source: "optimizer", changes, budgetDelta: 0 };
      persist();
      renderAll();
    } catch (error) {
      $("optimization-result").textContent = error.message;
    }
  });
  $("restore-baseline").addEventListener("click", () => {
    applyEdit(plan => plan.types.forEach(t => { t.count = t.baseline; t.lock = "none"; t.lockedSpend = 0; }));
  });
  $("save-scenario").addEventListener("click", () => {
    if (state.scenarios.length >= 25) return;
    const input = $("scenario-name");
    const name = input.value.trim().slice(0, 60) || "Scenario " + (state.scenarios.length + 1);
    state.scenarios.push({ id: freshId(), name, plan: copy(state.plan) });
    input.value = "";
    persist();
    renderScenarios();
    renderComparison();
  });
  $("export-json").addEventListener("click", () => {
    download("workforce-allocation-backup.json", JSON.stringify({ version: 1, plan: state.plan, scenarios: state.scenarios, mode: state.mode }, null, 2), "application/json");
  });
  $("import-json").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async function () {
    const file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    if (file.size > 1000000) { alert("Backup exceeds the 1 MB import limit."); return; }
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.version !== 1 || !Array.isArray(parsed.scenarios) || parsed.scenarios.length > 25) throw new Error("Unsupported or invalid backup.");
      const plan = L.normalizePlan(parsed.plan);
      const scenarios = parsed.scenarios.map(s => ({
        id: String(s.id).slice(0, 100),
        name: String(s.name).slice(0, 60),
        plan: L.normalizePlan(s.plan)
      }));
      if (!confirm("Replace this browser's plan and saved scenarios? Export your current backup first if needed.")) return;
      state = { plan, scenarios, mode: parsed.mode === "flex" ? "flex" : "trade" };
      lastMove = null;
      lastRecommendation = "";
      persist();
      renderAll();
    } catch (error) {
      alert("Unable to import: " + error.message);
    }
  });
  $("export-csv").addEventListener("click", exportComparison);

  restore();
  renderAll();
})();
