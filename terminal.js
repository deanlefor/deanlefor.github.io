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
  // FIX: Use scrollIntoView on the input wrapper to ensure it's
  // always visible, which is more reliable than scrolling the
  // whole window.
  const inputWrapper = document.getElementById("input-wrapper");
  if (inputWrapper) {
    inputWrapper.scrollIntoView();
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
      return; // Exit after processing this line
    }
    // FIX: Also scroll during the typing animation to handle long lines
    scrollToBottom();
  }, typingSpeed);
}
