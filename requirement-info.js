(function (global) {
  "use strict";

  // Add explanations here and call render(key) beside the relevant heading.
  // This component owns only temporary UI state, never tracker progress.
  const explanations = {
    foundation: {
      title: "Foundation Courses (18 credits)",
      paragraphs: [
        "Six required courses covering five foundational areas of public administration: theory and context, organizations, public policy, management, and ethics. These establish the scholarly foundation for doctoral research.",
      ],
    },
    methods: {
      title:
        "Research Foundations, Analysis, and Measurement Tools (9 credits)",
      paragraphs: [
        "Three courses developing research design, inquiry, and analytical skills: PAPA 6294 (Cornerstone), PAPA 6514 (Public Administration and Policy Inquiry), and one advisor-approved advanced quantitative or qualitative methods course.",
        "Advanced Methods is one specific three-credit requirement within this nine-credit sequence.",
      ],
    },
    advancedMethods: {
      title: "Advanced Methods (3 credits)",
      paragraphs: [
        "One advisor-approved course in advanced quantitative or qualitative research techniques relevant to your research interests. Examples include ethnography, textual analysis, historical research, survey design, time-series analysis, and simulation.",
        "Part of the nine-credit Research Foundations, Analysis, and Measurement Tools sequence, alongside PAPA 6294 and PAPA 6514. Advanced Topics courses do not automatically satisfy the Advanced Methods requirement.",
      ],
    },
    conc: {
      title: "Research Concentration (12 credits total)",
      paragraphs: [
        "An individualized area of specialized study developed with a faculty advisor to build expertise in a subject, theoretical approach, empirical literature, or research methodology.",
        "Nine credits of focused study may include graduate courses, independent studies, internships, or field studies. The work can support dissertation development but does not have to focus on the dissertation topic.",
        "A separate three-credit Concentration Lecture (PAPA 7964) completes the 12-credit requirement. The tracker lists the nine study credits and three lecture credits separately.",
      ],
    },
    lecture: {
      title: "Concentration Lecture (PAPA 7964, 3 credits)",
      paragraphs: [
        "A formal presentation integrating your nine credits of research concentration work. Complete it after the focused study and before the dissertation prospectus defense.",
        "Present it to your faculty advisor and an audience of at least six other participants.",
      ],
    },
    electives: {
      title: "Electives (18 credits)",
      paragraphs: [
        "Graduate courses selected to broaden or deepen scholarly expertise. May include PAPA Advanced Topics courses, other Virginia Tech graduate courses, and approved transfer coursework.",
      ],
    },
    capstone: {
      title: "Capstone Seminar (3 credits)",
      paragraphs: [
        "PAPA 6394, taken toward the end of coursework, supports the development of an independent research proposal or dissertation prospectus.",
      ],
    },
    dissertation: {
      title: "Research and Dissertation (30 credits)",
      paragraphs: [
        "PAPA 7994 credits supporting independent doctoral research and dissertation development. Three of the 30 credits are associated with the Doctoral Mentoring Program or approved equivalent activities.",
      ],
    },
  };
  let active = null;

  function render(key) {
    const info = Object.hasOwn(explanations, key) ? explanations[key] : null;
    if (!info) return "";
    const escape = global.SiteData.escapeHtml;
    const id = `requirement-info-${key}`;
    return `<span class="requirement-info">
      <button type="button" class="requirement-info-trigger" data-requirement-info
        aria-label="About ${escape(info.title)}" aria-haspopup="dialog"
        aria-expanded="false" aria-controls="${id}"><span aria-hidden="true">ⓘ</span></button>
      <span class="requirement-popover" id="${id}" role="dialog" aria-modal="false"
        aria-labelledby="${id}-title" tabindex="-1" hidden>
        <span class="requirement-popover-heading"><span id="${id}-title">${escape(info.title)}</span>
          <button type="button" class="requirement-info-close" data-requirement-close aria-label="Close requirement explanation"><span aria-hidden="true">×</span></button></span>
        ${info.paragraphs.map((text) => `<span class="requirement-popover-paragraph">${escape(text)}</span>`).join("")}
        <span class="requirement-popover-approval">Confirm course eligibility and Plan of Study placement with the appropriate faculty advisor.</span>
      </span>
    </span>`;
  }

  function close(restoreFocus = false) {
    if (!active) return;
    const { trigger, panel } = active;
    active = null;
    trigger.setAttribute("aria-expanded", "false");
    trigger.parentElement.classList.remove("is-open");
    panel.hidden = true;
    if (restoreFocus && trigger.isConnected)
      trigger.focus({ preventScroll: true });
  }

  function position() {
    if (!active) return;
    const { trigger, panel } = active;
    const anchor = trigger.getBoundingClientRect();
    const width = document.documentElement.clientWidth || global.innerWidth;
    const height = global.innerHeight;
    if (!trigger.isConnected || anchor.bottom < 0 || anchor.top > height) {
      close();
      return;
    }
    // Fit on one side of the icon so it remains reachable for a second tap.
    panel.style.maxHeight = "";
    const bounds = panel.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left, width - bounds.width - 12));
    const below = Math.max(0, height - anchor.bottom - 18);
    const above = Math.max(0, anchor.top - 18);
    const placeBelow = bounds.height <= below || below >= above;
    panel.style.maxHeight = `${Math.min(bounds.height, placeBelow ? below : above)}px`;
    const fittedHeight = panel.getBoundingClientRect().height;
    const top = placeBelow ? anchor.bottom + 6 : anchor.top - fittedHeight - 6;
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.max(12, top)}px`;
  }

  // Delegation keeps the component working when the tracker rerenders controls.
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-requirement-info]");
    if (trigger) {
      if (active?.trigger === trigger) {
        close(true);
        return;
      }
      close();
      const panel = document.getElementById(
        trigger.getAttribute("aria-controls"),
      );
      if (!panel) return;
      active = { trigger, panel };
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      trigger.parentElement.classList.add("is-open");
      position();
      panel.focus({ preventScroll: true });
      return;
    }
    if (active && event.target.closest("[data-requirement-close]")) close(true);
    else if (active && !active.panel.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (active && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  });
  global.addEventListener("resize", position);
  global.addEventListener(
    "scroll",
    (event) => {
      // Scrolling a long explanation should not resize it or reset its scroll.
      if (
        event.target instanceof global.Node &&
        active?.panel.contains(event.target)
      )
        return;
      position();
    },
    true,
  );

  global.RequirementInfo = { render, close };
})(window);
