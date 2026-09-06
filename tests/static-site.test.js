const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const { JSDOM } = require("jsdom");
const { root } = require("./dom-helpers.js");
const { validate } = require("../tracker-data.js");

function publicFiles(directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (
      entry.name.startsWith(".") ||
      ["node_modules", "apps", "tests"].includes(entry.name)
    )
      return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? publicFiles(file) : [file];
  });
}

const files = publicFiles();
test("all public HTML pages have existing local link and asset targets and valid inline scripts", () => {
  const failures = [];
  for (const file of files.filter((file) => file.endsWith(".html"))) {
    const dom = new JSDOM(fs.readFileSync(file, "utf8"));
    try {
      for (const element of dom.window.document.querySelectorAll(
        "[href], [src]",
      )) {
        const raw = element.getAttribute("href") ?? element.getAttribute("src");
        if (!raw || raw.startsWith("#") || /^(?:[a-z]+:|\/\/)/i.test(raw))
          continue;
        const relative = decodeURIComponent(raw.split(/[?#]/)[0]);
        const target = path.resolve(
          raw.startsWith("/") ? root : path.dirname(file),
          relative.replace(/^\//, ""),
        );
        if (!fs.existsSync(target))
          failures.push(`${path.relative(root, file)}: ${raw}`);
      }
      for (const script of dom.window.document.querySelectorAll(
        "script:not([src])",
      )) {
        if (script.type && script.type !== "text/javascript") continue;
        new vm.Script(script.textContent, { filename: file });
      }
    } finally {
      dom.window.close();
    }
  }
  assert.deepEqual(failures, []);
});

test("all public JavaScript files parse successfully", () => {
  for (const file of files.filter(
    (file) => file.endsWith(".js") && !file.endsWith(".test.js"),
  )) {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  }
});

test("the guide share link contains valid example data and points to the tracker", () => {
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "tracker-guide.html"), "utf8"),
  );
  try {
    const href = dom.window.document
      .querySelector('a[href*="#view="]')
      .getAttribute("href");
    assert.ok(href.startsWith("tracker.html#view="));
    const data = validate(
      JSON.parse(
        decodeURIComponent(
          Buffer.from(href.split("#view=")[1], "base64").toString(),
        ),
      ),
    );
    assert.equal(data.userName, "Example student");
    assert.equal(data.userEmail, "");
    assert.ok(data.done.length > 0);
  } finally {
    dom.window.close();
  }
});
