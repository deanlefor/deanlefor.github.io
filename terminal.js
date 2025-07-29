// terminal.js

// —————————————————————————————————————————————————————————————
// 1. State & Config
// —————————————————————————————————————————————————————————————
let cwdKey       = "";
// Attach currentInput to the window object to ensure it's
// globally accessible across all scripts.
window.currentInput = "";
let typingSpeed  = 15;       // ms per character
const defaultSpeed = 15;
const lineQueue    = [];
let isPrinting    = false;

// --- Command History ---
// Attach history to the window object to ensure it's globally
// accessible across all scripts.
window.commandHistory = [];
window.historyIndex = 0;
// --- End Command History ---

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
  const terminal = document.getElementById("terminal");
  if (terminal) {
    terminal.scrollTop = terminal.scrollHeight;
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
    scrollToBottom(); // Final scroll after queue is empty
    return;
  }
  isPrinting = true;
  const text = lineQueue.shift();
  const prev = out.innerText;
  let idx = 0;
  const timer = setInterval(() => {
    // FIX: Correctly handle empty strings to prevent 'undefined' output.
    if (idx === 0) {
      // If the text is empty, just add a newline. Otherwise, add the first character.
      const firstChar = text.length > 0 ? text[0] : "";
      out.innerText = prev
        ? prev + "\n" + firstChar
        : firstChar;
      idx++;
    } else if (idx < text.length) {
      out.innerText += text[idx++];
    } else {
      clearInterval(timer);
      processQueue(); // Process the next line
      return;
    }
    // Scroll after every character is added.
    scrollToBottom();
  }, typingSpeed);
}

// —————————————————————————————————————————————————————————————
// 5. Mobile Viewport & Keyboard Helper
// —————————————————————————————————————————————————————————————
function handleViewportChanges() {
  const terminal = document.getElementById("terminal");
  if (!terminal) return;

  const setTerminalHeight = () => {
    // Set the terminal's height to the window's inner height. This is more
    // reliable on mobile devices, as it correctly accounts for the browser UI
    // and the virtual keyboard.
    terminal.style.height = `${window.innerHeight}px`;
    // After resizing, always scroll to the bottom to ensure the
    // input prompt remains visible.
    scrollToBottom();
  };

  // Set the initial height as soon as the script loads.
  setTerminalHeight();

  // Add an event listener to update the height whenever the window is resized.
  // This handles both desktop browser resizing and mobile device orientation changes,
  // as well as the appearance/disappearance of the virtual keyboard.
  window.addEventListener('resize', setTerminalHeight);
}
