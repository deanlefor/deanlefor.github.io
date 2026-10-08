// Read legacy records once; keep their original saved copy for older tabs.
(() => {
  "use strict";
  const STORAGE_KEY = "project-tracker-local-v2";
  const LEGACY_KEY = "talk-timer-local-v1";
  const $ = (id) => document.getElementById(id);
  const newId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { freshState, normalize } = ProjectTrackerData;
  let state = freshState();
  let range = "today";
  let sortMetric = "total";
  let showHidden = false;
  let editPersonId = null;
  let editBucketId = null;
  let toastTimeout;
  let storageFailed = false;

  let protectedData = false;
  let storageMessage = "";

  try {
    const stored =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (stored) state = normalize(JSON.parse(stored));
  } catch (err) {
    storageFailed = true;
    protectedData = true;
    storageMessage =
      "Saved data could not be read and has been preserved. Changes are only in this tab; export a backup or restore a valid backup before replacing saved data.";
    console.warn("Could not read saved data:", err);
  }

  function renderStorageWarning() {
    $("storageWarning").textContent = storageMessage;
    $("storageWarning").classList.toggle("visible", storageFailed);
  }
  function persist(replacement = null) {
    try {
      if (protectedData && !replacement)
        throw Error("Preserved unreadable data");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(replacement || state));
      if (replacement) state = replacement;
      protectedData = false;
      storageFailed = false;
      storageMessage = "";
      renderStorageWarning();
      return true;
    } catch (err) {
      storageFailed = true;
      storageMessage = protectedData
        ? "Saved data could not be read and has been preserved. Changes are only in this tab; export a backup or restore a valid backup before replacing saved data."
        : replacement
          ? "The backup could not be saved. Your previous data is unchanged."
          : "Changes are only in this tab because saving failed. Export a backup before closing this page.";
      console.warn("Could not save data:", err);
      renderStorageWarning();
      return false;
    }
  }
  function notify(message) {
    const el = $("toast");
    clearTimeout(toastTimeout);
    el.textContent = message;
    el.classList.add("visible");
    toastTimeout = setTimeout(() => el.classList.remove("visible"), 3500);
  }
  function personName(id) {
    return state.people.find((p) => p.id === id)?.name ?? "Unknown";
  }
  function localMidnight(offsetDays = 0) {
    const d = new Date();
    return new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate() + offsetDays,
    ).getTime();
  }
  function rangeStart(which) {
    return which === "today"
      ? localMidnight()
      : which === "week"
        ? localMidnight(-6)
        : 0;
  }
  function allSegments(now = Date.now()) {
    const arr = state.sessions.map((s) => ({ ...s, current: false }));
    if (state.active)
      arr.push({
        personId: state.active.personId,
        start: state.active.start,
        end: now,
        current: true,
      });
    return arr;
  }
  function overlapDuration(s, start, end = Date.now()) {
    return Math.max(0, Math.min(s.end, end) - Math.max(s.start, start));
  }
  function sumRange(which, id = null, now = Date.now()) {
    const start = rangeStart(which);
    return allSegments(now).reduce(
      (total, s) =>
        total + (id && s.personId !== id ? 0 : overlapDuration(s, start, now)),
      0,
    );
  }
  function personStats(which, now = Date.now()) {
    const start = rangeStart(which);
    const stats = new Map(
      bucketPeople().map((p) => [
        p.id,
        { id: p.id, name: p.name, total: 0, count: 0, avg: 0 },
      ]),
    );
    for (const segment of allSegments(now)) {
      const elapsed = overlapDuration(segment, start, now);
      if (elapsed <= 0) continue;
      const item = stats.get(segment.personId);
      if (!item) continue;
      item.total += elapsed;
      item.count += 1;
    }
    for (const item of stats.values())
      item.avg = item.count ? item.total / item.count : 0;
    return [...stats.values()];
  }
  function duration(ms) {
    if (ms <= 0) return "0m";
    if (ms < 60000) return "<1m";
    const minutes = Math.round(ms / 60000);
    const h = Math.floor(minutes / 60),
      m = minutes % 60;
    return h ? `${h}h ${m}m` : `${minutes}m`;
  }
  function durationPrecise(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    if (hours) return `${hours}h ${minutes}m`;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }
  function clock(ms) {
    const secs = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  const fmtDate = (time) =>
    new Date(time).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const fmtTime = (time) =>
    new Date(time).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  const mk = (tag, classes, content = "") => {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    el.textContent = content;
    return el;
  };

  function selectedBucket() {
    return state.buckets.find((bucket) => bucket.id === state.selectedBucketId);
  }
  function bucketPeople() {
    return state.people.filter(
      (person) => person.bucketId === state.selectedBucketId,
    );
  }
  function bucketSessions() {
    const ids = new Set(bucketPeople().map((person) => person.id));
    return state.sessions.filter((session) => ids.has(session.personId));
  }
  function activeBucket() {
    if (!state.active) return null;
    const person = state.people.find((p) => p.id === state.active.personId);
    return state.buckets.find((bucket) => bucket.id === person.bucketId);
  }
  function selectBucket(id) {
    if (!state.buckets.some((bucket) => bucket.id === id)) return;
    state.selectedBucketId = id;
    showHidden = false;
    persist();
    render();
  }
  function renderBuckets() {
    const tabs = $("bucketTabs");
    const focusedId = tabs.contains(document.activeElement)
      ? document.activeElement.dataset.bucketId
      : null;
    tabs.replaceChildren();
    for (const bucket of state.buckets) {
      const button = mk("button", "button bucket-tab", bucket.name);
      button.type = "button";
      button.dataset.bucketId = bucket.id;
      button.setAttribute(
        "aria-pressed",
        String(bucket.id === state.selectedBucketId),
      );
      button.onclick = () => selectBucket(bucket.id);
      tabs.append(button);
      if (bucket.id === focusedId) button.focus();
    }
    $("overviewTitle").textContent = `${selectedBucket().name} overview`;
    $("peopleTitle").textContent = `${selectedBucket().name} projects`;
  }
  function openBucketDialog(id = null) {
    editBucketId = id;
    $("bucketError").hidden = true;
    $("bucketDialogTitle").textContent = id ? "Rename bucket" : "Add a bucket";
    $("bucketName").value = id
      ? state.buckets.find((bucket) => bucket.id === id).name
      : "";
    $("bucketDialog").showModal();
    setTimeout(() => $("bucketName").focus(), 50);
  }
  function saveBucket(event) {
    event.preventDefault();
    const name = $("bucketName").value.trim().slice(0, 60);
    if (!name) return;
    if (
      state.buckets.some(
        (bucket) =>
          bucket.id !== editBucketId &&
          bucket.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      $("bucketError").textContent = "That bucket name is already in use.";
      $("bucketError").hidden = false;
      return;
    }
    if (editBucketId) {
      state.buckets.find((bucket) => bucket.id === editBucketId).name = name;
    } else {
      const id = newId();
      state.buckets.push({ id, name });
      state.selectedBucketId = id;
    }
    $("bucketDialog").close();
    persist();
    render();
  }

  function stopCurrent() {
    if (!state.active) return;
    const { personId, start } = state.active;
    const end = Math.max(start, Date.now());
    if (end > start) state.sessions.push({ id: newId(), personId, start, end });
    state.active = null;
    persist();
  }
  function toggleTimer(personId) {
    if (state.active?.personId === personId) {
      stopCurrent();
      notify("Session saved.");
    } else {
      if (state.active) stopCurrent();
      state.active = { personId, start: Date.now() };
      persist();
    }
    render();
  }
  function discardTimer() {
    if (!state.active) return;
    if (window.confirm("Discard the running session without saving it?")) {
      state.active = null;
      persist();
      render();
      notify("Timer discarded.");
    }
  }
  function openPersonDialog(id = null) {
    editPersonId = id;
    $("personDialogTitle").textContent = id ? "Edit project" : "Add a project";
    $("personName").value = id ? personName(id) : "";
    const select = $("personBucket");
    select.replaceChildren();
    for (const bucket of state.buckets) {
      const option = mk("option", "", bucket.name);
      option.value = bucket.id;
      select.append(option);
    }
    const person = state.people.find((p) => p.id === id);
    select.value = person ? person.bucketId : state.selectedBucketId;
    select.disabled = !!(id && state.active?.personId === id);
    $("moveProjectNote").hidden = !select.disabled;
    const dialog = $("personDialog");
    dialog.showModal();
    setTimeout(() => $("personName").focus(), 50);
  }
  function savePerson(event) {
    event.preventDefault();
    const name = $("personName").value.trim().slice(0, 60);
    if (!name) return;
    const bucketId = $("personBucket").value;
    if (!state.buckets.some((bucket) => bucket.id === bucketId)) return;
    if (editPersonId) {
      const person = state.people.find((p) => p.id === editPersonId);
      if (person) {
        if (
          state.active?.personId === person.id &&
          person.bucketId !== bucketId
        ) {
          notify("Stop the timer before moving this project.");
          return;
        }
        person.name = name;
        person.bucketId = bucketId;
      }
    } else {
      state.people.push({ id: newId(), name, hidden: false, bucketId });
    }
    state.selectedBucketId = bucketId;
    $("personDialog").close();
    persist();
    render();
  }
  function hidePerson(id) {
    const p = state.people.find((p) => p.id === id);
    if (!p) return;
    if (state.active?.personId === id) {
      notify("Stop the timer before hiding this button.");
      return;
    }
    p.hidden = true;
    persist();
    render();
    notify("Button hidden. Past sessions are kept.");
  }
  function restorePerson(id) {
    const p = state.people.find((p) => p.id === id);
    if (p) p.hidden = false;
    persist();
    render();
  }

  function renderPeople() {
    const grid = $("peopleGrid");
    grid.replaceChildren();
    const people = bucketPeople().filter((p) => !p.hidden);
    if (!people.length) {
      const empty = mk("div", "empty-state");
      empty.append(
        mk("h3", "", "Start with one button"),
        mk(
          "p",
          "",
          "Add a project or a task. You can add as many as you need.",
        ),
      );
      const btn = mk("button", "button primary", "+ Add your first project");
      btn.type = "button";
      btn.onclick = () => openPersonDialog();
      empty.append(btn);
      grid.append(empty);
    }
    people.forEach((p) => {
      const running = state.active?.personId === p.id;
      const card = mk("article", `person-card${running ? " running" : ""}`);
      const btn = mk("button", "person-action");
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(running));
      btn.setAttribute(
        "aria-label",
        `${running ? "Stop timing" : "Start timing"} ${p.name}`,
      );
      btn.append(
        mk("span", "person-name", p.name),
        mk("span", "person-status", running ? "Tap to stop" : "Tap to start"),
      );
      btn.onclick = () => toggleTimer(p.id);
      const footer = mk("div", "person-foot");
      const today = mk(
        "span",
        "micro",
        `${duration(sumRange("today", p.id))} today`,
      );
      today.dataset.todayFor = p.id;
      const manage = mk("div", "");
      const rename = mk("button", "button quiet", "Edit");
      rename.type = "button";
      rename.onclick = () => openPersonDialog(p.id);
      const hide = mk("button", "button quiet", "Hide");
      hide.type = "button";
      hide.onclick = () => hidePerson(p.id);
      manage.append(rename, hide);
      footer.append(today, manage);
      card.append(btn, footer);
      grid.append(card);
    });
  }
  function renderActive(now = Date.now()) {
    const panel = $("activePanel");
    panel.classList.toggle("visible", !!state.active);
    if (!state.active) return;
    const bucket = activeBucket();
    $("activeBucketLabel").textContent = `Timer running · ${bucket.name}`;
    $("viewActiveBucket").hidden = bucket.id === state.selectedBucketId;
    $("viewActiveBucket").textContent = `View ${bucket.name} timer`;
    $("activePerson").textContent = personName(state.active.personId);
    $("activeStarted").textContent =
      `Started at ${fmtTime(state.active.start)}`;
    $("activeElapsed").textContent = clock(now - state.active.start);
  }
  function renderSummary(now = Date.now()) {
    const stats = personStats(range, now);
    const totalTime = stats.reduce((total, item) => total + item.total, 0);
    const interruptions = stats.reduce((total, item) => total + item.count, 0);
    $("summaryTime").textContent = duration(totalTime);
    $("summaryVisits").textContent = interruptions.toLocaleString();
    $("summaryAverage").textContent = interruptions
      ? durationPrecise(totalTime / interruptions)
      : "0m";
    document.querySelectorAll("[data-today-for]").forEach((el) => {
      el.textContent = `${duration(sumRange("today", el.dataset.todayFor, now))} today`;
    });
  }
  function renderBreakdown(now = Date.now()) {
    document.querySelectorAll(".segment").forEach((btn) => {
      const selected = btn.dataset.range === range;
      btn.classList.toggle("selected", selected);
      btn.setAttribute("aria-pressed", String(selected));
    });
    const totals = personStats(range, now)
      .filter((p) => p.count > 0)
      .sort(
        (a, b) =>
          b[sortMetric] - a[sortMetric] ||
          b.total - a.total ||
          a.name.localeCompare(b.name),
      );
    const el = $("breakdown");
    el.replaceChildren();
    if (!totals.length) {
      el.append(mk("p", "no-data", "No sessions recorded in this period yet."));
      return;
    }
    const header = mk("div", "breakdown-head");
    ["Project", "Time", "Sessions", "Average"].forEach((text) =>
      header.append(mk("span", "", text)),
    );
    el.append(header);
    const biggest = Math.max(...totals.map((p) => p.total));
    totals.forEach((p) => {
      const line = mk("div", "ranking");
      const values = mk("div", "breakdown-row");
      values.append(
        mk("span", "rank-name", p.name),
        mk("span", "breakdown-number", duration(p.total)),
        mk("span", "breakdown-number", String(p.count)),
        mk("span", "breakdown-number", durationPrecise(p.avg)),
      );
      const meter = mk("div", "meter");
      meter.setAttribute("aria-hidden", "true");
      const fill = mk("div", "meter-fill");
      fill.style.width = biggest
        ? `${((100 * p.total) / biggest).toFixed(2)}%`
        : "0%";
      meter.append(fill);
      line.append(values, meter);
      el.append(line);
    });
  }
  function renderHistory() {
    const history = $("history");
    history.replaceChildren();
    const sessions = bucketSessions().sort((a, b) => b.start - a.start);
    $("sessionCount").textContent = `${sessions.length} saved`;
    if (!sessions.length) {
      history.append(
        mk(
          "p",
          "no-data",
          "Completed sessions show up here. You can export all of them to a spreadsheet.",
        ),
      );
      return;
    }
    sessions.slice(0, 8).forEach((s) => {
      const entry = mk("div", "entry");
      const info = mk("div", "entry-info");
      info.append(
        mk("div", "entry-name", personName(s.personId)),
        mk(
          "div",
          "entry-date",
          `${fmtDate(s.start)} · ${fmtTime(s.start)}–${fmtTime(s.end)}`,
        ),
      );
      const dt = mk("span", "entry-duration", duration(s.end - s.start));
      const del = mk("button", "entry-remove", "✕");
      del.type = "button";
      del.title = "Delete this session";
      del.setAttribute(
        "aria-label",
        `Delete ${personName(s.personId)} session from ${fmtDate(s.start)}`,
      );
      del.onclick = () => {
        if (window.confirm(`Delete this ${personName(s.personId)} session?`)) {
          state.sessions = state.sessions.filter((item) => item.id !== s.id);
          persist();
          render();
        }
      };
      entry.append(info, dt, del);
      history.append(entry);
    });
    if (sessions.length > 8)
      history.append(
        mk(
          "p",
          "micro",
          `Showing 8 most recent of ${sessions.length}. The CSV export contains all records in this bucket.`,
        ),
      );
  }
  function renderHidden() {
    const hidden = bucketPeople().filter((p) => p.hidden);
    const toggle = $("toggleHidden");
    toggle.hidden = hidden.length === 0;
    toggle.textContent = `${showHidden ? "Hide" : "Show"} hidden projects (${hidden.length})`;
    const panel = $("hiddenPanel");
    panel.classList.toggle("visible", showHidden && hidden.length > 0);
    panel.replaceChildren();
    if (showHidden)
      hidden.forEach((p) => {
        const item = mk("div", "hidden-row");
        item.append(mk("span", "", p.name));
        const button = mk("button", "button", "Restore button");
        button.type = "button";
        button.onclick = () => restorePerson(p.id);
        item.append(button);
        panel.append(item);
      });
  }
  function render() {
    renderBuckets();
    renderPeople();
    renderActive();
    renderSummary();
    renderBreakdown();
    renderHistory();
    renderHidden();
    renderStorageWarning();
    $("clearHistory").disabled = bucketSessions().length === 0;
    $("exportCSV").disabled = bucketSessions().length === 0;
  }
  function download(filename, contents, contentType) {
    const blob = new Blob([contents], { type: contentType });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  }
  function exportCSV() {
    const quote = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const records = [
      [
        "Bucket",
        "Project",
        "Start (local)",
        "End (local)",
        "Start (UTC)",
        "End (UTC)",
        "Minutes",
      ],
    ];
    bucketSessions()
      .sort((a, b) => a.start - b.start)
      .forEach((s) => {
        records.push([
          selectedBucket().name,
          personName(s.personId),
          new Date(s.start).toLocaleString(),
          new Date(s.end).toLocaleString(),
          new Date(s.start).toISOString(),
          new Date(s.end).toISOString(),
          ((s.end - s.start) / 60000).toFixed(2),
        ]);
      });
    download(
      `project-tracker-${
        selectedBucket()
          .name.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "bucket"
      }-${new Date().toISOString().slice(0, 10)}.csv`,
      "\ufeff" + records.map((r) => r.map(quote).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
    if (state.active && activeBucket().id === state.selectedBucketId)
      notify("Running timer excluded. Stop it to include this session.");
  }
  function exportJSON() {
    download(
      `project-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(state, null, 2),
      "application/json",
    );
    notify("Backup created for all buckets. Keep it somewhere safe.");
  }
  async function importJSON(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const contents = await file.text();
      const incoming = normalize(JSON.parse(contents));
      if (
        !window.confirm(
          `Restore ${incoming.buckets.length} buckets, ${incoming.people.length} projects, and ${incoming.sessions.length} sessions? This REPLACES all your current saved data. Back it up first if needed.`,
        )
      )
        return;
      if (!persist(incoming)) {
        notify("Backup could not be saved. Your previous data is unchanged.");
        return;
      }
      showHidden = false;
      render();
      notify("Backup restored.");
    } catch (err) {
      window.alert(
        "Unable to read this backup file. Please choose a Project Tracker JSON backup.",
      );
      console.warn(err);
    }
  }

  $("addBucket").onclick = () => openBucketDialog();
  $("renameBucket").onclick = () => openBucketDialog(state.selectedBucketId);
  $("bucketForm").addEventListener("submit", saveBucket);
  $("cancelBucket").onclick = () => $("bucketDialog").close();
  $("viewActiveBucket").onclick = () => selectBucket(activeBucket().id);
  $("addPersonTop").onclick = () => openPersonDialog();
  $("personForm").addEventListener("submit", savePerson);
  $("cancelPerson").onclick = () => $("personDialog").close();
  $("finishActive").onclick = () => {
    stopCurrent();
    render();
    notify("Session saved.");
  };
  $("discardActive").onclick = discardTimer;
  $("rangePicker").onclick = (e) => {
    const selected = e.target.closest("[data-range]");
    if (selected) {
      range = selected.dataset.range;
      renderSummary();
      renderBreakdown();
    }
  };
  $("breakdownSort").onchange = (e) => {
    sortMetric = e.target.value;
    renderBreakdown();
  };
  $("exportCSV").onclick = exportCSV;
  $("exportJSON").onclick = exportJSON;
  $("importButton").onclick = () => $("fileImport").click();
  $("fileImport").addEventListener("change", importJSON);
  $("toggleHidden").onclick = () => {
    showHidden = !showHidden;
    renderHidden();
  };
  $("clearHistory").onclick = () => {
    if (
      window.confirm(
        `Permanently delete all ${bucketSessions().length} completed sessions in ${selectedBucket().name}? Your project buttons will be kept. Export a backup first if needed.`,
      )
    ) {
      const ids = new Set(bucketPeople().map((person) => person.id));
      state.sessions = state.sessions.filter(
        (session) => !ids.has(session.personId),
      );
      persist();
      render();
      notify("History cleared.");
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      renderActive();
      renderSummary();
      renderBreakdown();
    }
  });
  setInterval(() => {
    if (state.active) {
      const now = Date.now();
      renderActive(now);
      renderSummary(now);
      renderBreakdown(now);
    }
  }, 1000);
  render();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("./sw.js").catch(() => {}),
    );
  }
})();
