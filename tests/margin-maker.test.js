const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const directory = path.join(__dirname, "../margin-maker");
const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
const script = fs.readFileSync(path.join(directory, "comparison.js"), "utf8");
const screenshotScript = fs.readFileSync(path.join(directory, "screenshot.js"), "utf8");

function page(t, javascript = true) {
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  t.after(() => dom.window.close());
  if (javascript) dom.window.eval(script);
  return dom.window;
}

test("comparison endpoints preserve the same reading and announce the selected layout", (t) => {
  const { document } = page(t);
  const source = document.getElementById("source-page");
  const original = source.innerHTML;
  const slider = document.getElementById("comparison-slider");
  const before = document.querySelector('[data-state="before"]');
  const after = document.querySelector('[data-state="after"]');

  before.click();
  assert.equal(slider.value, "0");
  assert.equal(source.getAttribute("transform"), "translate(0 0) scale(1)");
  assert.equal(document.getElementById("margin-notes").getAttribute("opacity"), "0");
  assert.equal(before.getAttribute("aria-pressed"), "true");
  assert.equal(after.getAttribute("aria-pressed"), "false");
  assert.match(slider.getAttribute("aria-valuetext"), /^Before: original page/);

  after.click();
  assert.equal(slider.value, "100");
  assert.equal(source.getAttribute("transform"), "translate(0 64.75) scale(0.75)");
  assert.equal(document.getElementById("margin-notes").getAttribute("opacity"), "1");
  assert.equal(after.getAttribute("aria-pressed"), "true");
  assert.equal(before.getAttribute("aria-pressed"), "false");
  assert.match(slider.getAttribute("aria-valuetext"), /^After: 75% scale, middle-left/);
  assert.equal(source.innerHTML, original, "no article text or wrapping may change");
});

test("range input updates an intermediate comparison without falsely selecting an endpoint", (t) => {
  const window = page(t);
  const { document } = window;
  const slider = document.getElementById("comparison-slider");
  slider.value = "50";
  slider.dispatchEvent(new window.Event("input", { bubbles: true }));

  assert.match(slider.getAttribute("aria-valuetext"), /^Comparison: 88% scale/);
  assert.match(document.getElementById("pdf-description").textContent, /^Comparison:/);
  assert.match(document.getElementById("layout-readout").textContent, /88% scale/);
  for (const button of document.querySelectorAll("[data-state]")) {
    assert.equal(button.getAttribute("aria-pressed"), "false");
  }
  assert.equal(document.getElementById("source-page").getAttribute("transform"), "translate(0 32.375) scale(0.875)");
  assert.equal(document.querySelectorAll('input[type="file"]').length, 0);
});

test("without JavaScript the After illustration remains while inactive controls stay hidden", (t) => {
  const { document } = page(t, false);
  assert.match(document.getElementById("source-page").getAttribute("transform"), /scale\(0\.75\)/);
  assert.equal(document.querySelector(".state-buttons").hidden, true);
  assert.equal(document.querySelector(".slider-controls").hidden, true);
  assert.match(document.querySelector("noscript").textContent, /Enable JavaScript/);
});

test("screenshot inspection restores focus and resets actual-size zoom when reopened", (t) => {
  const window = page(t, false);
  const { document } = window;
  const dialog = document.getElementById("screenshot-dialog");
  // Model the native dialog methods here; focus containment and Escape are checked in-browser.
  dialog.showModal = () => dialog.setAttribute("open", "");
  dialog.close = () => {
    dialog.removeAttribute("open");
    dialog.dispatchEvent(new window.Event("close"));
  };
  window.eval(screenshotScript);
  const opener = document.querySelector("[data-screenshot-open]");
  const zoom = document.getElementById("screenshot-zoom");

  opener.click();
  assert.equal(dialog.open, true);
  zoom.click();
  assert.equal(zoom.getAttribute("aria-pressed"), "true");
  document.getElementById("screenshot-close").click();
  assert.equal(dialog.open, false);
  assert.equal(document.activeElement, opener);

  opener.click();
  assert.equal(dialog.open, true);
  assert.equal(zoom.getAttribute("aria-pressed"), "false");
  assert.equal(dialog.hasAttribute("data-zoomed"), false);
});

test("without native dialog support screenshot links retain their original-image fallback", (t) => {
  const window = page(t, false);
  const { document } = window;
  document.getElementById("screenshot-dialog").showModal = undefined;
  window.eval(screenshotScript);
  const link = document.querySelector("[data-screenshot-open]");
  let prevented;
  link.addEventListener("click", (event) => {
    prevented = event.defaultPrevented;
    event.preventDefault(); // Avoid navigation in this DOM-only test.
  });
  link.click();
  assert.equal(prevented, false);
  assert.equal(link.getAttribute("href"), "assets/app-screenshot.png");
});
