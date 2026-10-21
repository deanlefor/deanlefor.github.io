// Generate both guide examples from the real tracker and one fictional plan.
// Render the emitted HTML to replace Progress_Report_Example.pdf after visual QA.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { page, root } = require("../tests/dom-helpers.js");
const { validate } = require("../tracker-data.js");
const example = validate(require("../tests/fixtures/tracker-example.json"));
const p = page("tracker.html", {
  stored: { "phd-tracker-v2": JSON.stringify(example) },
});
try {
  const version = p.document
    .querySelector(".topbar")
    .textContent.match(/v(\d+\.\d+)/)[1];
  const href = `tracker.html?v=${version}#view=${Buffer.from(encodeURIComponent(JSON.stringify(example))).toString("base64")}`;
  const guideFile = path.join(root, "tracker-guide.html");
  const guide = fs.readFileSync(guideFile, "utf8");
  if (!/href="tracker\.html(?:\?[^"#]*)?#view=[^"]*"/.test(guide))
    throw new Error("Guide example link not found");
  fs.writeFileSync(
    guideFile,
    guide.replace(
      /href="tracker\.html(?:\?[^"#]*)?#view=[^"]*"/,
      `href="${href}"`,
    ),
  );
  const output =
    process.argv[2] || path.join(os.tmpdir(), "papa-tracker-example.html");
  fs.writeFileSync(output, p.window.generatePrintHTML());
  console.log(`Updated guide share example; print HTML: ${output}`);
} finally {
  p.dom.window.close();
}
