// boot.js
function runBootSplash() {
  const splash = document.getElementById("splash");
  const out    = document.getElementById("splash-output");
  const lines = [
    "IBM PC BIOS","Version 1.10","Copyright (c) 1982 IBM Corporation",
    "","64K System RAM","384K Extended RAM OK","","Press any key or TAP HERE to boot"
  ];
  let i = 0;
  const timer = setInterval(() => {
    out.innerText += lines[i++] + "\n";
    if (i === lines.length) {
      clearInterval(timer);
      document.addEventListener("keydown", continueBoot);
      ["pointerdown","touchstart","click"].forEach(evt =>
        splash.addEventListener(evt, continueBoot, { passive: false })
      );
    }
  }, 500);
}

function continueBoot(e) {
  e.preventDefault();
  const splash = document.getElementById("splash");
  document.removeEventListener("keydown", continueBoot);
  ["pointerdown","touchstart","click"].forEach(evt =>
    splash.removeEventListener(evt, continueBoot)
  );

  splash.style.display   = "none";
  document.getElementById("terminal").style.display = "block";

  // reset prompt/input
  currentInput = "";
  document.getElementById("typed-text").innerText = "";
  updatePrompt();

  // focus mobile
  const mi = document.getElementById("mobile-input");
  if (mi) setTimeout(() => mi.focus(), 0);

  // tap anywhere in terminal to re-focus mobile input
  const term = document.getElementById("terminal");
  ["click","touchstart"].forEach(evt =>
    term.addEventListener(evt, () => mi && mi.focus())
  );
}
