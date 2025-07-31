// input.js

function attachInputHandlers() {
  const mobileInput = document.getElementById("mobile-input");

  // Mobile: any tap focuses the hidden input
  document.body.addEventListener("touchstart", () => {
    // FIX: Don't focus if system is shut down
    if (window.isShutdown) return;
    mobileInput.focus();
  });

  // Desktop key handling
  document.addEventListener("keydown", e => {
    // --- FIX: Ignore all input if the system is shut down ---
    if (window.isShutdown) {
      e.preventDefault();
      return;
    }

    const splash = document.getElementById("splash");
    if (splash.style.display !== "none") {
      return;
    }

    const key = e.key;
    
    // Always handle history navigation first.
    if (key === "ArrowUp") {
      e.preventDefault();
      if (window.commandHistory.length > 0 && window.historyIndex > 0) {
        window.historyIndex--;
        window.currentInput = window.commandHistory[window.historyIndex];
        document.getElementById("typed-text").innerText = window.currentInput;
      }
      return;
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
      return;
    }
    
    if (document.activeElement === mobileInput) {
        return;
    }
    
    if (key === "Enter") {
      document.getElementById("input-wrapper").style.display = "none";
      const command = window.currentInput.trim();
      echoLine(getPrompt() + " " + command);

      // FIX: Use a more compatible way to get the last element.
      const lastCommand = window.commandHistory[window.commandHistory.length - 1];
      if (command && command !== lastCommand) {
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
    if (window.isShutdown) return;
    const ch = ev.data;
    if (ch) {
      window.currentInput += ch;
      document.getElementById("typed-text").innerText = window.currentInput;
    }
    mobileInput.value = "";
  });

  // Mobile: handle Backspace & Enter in the hidden <input>
  mobileInput.addEventListener("keydown", ev => {
    if (window.isShutdown) {
      ev.preventDefault();
      return;
    }

    if (ev.key === "Backspace") {
      ev.preventDefault();
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = window.currentInput;
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      document.getElementById("input-wrapper").style.display = "none";
      const command = window.currentInput.trim();
      echoLine(getPrompt() + " " + command);
      
      // FIX: Use a more compatible way to get the last element.
      const lastCommand = window.commandHistory[window.commandHistory.length - 1];
      if (command && command !== lastCommand) {
        window.commandHistory.push(command);
      }
      window.historyIndex = window.commandHistory.length;

      handleCommand(command.toLowerCase());
      window.currentInput = "";
      document.getElementById("typed-text").innerText = "";
    }
  });
}
