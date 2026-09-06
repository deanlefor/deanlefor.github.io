const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");

// Execute the real local page scripts against an isolated DOM. Never load remote assets.
function page(
  file,
  {
    hash = "",
    stored = {},
    blockedRead = false,
    blockedWrite = false,
    reducedMotion = true,
    fileText = "",
  } = {},
) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const scriptPattern = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  const scripts = [...html.matchAll(scriptPattern)].map((match) => match[0]);
  // Defer script execution until the storage/browser fixtures are installed, but
  // let jsdom execute native inline event handlers when a test clicks a control.
  const dom = new JSDOM(html.replace(scriptPattern, ""), {
    url: `https://website.test/${file}${hash}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.structuredClone = structuredClone;
  const alerts = [],
    confirms = [],
    storage = new Map(Object.entries(stored)),
    frames = new Map();
  let frameId = 0;
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem(key) {
        if (blockedRead) throw new Error("SecurityError");
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        if (blockedWrite) throw new Error("QuotaExceededError");
        storage.set(key, value);
      },
    },
  });
  window.alert = (text) => alerts.push(text);
  window.confirm = (text) => {
    confirms.push(text);
    return true;
  };
  window.matchMedia = () => ({
    matches: reducedMotion,
    addEventListener() {},
    removeEventListener() {},
  });
  window.requestAnimationFrame = (callback) => {
    frames.set(++frameId, callback);
    return frameId;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
  };
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {},
    beginPath() {},
    arc() {},
    fill() {},
  });
  window.FileReader = class {
    readAsText() {
      this.result = fileText;
      this.onload({ target: { result: fileText } });
    }
  };
  const context = dom.getInternalVMContext();
  for (const markup of scripts) {
    const container = window.document.createElement("div");
    container.innerHTML = markup;
    const script = container.firstElementChild;
    if (script.type === "application/ld+json") continue;
    const src = script.getAttribute("src");
    if (src && /^https?:/.test(src)) continue;
    if (src === "runner.js") continue; // Tests control boot and command submission explicitly.
    const scriptFile = src?.startsWith("/")
      ? path.join(root, src)
      : path.resolve(root, path.dirname(file), src || "");
    const text = src ? fs.readFileSync(scriptFile, "utf8") : script.textContent;
    new vm.Script(text, { filename: src || file }).runInContext(context);
  }
  return {
    dom,
    window,
    document: window.document,
    alerts,
    confirms,
    storage,
    frames,
  };
}
module.exports = { page, root };
