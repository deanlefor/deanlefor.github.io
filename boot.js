// boot.js

// simple sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBootSplash() {
  const splash = document.getElementById("splash");
  const out    = document.getElementById("splash-output");

  // define lines; mark the ones you want animated by ending them in "…"
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
    // if it ends with an ellipsis, animate the dots + OK
    if (line.endsWith("…")) {
      // strip the trailing ellipsis for controlled blinking
      const base = line.slice(0, -1);
      out.innerText += base;
      // blink three dots, one at a time
      for (let i = 0; i < 3; i++) {
        out.innerText += ".";
        await sleep(300);
      }
      out.innerText += " OK\n";
      // longer pause after OK
      await sleep(1000);
    } else {
      // normal lines, 500 ms apart
      out.innerText += line + "\n";
      await sleep(500);
    }
  }

  // once all lines are out, hook up the “press any key”
  document.addEventListener("keydown", continueBoot);
  ["pointerdown", "touchstart", "click"].forEach(evt =>
    splash.addEventListener(evt, continueBoot, { passive: false })
  );
}

function continueBoot(e) {
  e.preventDefault();
  const splash = document.getElementById("splash");

  // remove listeners
  document.removeEventListener("keydown", continueBoot);
  ["pointerdown", "touchstart", "click"].forEach(evt =>
    splash.removeEventListener(evt, continueBoot)
  );

  // hide splash, show terminal
  splash.style.display = "none";
  document.getElementById("terminal").style.display = "block";

  // reset prompt
  currentInput = "";
  document.getElementById("typed-text").innerText = "";
  updatePrompt();

  // focus mobile input
  const mi = document.getElementById("mobile-input");
  if (mi) setTimeout(() => mi.focus(), 0);

  // keep focusing on any tap in terminal
  const term = document.getElementById("terminal");
  ["click", "touchstart"].forEach(evt =>
    term.addEventListener(evt, () => mi && mi.focus())
  );
}

// you still need to call runBootSplash() on load
window.addEventListener("DOMContentLoaded", () => {
  runBootSplash();
});
