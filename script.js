// script.js

// —————————————————————————————————————————————————————————————
// 1. Grab DOM elements
// —————————————————————————————————————————————————————————————
const splash           = document.getElementById("splash");
const splashOutput     = document.getElementById("splash-output");
const terminal         = document.getElementById("terminal");
const output           = document.getElementById("output");
const typedText        = document.getElementById("typed-text");
const inputWrapper     = document.getElementById("input-wrapper");
const promptLine       = document.getElementById("prompt-line");

// —————————————————————————————————————————————————————————————
// 2. State & Config
// —————————————————————————————————————————————————————————————
let cwdKey       = "";        // "" means root (C:\Dean)
let currentInput = "";
let typingSpeed  = 30;        // ms per character
const defaultSpeed = 30;
const lineQueue   = [];
let isPrinting    = false;

// —————————————————————————————————————————————————————————————
// 3. Helper: Build & Update the Prompt
// —————————————————————————————————————————————————————————————
function getPrompt() {
  // e.g. "C:\Dean" or "C:\Dean\ABOUT"
  return `C:\\Dean${cwdKey ? '\\' + cwdKey : ''}>`;
}
function updatePrompt() {
  promptLine.innerText = getPrompt();
}

// —————————————————————————————————————————————————————————————
// 4. Boot Splash Sequence
// —————————————————————————————————————————————————————————————
function runBootSplash() {
  const lines = [
    "IBM PC BIOS",
    "Version 1.10",
    "Copyright (c) 1982 IBM Corporation",
    "",
    "64K System RAM",
    "384K Extended RAM OK",
    "",
    "Press any key to boot"
  ];
  let i = 0;
  const timer = setInterval(() => {
    splashOutput.innerText += lines[i++] + "\n";
    if (i === lines.length) {
      clearInterval(timer);
      document.addEventListener("keydown", continueBoot);
    }
  }, 500);
}

function continueBoot(e) {
  document.removeEventListener("keydown", continueBoot);
  splash.style.display = "none";
  terminal.style.display = "block";
  currentInput = "";
  typedText.innerText = "";
  updatePrompt();            // show initial prompt
  document.body.focus();
}

// —————————————————————————————————————————————————————————————
// 5. Echo & Typing Animation
// —————————————————————————————————————————————————————————————
function echoLine(text) {
  // prints text immediately (for prompt echo)
  if (output.innerText === "") output.innerText = text;
  else output.innerText += "\n" + text;
}

function enqueueLine(text) {
  lineQueue.push(text);
  if (!isPrinting) processQueue();
}

function processQueue() {
  if (lineQueue.length === 0) {
    isPrinting = false;
    updatePrompt();
    inputWrapper.style.display = "inline-flex";
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
// 6. Keyboard Input Handler
// —————————————————————————————————————————————————————————————
document.addEventListener("keydown", e => {
  // If splash still up, ignore (continueBoot handles it)
  if (splash.style.display !== "none") return;

  if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    inputWrapper.style.display = "none";
    // Echo command with dynamic prompt
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
// 7. Command Handler (including CD navigation)
// —————————————————————————————————————————————————————————————
function handleCommand(command) {
  const entry = window.fs[cwdKey];  // current directory

  // CLEAR / CLS
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    return;
  }

  // RESET
  if (command === "reset") {
    // reset theme
    ["green","blue","amber"].forEach(t => 
      document.body.classList.remove(`theme-${t}`)
    );
    document.body.classList.add("theme-green");
    // reset speed
    typingSpeed = defaultSpeed;
    enqueueLine("Theme reset to GREEN.");
    enqueueLine(`Typing speed reset to ${defaultSpeed} ms/char.`);
    return;
  }

  // HELP
  if (command === "help") {
    enqueueLine("Available commands:");
    enqueueLine("  HELP");
    enqueueLine("  DIR");
    enqueueLine("  CD <folder> / CD ..");
    enqueueLine("  DATE");
    enqueueLine("  TIME");
    enqueueLine("  COLOR [green, blue, amber]");
    enqueueLine("  SPEED [1-150]");
    enqueueLine("  RESET");
    enqueueLine("  CLEAR");
    enqueueLine("  CLS");
    return;
  }

  // DIR
  if (command === "dir") {
    enqueueLine(` Directory of ${getPrompt().slice(0,-1)}`); // no trailing '>'
    enqueueLine("");
    // list folders first
    entry.folders.forEach(f => enqueueLine("  " + f + "    <DIR>"));
    // then files
    Object.keys(entry.files).forEach(fn => enqueueLine("  " + fn));
    return;
  }

  // CD navigation
  if (command.startsWith("cd ")) {
    const target = command.slice(3).toUpperCase();
    if (target === "..") {
      // go up to root
      cwdKey = "";
    } else if (entry.folders.includes(target)) {
      cwdKey = target;
    } else {
      enqueueLine("Directory not found.");
    }
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

  // File display: <FILENAME>.TXT
  if (command.endsWith(".txt")) {
    const fn = command.toUpperCase();
    const content = entry.files[fn];
    if (content !== undefined) {
      // print each line
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
// 8. Start boot splash on load
// —————————————————————————————————————————————————————————————
window.onload = runBootSplash;
