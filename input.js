// input.js

function attachInputHandlers() {
  const mobileInput = document.getElementById("mobile-input");

  // Mobile: any tap focuses the hidden input
  document.body.addEventListener("touchstart", () => {
    mobileInput.focus();
  });

  // Desktop key handling (skip if splash is up or mobile input is focused)
  document.addEventListener("keydown", e => {
    const splash = document.getElementById("splash");
    if (splash.style.display !== "none" || document.activeElement === mobileInput) {
      return;
    }

    if (e.key === "Backspace") {
      currentInput = currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = currentInput;
      // FIX: Ensure prompt is visible after typing
      scrollToBottom();
    } else if (e.key === "Enter") {
      document.getElementById("input-wrapper").style.display = "none";
      echoLine(getPrompt() + " " + currentInput);
      handleCommand(currentInput.trim().toLowerCase());
      currentInput = "";
      document.getElementById("typed-text").innerText = "";
    } else if (e.key.length === 1) {
      currentInput += e.key;
      document.getElementById("typed-text").innerText = currentInput;
      // FIX: Ensure prompt is visible after typing
      scrollToBottom();
    }
  });

  // Mobile: capture characters via the hidden <input>
  mobileInput.addEventListener("input", ev => {
    const ch = ev.data;
    if (ch) {
      currentInput += ch;
      document.getElementById("typed-text").innerText = currentInput;
      // FIX: Ensure prompt is visible after typing
      scrollToBottom();
    }
    mobileInput.value = "";
  });

  // Mobile: handle Backspace & Enter in the hidden <input>
  mobileInput.addEventListener("keydown", ev => {
    if (ev.key === "Backspace") {
      ev.preventDefault();
      currentInput = currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = currentInput;
      // FIX: Ensure prompt is visible after typing
      scrollToBottom();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      document.getElementById("input-wrapper").style.display = "none";
      echoLine(getPrompt() + " " + currentInput);
      handleCommand(currentInput.trim().toLowerCase());
      currentInput = "";
      document.getElementById("typed-text").innerText = "";
    }
  });
}
