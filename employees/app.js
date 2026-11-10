(function () {
  "use strict";
  const L = window.StaffingLogic;
  const KEY = "workforce-allocation-studio:v1";
  const COLORS = ["#4bd2bd","#8ca7ff","#f5b96e","#df94db","#8fd3a4","#e99292","#86cde8","#e4d17b"];
  const EXPLANATIONS = {
    balanced:"Spread flexible funding approximately by priority weights, while respecting minimum staffing. This is a balanced heuristic, not a mathematical optimum.",
    priority:"Maximize the sum of each employee type's priority weight multiplied by its headcount, subject to the budget and locks.",
    headcount:"Maximize total employees under the budget, using funds spent as the tie-breaker. This can strongly favor less expensive roles.",
    utilization:"Minimize unallocated funds, using priority weights to break ties. This does not guarantee the best workforce for your mission."
  };
  const $ = id => document.getElementById(id);
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const dollar = v => "$" + fmt.format(Math.round(v));
  const compact = v => {
    const sign = v < 0 ? "-" : "";
    v = Math.abs(v);
    return sign + "$" + (v >= 1000000 ? (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 2) + "M" : v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "K" : fmt.format(v));
  };
  const copy = x => JSON.parse(JSON.stringify(x));
  const freshId = () => "role-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  let state = { plan: L.defaultPlan(), scenarios: [] };
  let storageOK = true;
  let lastRecommendation = "";
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  function field(labelText, value, type, onChange, config = {}) {
    const label = el("label", "");
    label.append(el("span", "", labelText));
    const input = document.createElement(type === "select" ? "select" : "input");
    if (type === "select") {
      config.options.forEach(([v, labelText]) => {
        const option = el("option", "", labelText);
        option.value = v;
        input.append(option);
      });
    } else {
      input.type = type;
      if (config.min !== undefined) input.min = config.min;
      if (config.max !== undefined) input.max = config.max;
      if (config.step !== undefined) input.step = config.step;
      if (config.placeholder !== undefined) input.placeholder = config.placeholder;
    }
    input.value = value == null ? "" : String(value);
    input.addEventListener("change", () => onChange(input.value, input));
    label.append(input);
    return label;
  }
  function warnStorage() {
    const n = $("storage-warning");
    n.hidden = storageOK;
    n.textContent = "Browser storage is unavailable or full. Your changes are only in this tab; export a JSON backup before leaving.";
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, plan: state.plan, scenarios: state.scenarios })); storageOK = true; }
    catch (_) { storageOK = false; }
    warnStorage();
  }
  function restore() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.version !== 1) throw new Error("Unsupported saved format");
      const plan = L.normalizePlan(saved.plan);
      const scenarios = (Array.isArray(saved.scenarios) ? saved.scenarios : []).slice(0, 25).map(s => ({
        id: String(s.id).slice(0, 100),
        name: String(s.name).slice(0, 60),
        plan: L.normalizePlan(s.plan)
      }));
      state = { plan, scenarios };
    } catch (_) { storageOK = false; warnStorage(); }
  }
  function update(mutator, rebuildTypes = false) {
    const previous = copy(state.plan);
    try {
      mutator(state.plan);
      state.plan = L.normalizePlan(state.plan);
      lastRecommendation = "";
      persist();
      render(rebuildTypes);
    } catch (error) {
      state.plan = previous;
      alert(error.message);
      render(true);
    }
  }
  function editValue(typeId, prop, raw, number = true, rebuild = true) {
    const n = number ? Number(raw) : raw;
    update(plan => {
      const t = plan.types.find(item => item.id === typeId);
      if (!t) return;
      t[prop] = n;
    }, rebuild);
  }
  function makeTypeCard(type, index) {
    const c = el("article", "type-card");
    c.style.setProperty("--role-color", COLORS[index % COLORS.length]);
    const top = el("div", "type-top");
    const name = document.createElement("input");
    name.className = "type-name";
    name.type = "text";
    name.value = type.name;
    name.maxLength = 64;
    name.setAttribute("aria-label", "Employee type name");
    name.addEventListener("change", () => editValue(type.id, "name", name.value, false));
    const remove = el("button", "type-delete", "Remove");
    remove.type = "button";
    remove.disabled = state.plan.types.length < 2;
    remove.setAttribute("aria-label", "Remove " + type.name);
    remove.addEventListener("click", () => {
      if (confirm("Remove " + type.name + " from this plan? Saved scenarios will be kept.")) update(p => { p.types = p.types.filter(t => t.id !== type.id); }, true);
    });
    top.append(name, remove);
    c.append(top);

    const fields = el("div", "type-grid");
    fields.append(
      field("Cost per position ($)",type.cost,"number",v => editValue(type.id,"cost",v),{min:1,step:1}),
      field("Today's positions",type.baseline,"number",v => editValue(type.id,"baseline",v),{min:0,step:1}),
      field("Priority weight (1–10)",type.priority,"number",v => editValue(type.id,"priority",v),{min:1,max:10,step:1}),
      field("Minimum positions",type.min,"number",v => editValue(type.id,"min",v),{min:0,step:1}),
      field("Maximum positions",type.max == null ? "" : type.max,"number",v => editValue(type.id,"max",v === "" ? null : v),{min:0,step:1,placeholder:"No maximum"})
    );
    c.append(fields);

    const count = L.countFor(type);
    const sliderRow = el("div", "range-row");
    const minus = el("button", "step", "−");
    const plus = el("button", "step", "+");
    [minus,plus].forEach(b => b.type = "button");
    const range = document.createElement("input");
    range.type = "range";
    const maxByBudget = Math.floor(state.plan.budget / type.cost);
    range.min = "0";
    range.max = String(Math.max(count, type.max == null ? Math.min(2000, maxByBudget + 10) : Math.min(type.max, 1000000), 1));
    range.value = count;
    range.setAttribute("aria-label", type.name + " positions slider");
    const numberCount = document.createElement("input");
    numberCount.type = "number";
    numberCount.className = "number-count";
    numberCount.min = "0";
    numberCount.step = "1";
    numberCount.value = count;
    numberCount.setAttribute("aria-label", type.name + " positions");
    const locked = type.lock !== "none";
    range.disabled = locked;
    numberCount.disabled = locked;
    minus.disabled = locked || count <= 0;
    plus.disabled = locked;
    range.addEventListener("input", () => {
      numberCount.value = range.value;
      update(p => { p.types.find(t => t.id === type.id).count = Number(range.value); });
    });
    numberCount.addEventListener("change", () => editValue(type.id,"count",numberCount.value));
    minus.addEventListener("click", () => editValue(type.id,"count",Math.max(0,count-1)));
    plus.addEventListener("click", () => editValue(type.id,"count",count+1));
    sliderRow.append(minus,range,plus,numberCount);
    c.append(sliderRow);
    const bottom = el("div", "type-bottom");
    bottom.append(el("span", "", compact(count * type.cost) + " payroll"),el("span","", (count - type.baseline >= 0 ? "+" : "") + (count - type.baseline) + " vs today"));
    c.append(bottom);
    const locks = el("div","lock-panel");
    const selectLock = field("Lock constraint",type.lock,"select",v => {
      update(p => {
        const t = p.types.find(t => t.id === type.id);
        if (v === "spend" && t.lock !== "spend") t.lockedSpend = L.countFor(t) * t.cost;
        if (v === "headcount") t.count = L.countFor(t);
        t.lock = v;
      },true);
    },{options:[["none","Flexible positions"],["headcount","Lock headcount"],["spend","Lock funding ($)"]]});
    locks.append(selectLock);
    if(type.lock === "spend"){
      locks.append(field("Reserved funding ($)",type.lockedSpend,"number",v => editValue(type.id,"lockedSpend",v),{min:0,step:1}));
    } else {
      locks.append(el("div","lock-value",type.lock === "headcount" ? "Fixed at " + count + " positions" : "Free to adjust or optimize"));
    }
    c.append(locks);
    if(type.lock === "spend" && type.lockedSpend % type.cost !== 0) c.append(el("p","type-alert",compact(type.lockedSpend % type.cost) + " is reserved but cannot pay for a whole position."));
    if(count < type.min || (type.max !== null && count > type.max)) c.append(el("p","type-alert","Current staffing is outside the minimum/maximum. Adjust it or use the allocation assistant."));
    return c;
  }
  function renderTypes(){
    const container = $("types-list");
    container.replaceChildren();
    state.plan.types.forEach((type,i) => container.append(makeTypeCard(type,i)));
    $("type-count").textContent = state.plan.types.length;
    $("add-type").disabled = state.plan.types.length >= L.MAX_TYPES;
  }
  function renderOverview() {
    const p = state.plan, s = L.summarize(p);
    $("budget-input").value = p.budget / 1000000;
    $("stat-staff").textContent = fmt.format(s.totalCount);
    const delta = s.totalCount - s.baselineCount;
    $("stat-staff-change").textContent = (delta > 0 ? "+" : "") + delta + " vs today's staffing";
    $("stat-payroll").textContent = compact(s.payroll);
    $("stat-reserved").textContent = compact(s.reservedRemainder);
    $("stat-balance").textContent = compact(Math.abs(s.remaining));
    $("stat-balance-label").textContent = s.remaining < 0 ? "Over allocated" : "Available to allocate";
    $("stat-balance").style.color = s.remaining < 0 ? "var(--red)" : "var(--accent)";
    const portion = p.budget > 0 ? (100 * s.committed / p.budget) : 0;
    $("usage-percent").textContent = portion.toFixed(1) + "%";
    const meter = $("budget-meter"), legend = $("budget-legend");
    meter.replaceChildren(); legend.replaceChildren();
    s.rows.forEach((r,i) => {
      const pct = p.budget ? Math.max(0, r.payroll / p.budget * 100) : 0;
      const bar = el("span");
      bar.style.width = pct + "%"; bar.style.background = COLORS[i % COLORS.length];
      bar.title = r.name + ": " + dollar(r.payroll);
      meter.append(bar);
      const item = el("span", "legend-item");
      const swatch = el("i","legend-swatch"); swatch.style.background=COLORS[i % COLORS.length];
      item.append(swatch, document.createTextNode(r.name + " " + compact(r.payroll)));
      legend.append(item);
    });
    if(s.reservedRemainder > 0){
      const bar=el("span");bar.style.width=(p.budget ? s.reservedRemainder/p.budget*100 : 0)+"%";bar.style.background="#d9ac68";bar.title="Reserved but not spent";
      meter.append(bar);
      const item=el("span","legend-item");const sw=el("i","legend-swatch");sw.style.background="#d9ac68";item.append(sw,document.createTextNode("Reserved unused "+compact(s.reservedRemainder)));legend.append(item);
    }
    const status=$("status-text");
    status.className="status-text"+(s.issues.length?" error":"");
    status.textContent = s.issues.length ? s.issues.join(" ") : s.remaining === 0 ? "This mix uses the entire budget." : s.remaining > 0 ? compact(s.remaining) + " remains unallocated. Adjust positions or try an allocation objective." : "Budget overrun: " + compact(-s.remaining) + ". Reduce staffing or increase the budget.";
  }
  function scenarioSummary(plan){
    const s=L.summarize(plan);
    return fmt.format(s.totalCount)+" employees · "+compact(s.committed)+" committed · "+compact(plan.budget)+" budget";
  }
  function renderScenarios(){
    const list=$("scenario-list");list.replaceChildren();
    if(!state.scenarios.length) list.append(el("p","tiny-note","No saved scenarios yet."));
    state.scenarios.forEach(s=>{
      const entry=el("article","scenario-entry");
      entry.append(el("div","scenario-title",s.name),el("div","scenario-sub",scenarioSummary(s.plan)));
      const actions=el("div","scenario-actions");
      const load=el("button","","Load");
      load.addEventListener("click",()=>{state.plan=copy(s.plan);lastRecommendation="";persist();render(true);});
      const remove=el("button","remove","Delete");
      remove.addEventListener("click",()=>{if(confirm("Delete scenario “"+s.name+"”?")){state.scenarios=state.scenarios.filter(x=>x.id!==s.id);persist();render(false);}});
      actions.append(load,remove);entry.append(actions);list.append(entry);
    });
    $("save-scenario").disabled=state.scenarios.length>=25;
  }
  function renderComparison(){
    const slots=[{name:"Current plan",plan:state.plan},...state.scenarios];
    const note=$("comparison-note"), holder=$("comparison-table");
    holder.replaceChildren();
    note.textContent = state.scenarios.length ? "The table compares employee counts and commitments; saved scenarios retain their own budgets. Different budgets are flagged." : "Save at least one scenario to compare alternative mixes.";
    if(!state.scenarios.length) return;
    const allNames=[...new Set(slots.flatMap(s=>s.plan.types.map(t=>t.name)))];
    const table=el("table");const thead=el("thead");const hr=el("tr");
    hr.append(el("th","","Metric"));
    slots.forEach((s,i)=>{const th=el("th",i===0?"current-column":"",s.name);th.scope="col";hr.append(th);});
    thead.append(hr);table.append(thead);
    const tbody=el("tbody");
    const push=(name,getValue)=>{
      const tr=el("tr");tr.append(el("td","",name));slots.forEach((slot,i)=>tr.append(el("td",i===0?"current-column":"",getValue(slot.plan))));tbody.append(tr);
    };
    allNames.forEach(name=>push(name,p=>{const t=p.types.find(x=>x.name===name);return t?fmt.format(L.countFor(t)):"—";}));
    push("Total employees",p=>fmt.format(L.summarize(p).totalCount));
    push("Payroll",p=>compact(L.summarize(p).payroll));
    push("Reserved unused",p=>compact(L.summarize(p).reservedRemainder));
    push("Remaining budget",p=>compact(L.summarize(p).remaining));
    push("Annual budget",p=>compact(p.budget));
    table.append(tbody);holder.append(table);
    if(state.scenarios.some(s=>s.plan.budget!==state.plan.budget)) {
      note.textContent += " Note: some scenarios have different annual budgets; compare those outcomes cautiously.";
    }
  }
  function render(rebuildTypes=true){
    if(rebuildTypes)renderTypes();
    renderOverview();
    renderScenarios();
    renderComparison();
    $("objective-explanation").textContent=EXPLANATIONS[$("objective").value];
    $("optimization-result").textContent=lastRecommendation;
  }
  function download(name,content,mime){
    const blob=new Blob([content],{type:mime});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=name;
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  function csvEscape(value){
    const s=String(value);
    return '"' + s.replace(/"/g,'""') + '"';
  }
  function exportCsv(){
    const slots=[{name:"Current plan",plan:state.plan},...state.scenarios];
    const names=[...new Set(slots.flatMap(s=>s.plan.types.map(t=>t.name)))];
    const rows=[["Metric",...slots.map(s=>s.name)]];
    names.forEach(name=>rows.push([name,...slots.map(s=>{const t=s.plan.types.find(x=>x.name===name);return t?L.countFor(t):"";})]));
    [["Total employees",p=>L.summarize(p).totalCount],["Payroll",p=>L.summarize(p).payroll],["Reserved unused",p=>L.summarize(p).reservedRemainder],["Unallocated budget",p=>L.summarize(p).remaining],["Annual budget",p=>p.budget]].forEach(([name,fn])=>rows.push([name,...slots.map(s=>fn(s.plan))]));
    download("workforce-allocations.csv",rows.map(row=>row.map(csvEscape).join(",")).join("\r\n"),"text/csv;charset=utf-8");
  }
  $("budget-input").addEventListener("change",function(){
    update(p=>{p.budget=Math.round(Number(this.value)*1000000);},true);
  });
  $("add-type").addEventListener("click",()=>{
    update(p=>p.types.push({id:freshId(),name:"New employee type",cost:100000,baseline:0,count:0,min:0,max:null,priority:5,lock:"none",lockedSpend:0}),true);
  });
  $("objective").addEventListener("change",()=>{$("objective-explanation").textContent=EXPLANATIONS[$("objective").value];});
  $("optimize-btn").addEventListener("click",()=>{
    try {
      const result=L.optimize(state.plan,$("objective").value);
      state.plan=result.plan;
      lastRecommendation=(result.exact?"Exact optimum for the selected objective.":"Approximate recommendation; global optimality not guaranteed.")+" "+fmt.format(result.summary.totalCount)+" staff and "+compact(result.summary.remaining)+" unallocated.";
      persist();render(true);
    }catch(err){lastRecommendation=err.message;render(false);}
  });
  $("restore-baseline").addEventListener("click",()=>{
    update(p=>p.types.forEach(t=>{t.count=t.baseline;t.lock="none";t.lockedSpend=0;}),true);
  });
  $("save-scenario").addEventListener("click",()=>{
    if(state.scenarios.length>=25) return;
    const input=$("scenario-name");
    const name=input.value.trim() || "Scenario "+(state.scenarios.length+1);
    state.scenarios.push({id:freshId(),name:name.slice(0,60),plan:copy(state.plan)});
    input.value="";persist();render(false);
  });
  $("export-json").addEventListener("click",()=>download("workforce-allocation-backup.json",JSON.stringify({version:1,plan:state.plan,scenarios:state.scenarios},null,2),"application/json"));
  $("import-json").addEventListener("click",()=>$("import-file").click());
  $("import-file").addEventListener("change",async function(){
    const file=this.files && this.files[0];this.value="";
    if(!file) return;
    if(file.size>1000000){alert("Backup exceeds the 1 MB import limit.");return;}
    try {
      const parsed=JSON.parse(await file.text());
      if(parsed.version!==1 || !Array.isArray(parsed.scenarios) || parsed.scenarios.length>25) throw new Error("Unsupported or invalid backup.");
      const plan=L.normalizePlan(parsed.plan);
      const scenarios=parsed.scenarios.map(s=>({id:String(s.id).slice(0,100),name:String(s.name).slice(0,60),plan:L.normalizePlan(s.plan)}));
      if(!confirm("Replace your current plan and saved scenarios with the imported backup? Export your existing work first if needed."))return;
      state={plan,scenarios};lastRecommendation="";persist();render(true);
    }catch(err){alert("Unable to import backup: "+err.message);}
  });
  $("export-csv").addEventListener("click",exportCsv);
  restore();
  render(true);
})();
