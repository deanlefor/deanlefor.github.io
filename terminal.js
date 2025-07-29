// terminal.js

// —————————————————————————————————————————————————————————————
// 1. State & Config
// —————————————————————————————————————————————————————————————
let cwdKey       = "";       // "" means C:\Dean root
let currentInput = "";
let typingSpeed  = 30;       // ms per character
const defaultSpeed = 30;
const lineQueue   = [];
let isPrinting   = false;

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
  // Scroll the page so the input-wrapper is in view
  const iw = document.getElementById("input-wrapper");
  if (iw) {
    iw.scrollIntoView({ block: "end" });
  } else {
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
    updatePrompt();  // will scroll once
    document.getElementById("input-wrapper").style.display = "inline-flex";
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = out.innerText;
  let idx = 0;
  const timer = setInterval(() => {
    if (idx < text.length) {
      if (idx === 0 && prev) out.innerText += "\n" + text.charAt(0);
      else out.innerText += text.charAt(idx);
      idx++;
    } else {
      clearInterval(timer);
      scrollToBottom(); // scroll once after full line
      processQueue();
    }
  }, typingSpeed);
}
