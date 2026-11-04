/* A synthetic illustration only. No files, PDF processing, or network requests. */
(() => {
  "use strict";

  const comparison = document.getElementById("comparison");
  const slider = document.getElementById("comparison-slider");
  if (!comparison || !slider) return;

  const source = document.getElementById("source-page");
  const notes = document.getElementById("margin-notes");
  const description = document.getElementById("pdf-description");
  const readout = document.getElementById("layout-readout");
  const buttons = comparison.querySelectorAll("[data-state]");

  function update() {
    const progress = Number(slider.value) / 100;
    const scale = 1 - progress * 0.25;
    const percentage = Math.round(scale * 100);
    // A Letter page at 75%, middle-left: x = 0, y = (518 - 518 * .75) / 2.
    // Transform the one original group uniformly, preserving every line and its aspect ratio.
    source.setAttribute("transform", `translate(0 ${(518 * (1 - scale)) / 2}) scale(${scale})`);
    notes.setAttribute("opacity", String(Math.max(0, (progress - 0.65) / 0.35)));

    const before = progress === 0;
    const after = progress === 1;
    const state = before ? "Before" : after ? "After" : "Comparison";
    const detail = before
      ? "original page, no added annotation space"
      : `${percentage}% scale, middle-left, ${after ? "with room for notes" : "creating annotation space"}`;

    slider.setAttribute("aria-valuetext", `${state}: ${detail}`);
    readout.textContent = before ? "100% scale / Original page" : `${percentage}% scale / Middle-left`;
    description.textContent = `${state}: ${detail}. The same article is scaled and positioned on a new portrait page without changing its text or proportions. Example notes are added afterward in your own annotation app.`;
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.state === "before" ? before : after));
    }
  }

  slider.addEventListener("input", update);
  for (const button of buttons) {
    button.addEventListener("click", () => {
      slider.value = button.dataset.state === "before" ? "0" : "100";
      update();
    });
  }

  // The static After illustration remains useful when JavaScript is unavailable.
  for (const control of comparison.querySelectorAll("[hidden]")) control.hidden = false;
  update();
})();
