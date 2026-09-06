// boot.js

// simple sleep helper
function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, prefersReducedMotion() ? 0 : ms),
  );
}

async function runBootSplash() {
  const splash = document.getElementById("splash");
  const out = document.getElementById("splash-output");

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
    "Press any key or TAP HERE to boot",
  ];

  for (let line of lines) {
    if (line.endsWith("…")) {
      const base = line.slice(0, -1);
      out.textContent += base;
      for (let i = 0; i < 3; i++) {
        out.textContent += ".";
        await sleep(300);
      }
      out.textContent += " OK\n";
      await sleep(1000);
    } else {
      out.textContent += line + "\n";
      await sleep(500);
    }
  }

  document.addEventListener("keydown", continueBoot);
  ["pointerdown", "touchstart", "click"].forEach((evt) =>
    splash.addEventListener(evt, continueBoot, { passive: false }),
  );
}

function continueBoot(e) {
  e.preventDefault();
  const splash = document.getElementById("splash");
  document.removeEventListener("keydown", continueBoot);
  ["pointerdown", "touchstart", "click"].forEach((evt) =>
    splash.removeEventListener(evt, continueBoot),
  );

  splash.style.display = "none";
  document.getElementById("terminal").style.removeProperty("display");

  window.currentInput = "";
  document.getElementById("typed-text").textContent = "";
  updatePrompt();

  const mi = document.getElementById("mobile-input");
  if (mi) setTimeout(() => mi.focus(), 0);

  const term = document.getElementById("terminal");
  ["click", "touchstart"].forEach((evt) =>
    term.addEventListener(evt, () => mi && mi.focus()),
  );
}

async function runShutdownSequence() {
  window.isShutdown = true;
  cancelOutput();
  // Hide the input prompt immediately
  document.getElementById("input-wrapper").style.display = "none";

  // Clear the screen for a clean shutdown
  await sleep(500);
  const out = document.getElementById("output");
  out.textContent = "";
  scrollToBottom();

  const shutdownLines = [
    "Flushing file buffers…",
    "Saving system state…",
    "Powering down…",
  ];

  for (let line of shutdownLines) {
    // Animate each line
    const prevText = out.textContent;
    const base = line.slice(0, -1);

    out.textContent += (prevText ? "\n" : "") + base;

    for (let i = 0; i < 3; i++) {
      out.textContent += ".";
      scrollToBottom();
      await sleep(400);
    }

    out.textContent += " OK";
    scrollToBottom();
    await sleep(1000);
  }

  // Display the final message
  await sleep(500);
  out.textContent += "\n\nIt is now safe to close this browser window.";
  scrollToBottom();

  // Remove the blinking cursor animation to complete the effect
  const cursor = document.getElementById("fake-cursor");
  if (cursor) {
    cursor.style.display = "none";
  }

  // Set the shutdown state to true to disable further input
  window.isShutdown = true;
}
