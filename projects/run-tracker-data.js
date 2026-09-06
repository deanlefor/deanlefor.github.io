(function (global) {
  "use strict";
  const { isRecord, isCalendarDate } =
    typeof module !== "undefined" && module.exports
      ? require("../site-data.js")
      : global.SiteData;
  function validate(raw) {
    const fail = (field) => {
      throw new Error(`Invalid run backup: ${field}.`);
    };
    if (!isRecord(raw)) fail("expected an object");
    if (raw.app !== undefined && raw.app !== "nd-run-tracker")
      fail("wrong application");
    if (raw.version !== undefined && raw.version !== 1)
      fail("unsupported version");
    const source = raw.data === undefined ? raw : raw.data;
    if (
      !isRecord(source) ||
      !Array.isArray(source.runs) ||
      !isRecord(source.c25k)
    )
      fail("runs and C25K progress are required");
    const ids = new Set();
    const runs = source.runs.map((run) => {
      if (!isRecord(run) || !isCalendarDate(run.date)) fail("run date");
      if (
        typeof run.id !== "number" ||
        !Number.isFinite(run.id) ||
        ids.has(run.id)
      )
        fail("run identifier");
      ids.add(run.id);
      if (
        typeof run.miles !== "number" ||
        !Number.isFinite(run.miles) ||
        run.miles <= 0
      )
        fail("distance");
      if (
        !["great", "ok", "tough"].includes(run.feeling) ||
        typeof run.notes !== "string"
      )
        fail("run details");
      const w = run.w ?? null,
        day = run.day ?? null;
      if (
        (w === null) !== (day === null) ||
        (w !== null &&
          (!Number.isInteger(w) ||
            w < 1 ||
            w > 9 ||
            !Number.isInteger(day) ||
            day < 1 ||
            day > 3))
      )
        fail("C25K day");
      return {
        id: run.id,
        date: run.date,
        miles: run.miles,
        feeling: run.feeling,
        notes: run.notes,
        w,
        day,
      };
    });
    const c25k = {};
    for (const [key, value] of Object.entries(source.c25k)) {
      if (!/^w[1-9]d[1-3]$/.test(key) || typeof value !== "boolean")
        fail("C25K progress");
      if (value) c25k[key] = true;
    }
    return { runs, c25k };
  }
  const api = { validate };
  if (global) global.RunTrackerData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
