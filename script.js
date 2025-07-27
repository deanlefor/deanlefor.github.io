const output = document.getElementById("output");
const typedText = document.getElementById("typed-text");

let currentInput = "";

// Core commands (for help only)
const commands = {
  help: "Available commands: HELP, DIR, CLEAR, CLS"
};

// Listen for keyboard input
document.addEventListener("keydown", function (e) {
  if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    // Echo with prompt
    printLine("C:\\dean> " + currentInput);
    handleCommand(currentInput.trim().toLowerCase());
    currentInput = "";
  } else if (e.key.length === 1) {
    currentInput += e.key;
  }

  typedText.innerText = currentInput;
});

// Print a new line of output
function printLine(text) {
  if (output.innerText === "") {
    // first line, don't add a new line
    output.innerText = text;
  } else {
    // subsequent lines, prefix with a new line
    output.innerText += "\n" + text;
  }
}

// Command handler
function handleCommand(command) {
  // CLEAR or CLS
  if (command === "clear" || command === "cls") {
    output.innerText = "";
    return;
  }

  // DIR: list only .TXT files
  if (command === "dir") {
    const files = [
      "ABOUT.TXT",
      "RESUME.TXT",
      "CV.TXT"
    ];
    printLine(" Directory of C:\\");
    printLine("");
    files.forEach(name => printLine("  " + name));
    return;
  }

  // File commands with .TXT extension
  if (command === "about.txt") {
    printLine("Dean Lefor is a public servant and scholar exploring AI, oversight, and public trust.");
    return;
  }
  if (command === "resume.txt" || command === "cv.txt") {
    printLine("Resume coming soon... or visit deanlefor.com/resume.pdf");
    return;
  }

  // HELP
  if (command === "help") {
    printLine(commands.help);
    return;
  }

  // Unknown command
  printLine("Unknown command. Type HELP to begin.");
}
