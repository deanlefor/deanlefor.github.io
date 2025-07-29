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
    if (idx === 0) {
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
    scrollToBottom();
  }, typingSpeed);
}

// —————————————————————————————————————————————————————————————
// 5. Mobile Viewport & Keyboard Helper
// —————————————————————————————————————————————————————————————
function handleViewportChanges() {
  const terminal = document.getElementById("terminal");
  if (!terminal) return;

  // FIX: Use the VisualViewport API for a reliable mobile experience.
  // This modern API correctly handles the on-screen keyboard.
  if (window.visualViewport) {
    const setTerminalHeight = () => {
      terminal.style.height = `${window.visualViewport.height}px`;
      scrollToBottom();
    };
    // Set initial height and listen for changes.
    setTerminalHeight();
    window.visualViewport.addEventListener('resize', setTerminalHeight);
  } else {
    // Fallback for older browsers.
    const setTerminalHeightFallback = () => {
      terminal.style.height = `${window.innerHeight}px`;
      scrollToBottom();
    };
    setTerminalHeightFallback();
    window.addEventListener('resize', setTerminalHeightFallback);
  }
}
