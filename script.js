const output = document.getElementById("output");
const input = document.getElementById("input");

const commands = {
  help: "Available commands: HELP, ABOUT, RESUME, CLEAR",
  about: "Dean Lefor is a public servant and scholar exploring AI, oversight, and public trust.",
  resume: "Resume coming soon... or visit deanlefor.com/resume.pdf",
  cv: "Resume coming soon... or visit deanlefor.com/resume.pdf"
};

function printLine(text) {
  output.innerText += "\n" + text;
}

input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    const command = input.value.trim().toLowerCase();
    printLine("> " + input.value);

    if (command === "clear") {
      output.innerText = "";
    } else if (commands[command]) {
      printLine(commands[command]);
    } else {
      printLine("Unknown command. Type HELP to begin.");
    }

    input.value = "";
  }
});

