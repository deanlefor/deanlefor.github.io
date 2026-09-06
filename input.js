// input.js

function attachInputHandlers() {
  const mobileInput = document.getElementById("mobile-input");

  // Mobile: any tap focuses the hidden input
  document.body.addEventListener("touchstart", () => {
    // Don't focus if system is shut down
    if (window.isShutdown) return;
    mobileInput.focus();
  });

  function submitCommand() {
    if (isPrinting || window.isShutdown) return;
    document.getElementById("input-wrapper").style.display = "none";
    const command = window.currentInput.trim();
    echoLine(getPrompt() + " " + command);
    if (command && command !== window.commandHistory.at(-1))
      window.commandHistory.push(command);
    window.historyIndex = window.commandHistory.length;
    window.currentInput = "";
    document.getElementById("typed-text").textContent = "";
    handleCommand(command.toLowerCase());
  }

  // Desktop key handling
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isPrinting) {
      e.preventDefault();
      return;
    }
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
        document.getElementById("typed-text").textContent = window.currentInput;
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
        document.getElementById("typed-text").textContent = window.currentInput;
      }
      return;
    }

    if (document.activeElement === mobileInput) {
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      submitCommand();
    } else if (key === "Backspace") {
      window.historyIndex = window.commandHistory.length;
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").textContent = window.currentInput;
    } else if (key.length === 1) {
      window.historyIndex = window.commandHistory.length;
      window.currentInput += key;
      document.getElementById("typed-text").textContent = window.currentInput;
    }
  });

  // Mobile: capture characters via the hidden <input>
  mobileInput.addEventListener("input", (ev) => {
    if (window.isShutdown || isPrinting) {
      mobileInput.value = "";
      return;
    }
    const ch = ev.data;
    if (ch) {
      window.currentInput += ch;
      document.getElementById("typed-text").textContent = window.currentInput;
    }
    mobileInput.value = "";
  });

  // Mobile: handle Backspace & Enter in the hidden <input>
  mobileInput.addEventListener("keydown", (ev) => {
    if (isPrinting) {
      ev.preventDefault();
      return;
    }
    if (window.isShutdown) {
      ev.preventDefault();
      return;
    }

    if (ev.key === "Backspace") {
      ev.preventDefault();
      window.currentInput = window.currentInput.slice(0, -1);
      document.getElementById("typed-text").textContent = window.currentInput;
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      submitCommand();
    }
  });
}
