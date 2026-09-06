(function (global) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function isCalendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }

  // Read once. Subsequent reads use memory, including edits that could not be saved.
  // Imports are different: commit them only after validation AND a successful write.
  function createStore({
    key,
    initial,
    validate,
    storage = () => global.localStorage,
  }) {
    const clone = (value) => JSON.parse(JSON.stringify(value));
    let current = validate(clone(initial));
    let error = "";
    let protectedData = false;
    try {
      const raw = storage().getItem(key);
      if (raw !== null) current = validate(JSON.parse(raw));
    } catch (cause) {
      protectedData = true;
      error =
        "Saved data could not be read. It has been preserved. Export your work or restore a valid backup before replacing it.";
    }

    function write(candidate, replace) {
      const next = validate(candidate);
      if (!replace) current = next;
      try {
        if (protectedData && !replace) throw new Error("Protected saved data");
        storage().setItem(key, JSON.stringify(next));
        current = next;
        protectedData = false;
        error = "";
        return true;
      } catch (cause) {
        error = protectedData
          ? "The unreadable saved copy has been preserved. Changes are only in this tab; export a backup to keep them."
          : replace
            ? "The backup could not be saved. Your previous data is unchanged."
            : "Changes are only in this tab because saving failed. Export a backup before closing this page.";
        return false;
      }
    }

    return {
      get: () => clone(current),
      save: (candidate) => write(candidate, false),
      replace: (candidate) => write(candidate, true),
      get error() {
        return error;
      },
      get protectedData() {
        return protectedData;
      },
    };
  }

  const api = { escapeHtml, isRecord, localDate, isCalendarDate, createStore };
  if (global) global.SiteData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
