// Grab DOM elements
const splash = document.getElementById("splash");
const splashOutput = document.getElementById("splash-output");
const terminal = document.getElementById("terminal");
const output = document.getElementById("output");
const typedText = document.getElementById("typed-text");
const inputWrapper = document.getElementById("input-wrapper");

let currentInput = "";
let typingSpeed = 20;       // ms per character for typing animation (now mutable)
const lineQueue = [];
let isPrinting = false;

// 1) Boot splash sequence
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

// 2) Hide splash & show terminal when a key is pressed
function continueBoot(e) {
  document.removeEventListener("keydown", continueBoot);
  splash.style.display = "none";
  terminal.style.display = "block";
  currentInput = "";
  typedText.innerText = "";
  document.body.focus();
}

// 3) Immediately echo prompt+command
function echoLine(text) {
  if (output.innerText === "") output.innerText = text;
  else output.innerText += "\n" + text;
}

// 4) Queue lines for animated typing
function enqueueLine(text) {
  lineQueue.push(text);
  if (!isPrinting) processQueue();
}

function processQueue() {
  if (lineQueue.length === 0) {
    isPrinting = false;
    inputWrapper.style.display = "inline-flex";  // show prompt again
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = output.innerText;
  let idx = 0;
  const timer = setInterval(() => {
    if (idx === 0) {
      // First character: add newline if needed
      output.innerText = prev === "" ? text[0] : prev + "\n" + text[0];
      idx++;
    } else if (idx < text.length) {
      // Append next character
      output.innerText += text[idx++];
    } else {
      clearInterval(timer);
      processQueue();
    }
  }, typingSpeed);
}

// 5) Handle keystrokes (for both splash and terminal)
document.addEventListener("keydown", e => {
  // During splash, only continueBoot matters
  if (splash.style.display !== "none") return;

  if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    inputWrapper.style.display = "none";
    echoLine("C:\\dean> " + currentInput);
    handleCommand(currentInput.trim().toLowerCase());
    currentInput = "";
    typedText.innerText = "";
  } else if (e.key.length === 1) {
    currentInput += e.key;
  }
  typedText.innerText = currentInput;
});

// 6) Command handler
function handleCommand(command) {
  // CLEAR / CLS
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    inputWrapper.style.display = "inline-flex";
    return;
  }

  // DIR: list only .TXT files
if (command === "dir") {
  enqueueLine(" Directory of C:\\");
  // If you want a blank line, use a real empty string:
  // enqueueLine("");
  ["ABOUT.TXT", "RESUME.TXT", "CV.TXT"].forEach(f =>
    enqueueLine("  " + f)
  );
  return;
}

  // HELP: each command on its own line
  if (command === "help") {
    enqueueLine("Available commands:");
    enqueueLine("  HELP");
    enqueueLine("  DIR");
    enqueueLine("  DATE");
    enqueueLine("  TIME");
    enqueueLine("  COLOR [green, blue, amber]");
    enqueueLine("  SPEED [1-150]");
    enqueueLine("  CLEAR or CLS");
    return;
  }

  // DATE: show local date
  if (command === "date") {
    const today = new Date();
    enqueueLine("Current date: " + today.toLocaleDateString());
    return;
  }

  // TIME: show local time
  if (command === "time") {
    const now = new Date();
    enqueueLine("Current time: " + now.toLocaleTimeString());
    return;
  }

  // COLOR: switch theme
  if (command.startsWith("color ")) {
    const theme = command.split(" ")[1];
    const validThemes = ["green", "blue", "amber"];
    if (validThemes.includes(theme)) {
      validThemes.forEach(t => document.body.classList.remove(`theme-${t}`));
      document.body.classList.add(`theme-${theme}`);
      enqueueLine(`Theme set to ${theme.toUpperCase()}.`);
    } else {
      enqueueLine("Unknown theme. Available: GREEN, BLUE, AMBER");
    }
    return;
  }

  // SPEED: adjust typing speed (1–150 ms)
  if (command.startsWith("speed ")) {
    const parts = command.split(" ");
    const val = parseInt(parts[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 150) {
      typingSpeed = val;
      enqueueLine(`Typing speed set to ${val} ms/char.`);
    } else {
      enqueueLine("Invalid speed. Usage: SPEED <1-150>");
    }
    return;
  }

  // ABOUT.TXT
  if (command === "about.txt") {
    enqueueLine(
      "Dean Lefor is a public servant and scholar exploring AI, oversight, and public trust."
    );
    return;
  }

  // RESUME.TXT or CV.TXT
  if (command === "resume.txt" || command === "cv.txt") {
    enqueueLine(
      "Resume coming soon... or visit deanlefor.com/resume.pdf"
    );
    return;
  }

  // Unknown command
  enqueueLine("Unknown command. Type HELP to begin.");
}

// Start the boot splash on page load
window.onload = runBootSplash;
