const output = document.getElementById("output");
const typedText = document.getElementById("typed-text");

let currentInput = "";

// Listen for keyboard input
document.addEventListener("keydown", function (e) {
  if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    printLine("> " + currentInput);
    handleCommand(currentInput.trim().toLowerCase());
    currentInput = "";
  } else if (e.key.length === 1) {
    currentInput += e.key;
  }

  typedText.innerText = currentInput;
});

// Print a new line of output
function printLine(text) {
  output.innerText += "\n" + text;
}

// Handle commands
function handleCommand(command) {
  const commands = {
    help: "Available commands: HELP, ABOUT, RESUME, CV, CLEAR, CLS",
    about: "Dean Lefor is a public servant and scholar exploring AI, oversight, and public trust.",
    resume: "Resume coming soon... or visit deanlefor.com/resume.pdf",
    cv: "Resume coming soon... or visit deanlefor.com/resume.pdf",
    clear: "__CLEAR__",
    cls: "__CLEAR__"
  };

  if (commands[command] === "__CLEAR__") {
    output.innerText = "";
    return;
  }

  const response = commands[command];
  if (response) {
    printLine(response);
  } else {
    printLine("Unknown command. Type HELP to begin.");
  }
}
