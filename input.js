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

    const key = e.key;

    // --- FIX: Completely rewritten and simplified history logic ---

    if (key === "ArrowUp") {
      e.preventDefault();
      if (window.commandHistory.length === 0) return; // No history, do nothing

      // Decrement index, but not below 0
      window.historyIndex = Math.max(0, window.historyIndex - 1);
      window.currentInput = window.commandHistory[window.historyIndex];
      document.getElementById("typed-text").innerText = window.currentInput;

    } else if (key === "ArrowDown") {
      e.preventDefault();
      if (window.commandHistory.length === 0) return;

      // If we are in the middle of history, move forward
      if (window.historyIndex < window.commandHistory.length - 1) {
        window.historyIndex++;
        window.currentInput = window.commandHistory[window.historyIndex];
      } else {
        // Otherwise, go to a new blank line at the end of history
        window.historyIndex = window.commandHistory.length;
        window.currentInput = "";
      }
      document.getElementById("typed-text").innerText = window.currentInput;

    } else if (key === "Enter") {
      document.getElementById("input-wrapper").style.display = "none";
      const command = window.currentInput.trim();
      echoLine(getPrompt() + " " + command);

      // Add to history if it's a non-empty command and not a duplicate of the last one
      if (command && command !== window.commandHistory.at(-1)) {
        window.commandHistory.push(command);
      }
      // Reset index to point to the new "blank" line after the last command
      window.historyIndex = window.commandHistory.length;
      
      handleCommand(command.toLowerCase());
      window.currentInput = "";
      document.getElementById("typed-text").innerText = "";

    } else if (key === "Backspace") {
      // Any other typing action resets our position in the history.
      window.historyIndex = window.commandHistory.length;
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = window.currentInput;

    } else if (key.length === 1) { // Catches all printable characters
      // Any other typing action resets our position in the history.
      window.historyIndex = window.commandHistory.length;
      window.currentInput += key;
      document.getElementById("typed-text").innerText = window.currentInput;
    }
  });

  // Mobile: capture characters via the hidden <input>
  mobileInput.addEventListener("input", ev => {
    const ch = ev.data;
    if (ch) {
      window.currentInput += ch;
      document.getElementById("typed-text").innerText = window.currentInput;
    }
    mobileInput.value = "";
  });

  // Mobile: handle Backspace & Enter in the hidden <input>
  mobileInput.addEventListener("keydown", ev => {
    if (ev.key === "Backspace") {
      ev.preventDefault();
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = window.currentInput;
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      document.getElementById("input-wrapper").style.display = "none";
      const command = window.currentInput.trim();
      echoLine(getPrompt() + " " + command);
      
      if (command && command !== window.commandHistory.at(-1)) {
        window.commandHistory.push(command);
      }
      window.historyIndex = window.commandHistory.length;

      handleCommand(command.toLowerCase());
      window.currentInput = "";
      document.getElementById("typed-text").innerText = "";
    }
  });
}
