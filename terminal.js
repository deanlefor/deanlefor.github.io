// terminal.js

// —————————————————————————————————————————————————————————————
// 1. State & Config
// —————————————————————————————————————————————————————————————
let cwdKey = "";
// Attach currentInput to the window object to ensure it's
// globally accessible across all scripts.
window.currentInput = "";
let typingSpeed = 15; // ms per character
const defaultSpeed = 15;
const lineQueue = [];
let isPrinting = false;

window.isShutdown = false;

// --- Command History ---
// Attach history to the window object to ensure it's globally
// accessible across all scripts.
window.commandHistory = [];
window.historyIndex = 0;
// --- End Command History ---

// —————————————————————————————————————————————————————————————
// 2. Prompt Helpers
// —————————————————————————————————————————————————————————————
function getPrompt() {
  return `C:\\Dean${cwdKey ? "\\" + cwdKey : ""}>`;
}

function updatePrompt() {
  document.getElementById("prompt-line").textContent = getPrompt();
  scrollToBottom();
}

// —————————————————————————————————————————————————————————————
// 3. Scrolling Helper
// —————————————————————————————————————————————————————————————
function scrollToBottom() {
  const terminal = document.getElementById("terminal");
  if (terminal) {
    terminal.scrollTop = terminal.scrollHeight;
  }
}

// —————————————————————————————————————————————————————————————
// 4. Echo & Typing Animation
// —————————————————————————————————————————————————————————————
let outputTimer = null;
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function appendOutputLine(text = "") {
  const output = document.getElementById("output");
  if (output.childNodes.length)
    output.appendChild(document.createTextNode("\n"));
  const line = document.createTextNode(text);
  output.appendChild(line);
  return line;
}

function echoLine(text) {
  appendOutputLine(text);
  scrollToBottom();
}

function cancelOutput() {
  clearInterval(outputTimer);
  outputTimer = null;
  lineQueue.length = 0;
  isPrinting = false;
}

function enqueueLine(text) {
  if (text === undefined) return;
  lineQueue.push(String(text));
  if (!isPrinting) processQueue();
}

function processQueue() {
  if (!lineQueue.length) {
    isPrinting = false;
    outputTimer = null;
    updatePrompt();
    if (!window.isShutdown)
      document.getElementById("input-wrapper").style.display = "inline-flex";
    return;
  }
  isPrinting = true;
  if (prefersReducedMotion()) {
    while (lineQueue.length) appendOutputLine(lineQueue.shift());
    processQueue();
    return;
  }
  const text = lineQueue.shift();
  const line = appendOutputLine();
  let index = 0;
  outputTimer = setInterval(() => {
    if (index < text.length) line.appendData(text[index++]);
    else {
      clearInterval(outputTimer);
      processQueue();
    }
    scrollToBottom();
  }, typingSpeed);
}

// —————————————————————————————————————————————————————————————
// 5. Mobile Viewport & Keyboard Helper
// —————————————————————————————————————————————————————————————
function handleViewportChanges() {
  const terminal = document.getElementById("terminal");
  if (!terminal) return;

  // Use the VisualViewport API for a reliable mobile experience.
  // This modern API correctly handles the on-screen keyboard.
  if (window.visualViewport) {
    const setTerminalHeight = () => {
      terminal.style.height = `${window.visualViewport.height}px`;
      scrollToBottom();
    };
    // Set initial height and listen for changes.
    setTerminalHeight();
    window.visualViewport.addEventListener("resize", setTerminalHeight);
  } else {
    // Fallback for older browsers.
    const setTerminalHeightFallback = () => {
      terminal.style.height = `${window.innerHeight}px`;
      scrollToBottom();
    };
    setTerminalHeightFallback();
    window.addEventListener("resize", setTerminalHeightFallback);
  }
}
