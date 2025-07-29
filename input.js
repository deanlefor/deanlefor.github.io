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

    // If user is using arrow keys, we handle history
    if (e.key === "ArrowUp") {
        e.preventDefault(); // Prevent cursor from moving in some browsers
        if (window.historyIndex > 0) {
            window.historyIndex--;
            // FIX: Use the global currentInput variable
            window.currentInput = window.commandHistory[window.historyIndex];
            document.getElementById("typed-text").innerText = window.currentInput;
        }
        return; // Stop further processing
    }
    
    if (e.key === "ArrowDown") {
        e.preventDefault();
        if (window.historyIndex < window.commandHistory.length - 1) {
            window.historyIndex++;
            // FIX: Use the global currentInput variable
            window.currentInput = window.commandHistory[window.historyIndex];
            document.getElementById("typed-text").innerText = window.currentInput;
        } else {
            // If at the end of history or beyond, clear the input
            window.historyIndex = window.commandHistory.length;
            window.currentInput = "";
            document.getElementById("typed-text").innerText = "";
        }
        return; // Stop further processing
    }

    // Any other key press resets the history navigation
    window.historyIndex = window.commandHistory.length;

    if (e.key === "Backspace") {
      // FIX: Use the global currentInput variable
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = window.currentInput;
    } else if (e.key === "Enter") {
      document.getElementById("input-wrapper").style.display = "none";
      // FIX: Use the global currentInput variable
      const command = window.currentInput.trim();
      echoLine(getPrompt() + " " + command);

      // Add to history only if it's a non-empty command
      if (command) {
        window.commandHistory.push(command);
      }
      window.historyIndex = window.commandHistory.length; // Reset history index

      handleCommand(command.toLowerCase());
      window.currentInput = "";
      document.getElementById("typed-text").innerText = "";
    } else if (e.key.length === 1) {
      // FIX: Use the global currentInput variable
      window.currentInput += e.key;
      document.getElementById("typed-text").innerText = window.currentInput;
    }
  });

  // Mobile: capture characters via the hidden <input>
  mobileInput.addEventListener("input", ev => {
    const ch = ev.data;
    if (ch) {
      // FIX: Use the global currentInput variable
      window.currentInput += ch;
      document.getElementById("typed-text").innerText = window.currentInput;
    }
    mobileInput.value = "";
  });

  // Mobile: handle Backspace & Enter in the hidden <input>
  mobileInput.addEventListener("keydown", ev => {
    if (ev.key === "Backspace") {
      ev.preventDefault();
      // FIX: Use the global currentInput variable
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = window.currentInput;
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      document.getElementById("input-wrapper").style.display = "none";
      // FIX: Use the global currentInput variable
      const command = window.currentInput.trim();
      echoLine(getPrompt() + " " + command);
      
      if (command) {
        window.commandHistory.push(command);
      }
      window.historyIndex = window.commandHistory.length;

      handleCommand(command.toLowerCase());
      window.currentInput = "";
      document.getElementById("typed-text").innerText = "";
    }
  });
}
