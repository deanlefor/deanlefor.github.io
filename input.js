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
    if (splash.style.display !== "none") {
      return;
    }

    const key = e.key;

    // --- FIX: Prioritize arrow keys to prevent focus conflicts ---

    // Always handle history navigation first.
    if (key === "ArrowUp") {
      e.preventDefault();
      if (window.commandHistory.length > 0 && window.historyIndex > 0) {
        window.historyIndex--;
        window.currentInput = window.commandHistory[window.historyIndex];
        document.getElementById("typed-text").innerText = window.currentInput;
      }
      return; // Stop processing
    }

    if (key === "ArrowDown") {
      e.preventDefault();
      if (window.historyIndex < window.commandHistory.length) {
        window.historyIndex++;
        if (window.historyIndex === window.commandHistory.length) {
          window.currentInput = "";
        } else {
          window.currentInput = window.commandHistory[window.historyIndex];
        }
        document.getElementById("typed-text").innerText = window.currentInput;
      }
      return; // Stop processing
    }
    
    // If the mobile input is focused, let its own handlers take over.
    if (document.activeElement === mobileInput) {
        return;
    }

    // --- Handle other keys only if desktop is focused ---
    
    if (key === "Enter") {
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

    } else if (key === "Backspace") {
      window.historyIndex = window.commandHistory.length;
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = window.currentInput;

    } else if (key.length === 1) {
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
