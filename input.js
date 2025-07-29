// input.js

function attachInputHandlers() {
  const mobileInput = document.getElementById("mobile-input");

  // Desktop key handling
  document.addEventListener("keydown", e => {
    // Don’t handle keys while splash is visible
    if (document.getElementById("splash").style.display !== "none") return;

    if (e.key === "Backspace") {
      currentInput = currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = currentInput;
    } else if (e.key === "Enter") {
      document.getElementById("input-wrapper").style.display = "none";
      echoLine(getPrompt() + " " + currentInput);
      handleCommand(currentInput.trim().toLowerCase());
      currentInput = "";
      document.getElementById("typed-text").innerText = "";
    } else if (e.key.length === 1) {
      currentInput += e.key;
      document.getElementById("typed-text").innerText = currentInput;
    }
  });

  // Mobile: use hidden input to capture keystrokes
  mobileInput.addEventListener("input", ev => {
    // Read one character at a time then clear
    const ch = ev.data;
    if (ch) {
      currentInput += ch;
      document.getElementById("typed-text").innerText = currentInput;
    }
    mobileInput.value = "";
  });

  mobileInput.addEventListener("keydown", ev => {
    // Backspace hack
    if (ev.key === "Backspace") {
      ev.preventDefault();
      currentInput = currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = currentInput;
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      document.getElementById("input-wrapper").style.display = "none";
      echoLine(getPrompt() + " " + currentInput);
      handleCommand(currentInput.trim().toLowerCase());
      currentInput = "";
      document.getElementById("typed-text").innerText = "";
    }
  });

  // Mobile: any tap focuses the hidden input
  document.body.addEventListener("touchstart", () => {
    mobileInput.focus();
  });
}
