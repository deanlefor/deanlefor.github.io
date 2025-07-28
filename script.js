// script.js

// —————————————————————————————————————————————————————————————
// 1. Grab DOM elements
// —————————————————————————————————————————————————————————————
const splash       = document.getElementById("splash");
const splashOutput = document.getElementById("splash-output");
const terminal     = document.getElementById("terminal");
const output       = document.getElementById("output");
const typedText    = document.getElementById("typed-text");
const inputWrapper = document.getElementById("input-wrapper");
const promptLine   = document.getElementById("prompt-line");
const mobileInput  = document.getElementById("mobile-input");

// —————————————————————————————————————————————————————————————
// 2. State & Config
// —————————————————————————————————————————————————————————————
let cwdKey         = "";       // "" means C:\Dean root
let currentInput   = "";
let typingSpeed    = 30;       // ms per character
const defaultSpeed = 30;
const lineQueue    = [];
let isPrinting     = false;

// —————————————————————————————————————————————————————————————
// 3. Prompt Helpers
// —————————————————————————————————————————————————————————————
function getPrompt() {
  return `C:\\Dean${cwdKey ? '\\' + cwdKey : ''}>`;
}

function updatePrompt() {
  promptLine.innerText = getPrompt();
}

// —————————————————————————————————————————————————————————————
// 4. Boot Splash (tap or key)
// —————————————————————————————————————————————————————————————
function runBootSplash() {
  const lines = [
    "IBM PC BIOS, mobile v2",
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
  splash.style.display   = "none";
  terminal.style.display = "block";
  currentInput = "";
  typedText.innerText = "";
  updatePrompt();
  if (mobileInput) {
    mobileInput.value = "";
    mobileInput.focus();
  }
}

// —————————————————————————————————————————————————————————————
// 5. Echo & Typing Animation
// —————————————————————————————————————————————————————————————
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

// —————————————————————————————————————————————————————————————
// 6a. Desktop Keyboard Handler
// —————————————————————————————————————————————————————————————
document.addEventListener("keydown", e => {
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

// —————————————————————————————————————————————————————————————
// 6b. Mobile Input Mirroring
// —————————————————————————————————————————————————————————————
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

// —————————————————————————————————————————————————————————————
// 7. Command Handler
// —————————————————————————————————————————————————————————————
function handleCommand(command) {
  const entry = window.fs[cwdKey]; // current directory

  // CLEAR / CLS
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    updatePrompt();
    inputWrapper.style.display = "inline-flex";
    if (mobileInput) mobileInput.focus();
    return;
  }

  // RESET
  if (command === "reset") {
    ["green","blue","amber"].forEach(t => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add("theme-green");
    typingSpeed = defaultSpeed;
    enqueueLine("Theme reset to GREEN.");
    enqueueLine(`Typing speed reset to ${defaultSpeed} ms/char.`);
    return;
  }

  // HELP
  if (command === "help") {
    enqueueLine("Welcome to Dean’s DOS terminal!");
    enqueueLine("You are currently at the root directory: C:\\Dean");
    enqueueLine("");
    enqueueLine("Navigation:");
    enqueueLine("  DIR                  List folders & files");
    enqueueLine("  CD <folder>          Enter a folder");
    enqueueLine("  CD ..                Go up one level");
    enqueueLine("  <filename>.TXT       View a text file");
    enqueueLine("  <imagename>.JPG      Display an image");
    enqueueLine("");
    enqueueLine("Other commands:");
    enqueueLine("  DATE                 Show current date");
    enqueueLine("  TIME                 Show current time");
    enqueueLine("  COLOR [g,b,a]        Theme: green, blue, amber");
    enqueueLine("  SPEED [1-150]        Typing speed in ms/char");
    enqueueLine("  RESET                Restore defaults");
    enqueueLine("  CLEAR   or   CLS     Clear the screen");
    enqueueLine("");
    enqueueLine("Type HELP at any time to see this again.");
    return;
  }

  // DIR
  if (command === "dir") {
    enqueueLine(` Directory of ${getPrompt().slice(0,-1)}`);
    entry.folders.forEach(f => enqueueLine("  " + f + "    <DIR>"));
    Object.keys(entry.files).forEach(fn => enqueueLine("  " + fn));
    if (entry.images) Object.keys(entry.images).forEach(img => enqueueLine("  " + img));
    return;
  }

  // CD navigation
  if (command.startsWith("cd ")) {
    const target = command.slice(3).toUpperCase();
    if (target === "..") {
      cwdKey = "";
    } else if (entry.folders.includes(target)) {
      cwdKey = target;
    } else {
      enqueueLine("Directory not found.");
      updatePrompt();
      inputWrapper.style.display = "inline-flex";
      if (mobileInput) mobileInput.focus();
      return;
    }
    updatePrompt();
    inputWrapper.style.display = "inline-flex";
    if (mobileInput) mobileInput.focus();
    return;
  }

  // DATE
  if (command === "date") {
    enqueueLine("Current date: " + new Date().toLocaleDateString());
    return;
  }

  // TIME
  if (command === "time") {
    enqueueLine("Current time: " + new Date().toLocaleTimeString());
    return;
  }

  // COLOR
  if (command.startsWith("color ")) {
    const theme = command.split(" ")[1];
    const valid = ["green","blue","amber"];
    if (valid.includes(theme)) {
      valid.forEach(t => document.body.classList.remove(`theme-${t}`));
      document.body.classList.add(`theme-${theme}`);
      enqueueLine(`Theme set to ${theme.toUpperCase()}.`);
    } else {
      enqueueLine("Unknown theme. Available: GREEN, BLUE, AMBER");
    }
    return;
  }

  // SPEED
  if (command.startsWith("speed ")) {
    const val = parseInt(command.split(" ")[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 150) {
      typingSpeed = val;
      enqueueLine(`Typing speed set to ${val} ms/char.`);
    } else {
      enqueueLine("Invalid speed. Usage: SPEED <1-150>");
    }
    return;
  }

  // IMAGE display
  if (command.endsWith(".jpg")) {
    const fn = command.toUpperCase();
    const imgPath = entry.images && entry.images[fn];
    if (imgPath) {
      output.innerHTML += `<img src="${imgPath}" alt="${fn}" style="max-width:100%;margin:1rem 0;">`;
    } else {
      enqueueLine("File not found.");
    }
    updatePrompt();
    inputWrapper.style.display = "inline-flex";
    if (mobileInput) mobileInput.focus();
    return;
  }

  // TEXT files
  if (command.endsWith(".txt")) {
    const fn = command.toUpperCase();
    const content = entry.files[fn];
    if (typeof content !== "undefined") {
      content.split("\n").forEach(line => enqueueLine(line));
    } else {
      enqueueLine("File not found.");
    }
    return;
  }

  // Unknown
  enqueueLine("Unknown command. Type HELP to begin.");
}

// —————————————————————————————————————————————————————————————
// 8. Launch
// —————————————————————————————————————————————————————————————
window.onload = runBootSplash;
