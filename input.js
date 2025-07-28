// input.js
function attachInputHandlers() {
  const mobileInput = document.getElementById("mobile-input");

  // Desktop
  document.addEventListener("keydown", e => {
    if (
      document.getElementById("splash").style.display !== "none" ||
      (mobileInput && e.target === mobileInput)
    ) return;

    if (e.key === "Backspace") {
      currentInput = currentInput.slice(0, -1);
    } else if (e.key === "Enter") {
      document.getElementById("input-wrapper").style.display = "none";
      echoLine(getPrompt() + " " + currentInput);
      handleCommand(currentInput.trim().toLowerCase());
      currentInput = "";
      document.getElementById("typed-text").innerText = "";
    } else if (e.key.length === 1) {
      currentInput += e.key;
    }
    document.getElementById("typed-text").innerText = currentInput;
  });

  // Mobile
  if (!mobileInput) return;
  mobileInput.addEventListener("input", ev => {
    const v = ev.target.value;
    if (v) {
      currentInput += v;
      document.getElementById("typed-text").innerText = currentInput;
      ev.target.value = "";
    }
  });
  mobileInput.addEventListener("keydown", ev => {
    if (ev.key === "Backspace") {
      ev.preventDefault();
      currentInput = currentInput.slice(0, -1);
      document.getElementById("typed-text").innerText = currentInput;
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      document.getElementById("input-wrapper").style.display = "none";
      echoLine(getPrompt() + " " + currentInput);
      handleCommand(currentInput.trim().toLowerCase());
      currentInput = "";
      document.getElementById("typed-text").innerText = "";
    }
  });
}
