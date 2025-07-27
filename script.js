const splash = document.getElementById("splash");
const splashOutput = document.getElementById("splash-output");
const terminal = document.getElementById("terminal");
const output = document.getElementById("output");
const typedText = document.getElementById("typed-text");
const inputWrapper = document.getElementById("input-wrapper");

let currentInput = "";
const typingSpeed = 30;
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

// 2) Hide splash & show terminal
function continueBoot(e) {
  document.removeEventListener("keydown", continueBoot);
  splash.style.display = "none";
  terminal.style.display = "block";
  currentInput = "";
  typedText.innerText = "";
  document.body.focus();
}

// 3) Echo prompt immediately
function echoLine(text) {
  if (output.innerText === "") output.innerText = text;
  else output.innerText += "\n" + text;
}

// 4) Queue lines for typing animation
function enqueueLine(text) {
  lineQueue.push(text);
  if (!isPrinting) processQueue();
}

function processQueue() {
  if (lineQueue.length === 0) {
    isPrinting = false;
    inputWrapper.style.display = "inline-flex";
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = output.innerText;
  let idx = 0;
  const timer = setInterval(() => {
    if (idx === 0) {
      output.innerText = prev === "" ? text[0] : prev + "\n" + text[0];
      idx++;
    } else if (idx < text.length) {
      output.innerText += text[idx++];
    } else {
      clearInterval(timer);
      processQueue();
    }
  }, typingSpeed);
}

// 5) Keyboard handler (for both splash and terminal)
document.addEventListener("keydown", e => {
  // While splash is visible, only continueBoot() runs
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

// 6) Command logic (unchanged)
function handleCommand(command) {
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    inputWrapper.style.display = "inline-flex";
    return;
  }
  if (command === "dir") {
    enqueueLine(" Directory of C:\\");
    enqueueLine("");
    ["ABOUT.TXT", "RESUME.TXT", "CV.TXT"].forEach(f =>
      enqueueLine("  " + f)
    );
    return;
  }
  if (command === "help") {
    enqueueLine("Available commands: HELP, DIR, CLEAR, CLS");
    return;
  }
  if (command === "about.txt") {
    enqueueLine(
      "Dean Lefor is a public servant and scholar exploring AI, oversight, and public trust."
    );
    return;
  }
  if (command === "resume.txt" || command === "cv.txt") {
    enqueueLine(
      "Resume coming soon... or visit deanlefor.com/resume.pdf"
    );
    return;
  }
  enqueueLine("Unknown command. Type HELP to begin.");
}

// Start the splash on load
window.onload = runBootSplash;
