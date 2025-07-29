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

    // --- FIX: Restructured logic to correctly handle history navigation ---

    if (e.key === "ArrowUp") {
        e.preventDefault();
        if (window.historyIndex > 0) {
            window.historyIndex--;
            window.currentInput = window.commandHistory[window.historyIndex];
            document.getElementById("typed-text").innerText = window.currentInput;
        }
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (window.historyIndex < window.commandHistory.length) {
            window.historyIndex++;
            if (window.historyIndex === window.commandHistory.length) {
                window.currentInput = ""; // Clear input when at the end of history
            } else {
                window.currentInput = window.commandHistory[window.historyIndex];
            }
            document.getElementById("typed-text").innerText = window.currentInput;
        }
    } else if (e.key === "Enter") {
        document.getElementById("input-wrapper").style.display = "none";
        const command = window.currentInput.trim();
        echoLine(getPrompt() + " " + command);

        // Add to history only if it's a non-empty command and not a duplicate of the last one
        if (command && command !== window.commandHistory[window.commandHistory.length - 1]) {
          window.commandHistory.push(command);
        }
        window.historyIndex = window.commandHistory.length; // Reset history position

        handleCommand(command.toLowerCase());
        window.currentInput = "";
        document.getElementById("typed-text").innerText = "";
    } else if (e.key === "Backspace") {
        // Any other typing breaks from history navigation
        window.historyIndex = window.commandHistory.length;
        window.currentInput = window.currentInput.slice(0, -1);
        document.getElementById("typed-text").innerText = window.currentInput;
    } else if (e.key.length === 1) {
        // Any other typing breaks from history navigation
        window.historyIndex = window.commandHistory.length;
        window.currentInput += e.key;
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
      
      if (command && command !== window.commandHistory[window.commandHistory.length - 1]) {
        window.commandHistory.push(command);
      }
      window.historyIndex = window.commandHistory.length;

      handleCommand(command.toLowerCase());
      window.currentInput = "";
      document.getElementById("typed-text").innerText = "";
    }
  });
}
