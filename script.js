// script.js

// 1) Grab DOM elements
const splash       = document.getElementById("splash");
const splashOutput = document.getElementById("splash-output");
const terminal     = document.getElementById("terminal");
const output       = document.getElementById("output");
const typedText    = document.getElementById("typed-text");
const inputWrapper = document.getElementById("input-wrapper");
const promptLine   = document.getElementById("prompt-line");
const mobileInput  = document.getElementById("mobile-input");

// 2) State & Config
let cwdKey        = "";      // "" = C:\Dean
let currentInput  = "";
let typingSpeed   = 30;      // ms per character
const defaultSpeed = 30;
const lineQueue    = [];
let isPrinting     = false;

// 3) Prompt Helpers
function getPrompt() {
  return `C:\\Dean${cwdKey ? '\\' + cwdKey : ''}>`;
}
function updatePrompt() {
  promptLine.innerText = getPrompt();
}

// 4) Boot Splash (tap or key)
function runBootSplash() {
  const lines = [
    "IBM PC BIOS, mobile v1",
    "Version 1.10",
    "Copyright (c) 1982 IBM Corporation",
    "",
    "64K System RAM",
    "384K Extended RAM OK",
    "",
    "Press any key or tap to boot"
  ];
  let i = 0;
  const timer = setInterval(() => {
    splashOutput.innerText += lines[i++] + "\n";
    if (i === lines.length) {
      clearInterval(timer);
      document.addEventListener("keydown", continueBoot);
      splash.addEventListener("touchstart", continueBoot);
    }
  }, 500);
}

function continueBoot(e) {
  document.removeEventListener("keydown", continueBoot);
  splash.removeEventListener("touchstart", continueBoot);

  // Show terminal
  splash.style.display   = "none";
  terminal.style.display = "block";

  // Reset input buffer & prompt
  currentInput = "";
  typedText.innerText = "";
  updatePrompt();

  // Focus the mobile input so soft keyboard appears
  if (mobileInput) {
    mobileInput.value = "";
    mobileInput.focus();
  }
}

// 5) Echo & Typing Animation
function echoLine(text) {
  if (!output.innerText) output.innerText = text;
  else output.innerText += "\n" + text;
}
function enqueueLine(text) {
  if (typeof text === "undefined") return;
  lineQueue.push(text);
  if (!isPrinting) processQueue();
}
function processQueue() {
  if (lineQueue.length === 0) {
    isPrinting = false;
    updatePrompt();
    inputWrapper.style.display = "inline-flex";
    if (mobileInput) mobileInput.focus();
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = output.innerText;
  let idx = 0;
  const timer = setInterval(() => {
    if (idx === 0) {
      output.innerText = prev === ""
        ? text.charAt(0)
        : prev + "\n" + text.charAt(0);
      idx++;
    } else if (idx < text.length) {
      output.innerText += text.charAt(idx++);
    } else {
      clearInterval(timer);
      processQueue();
    }
  }, typingSpeed);
}

// 6a) Desktop Keyboard Handler
document.addEventListener("keydown", e => {
  // If splash is active or event from mobileInput, ignore
  if (
    splash.style.display !== "none" ||
    (mobileInput && e.target === mobileInput)
  ) return;

  if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    inputWrapper.style.display = "none";
    echoLine(getPrompt() + " " + currentInput);
    handleCommand(currentInput.trim().toLowerCase());
    currentInput = "";
    typedText.innerText = "";
  } else if (e.key.length === 1) {
    currentInput += e.key;
  }
  typedText.innerText = currentInput;
});

// 6b) Mobile Input Mirroring
if (mobileInput) {
  mobileInput.addEventListener("input", ev => {
    const v = ev.target.value;
    if (v) {
      currentInput += v;
      typedText.innerText = currentInput;
      ev.target.value = "";
    }
  });
  mobileInput.addEventListener("keydown", ev => {
    if (ev.key === "Backspace") {
      ev.preventDefault();
      currentInput = currentInput.slice(0, -1);
      typedText.innerText = currentInput;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      inputWrapper.style.display = "none";
      echoLine(getPrompt() + " " + currentInput);
      handleCommand(currentInput.trim().toLowerCase());
      currentInput = "";
      typedText.innerText = "";
    }
  });
}

// 7) Command Handler (your existing logic)
function handleCommand(command) {
  const entry = window.fs[cwdKey];
  // ... all your CLEAR, DIR, CD, etc. handlers go here ...
}

// 8) Launch
window.onload = runBootSplash;
