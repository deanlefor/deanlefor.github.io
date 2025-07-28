// terminal.js
let cwdKey = "";
let currentInput = "";
let typingSpeed = 30;
const defaultSpeed = 30;
const lineQueue = [];
let isPrinting = false;

function getPrompt() {
  return `C:\\Dean${cwdKey ? '\\' + cwdKey : ''}>`;
}

function updatePrompt() {
  document.getElementById("prompt-line").innerText = getPrompt();
}

function echoLine(text) {
  const out = document.getElementById("output");
  out.innerText = out.innerText ? out.innerText + "\n" + text : text;
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
    const mi = document.getElementById("mobile-input");
    if (mi) setTimeout(() => mi.focus(), 0);
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = out.innerText;
  let idx = 0;
  const timer = setInterval(() => {
    if (idx === 0) {
      out.innerText = prev ? prev + "\n" + text[0] : text[0];
      idx++;
    } else if (idx < text.length) {
      out.innerText += text[idx++];
    } else {
      clearInterval(timer);
      processQueue();
    }
  }, typingSpeed);
}
