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
  // FIX: Target the fake cursor and scroll it into the nearest
  // block. This is the most reliable way to ensure the prompt
  // is visible without causing the page to jump to the top.
  const cursor = document.getElementById("fake-cursor");
  if (cursor) {
    cursor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    scrollToBottom(); // Ensure it's scrolled after queue finishes
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
      return;
    }
    // Scroll during typing to handle long lines that wrap
    scrollToBottom();
  }, typingSpeed);
}
