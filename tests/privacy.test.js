const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { root } = require("./dom-helpers.js");

test("Git excludes private exports and credentials, while keeping project JSON trackable", () => {
  const privateFiles = [
    ".env",
    ".env.production",
    "nested/.env.test",
    "retirement-inputs.json",
    "downloads/retirement-inputs-2026-09-06.json",
    "phd-tracker-2026-09-06.json",
    "nd-run-backup-2026-09-06.json",
    "game-history-backup-2026-09-06.json",
    "game-history-before-restore-2026-09-06.json",
    ".private/notes.md",
    "credentials.key",
  ];
  const ignored = execFileSync(
    "git",
    ["check-ignore", "--no-index", "--stdin"],
    {
      cwd: root,
      input: privateFiles.join("\n") + "\n",
      encoding: "utf8",
    },
  )
    .trim()
    .split("\n");
  assert.deepEqual(ignored, privateFiles);
  const publicFiles = [
    "package.json",
    "package-lock.json",
    "apps/fers-retirement/package.json",
    "tests/fixtures/example.json",
    ".env.example",
  ];
  const check = spawnSync("git", ["check-ignore", "--no-index", "--stdin"], {
    cwd: root,
    input: publicFiles.join("\n") + "\n",
    encoding: "utf8",
  });
  assert.equal(check.status, 1);
  assert.equal(check.stdout, "");
});

test("no tracked file bypasses the repository ignore protections", () => {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root });
  const check = spawnSync(
    "git",
    ["check-ignore", "--no-index", "-z", "--stdin"],
    {
      cwd: root,
      input: tracked,
      encoding: "utf8",
    },
  );
  // --no-index catches even files that were force-added past .gitignore.
  assert.equal(
    check.stdout,
    "",
    "remove any tracked file matching an ignore rule",
  );
  assert.equal(check.status, 1);
});

test("public pages restrict external JavaScript and have a privacy explanation", () => {
  const files = [
    ...fs.readdirSync(root).filter((f) => f.endsWith(".html")),
    ...fs
      .readdirSync(path.join(root, "projects"))
      .filter((f) => f.endsWith(".html"))
      .map((f) => `projects/${f}`),
    "fers-retirement/index.html",
  ];
  for (const file of files) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, file), "utf8"));
    try {
      const { document } = dom.window;
      const policy = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      assert.ok(policy, file);
      const directives = Object.fromEntries(
        policy.content.split(";").map((part) => {
          const [name, ...sources] = part.trim().split(/\s+/);
          return [name, sources];
        }),
      );
      assert.ok(
        directives["script-src"].every((s) =>
          ["'self'", "'unsafe-inline'", "'none'"].includes(s),
        ),
        file,
      );
      assert.deepEqual(directives["object-src"], ["'none'"]);
      assert.deepEqual(directives["form-action"], ["'none'"]);
      assert.equal(
        document.querySelector('meta[name="referrer"]').content,
        "no-referrer",
      );
      for (const script of document.querySelectorAll("script[src]"))
        assert.equal(
          new URL(script.getAttribute("src"), "https://site.test/").origin,
          "https://site.test",
          file,
        );
      if (file === "fers-retirement/index.html")
        assert.deepEqual(directives["script-src"], ["'self'"]);
    } finally {
      dom.window.close();
    }
  }
  const css = fs.readFileSync(
    path.join(root, "vendor/leaflet/leaflet.css"),
    "utf8",
  );
  for (const [, image] of css.matchAll(/url\((images\/[^)]+)\)/g))
    assert.ok(fs.existsSync(path.join(root, "vendor/leaflet", image)), image);
});
