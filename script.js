// script.js

// —————————————————————————————————————————————————————————————
// 1. Grab DOM elements
const splash       = document.getElementById("splash");
const splashOutput = document.getElementById("splash-output");
const terminal     = document.getElementById("terminal");
const output       = document.getElementById("output");
const typedText    = document.getElementById("typed-text");
const inputWrapper = document.getElementById("input-wrapper");
const promptLine   = document.getElementById("prompt-line");

// 2. State & Config
let cwdKey        = "";       // "" => C:\Dean
let currentInput  = "";
let typingSpeed   = 30;       // ms per character
const defaultSpeed = 30;
const lineQueue    = [];
let isPrinting     = false;

// 3. Prompt Helpers
function getPrompt() {
  return `C:\\Dean${cwdKey ? '\\' + cwdKey : ''}>`;
}
function updatePrompt() {
  promptLine.innerText = getPrompt();
}

// 4. Boot Splash
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
  splash.style.display   = "none";
  terminal.style.display = "block";
  currentInput           = "";
  typedText.innerText    = "";
  updatePrompt();
  document.body.focus();
}

// 5. Echo & Typing Animation
function echoLine(text) {
  // immediate text output
  if (!output.innerText) output.innerText = text;
  else output.innerText += "\n" + text;
}
function enqueueLine(text) {
  // skip undefined
  if (typeof text === "undefined") return;
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

// 6. Keyboard Handler
document.addEventListener("keydown", e => {
  if (splash.style.display !== "none") return;
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

// 7. Command Handler (with image support)
function handleCommand(command) {
  const entry = window.fs[cwdKey];  // current directory

  // CLEAR / CLS
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    updatePrompt();
    inputWrapper.style.display = "inline-flex";
    return;
  }

  // RESET
  if (command === "reset") {
    ["green","blue","amber"].forEach(t=>
      document.body.classList.remove(`theme-${t}`)
    );
    document.body.classList.add("theme-green");
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
    enqueueLine("  <filename>.TXT");
    enqueueLine("  <imagename>.JPG");
    return;
  }

  // DIR
  if (command === "dir") {
    enqueueLine(` Directory of ${getPrompt().slice(0,-1)}`);
    entry.folders.forEach(f =>
      enqueueLine("  " + f + "    <DIR>")
    );
    Object.keys(entry.files).forEach(fn =>
      enqueueLine("  " + fn)
    );
    // list images if any
    if (entry.images) {
      Object.keys(entry.images).forEach(img =>
        enqueueLine("  " + img)
      );
    }
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
    }
    updatePrompt();
    inputWrapper.style.display = "inline-flex";
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

  // COLOR / SPEED / etc. (unchanged) …
  // [ your existing handlers here ]

  // IMAGE display (e.g. DEAN1.JPG)
  if (command.endsWith(".jpg")) {
    const fn = command.toUpperCase();
    const imgPath = entry.images && entry.images[fn];
    if (imgPath) {
      // append an <img> under your <pre id="output"> container
      // switch to innerHTML just for this one injection:
      output.innerHTML += `<img src="${imgPath}" alt="${fn}" style="max-width:100%;margin:1rem 0;">`;
    } else {
      enqueueLine("File not found.");
    }
    return;
  }

  // TEXT file display (unchanged) …
  if (command.endsWith(".txt")) {
    const fn = command.toUpperCase();
    const content = entry.files[fn];
    if (content !== undefined) {
      content.split("\n").forEach(line => enqueueLine(line));
    } else {
      enqueueLine("File not found.");
    }
    return;
  }

  // Unknown
  enqueueLine("Unknown command. Type HELP to begin.");
}

// 8. Launch
window.onload = runBootSplash;
