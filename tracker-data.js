(function (global) {
  "use strict";
  const { isRecord } =
    typeof module !== "undefined" && module.exports
      ? require("./site-data.js")
      : global.SiteData;
  const courseId = /^(?:f[1-6]|m[1-3]|c[1-3]|l1|k1|d(?:[1-9]|10)|el[1-6])$/;
  const termId = /^[fsu]20\d{2}$/;
  const initial = {
    done: [],
    mdone: [],
    dmp: 0,
    assign: {},
    names: {},
    termDone: [],
    startSem: "fall",
    startYear: 2025,
    darkMode: false,
    userName: "",
    userEmail: "",
  };

  function validate(raw) {
    const fail = (field) => {
      throw new Error(`Invalid tracker backup: ${field}.`);
    };
    if (!isRecord(raw)) fail("expected an object");
    if (raw.app !== undefined && raw.app !== "papa-phd-tracker")
      fail("wrong application");
    if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1)
      fail("unsupported version");
    const next = { ...initial };
    for (const [field, pattern] of [
      ["done", courseId],
      ["mdone", /^ms(?:[1-9]|1[0-5])$/],
      ["termDone", termId],
    ]) {
      const value =
        raw[field] === undefined && field === "termDone" ? [] : raw[field];
      if (
        !Array.isArray(value) ||
        value.some((id) => typeof id !== "string" || !pattern.test(id))
      )
        fail(field);
      next[field] = [...new Set(value)];
    }
    if (!Number.isInteger(raw.dmp) || raw.dmp < 0 || raw.dmp > 15)
      fail("DMP sessions");
    next.dmp = raw.dmp;
    for (const field of ["assign", "names"]) {
      if (!isRecord(raw[field])) fail(field);
      next[field] = {};
      for (const [id, value] of Object.entries(raw[field])) {
        if (!courseId.test(id) || typeof value !== "string") fail(field);
        if (field === "assign" && value !== "_transfer" && !termId.test(value))
          fail("semester assignment");
        if (field === "names" && value.length > 2000)
          fail("course name length");
        next[field][id] = value;
      }
    }
    for (const field of [
      "startSem",
      "startYear",
      "darkMode",
      "userName",
      "userEmail",
    ]) {
      if (raw[field] !== undefined) next[field] = raw[field];
    }
    if (!["fall", "spring"].includes(next.startSem)) fail("start semester");
    if (
      !Number.isInteger(next.startYear) ||
      next.startYear < 2022 ||
      next.startYear > 2027
    )
      fail("start year");
    if (typeof next.darkMode !== "boolean") fail("appearance");
    for (const field of ["userName", "userEmail"]) {
      if (typeof next[field] !== "string" || next[field].length > 2000)
        fail(field);
    }
    return next;
  }

  const api = { initial, validate };
  if (global) global.PhDTrackerData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
