// terminal.js

// —————————————————————————————————————————————————————————————
// 1. State & Config
// —————————————————————————————————————————————————————————————
let cwdKey       = "";
let currentInput = "";
let typingSpeed  = 15;       // ms per character
const defaultSpeed = 15;
const lineQueue    = [];
let isPrinting    = false;

// —————————————————————————————————————————————————————————————
// 2. Prompt Helpers
// —————————————————————————————————————————————————————————————
function getPrompt() {
  return `C:\\Dean${cwdKey ? '\\' + cwdKey : ''}>`;
}

function updatePrompt() {
  document.getElementById("prompt-line").innerText = getPrompt();
  scrollToBottom();
}

// —————————————————————————————————————————————————————————————
// 3. Scrolling Helper
// —————————————————————————————————————————————————————————————
function scrollToBottom() {
  /*
    FIX: Removed the setTimeout wrapper.
    Calling scrollIntoView directly is more reliable and less prone to
    race conditions with browser rendering or keyboard animations.
    The { block: "end" } option ensures the element aligns to the
    bottom of the visible area.
  */
  const promptEl = document.getElementById("input-wrapper");
  if (promptEl) {
    // scroll the prompt into view at the bottom of the viewport
    promptEl.scrollIntoView({ behavior: "auto", block: "end" });
  } else {
    // fallback
    window.scrollTo(0, document.body.scrollHeight);
  }
}

// —————————————————————————————————————————————————————————————
// 4. Echo & Typing Animation
// —————————————————————————————————————————————————————————————
function echoLine(text) {
  const out = document.getElementById("output");
  out.innerText = out.innerText
    ? out.innerText + "\n" + text
    : text;
  scrollToBottom();
}

function enqueueLine(text) {
  if (typeof text === "undefined") return;
  lineQueue.push(text);
  if (!isPrinting) processQueue();
}

function processQueue() {
  const out = document.getElementById("output");
  if (lineQueue.length === 0) {
    isPrinting = false;
    updatePrompt();
    document.getElementById("input-wrapper").style.display = "inline-flex";
    // After everything is printed, focus the mobile input if it exists
    const mi = document.getElementById("mobile-input");
    if (mi) mi.focus();
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = out.innerText;
  let idx = 0;
  const timer = setInterval(() => {
    if (idx === 0) {
      out.innerText = prev
        ? prev + "\n" + text[0]
        : text[0];
      idx++;
    } else if (idx < text.length) {
      out.innerText += text[idx++];
    } else {
      clearInterval(timer);
      scrollToBottom();
      processQueue();
    }
  }, typingSpeed);
}
