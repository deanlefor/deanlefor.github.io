(function (global) {
  "use strict";

  const initialBuckets = () => [
    { id: "work", name: "Work" },
    { id: "school", name: "School" },
    { id: "personal", name: "Personal" },
  ];
  const freshState = () => ({
    version: 2,
    buckets: initialBuckets(),
    selectedBucketId: "work",
    people: [],
    sessions: [],
    active: null,
  });

  function normalize(raw, now = Date.now()) {
    const fail = () => {
      throw new Error("Invalid Project Tracker backup.");
    };
    const record = (value) =>
      value && typeof value === "object" && !Array.isArray(value);
    const time = (value) =>
      Number.isFinite(value) && value >= 0 && value <= now + 86400000;
    const name = (value) =>
      typeof value === "string" && value.trim().length > 0;
    const uniqueIds = (items) => {
      const ids = new Set();
      for (const item of items) {
        if (!record(item) || !name(item.id) || ids.has(item.id)) fail();
        ids.add(item.id);
      }
      return ids;
    };
    if (
      !record(raw) ||
      !Array.isArray(raw.people) ||
      !Array.isArray(raw.sessions)
    )
      fail();
    const legacy = raw.version === undefined || raw.version === 1;
    if (!legacy && raw.version !== 2) fail();
    if (!legacy && (!Array.isArray(raw.buckets) || !raw.buckets.length)) fail();
    const buckets = legacy
      ? initialBuckets()
      : raw.buckets.map((bucket) => {
          if (
            !record(bucket) ||
            !name(bucket.name) ||
            bucket.name.trim().length > 60
          )
            fail();
          return { id: bucket.id, name: bucket.name.trim() };
        });
    const bucketIds = uniqueIds(buckets);
    const people = raw.people.map((person) => {
      if (!record(person) || typeof person.name !== "string") fail();
      const bucketId = legacy ? "work" : person.bucketId;
      if (!bucketIds.has(bucketId)) fail();
      return {
        id: person.id,
        name: person.name.trim().slice(0, 60) || "Unnamed",
        hidden: !!person.hidden,
        bucketId,
      };
    });
    const personIds = uniqueIds(people);
    const sessions = raw.sessions.map((session) => {
      if (
        !record(session) ||
        !personIds.has(session.personId) ||
        !time(session.start) ||
        !time(session.end) ||
        session.end < session.start
      )
        fail();
      return {
        id: session.id,
        personId: session.personId,
        start: session.start,
        end: session.end,
      };
    });
    uniqueIds(sessions);
    let active = null;
    if (raw.active !== null && raw.active !== undefined) {
      if (
        !record(raw.active) ||
        !personIds.has(raw.active.personId) ||
        !time(raw.active.start)
      )
        fail();
      active = { personId: raw.active.personId, start: raw.active.start };
    }
    return {
      version: 2,
      buckets,
      selectedBucketId: bucketIds.has(raw.selectedBucketId)
        ? raw.selectedBucketId
        : buckets[0].id,
      people,
      sessions,
      active,
    };
  }

  const api = { freshState, normalize };
  if (global) global.ProjectTrackerData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
