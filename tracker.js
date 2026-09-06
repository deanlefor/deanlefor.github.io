const BL = "#378ADD",
  GR = "#639922",
  AM = "#BA7517";
const KEY = "phd-tracker-v2";
const VERSION = "v1.02";
const escapeHtml = SiteData.escapeHtml;
const dataStore = SiteData.createStore({
  key: KEY,
  initial: PhDTrackerData.initial,
  validate: PhDTrackerData.validate,
});
let shareError = "";
function updateSaveStatus() {
  document.getElementById("storage-status").textContent =
    shareError || (state.readOnly ? "" : dataStore.error);
}

const DISCLAIMER = `This tracker is built from the November 2024 CPAP Policy Guide and the April 2026 Qualifying Examination & Constellations update (approved April 23, 2026). It is meant for planning and tracking only — not an official advising tool. There may be errors or omissions, and program requirements do change. Always confirm your plan with your advisor and the VT Graduate School.\n\nThis tool is not affiliated with or endorsed by Virginia Tech. If you spot something wrong, please let me know and I will fix it.\n\nThe constellation-based QE process replaced the prior 3-of-5-fields exam. Students who started before April 2026 should confirm which QE procedures apply to them.\n\nFor safety and security reasons, none of this is stored on a server. I do not see your data and it is not saved anywhere other than on your computer. However, since your progress is saved in your browser’s local storage it will disappear if you clear your browser data or use private/incognito mode. Please ensure you do backup (settings page) and save the .json file somewhere safe. I CANNOT RECOVER PROGRESS ON YOUR BEHALF.\n\nFinally, if you do not graduate because a website told you that you had enough credits: not liable. 🙂`;

const STATIC_BUCKETS = [
  {
    id: "foundation",
    name: "Foundation courses",
    req: 18,
    sub: "6 courses across the 5 core fields",
    courses: [
      {
        id: "f1",
        code: "PAPA 6014",
        name: "PA theory and context",
        cr: 3,
        tag: "Theory",
        tc: "#7C3AED",
      },
      {
        id: "f2",
        code: "PAPA 6114",
        name: "Complex public organizations",
        cr: 3,
        tag: "Orgs",
        tc: "#1D4ED8",
      },
      {
        id: "f3",
        code: "PAPA 6214",
        name: "Public policy processes",
        cr: 3,
        tag: "Policy",
        tc: "#0369A1",
      },
      {
        id: "f4",
        code: "PAPA 6224",
        name: "Public policy design",
        cr: 3,
        tag: "Policy",
        tc: "#0369A1",
      },
      {
        id: "f5",
        code: "PAPA 6344",
        name: "Leadership and management in PA",
        cr: 3,
        tag: "Mgmt",
        tc: "#15803D",
      },
      {
        id: "f6",
        code: "PAPA 6414",
        name: "Normative foundations of PA",
        cr: 3,
        tag: "Ethics",
        tc: "#B45309",
      },
    ],
  },
  {
    id: "methods",
    name: "Research foundations & methods",
    req: 9,
    sub: "Cornerstone · inquiry · advanced techniques",
    courses: [
      {
        id: "m1",
        code: "PAPA 6294",
        name: "Cornerstone seminar",
        cr: 3,
        tag: "Req",
        tc: BL,
        note: "First year required",
      },
      {
        id: "m2",
        code: "PAPA 6514",
        name: "PA and policy inquiry",
        cr: 3,
        tag: "Req",
        tc: BL,
        note: "Required before qualifying exam",
      },
      {
        id: "m3",
        code: "TBD",
        name: "Advanced methods (advisor-approved)",
        cr: 3,
        tag: "Flex",
        tc: AM,
        note: "Quantitative or qualitative techniques",
      },
    ],
  },
  {
    id: "conc",
    name: "Research concentration",
    req: 9,
    sub: "Independent studies · AT courses · field work",
    courses: [
      {
        id: "c1",
        code: "PAPA 5974/AT",
        name: "Concentration study 1",
        cr: 3,
        tag: "Flex",
        tc: AM,
      },
      {
        id: "c2",
        code: "PAPA 5974/AT",
        name: "Concentration study 2",
        cr: 3,
        tag: "Flex",
        tc: AM,
      },
      {
        id: "c3",
        code: "PAPA 5974/AT",
        name: "Concentration study 3",
        cr: 3,
        tag: "Flex",
        tc: AM,
      },
    ],
  },
  {
    id: "lecture",
    name: "Concentration lecture",
    req: 3,
    sub: "After 9 concentration hours · before prospectus",
    courses: [
      {
        id: "l1",
        code: "PAPA 7964",
        name: "Concentration lecture",
        cr: 3,
        tag: "Req",
        tc: BL,
        note: "Deadline: Dec 1 (fall) / May 1 (spring). Audience of 6+.",
      },
    ],
  },
  {
    id: "capstone",
    name: "Capstone seminar",
    req: 3,
    sub: "Final semester of coursework",
    courses: [
      {
        id: "k1",
        code: "PAPA 6394",
        name: "Capstone seminar",
        cr: 3,
        tag: "Req",
        tc: BL,
        note: "Preferably the last semester of coursework",
      },
    ],
  },
  {
    id: "dissertation",
    name: "Dissertation",
    req: 30,
    sub: "PAPA 7994 · 10 × 3 credits · assign to semesters",
    courses: [
      {
        id: "d1",
        code: "PAPA 7994",
        name: "Dissertation 1",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d2",
        code: "PAPA 7994",
        name: "Dissertation 2",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d3",
        code: "PAPA 7994",
        name: "Dissertation 3",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d4",
        code: "PAPA 7994",
        name: "Dissertation 4",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d5",
        code: "PAPA 7994",
        name: "Dissertation 5",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d6",
        code: "PAPA 7994",
        name: "Dissertation 6",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d7",
        code: "PAPA 7994",
        name: "Dissertation 7",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d8",
        code: "PAPA 7994",
        name: "Dissertation 8",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d9",
        code: "PAPA 7994",
        name: "Dissertation 9",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
      {
        id: "d10",
        code: "PAPA 7994",
        name: "Dissertation 10",
        cr: 3,
        tag: "Diss",
        tc: "#2563EB",
        renameable: true,
      },
    ],
  },
];

const MILESTONES = [
  {
    id: "ms1",
    name: "Scholarly ethics quiz",
    target: "Year 1 (early)",
    desc: "Pass the CPAP ethics quiz. Review Roig guide, COPE guidelines, and ASPA Code of Ethics. Verified at Plan of Study submission.",
  },
  {
    id: "ms2",
    name: "CITI human subjects training",
    target: "Year 1",
    desc: "Complete VT IRB certification. Required for PhD; documented on Plan of Study.",
  },
  {
    id: "ms3",
    name: "Plan of study submitted",
    target: "Before 24 credits",
    desc: "File before completing 24 semester hours. Signed by committee, submitted to Graduate School.",
  },
  {
    id: "ms4",
    name: "Constellation selected",
    target: "Before QE registration",
    desc: "Choose one of four constellations: I (Public Management: Management & Leadership + Complex Organizations), II (PA Foundations: Theory & Context + Normative Foundations), III (Public Policy: Policy Process + Policy Design + Policy Inquiry), or IV (Custom: any two courses from Constellations I–III). Must complete all constellation courses and at least 5 of 7 total foundation courses before the exam.",
  },
  {
    id: "ms5",
    name: "QE request submitted",
    target: "By May 1 (June 1 in 2026 only)",
    desc: 'Submit \"Request to Admit Candidate to Qualifying Examination\" to the CPAP office by May 1. Missing this deadline means waiting a full year — the exam is offered once annually in August only.',
  },
  {
    id: "ms6",
    name: "Submitted papers ready",
    target: "By August 1",
    desc: "Prepare at least 2 papers from constellation courses (up to 4 total, including papers from other foundation courses). Papers are evaluated alongside the Foundations Essay and oral engagement.",
  },
  {
    id: "ms7",
    name: "Foundations essay completed",
    target: "By August 1",
    desc: "Write a 2,000–2,500 word essay (double-spaced, excluding references) synthesizing and critically assessing scholarship from submitted papers. Must be completed independently — working with your advisor or any faculty member on this essay is not permitted.",
  },
  {
    id: "ms8",
    name: "QE oral engagement",
    target: "August, before Fall semester",
    desc: "15-minute in-person presentation of the Foundations Essay followed by 30-minute Q&A with a 3-faculty committee from your selected constellation. Committee may also ask about broader constellation scholarship.",
  },
  {
    id: "ms9",
    name: "Qualifying examination passed",
    target: "August result",
    desc: "Committee evaluates submitted papers, essay, and oral engagement as a whole. Outcome is Pass or Fail. A minor deficiency may result in an additional 30-minute Q&A within 2 weeks. A failed exam may be retaken the following January or August; the second attempt must occur within one calendar year.",
  },
  {
    id: "ms10",
    name: "Dissertation committee formed",
    target: "After qualifying exam",
    desc: "4 members minimum; at least 3 must be CPAP core faculty. Chair must be core faculty. Graduate School approval required.",
  },
  {
    id: "ms11",
    name: "Concentration lecture delivered",
    target: "Before Dec 1 (fall) or May 1 (spring)",
    desc: "Integrates 9 research concentration hours. Audience of at least 6 required. Must occur before prospectus defense. Cannot be scheduled during summer. Student is responsible for assembling the audience.",
  },
  {
    id: "ms12",
    name: "Capstone seminar completed",
    target: "Preferably last semester of coursework",
    desc: "PAPA 6394. Focuses on developing and refining the dissertation prospectus proposal.",
  },
  {
    id: "ms13",
    name: "Prospectus defense (preliminary exam)",
    target: "After all coursework",
    desc: 'File \"Request to Admit to Preliminary Examination.\" Full committee reviews and approves research design including topic, significance, methodology, and timeline.',
  },
  {
    id: "ms14",
    name: "Dissertation draft distributed",
    target: "At least 6 weeks before defense",
    desc: "Defense cannot be scheduled until at least 6 weeks after the chair-approved draft is distributed to all committee members.",
  },
  {
    id: "ms15",
    name: "Dissertation defense (final exam)",
    target: "Final requirement",
    desc: 'File \"Request to Admit to Final Exam.\" All committee members must be present. Be prepared to discuss theoretical, methodological, and practical implications of the dissertation.',
  },
];

const THEMES = {
  dark: {
    "--bg1": "#1c1c1b",
    "--bg2": "#262625",
    "--bg3": "#303030",
    "--tx1": "#f0efee",
    "--tx2": "#8c8c8a",
    "--tx3": "#5c5c5a",
    "--bd1": "rgba(255,255,255,0.09)",
    "--bd2": "rgba(255,255,255,0.18)",
    "--accent": "#378ADD",
    "--topbar-bg": "#262625",
    "--topbar-tx": "#f0efee",
    "--topbar-link": "#8c8c8a",
  },
  light: {
    "--bg1": "#ffffff",
    "--bg2": "#f5f1f2",
    "--bg3": "#ece6e8",
    "--tx1": "#1a1414",
    "--tx2": "#5c5254",
    "--tx3": "#8c8587",
    "--bd1": "rgba(134,31,65,0.12)",
    "--bd2": "rgba(134,31,65,0.28)",
    "--accent": "#E5751F",
    "--topbar-bg": "#861F41",
    "--topbar-tx": "#ffffff",
    "--topbar-link": "rgba(255,255,255,0.75)",
  },
};
function applyTheme() {
  const t = THEMES[state.darkMode ? "dark" : "light"];
  for (const [k, v] of Object.entries(t))
    document.documentElement.style.setProperty(k, v);
}
let state = {
  tab: "dashboard",
  done: new Set(),
  mdone: new Set(),
  dmp: 0,
  open: new Set(["foundation", "methods", "electives", "dissertation"]),
  assign: {},
  picker: null,
  showSettings: false,
  startSem: "fall",
  startYear: 2025,
  names: {},
  renaming: null,
  termDone: new Set(),
  shareLinkCopied: false,
  darkMode: false,
  readOnly: false,
  userName: "",
  userEmail: "",
};

// Dynamic term generation
function generateTerms() {
  const terms = [];
  let y = state.startYear,
    sg = state.startSem,
    sn = 1;
  while (terms.length < 15) {
    if (sg === "fall") {
      terms.push({
        id: `f${y}`,
        name: `Fall ${y}`,
        label: `Sem ${sn}`,
        type: "sem",
      });
      sn++;
      sg = "spring";
      y++;
    } else {
      terms.push({
        id: `s${y}`,
        name: `Spring ${y}`,
        label: `Sem ${sn}`,
        type: "sem",
      });
      sn++;
      if (terms.length < 15)
        terms.push({ id: `u${y}`, name: `Summer ${y}`, type: "summer" });
      sg = "fall";
    }
  }
  return terms.slice(0, 15);
}

// Dynamic electives bucket
function getElecBucket() {
  const courses = [];
  for (let i = 1; i <= 6; i++)
    courses.push({
      id: `el${i}`,
      code: "Elective",
      name: `Elective ${i}`,
      cr: 3,
      tag: "Sched",
      tc: "#6B7280",
      note: "Any CPAP, SPIA, or related graduate course",
      renameable: true,
    });
  return {
    id: "electives",
    name: "Electives",
    req: 18,
    sub: "6 elective courses · schedule or transfer in",
    courses,
  };
}

function allBuckets() {
  return [...STATIC_BUCKETS, getElecBucket()];
}
function allCourses() {
  return allBuckets().flatMap((b) =>
    b.courses.map((c) => ({ ...c, bid: b.id })),
  );
}
function validTermIds() {
  return new Set(generateTerms().map((t) => t.id));
}
function termCourses(tid) {
  return allCourses().filter((c) => state.assign[c.id] === tid);
}
function isDone(id) {
  return state.done.has(id) || state.assign[id] === "_transfer";
}
function courseName(c) {
  return state.names[c.id] || c.name;
}
function unassignedCourses() {
  const vt = validTermIds();
  return allCourses().filter(
    (c) =>
      !c.locked &&
      (!state.assign[c.id] ||
        (!vt.has(state.assign[c.id]) && state.assign[c.id] !== "_transfer")),
  );
}
function bucketProgress() {
  return allBuckets().map((b) => ({
    ...b,
    earned: Math.min(
      b.req,
      b.courses.reduce((a, c) => (isDone(c.id) ? a + c.cr : a), 0),
    ),
  }));
}
function totals() {
  const p = bucketProgress();
  const diss = p.find((b) => b.id === "dissertation")?.earned || 0;
  const cw = p
    .filter((b) => b.id !== "dissertation")
    .reduce((a, b) => a + b.earned, 0);
  return { p, cw, diss, total: cw + diss };
}

// Apply only validated snapshots. UI-only state and the stored key stay unchanged.
function applySnapshot(data) {
  Object.assign(state, data, {
    done: new Set(data.done),
    mdone: new Set(data.mdone),
    termDone: new Set(data.termDone),
  });
}

function load() {
  applySnapshot(dataStore.get());
  if (window.location.hash.startsWith("#view=")) {
    state.readOnly = true;
    // A shared page must not inherit private fields from the viewer's saved plan.
    applySnapshot(PhDTrackerData.initial);
    try {
      const data = JSON.parse(
        decodeURIComponent(atob(window.location.hash.slice(6))),
      );
      applySnapshot(PhDTrackerData.validate(data));
    } catch (error) {
      shareError =
        "This shared link is invalid. Your saved tracker has not been changed.";
    }
  }
  applyTheme();
  render();
}

function saveProgress() {
  if (state.readOnly) return;
  dataStore.save(JSON.parse(stateData()));
  updateSaveStatus();
}

// Render helpers
function bar(v, m) {
  const pct = Math.min((v / m) * 100, 100),
    col = v >= m ? GR : "var(--accent)";
  return /* HTML */ `<div class="track">
    <div class="fill" style="width:${pct}%;background:${col}"></div>
  </div>`;
}

function ring(v, m) {
  const sz = 118,
    sw = 10,
    r = (sz - sw) / 2,
    c2 = 2 * Math.PI * r,
    off = c2 * (1 - Math.min(v / m, 1)),
    col = v >= m ? GR : "var(--accent)";
  return /* HTML */ `<svg
    width="${sz}"
    height="${sz}"
    style="transform:rotate(-90deg)"
  >
    <circle
      cx="${sz / 2}"
      cy="${sz / 2}"
      r="${r}"
      fill="none"
      stroke="var(--bg2)"
      stroke-width="${sw}"
    />
    <circle
      cx="${sz / 2}"
      cy="${sz / 2}"
      r="${r}"
      fill="none"
      stroke="${col}"
      stroke-width="${sw}"
      stroke-dasharray="${c2}"
      stroke-dashoffset="${off}"
      stroke-linecap="round"
      style="transition:stroke-dashoffset .5s"
    />
  </svg>`;
}

function ck() {
  return /* HTML */ `<svg width="10" height="8" viewBox="0 0 10 8" fill="none">
    <path
      d="M1 4l2.5 2.5L9 1"
      stroke="white"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>`;
}

// Settings panel
function renderSettings() {
  return /* HTML */ `<div
    id="tracker-settings"
    class="csec"
    style="margin-bottom:14px;border:1px solid ${BL}55"
  >
    <div style="font-size:13px;font-weight:500;margin-bottom:12px">
      Program settings
    </div>
    <div class="srow" style="margin-bottom:8px">
      <span class="slbl">Your name</span>
      <input
        aria-label="Your name"
        maxlength="2000"
        type="text"
        value="${escapeHtml(state.userName)}"
        oninput="state.userName=this.value;saveProgress()"
        placeholder="e.g. Herbert Simon"
        style="flex:1;font-size:12px;padding:5px 8px;border:0.5px solid var(--bd2);border-radius:var(--rm);background:var(--bg1);color:var(--tx1);outline:none"
      />
    </div>
    <div class="srow" style="margin-bottom:10px">
      <span class="slbl">Email</span>
      <input
        aria-label="Email"
        maxlength="2000"
        type="email"
        value="${escapeHtml(state.userEmail)}"
        oninput="state.userEmail=this.value;saveProgress()"
        placeholder="e.g. hsimon@vt.edu"
        style="flex:1;font-size:12px;padding:5px 8px;border:0.5px solid var(--bd2);border-radius:var(--rm);background:var(--bg1);color:var(--tx1);outline:none"
      />
    </div>
    <div class="srow">
      <span class="slbl">Start semester</span>
      <div style="display:flex;gap:4px">
        ${["fall", "spring"].map((o) => /* HTML */ `<button data-edit class="pill ${state.startSem === o ? "on" : ""}" onclick="setStart('${o}',${state.startYear})">${o[0].toUpperCase() + o.slice(1)}</button>`).join("")}
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button
          data-edit
          class="btn"
          style="padding:4px 10px"
          onclick="setStart('${state.startSem}',${state.startYear - 1})"
          ${state.startYear <= 2022 ? "disabled" : ""}
        >
          &#8722;
        </button>
        <span
          style="font-size:13px;font-weight:500;min-width:38px;text-align:center"
          >${state.startYear}</span
        >
        <button
          data-edit
          class="btn"
          style="padding:4px 10px"
          onclick="setStart('${state.startSem}',${state.startYear + 1})"
          ${state.startYear >= 2027 ? "disabled" : ""}
        >
          +
        </button>
      </div>
    </div>
    <div class="srow" style="margin-top:8px">
      <span class="slbl">Appearance</span>
      <div style="display:flex;gap:4px">
        <button
          class="pill ${!state.darkMode ? "on" : ""}"
          onclick="setTheme(false)"
        >
          Light
        </button>
        <button
          class="pill ${state.darkMode ? "on" : ""}"
          onclick="setTheme(true)"
        >
          Dark
        </button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-top:2px">
      Changing start semester preserves your existing course assignments where
      possible.
    </div>
    <div
      style="border-top:0.5px solid var(--bd1);padding-top:10px;margin-top:10px"
    >
      <div
        style="font-size:12px;font-weight:500;color:var(--tx2);margin-bottom:8px"
      >
        Share &amp; export
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:8px">
        Share a read-only link with your advisor, or export a printable PDF
        report.
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" onclick="copyShareLink()">
          ${state.shareLinkCopied ? "&#10003; Link copied!" : "Copy share link"}
        </button>
        <button class="btn" onclick="openPrintView()">
          Print / Save as PDF
        </button>
      </div>
    </div>
    <div
      style="border-top:0.5px solid var(--bd1);padding-top:10px;margin-top:10px"
    >
      <div
        style="font-size:12px;font-weight:500;color:var(--tx2);margin-bottom:8px"
      >
        Backup &amp; restore
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:8px">
        Save a backup file to your device and reload it any time — even months
        later.
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <button class="btn" onclick="downloadBackup()">
          &#8681; Save backup file (.json)
        </button>
        <button
          class="btn"
          onclick="document.getElementById('file-inp').click()"
        >
          &#8679; Load from file
        </button>
        <input
          type="file"
          id="file-inp"
          accept=".json"
          onchange="loadFromFile(this)"
          style="display:none"
        />
      </div>
    </div>
    <div
      style="border-top:0.5px solid var(--bd1);padding-top:10px;margin-top:10px"
    >
      <div
        style="font-size:12px;font-weight:500;color:#c0392b;margin-bottom:6px"
      >
        Reset
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:8px">
        Clears all courses, milestones, DMP sessions, semester assignments, and
        custom names. Your name, email, start semester, and appearance settings
        are kept. This cannot be undone.
      </div>
      <button
        data-edit
        class="btn"
        onclick="resetAll()"
        style="border-color:#c0392b;color:#c0392b"
      >
        &#9888; Reset all progress
      </button>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-bottom:8px">
      New to the tracker? The User Guide covers all features, milestones, and
      frequently asked questions.
    </div>
    <a
      href="tracker-guide.html"
      target="_blank"
      style="display:inline-flex;align-items:center;gap:5px;background:var(--bg2);border:0.5px solid var(--bd2);border-radius:var(--rm);padding:5px 11px;font-size:12px;font-weight:500;color:var(--tx1);text-decoration:none"
      ><i class="ti ti-book" style="font-size:13px" aria-hidden="true"></i> Open
      User Guide</a
    >
    <div
      style="border-top:0.5px solid var(--bd1);padding-top:10px;margin-top:10px"
    >
      <div
        style="font-size:12px;font-weight:500;color:var(--tx2);margin-bottom:6px"
      >
        Disclaimer
      </div>
      <div style="font-size:11px;color:var(--tx3);line-height:1.7">
        ${DISCLAIMER.replace(/\n/g, "<br>")}
      </div>
    </div>
  </div>`;
}

// Tab: Dashboard
function renderDashboard() {
  const { p, cw, diss, total } = totals();
  return /* HTML */ `<div
      class="card"
      style="display:flex;align-items:center;gap:18px;flex-wrap:wrap"
    >
      <div style="position:relative;flex-shrink:0">
        ${ring(total, 90)}
        <div
          style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"
        >
          <div
            style="font-size:24px;font-weight:500;color:${total >= 90 ? GR : BL}"
          >
            ${total}
          </div>
          <div style="font-size:11px;color:var(--tx2)">of 90</div>
        </div>
      </div>
      <div style="flex:1;min-width:170px">
        <div style="font-size:15px;font-weight:500;margin-bottom:10px">
          ${Math.round((total / 90) * 100)}% complete
        </div>
        ${[
      { l: "Coursework", v: cw, m: 60 },
      { l: "Dissertation", v: diss, m: 30 },
    ]
      .map(
        (x) =>
          `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:12px;color:var(--tx2)">${x.l}</span><span style="font-size:12px;font-weight:500;color:${x.v >= x.m ? GR : BL}">${x.v}/${x.m} cr.</span></div>${bar(x.v, x.m)}</div>`,
      )
      .join("")}
        <div style="margin-top:4px">
          <div
            style="display:flex;justify-content:space-between;margin-bottom:3px"
          >
            <span style="font-size:12px;color:var(--tx2)">DMP sessions</span
            ><span
              style="font-size:12px;font-weight:500;color:${state.dmp >= 15 ? GR : BL}"
              >${state.dmp}/15</span
            >
          </div>
          ${bar(state.dmp, 15)}
          <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
            <button data-edit class="btn" onclick="adjustDmp(-1)">
              &#8722; session</button
            ><button data-edit class="btn" onclick="adjustDmp(1)">
              + session</button
            >${state.dmp >= 15 ? /* HTML */ `<span style="font-size:11px;color:${GR};font-weight:500">&#10003; complete</span>` : ""}
          </div>
        </div>
      </div>
    </div>
    <div
      style="font-size:11px;color:var(--tx2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;margin-top:4px;font-weight:500"
    >
      Credit buckets
    </div>
    <div class="g2">
      ${p
    .map(
      (b) =>
        /* HTML */ `<div
          class="csec"
          style="${b.earned >= b.req ? "border-color:" + GR + "55" : ""}"
        >
          <div
            style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px"
          >
            <span
              style="font-size:12px;font-weight:500;flex:1;padding-right:6px;line-height:1.35"
              >${b.name}</span
            ><span
              style="font-size:12px;font-weight:500;color:${b.earned >= b.req ? GR : BL}"
              >${b.earned}/${b.req}</span
            >
          </div>
          ${bar(b.earned, b.req)}${b.earned >= b.req ? /* HTML */ `<div style="font-size:10px;color:${GR};margin-top:3px;font-weight:500">&#10003; complete</div>` : ""}
        </div>`,
    )
    .join("")}
    </div>`;
}

// Tab: Planner
function renderPlanner() {
  const ua = unassignedCourses(),
    terms = generateTerms(),
    vt = validTermIds();
  const xferCourses = allCourses().filter(
    (c) => state.assign[c.id] === "_transfer",
  );
  const xferCr = xferCourses.reduce((a, c) => a + c.cr, 0);
  const isXP = state.picker === "_transfer";
  const avail = (c) =>
    !c.locked &&
    (!state.assign[c.id] ||
      (!vt.has(state.assign[c.id]) && state.assign[c.id] !== "_transfer"));
  const xferAvail = allCourses().filter(avail);
  const xferGrouped = allBuckets()
    .map((b) => ({ ...b, av: xferAvail.filter((c) => c.bid === b.id) }))
    .filter((b) => b.av.length > 0);
  return /* HTML */ `<div class="csec" style="margin-bottom:12px">
      <div
        style="display:flex;justify-content:space-between;align-items:center"
      >
        <div>
          <div style="font-size:13px;font-weight:500">Unscheduled courses</div>
          <div style="font-size:11px;color:var(--tx2);margin-top:1px">
            Click "add" on any section below
          </div>
        </div>
        <span
          style="font-size:22px;font-weight:500;color:${ua.length === 0 ? GR : AM}"
          >${ua.length}</span
        >
      </div>
      ${ua.length > 0 ? /* HTML */ `<div style="margin-top:8px;display:flex;flex-wrap:wrap">${ua.map((c) => /* HTML */ `<div class="chip"><span class="code">${c.code}</span><span style="font-size:12px;color:var(--tx1)">${escapeHtml(courseName(c).length > 28 ? courseName(c).slice(0, 28) + "..." : courseName(c))}</span></div>`).join("")}</div>` : /* HTML */ `<div style="font-size:12px;color:${GR};margin-top:6px;font-weight:500">&#10003; All courses placed</div>`}
    </div>
    <div class="card" style="border-color:${AM}55;margin-bottom:14px">
      <div
        style="display:flex;justify-content:space-between;align-items:flex-start"
      >
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--tx1)">
            Transfer in
          </div>
          <div style="font-size:11px;color:var(--tx2);margin-top:1px">
            Prior graduate work that counts toward your electives requirement
          </div>
        </div>
        <span
          style="font-size:13px;font-weight:500;color:${xferCr > 0 ? AM : "var(--tx2)"}"
          >${xferCr} cr.</span
        >
      </div>
      ${xferCourses.length > 0 ? /* HTML */ `<div style="margin-top:8px;display:flex;flex-wrap:wrap">${xferCourses.map((c) => /* HTML */ `<div class="chip"><span class="code">${c.code}</span><span style="font-size:12px">${escapeHtml(courseName(c).length > 22 ? courseName(c).slice(0, 22) + "..." : courseName(c))}</span><span style="font-size:11px;color:var(--tx2)">${c.cr} cr.</span><button data-edit class="cx" onclick="unassignCourse('${c.id}')" aria-label="Remove">&#x2715;</button></div>`).join("")}</div>` : ""}
      <div style="margin-top:8px">
        ${!isXP ? /* HTML */ `<button data-edit class="bsm" onclick="openPicker('_transfer')">+ add transferred course</button>` : /* HTML */ `<button class="bsm" onclick="closePicker()">cancel</button>`}
      </div>
      ${
      isXP
        ? /* HTML */ `<div class="picker">
            ${xferGrouped.length === 0 ? /* HTML */ `<div style="font-size:12px;color:var(--tx2);padding:4px 0">No unscheduled courses available.</div>` : ""}${xferGrouped
              .map(
                (g) =>
                  /* HTML */ `<div
                      style="font-size:10px;font-weight:500;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;margin:6px 0 2px"
                    >
                      ${g.name}
                    </div>
                    ${g.av.map((c) => /* HTML */ `<button type="button" data-edit class="pcourse" onclick="assignCourse('${c.id}','_transfer')"><span class="code">${c.code}</span><span style="font-size:13px;flex:1">${escapeHtml(courseName(c))}</span><span style="font-size:11px;font-weight:500;color:${AM}">${c.cr} cr.</span></button>`).join("")}`,
              )
              .join("")}
          </div>`
        : ""
    }
    </div>
    ${terms
    .map((tm) => {
      const tc = termCourses(tm.id),
        used = tc.reduce((a, c) => a + c.cr, 0),
        isP = state.picker === tm.id;
      const isDoneT = state.termDone.has(tm.id);
      const tmAvail = allCourses().filter(avail);
      const grouped = allBuckets()
        .map((b) => ({ ...b, av: tmAvail.filter((c) => c.bid === b.id) }))
        .filter((b) => b.av.length > 0);
      return /* HTML */ `<div
        class="card"
        style="${isDoneT ? "background:var(--bg2);border-color:" + GR + "44" : ""}"
      >
        <div
          style="display:flex;justify-content:space-between;align-items:center"
        >
          <div style="display:flex;align-items:center;gap:8px">
            <button
              type="button"
              data-edit
              aria-pressed="${isDoneT}"
              class="circ ${isDoneT ? "on" : ""}"
              onclick="toggleTermDone('${tm.id}')"
              style="width:18px;height:18px;border-width:1.5px;flex-shrink:0"
              aria-label="Mark ${tm.name} done"
            >
              ${isDoneT ? /* HTML */ `<svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>` : ""}
            </button>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span
                style="font-size:13px;font-weight:500;color:${isDoneT ? GR : "var(--tx1)"}"
                >${tm.name}</span
              >
              ${tm.label ? /* HTML */ `<span style="font-size:10px;background:var(--bg2);padding:1px 6px;border-radius:4px;color:var(--tx2);font-weight:500">${tm.label}</span>` : ""}
              ${tm.type === "summer" ? /* HTML */ `<span style="font-size:10px;color:${AM};font-weight:500">summer</span>` : ""}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:10px">
            <div
              style="font-size:13px;font-weight:500;color:${used > 0 ? BL : "var(--tx2)"}${used > 0 ? "" : ""}"
            >
              ${used} cr.
            </div>
          </div>
        </div>
        ${tc.length > 0 ? /* HTML */ `<div style="margin-top:8px;display:flex;flex-wrap:wrap">${tc.map((c) => /* HTML */ `<div class="chip"><span class="code">${c.code}</span><span style="font-size:12px">${escapeHtml(courseName(c).length > 22 ? courseName(c).slice(0, 22) + "..." : courseName(c))}</span><span style="font-size:11px;color:var(--tx2)">${c.cr} cr.</span><button data-edit class="cx" onclick="unassignCourse('${c.id}')" aria-label="Remove">&#x2715;</button></div>`).join("")}</div>` : ""}
        <div style="margin-top:8px">
          ${!isP ? /* HTML */ `<button data-edit class="bsm" onclick="openPicker('${tm.id}')">+ add course</button>` : /* HTML */ `<button class="bsm" onclick="closePicker()">cancel</button>`}
        </div>
        ${
        isP
          ? /* HTML */ `<div class="picker">
              ${grouped.length === 0 ? /* HTML */ `<div style="font-size:12px;color:var(--tx2);padding:4px 0">No unscheduled courses available.</div>` : ""}${grouped
                .map(
                  (g) =>
                    /* HTML */ `<div
                        style="font-size:10px;font-weight:500;color:var(--tx2);text-transform:uppercase;letter-spacing:.5px;margin:6px 0 2px"
                      >
                        ${g.name}
                      </div>
                      ${g.av.map((c) => /* HTML */ `<button type="button" data-edit class="pcourse" onclick="assignCourse('${c.id}','${tm.id}')"><span class="code">${c.code}</span><span style="font-size:13px;flex:1">${escapeHtml(courseName(c))}</span><span style="font-size:11px;font-weight:500;color:${BL}">${c.cr} cr.</span></button>`).join("")}`,
                )
                .join("")}
            </div>`
          : ""
      }
      </div>`;
    })
    .join("")}`;
}

// Tab: Courses
function renderCourses() {
  const { p, cw } = totals();
  const terms = generateTerms(),
    tn = (id) =>
      id === "_transfer"
        ? "Transfer in"
        : terms.find((t) => t.id === id)?.name || null;
  return /* HTML */ `<div
      class="csec"
      style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"
    >
      <span style="font-size:14px;font-weight:500">Coursework progress</span
      ><span style="font-size:14px;font-weight:500;color:${cw >= 60 ? GR : BL}"
        >${cw} / 60 credits</span
      >
    </div>
    ${p
    .map((b) => {
      const io = state.open.has(b.id);
      return /* HTML */ `<div
        class="card"
        style="${b.earned >= b.req ? "border-color:" + GR + "44" : ""}"
      >
        <button
          type="button"
          class="ahdr"
          aria-expanded="${io}"
          onclick="toggleBucket('${b.id}')"
        >
          <span
            ><span style="font-size:13px;font-weight:500">${b.name}</span
            ><span
              style="display:block;font-size:11px;color:var(--tx2);margin-top:1px"
              >${b.sub}</span
            ></span
          ><span style="display:flex;align-items:center;gap:8px"
            ><span
              style="font-size:12px;font-weight:500;color:${b.earned >= b.req ? GR : BL}"
              >${b.earned}/${b.req} cr.</span
            ><span style="font-size:12px;color:var(--tx2)"
              >${io ? "&#9650;" : "&#9660;"}</span
            ></span
          ></button
        >${
          io
            ? /* HTML */ `<div
                style="border-top:0.5px solid var(--bd1);padding-top:4px"
              >
                ${b.courses
                  .map((c) => {
                    const t = tn(state.assign[c.id]);
                    const isRen = state.renaming === c.id;
                    if (isRen)
                      return /* HTML */ `<div
                        class="crow"
                        style="cursor:default"
                        onclick="event.stopPropagation()"
                      >
                        <div class="chk ${isDone(c.id) ? "on" : ""}">
                          ${isDone(c.id) ? ck() : ""}
                        </div>
                        <div style="flex:1;min-width:0">
                          <div
                            style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:6px"
                          >
                            <span class="code">${c.code}</span
                            ><span
                              class="tag"
                              style="background:${c.tc}22;color:${c.tc}"
                              >${c.tag}</span
                            >
                          </div>
                          <input
                            id="rename-inp"
                            aria-label="Course name"
                            maxlength="2000"
                            value="${escapeHtml(courseName(c))}"
                            placeholder="${c.name}"
                            style="font-size:13px;background:var(--bg3);border:1px solid ${BL};border-radius:4px;padding:4px 8px;color:var(--tx1);width:100%"
                            onkeydown="if(event.key==='Enter')saveRename();if(event.key==='Escape')cancelRename()"
                            onclick="event.stopPropagation()"
                          />
                          <div style="display:flex;gap:6px;margin-top:6px">
                            <button
                              class="bsm"
                              onclick="event.stopPropagation();saveRename()"
                            >
                              Save</button
                            ><button
                              class="bsm"
                              onclick="event.stopPropagation();cancelRename()"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>`;
                    return /* HTML */ `<div class="crow">
                      <button
                        type="button"
                        data-edit
                        class="chk ${isDone(c.id) ? "on" : ""}"
                        aria-label="Complete ${escapeHtml(courseName(c))}"
                        aria-pressed="${isDone(c.id)}"
                        onclick="toggleCourse('${c.id}')"
                        ${c.locked ? "disabled" : ""}
                      >
                        ${isDone(c.id) ? ck() : ""}
                      </button>
                      <div style="flex:1;min-width:0">
                        <div
                          style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px"
                        >
                          <span class="code">${c.code}</span
                          ><span
                            class="tag"
                            style="background:${c.tc}22;color:${c.tc}"
                            >${c.tag}</span
                          >${t ? /* HTML */ `<span style="font-size:10px;background:var(--bg2);padding:1px 5px;border-radius:3px;color:var(--tx2);font-weight:500">${t}</span>` : ""}<span
                            style="font-size:11px;font-weight:500;color:${BL};margin-left:auto"
                            >${c.cr} cr.</span
                          >
                        </div>
                        <div style="display:flex;align-items:center;gap:4px">
                          <span
                            style="font-size:13px;color:var(--tx${isDone(c.id) ? "3" : "1"});${isDone(c.id) ? "text-decoration:line-through" : ""}"
                            >${escapeHtml(courseName(c))}</span
                          >${c.renameable ? /* HTML */ `<button data-edit onclick="event.stopPropagation();startRename('${c.id}')" style="background:none;border:none;cursor:pointer;color:var(--tx3);padding:0 3px;font-size:13px;line-height:1;opacity:.7" aria-label="Rename course">&#9998;</button>` : ""}
                        </div>
                        ${c.note && !state.names[c.id] ? /* HTML */ `<div style="font-size:11px;color:var(--tx3);margin-top:1px;font-style:italic">${c.note}</div>` : ""}
                      </div>
                    </div>`;
                  })
                  .join("")}
              </div>`
            : ""
        }
      </div>`;
    })
    .join("")}`;
}

// Tab: Milestones
function renderMilestones() {
  return `${MILESTONES.map(
    (m, i) =>
      /* HTML */ `<div style="display:flex;gap:10px;margin-bottom:4px">
        <div
          style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:28px"
        >
          <button
            type="button"
            data-edit
            aria-label="${escapeHtml(m.name)}"
            aria-pressed="${state.mdone.has(m.id)}"
            class="circ ${state.mdone.has(m.id) ? "on" : ""}"
            onclick="toggleMilestone('${m.id}')"
            style="margin-top:10px"
          >
            ${state.mdone.has(m.id) ? ck() : ""}</button
          >${i < MILESTONES.length - 1 ? /* HTML */ `<div style="width:1.5px;flex:1;min-height:12px;background:var(--bd1);margin:3px 0"></div>` : ""}
        </div>
        <div
          class="card"
          style="${state.mdone.has(m.id) ? "opacity:.6;border-color:" + GR + "44" : ""}"
        >
          <div
            style="font-size:13px;font-weight:500;${state.mdone.has(m.id) ? "text-decoration:line-through" : ""}"
          >
            ${m.name}
          </div>
          <div
            style="font-size:11px;color:${BL};font-weight:500;margin-top:2px"
          >
            ${m.target}
          </div>
          <div
            style="font-size:12px;color:var(--tx2);margin-top:5px;line-height:1.55"
          >
            ${m.desc}
          </div>
        </div>
      </div>`,
  ).join("")}`;
}

// Main render
function render() {
  const active = document.activeElement;
  const focusAction = active?.closest("[onclick]")?.getAttribute("onclick");
  const { total } = totals();
  document.getElementById("app").innerHTML = /* HTML */ ` <div class="topbar">
      <span style="font-size:13px;font-weight:700;color:var(--topbar-tx)"
        >PAPA PhD Tracker</span
      ><span style="font-size:11px;color:var(--topbar-link);margin-left:6px"
        >${VERSION}</span
      >
      <div style="display:flex;align-items:center;gap:14px">
        <a href="tracker-guide.html" target="_blank">User Guide</a
        ><a href="index.html">deanlefor.com</a>
      </div>
    </div>
    <div class="hdr">
      <div
        style="font-size:11px;color:var(--tx2);letter-spacing:.8px;text-transform:uppercase;margin-bottom:2px"
      >
        Virginia Tech &#183; CPAP
      </div>
      <div
        style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px"
      >
        <div style="font-size:19px;font-weight:500">PAPA PhD tracker</div>
        <button
          aria-expanded="${state.showSettings}"
          aria-controls="tracker-settings"
          onclick="toggleSettings()"
          style="background:${state.showSettings ? BL : "transparent"};border:0.5px solid ${state.showSettings ? BL : "var(--bd2)"};border-radius:var(--rm);padding:5px 10px;cursor:pointer;font-size:11px;font-weight:500;color:${state.showSettings ? "#fff" : "var(--tx2)"};display:flex;align-items:center;gap:4px"
        >
          <i
            class="ti ti-settings"
            style="font-size:13px"
            aria-hidden="true"
          ></i>
          Settings
        </button>
      </div>
      <div style="font-size:12px;color:var(--tx2)">
        <span style="font-weight:500;color:${BL}">${total}</span>/90 cr. &#183;
        <span style="font-weight:500;color:${BL}">${state.mdone.size}</span
        >/${MILESTONES.length} milestones &#183;
        <span style="font-weight:500;color:${BL}">${state.dmp}</span>/15 DMP
      </div>
      <div class="tabs">
        ${["dashboard", "planner", "courses", "milestones"].map((t) => /* HTML */ `<button class="tab ${state.tab === t ? "on" : ""}" onclick="selectTab('${t}')">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
      </div>
    </div>
    <div class="body">
      ${state.readOnly ? /* HTML */ `<div style="background:#E5751F;color:white;padding:8px 18px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:8px"><i class="ti ti-eye" aria-hidden="true"></i> Shared view — read only${state.userName ? ` · ${escapeHtml(state.userName)}` : ""}${state.userEmail ? ` · ${escapeHtml(state.userEmail)}` : ""}</div>` : ""}
      ${state.showSettings ? renderSettings() : ""}
      ${state.tab === "dashboard" ? renderDashboard() : state.tab === "planner" ? renderPlanner() : state.tab === "courses" ? renderCourses() : renderMilestones()}
    </div>`;
  applyTheme();
  updateSaveStatus();
  if (state.readOnly)
    document
      .querySelectorAll(
        '[data-edit], input, button[onclick*="resetAll"], button[onclick*="loadFromFile"]',
      )
      .forEach((el) => (el.disabled = true));
  if (focusAction)
    [...document.querySelectorAll("[onclick]")]
      .find((el) => el.getAttribute("onclick") === focusAction)
      ?.focus({ preventScroll: true });
  if (state.renaming) {
    requestAnimationFrame(() => {
      const inp = document.getElementById("rename-inp");
      if (inp) {
        inp.focus();
        inp.select();
      }
    });
  }
}

// Event handlers
function selectTab(t) {
  state.tab = t;
  state.picker = null;
  render();
}
function toggleBucket(id) {
  state.open.has(id) ? state.open.delete(id) : state.open.add(id);
  render();
}
function toggleCourse(id) {
  if (state.readOnly) return;
  state.done.has(id) ? state.done.delete(id) : state.done.add(id);
  saveProgress();
  render();
}
function toggleMilestone(id) {
  if (state.readOnly) return;
  state.mdone.has(id) ? state.mdone.delete(id) : state.mdone.add(id);
  saveProgress();
  render();
}
function adjustDmp(d) {
  if (state.readOnly) return;
  state.dmp = Math.min(15, Math.max(0, state.dmp + d));
  saveProgress();
  render();
}
function assignCourse(cid, tid) {
  if (state.readOnly) return;
  state.assign[cid] = tid;
  state.picker = null;
  saveProgress();
  render();
  [...document.querySelectorAll("button[onclick]")]
    .find((button) => button.getAttribute("onclick") === `openPicker('${tid}')`)
    ?.focus();
}
function unassignCourse(cid) {
  if (state.readOnly) return;
  delete state.assign[cid];
  saveProgress();
  render();
}
function openPicker(tid) {
  if (state.readOnly) return;
  state.picker = tid;
  render();
  document.querySelector("button.pcourse")?.focus();
}
function closePicker() {
  const tid = state.picker;
  state.picker = null;
  render();
  [...document.querySelectorAll("button[onclick]")]
    .find((button) => button.getAttribute("onclick") === `openPicker('${tid}')`)
    ?.focus();
}
function toggleSettings() {
  state.showSettings = !state.showSettings;
  render();
}

function toggleTermDone(id) {
  if (state.readOnly) return;
  state.termDone.has(id) ? state.termDone.delete(id) : state.termDone.add(id);
  saveProgress();
  render();
}

function stateData() {
  return JSON.stringify({
    done: [...state.done],
    mdone: [...state.mdone],
    dmp: state.dmp,
    assign: state.assign,
    names: state.names,
    termDone: [...state.termDone],
    startSem: state.startSem,
    startYear: state.startYear,
    darkMode: state.darkMode,
    userName: state.userName,
    userEmail: state.userEmail,
  });
}

function downloadBackup() {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob(
    [
      JSON.stringify({
        app: "papa-phd-tracker",
        schemaVersion: 1,
        ...JSON.parse(stateData()),
      }),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `phd-tracker-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadFromFile(input) {
  if (state.readOnly) return;
  const file = input.files[0];
  input.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const raw = JSON.parse(event.target.result);
      const candidate = PhDTrackerData.validate(raw);
      if (raw.userName === undefined) candidate.userName = state.userName;
      if (raw.userEmail === undefined) candidate.userEmail = state.userEmail;
      if (
        !confirm(
          "Replace your tracker with this validated backup? Save a backup of your current plan first if you want to keep it.",
        )
      )
        return;
      if (!dataStore.replace(candidate)) throw new Error(dataStore.error);
      applySnapshot(candidate);
      state.renaming = null;
      render();
    } catch (error) {
      alert(
        error.message ||
          "Could not read that tracker backup. Your previous data is unchanged.",
      );
      updateSaveStatus();
    }
  };
  reader.onerror = () =>
    alert("Could not read that file. Your previous data is unchanged.");
  reader.readAsText(file);
}

function resetAll() {
  if (state.readOnly) return;
  if (
    !confirm(
      "Reset all progress?\n\nThis will clear all completed courses, milestones, DMP sessions, semester assignments, and custom names.\n\nYour name, email, start semester, and appearance settings will be kept.\n\nThis cannot be undone.",
    )
  )
    return;
  state.done = new Set();
  state.mdone = new Set();
  state.dmp = 0;
  state.assign = {};
  state.names = {};
  state.termDone = new Set();
  state.open = new Set(["foundation", "methods", "electives", "dissertation"]);
  saveProgress();
  render();
}

function setTheme(dark) {
  state.darkMode = dark;
  applyTheme();
  saveProgress();
  render();
}

function setStart(sem, year) {
  if (state.readOnly) return;
  if (year < 2022 || year > 2027) return;
  state.startSem = sem;
  state.startYear = year;
  saveProgress();
  render();
}

function startRename(id) {
  if (state.readOnly) return;
  state.renaming = id;
  render();
}
function cancelRename() {
  state.renaming = null;
  render();
}
function saveRename() {
  if (state.readOnly) return;
  const inp = document.getElementById("rename-inp");
  if (inp) {
    const v = inp.value.trim();
    if (v) state.names[state.renaming] = v;
    else delete state.names[state.renaming];
  }
  state.renaming = null;
  saveProgress();
  render();
}

function copyShareLink() {
  const data = JSON.stringify({
    done: [...state.done],
    mdone: [...state.mdone],
    dmp: state.dmp,
    assign: state.assign,
    names: state.names,
    termDone: [...state.termDone],
    startSem: state.startSem,
    startYear: state.startYear,
    darkMode: state.darkMode,
    userName: state.userName,
    userEmail: state.userEmail,
  });
  const url =
    window.location.origin +
    window.location.pathname +
    "#view=" +
    btoa(encodeURIComponent(data));
  navigator.clipboard
    .writeText(url)
    .then(() => {
      state.shareLinkCopied = true;
      render();
      setTimeout(() => {
        state.shareLinkCopied = false;
        render();
      }, 2500);
    })
    .catch(() => prompt("Copy this share link:", url));
}

function openPrintView() {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Allow popups to open the printable report.");
    return;
  }
  w.document.write(generatePrintHTML());
  w.document.close();
}

function generatePrintHTML() {
  const { p, cw, diss, total } = totals();
  const terms = generateTerms();
  const xferCourses = allCourses().filter(
    (c) => state.assign[c.id] === "_transfer",
  );
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const startLabel =
    state.startSem[0].toUpperCase() +
    state.startSem.slice(1) +
    " " +
    state.startYear;

  const semRows = terms
    .map((tm) => {
      const tc = termCourses(tm.id);
      if (!tc.length) return "";
      const doneT = state.termDone.has(tm.id);
      return /* HTML */ `<tr style="background:${doneT ? "#f0fff4" : "white"}">
        <td
          style="padding:6px 8px;font-weight:600;white-space:nowrap;border-left:3px solid ${doneT ? "#639922" : "#E5751F"};font-size:11px"
        >
          ${tm.name}${tm.label ? ` <span style="font-weight:400;color:#888;font-size:10px">(${tm.label})</span>` : ""}
        </td>
        <td style="padding:6px 8px">
          ${tc.map((c) => /* HTML */ `<div style="font-size:11px;color:#1a1a1a">${c.code} — ${escapeHtml(courseName(c))}</div>`).join("")}
        </td>
        <td
          style="padding:6px 8px;text-align:right;color:#861F41;font-weight:600;font-size:11px;white-space:nowrap"
        >
          ${tc.reduce((a, c) => a + c.cr, 0)} cr.
        </td>
        <td
          style="padding:6px 8px;text-align:center;font-size:13px;color:#639922"
        >
          ${doneT ? "✓" : ""}
        </td>
      </tr>`;
    })
    .join("");

  const courseList = p
    .map(
      (b) =>
        /* HTML */ `<div style="margin-bottom:14px;break-inside:avoid">
          <div
            style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#861F41;margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid #E5751F"
          >
            ${b.name} · ${b.earned}/${b.req} cr.
          </div>
          ${b.courses
      .map((c) => {
        const done = isDone(c.id);
        return /* HTML */ `<div
          style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:.5px solid #f0f0f0"
        >
          <div
            style="width:13px;height:13px;border-radius:3px;border:1.5px solid ${done ? "#639922" : "#ccc"};background:${done ? "#639922" : "white"};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:white"
          >
            ${done ? "✓" : ""}
          </div>
          <span
            style="font-size:10px;font-family:monospace;background:#f5f5f5;padding:1px 4px;border-radius:2px;color:#666;flex-shrink:0"
            >${c.code}</span
          >
          <span
            style="font-size:11px;flex:1;color:${done ? "#aaa" : "#1a1a1a"};${done ? "text-decoration:line-through" : ""}"
            >${escapeHtml(courseName(c))}</span
          >
          <span style="font-size:10px;color:#861F41;font-weight:600"
            >${c.cr} cr.</span
          >
        </div>`;
      })
      .join("")}
        </div>`,
    )
    .join("");

  const mileRows = MILESTONES.map((m) => {
    const done = state.mdone.has(m.id);
    return /* HTML */ `<div
      style="display:flex;gap:10px;padding:5px 0;border-bottom:.5px solid #eee;align-items:flex-start"
    >
      <div
        style="width:15px;height:15px;border-radius:50%;border:1.5px solid ${done ? "#639922" : "#861F41"};background:${done ? "#639922" : "white"};flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;font-size:9px;color:white"
      >
        ${done ? "✓" : ""}
      </div>
      <div>
        <div
          style="font-size:11px;font-weight:600;color:${done ? "#aaa" : "#1a1a1a"};${done ? "text-decoration:line-through" : ""}"
        >
          ${m.name}
        </div>
        <div style="font-size:10px;color:#E5751F;margin-top:1px">
          ${m.target}
        </div>
      </div>
    </div>`;
  }).join("");

  return /* HTML */ `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>PAPA PhD Progress Report — ${startLabel}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family:
              -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #1a1a1a;
            background: white;
          }
          .no-print {
            background: #e5751f;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .no-print button {
            background: white;
            color: #e5751f;
            border: none;
            border-radius: 6px;
            padding: 6px 14px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          }
          .sec-title {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #861f41;
            border-bottom: 1.5px solid #861f41;
            padding-bottom: 4px;
            margin-bottom: 12px;
          }
          @media print {
            .no-print {
              display: none;
            }
            header,
            tr,
            td {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <span style="font-size:12px;font-weight:500"
            >Use your browser's print dialog (Ctrl+P / Cmd+P) to print or save
            as PDF</span
          ><button onclick="window.print()">Print / Save PDF</button>
        </div>
        <header style="background:#861F41;color:white;padding:20px 28px">
          <div
            style="font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:.7;margin-bottom:4px"
          >
            Virginia Tech · Center for Public Administration and Policy
          </div>
          <div style="font-size:22px;font-weight:700">
            PAPA PhD Progress Report
          </div>
          ${state.userName || state.userEmail ? /* HTML */ `<div style="font-size:13px;font-weight:500;margin-top:5px;opacity:.95">${escapeHtml([state.userName, state.userEmail].filter(Boolean).join(" · "))}</div>` : ""}
          <div style="font-size:11px;opacity:.8;margin-top:4px">
            Start: ${startLabel} · Generated ${dateStr}
          </div>
        </header>
        <div style="padding:20px 28px">
          <div style="margin-bottom:24px">
            <div class="sec-title">Progress summary</div>
            <div
              style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px"
            >
              ${[
          { l: "Total credits", v: total, m: 90 },
          { l: "Coursework", v: cw, m: 60 },
          { l: "Dissertation", v: diss, m: 30 },
          { l: "DMP sessions", v: state.dmp, m: 15 },
        ]
          .map(
            (x) =>
              `<div style="text-align:center;padding:10px;background:#f5f1f2;border-radius:6px"><div style="font-size:24px;font-weight:700;color:${x.v >= x.m ? "#639922" : "#861F41"}">${x.v}</div><div style="font-size:10px;color:#666;margin-top:1px">${x.l}</div><div style="font-size:10px;color:#999">of ${x.m}</div></div>`,
          )
          .join("")}
            </div>
          </div>
          <div style="margin-bottom:24px">
            <div class="sec-title">Semester plan</div>
            ${
        xferCourses.length
          ? /* HTML */ `<div
              style="margin-bottom:8px;padding:8px 10px;background:#fff8f0;border-left:3px solid #E5751F;border-radius:3px"
            >
              <div
                style="font-size:10px;font-weight:600;color:#E5751F;margin-bottom:3px"
              >
                Transfer in
              </div>
              ${xferCourses.map((c) => /* HTML */ `<div style="font-size:11px">${c.code} — ${escapeHtml(courseName(c))} · ${c.cr} cr.</div>`).join("")}
            </div>`
          : ""
      }
            ${
        semRows
          ? /* HTML */ `<table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#f5f1f2">
                  <th
                    style="padding:6px 8px;text-align:left;font-size:10px;color:#666;font-weight:600;text-transform:uppercase"
                  >
                    Term
                  </th>
                  <th
                    style="padding:6px 8px;text-align:left;font-size:10px;color:#666;font-weight:600;text-transform:uppercase"
                  >
                    Courses
                  </th>
                  <th
                    style="padding:6px 8px;text-align:right;font-size:10px;color:#666;font-weight:600;text-transform:uppercase"
                  >
                    Cr.
                  </th>
                  <th
                    style="padding:6px 8px;text-align:center;font-size:10px;color:#666;font-weight:600;text-transform:uppercase"
                  >
                    Done
                  </th>
                </tr>
              </thead>
              <tbody>
                ${semRows}
              </tbody>
            </table>`
          : '<div style="font-size:12px;color:#999;padding:8px 0">No courses scheduled yet.</div>'
      }
          </div>
          <div class="page-break" style="margin-bottom:24px">
            <div class="sec-title">Course completion</div>
            <div style="columns:2;column-gap:24px">${courseList}</div>
          </div>
          <div style="margin-bottom:24px">
            <div class="sec-title">Milestones</div>
            ${mileRows}
          </div>
          <div
            style="font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px;margin-top:8px"
          >
            Generated by PAPA PhD Tracker · deanlefor.com/tracker.html · For
            planning purposes only — confirm all requirements with your advisor
            and the VT Graduate School.
          </div>
        </div>
      </body>
    </html>`;
}

load();
