const output = document.getElementById("output");
const typedText = document.getElementById("typed-text");

// Configuration
const typingSpeed = 30;            // ms per character
let currentInput = "";

// A queue of lines waiting to be typed
const lineQueue = [];
let isPrinting = false;

// Echo a line immediately (used for the prompt)
function echoLine(text) {
  if (output.innerText === "") {
    output.innerText = text;
  } else {
    output.innerText += "\n" + text;
  }
}

// Enqueue a line for animated typing
function enqueueLine(text) {
  lineQueue.push(text);
  if (!isPrinting) processQueue();
}

// Process the queue, one line at a time
function processQueue() {
  if (lineQueue.length === 0) {
    isPrinting = false;
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = output.innerText;
  let i = 0;

  const timer = setInterval(() => {
    if (i === 0) {
      // First character: add newline if needed
      if (prev === "") output.innerText = text.charAt(0);
      else output.innerText = prev + "\n" + text.charAt(0);
      i++;
    } else if (i < text.length) {
      // Append next char
      output.innerText += text.charAt(i);
      i++;
    } else {
      // Finished this line
      clearInterval(timer);
      processQueue();  // Move to next
    }
  }, typingSpeed);
}

// Handle keypresses
document.addEventListener("keydown", e => {
  if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    // Echo the prompt+command immediately
    echoLine("C:\\dean> " + currentInput);
    handleCommand(currentInput.trim().toLowerCase());
    currentInput = "";
  } else if (e.key.length === 1) {
    // Regular character
    currentInput += e.key;
  }
  // Update the on-screen input line
  typedText.innerText = currentInput;
});

// Print blank line or queued lines
function handleCommand(command) {
  // CLEAR / CLS
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    return;
  }

  // DIR listing
  if (command === "dir") {
    const files = ["ABOUT.TXT", "RESUME.TXT", "CV.TXT"];
    enqueueLine(" Directory of C:\\");
    enqueueLine("");
    files.forEach(f => enqueueLine("  " + f));
    return;
  }

  // HELP
  if (command === "help") {
    enqueueLine("Available commands: HELP, DIR, CLEAR, CLS");
    return;
  }

  // ABOUT.TXT
  if (command === "about.txt") {
    enqueueLine("Dean Lefor is a public servant and scholar exploring AI, oversight, and public trust.");
    return;
  }

  // RESUME.TXT or CV.TXT
  if (command === "resume.txt" || command === "cv.txt") {
    enqueueLine("Resume coming soon... or visit deanlefor.com/resume.pdf");
    return;
  }

  // Fallback
  enqueueLine("Unknown command. Type HELP to begin.");
}
