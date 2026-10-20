(function (global) {
  "use strict";
  const { isRecord } =
    typeof module !== "undefined" && module.exports
      ? require("./site-data.js")
      : global.SiteData;
  const courseId = /^(?:f[1-6]|m[1-3]|c[1-3]|l1|k1|d(?:[1-9]|10)|el[1-6])$/;
  const termId = /^[fsu]20\d{2}$/;
  const foundationIds = ["f1", "f2", "f3", "f4", "f5", "f6"];
  const customCourseIds = [...foundationIds, "m2"];
  const constellations = {
    I: { name: "Public Management", courses: ["f5", "f2"] },
    II: { name: "PA Foundations", courses: ["f1", "f6"] },
    III: { name: "Public Policy", courses: ["f3", "f4", "m2"] },
    IV: { name: "Custom", courses: [] },
  };
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
    constellation: "",
    customConstellationCourses: [],
    qePapers: Array.from({ length: 4 }, () => ({
      title: "",
      courseId: "",
      ready: false,
    })),
    qePrepDone: [],
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
    // Additive fields: old saved plans, links and schema-1 backups keep all
    // existing progress and simply start without a recorded constellation.
    const constellation =
      raw.constellation === undefined ? "" : raw.constellation;
    if (
      typeof constellation !== "string" ||
      !["", ...Object.keys(constellations)].includes(constellation)
    )
      fail("constellation");
    const custom =
      raw.customConstellationCourses === undefined
        ? []
        : raw.customConstellationCourses;
    if (
      !Array.isArray(custom) ||
      custom.length > 2 ||
      new Set(custom).size !== custom.length ||
      custom.some((id) => !customCourseIds.includes(id))
    )
      fail("custom constellation courses");
    next.constellation = constellation;
    next.customConstellationCourses = [...custom];
    const papers = raw.qePapers === undefined ? initial.qePapers : raw.qePapers;
    if (!Array.isArray(papers) || papers.length !== 4) fail("QE papers");
    next.qePapers = papers.map((paper) => {
      if (
        !isRecord(paper) ||
        typeof paper.title !== "string" ||
        paper.title.length > 200 ||
        !["", ...customCourseIds].includes(paper.courseId) ||
        typeof paper.ready !== "boolean"
      )
        fail("QE paper details");
      return {
        title: paper.title,
        courseId: paper.courseId,
        ready: paper.ready,
      };
    });
    const prep = raw.qePrepDone === undefined ? [] : raw.qePrepDone;
    if (
      !Array.isArray(prep) ||
      prep.some(
        (id) => !["materialsSubmitted", "presentationReady"].includes(id),
      )
    )
      fail("QE preparation");
    next.qePrepDone = [...new Set(prep)];
    return next;
  }

  // Use recorded completions (including approved transfers), never assignments
  // to future semesters or milestone checkmarks, to assess coursework readiness.
  function qeReadiness(data) {
    const complete = (id) =>
      data.done.includes(id) || data.assign[id] === "_transfer";
    const choice = constellations[data.constellation];
    const courses =
      data.constellation === "IV"
        ? data.customConstellationCourses
        : choice?.courses || [];
    const selectionComplete =
      !!choice && (data.constellation !== "IV" || courses.length === 2);
    const foundationCount = foundationIds.filter(complete).length;
    const missingCourses = courses.filter((id) => !complete(id));
    const cornerstoneComplete = complete("m1");
    const inquiryComplete = complete("m2");
    return {
      courses,
      selectionComplete,
      foundationCount,
      missingCourses,
      cornerstoneComplete,
      inquiryComplete,
      ready:
        selectionComplete &&
        foundationCount >= 5 &&
        cornerstoneComplete &&
        inquiryComplete &&
        missingCourses.length === 0,
    };
  }

  function qePaperProgress(data) {
    const qe = qeReadiness(data);
    const requiredReady = data.qePapers
      .slice(0, 2)
      .filter(
        (paper) =>
          paper.ready &&
          qe.selectionComplete &&
          qe.courses.includes(paper.courseId),
      ).length;
    const optional = data.qePapers
      .slice(2)
      .filter((paper) => paper.title || paper.courseId || paper.ready);
    const optionalPending = optional.filter(
      (paper) => !paper.ready || !paper.courseId,
    ).length;
    return {
      requiredReady,
      optionalCount: optional.length,
      optionalPending,
      packetReady: requiredReady === 2 && optionalPending === 0,
    };
  }

  const api = {
    initial,
    validate,
    constellations,
    customCourseIds,
    qeReadiness,
    qePaperProgress,
  };
  if (global) global.PhDTrackerData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
