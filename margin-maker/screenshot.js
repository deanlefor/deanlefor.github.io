/* Progressive enhancement: the original image links work without this script. */
(() => {
  "use strict";

  const dialog = document.getElementById("screenshot-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const zoom = document.getElementById("screenshot-zoom");
  let opener;

  for (const link of document.querySelectorAll("[data-screenshot-open]")) {
    link.addEventListener("click", (event) => {
      // Preserve the usual open-in-new-tab/window shortcuts.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      dialog.showModal();
    });
  }

  document.getElementById("screenshot-close").addEventListener("click", () => dialog.close());
  zoom.addEventListener("click", () => {
    const zoomed = dialog.toggleAttribute("data-zoomed");
    zoom.setAttribute("aria-pressed", String(zoomed));
    zoom.textContent = zoomed ? "Fit to window" : "Actual size";
  });
  dialog.addEventListener("close", () => {
    dialog.removeAttribute("data-zoomed");
    zoom.setAttribute("aria-pressed", "false");
    zoom.textContent = "Actual size";
    opener?.focus();
  });
  // Native dialog behavior handles Escape, background inertness, and focus containment.
})();
