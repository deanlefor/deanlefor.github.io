// boot.js

// simple sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBootSplash() {
  const splash = document.getElementById("splash");
  const out    = document.getElementById("splash-output");

  const lines = [
    "PC BIOS Version 1.00",
    "",
    "64K System RAM…",
    "384K Extended RAM…",
    "",
    "Booting DOS Sim…",
    "",
    "(c) Dean Lefor 2025",
    "",
    "Press any key or TAP HERE to boot"
  ];

  for (let line of lines) {
    if (line.endsWith("…")) {
      const base = line.slice(0, -1);
      out.innerText += base;
      for (let i = 0; i < 3; i++) {
        out.innerText += ".";
        await sleep(300);
      }
      out.innerText += " OK\n";
      await sleep(1000);
    } else {
      out.innerText += line + "\n";
      await sleep(500);
    }
  }

  document.addEventListener("keydown", continueBoot);
  ["pointerdown", "touchstart", "click"].forEach(evt =>
    splash.addEventListener(evt, continueBoot, { passive: false })
  );
}

function continueBoot(e) {
  e.preventDefault();
  const splash = document.getElementById("splash");
  document.removeEventListener("keydown", continueBoot);
  ["pointerdown", "touchstart", "click"].forEach(evt =>
    splash.removeEventListener(evt, continueBoot)
  );

  splash.style.display = "none";
  document.getElementById("terminal").style.removeProperty("display");
  
  window.currentInput = "";
  document.getElementById("typed-text").innerText = "";
  updatePrompt();

  const mi = document.getElementById("mobile-input");
  if (mi) setTimeout(() => mi.focus(), 0);

  const term = document.getElementById("terminal");
  ["click", "touchstart"].forEach(evt =>
    term.addEventListener(evt, () => mi && mi.focus())
  );
}

// --- FIX: Add shutdown sequence ---
async function runShutdownSequence() {
  // Hide the input prompt immediately
  document.getElementById("input-wrapper").style.display = "none";
  
  // Clear the screen for a clean shutdown
  await sleep(500);
  const out = document.getElementById("output");
  out.innerText = "";
  scrollToBottom();

  const shutdownLines = [
    "Flushing file buffers…",
    "Saving system state…",
    "Powering down…"
  ];

  for (let line of shutdownLines) {
    // Animate each line
    const prevText = out.innerText;
    const base = line.slice(0, -1);
    
    out.innerText += (prevText ? "\n" : "") + base;
    
    for (let i = 0; i < 3; i++) {
      out.innerText += ".";
      scrollToBottom();
      await sleep(400);
    }

    out.innerText += " OK";
    scrollToBottom();
    await sleep(1000);
  }

  // Display the final message
  await sleep(500);
  out.innerText += "\n\nIt is now safe to close this browser window.";
  scrollToBottom();

  // Remove the blinking cursor animation to complete the effect
  const cursor = document.getElementById("fake-cursor");
  if (cursor) {
    cursor.style.display = "none";
  }

  // Set the shutdown state to true to disable further input
  window.isShutdown = true;
}
// --- End FIX ---
