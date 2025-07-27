const output = document.getElementById("output");
const typedText = document.getElementById("typed-text");
const inputWrapper = document.getElementById("input-wrapper");

let currentInput = "";
const typingSpeed = 30;     // ms per character
const lineQueue = [];
let isPrinting = false;

// Echo a line immediately (used for prompt+command)
function echoLine(text) {
  if (output.innerText === "") {
    output.innerText = text;
  } else {
    output.innerText += "\n" + text;
  }
}

// Queue a line for animated typing
function enqueueLine(text) {
  lineQueue.push(text);
  if (!isPrinting) processQueue();
}

// Process the queue, one character at a time
function processQueue() {
  if (lineQueue.length === 0) {
    isPrinting = false;
    // All done printing—show the prompt again
    inputWrapper.style.display = "inline-flex";
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = output.innerText;
  let i = 0;

  const timer = setInterval(() => {
    if (i === 0) {
      // First char: add newline if needed
      if (prev === "") output.innerText = text.charAt(0);
      else output.innerText = prev + "\n" + text.charAt(0);
      i++;
    } else if (i < text.length) {
      // Append next char
      output.innerText += text.charAt(i);
      i++;
    } else {
      clearInterval(timer);
      processQueue();  // Next line
    }
  }, typingSpeed);
}

// Listen for keystrokes
document.addEventListener("keydown", e => {
  if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    // Hide the prompt while text prints
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

// Core command handler
function handleCommand(command) {
  // CLEAR / CLS
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    inputWrapper.style.display = "inline-flex";
    return;
  }

  // DIR
  if (command === "dir") {
    enqueueLine(" Directory of C:\\");
    enqueueLine("");
    ["ABOUT.TXT", "RESUME.TXT", "CV.TXT"].forEach(f =>
      enqueueLine("  " + f)
    );
    return;
  }

  // HELP
  if (command === "help") {
    enqueueLine("Available commands: HELP, DIR, CLEAR, CLS");
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

  // Fallback
  enqueueLine("Unknown command. Type HELP to begin.");
}
