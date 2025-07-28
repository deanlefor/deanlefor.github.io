// commands.js

function handleCommand(command) {
  const entry = window.fs[cwdKey];

  // CLEAR & CLS
  if (["clear", "cls"].includes(command)) {
    document.getElementById("output").innerText = "";
    updatePrompt();
    document.getElementById("input-wrapper").style.display = "inline-flex";
    const mi = document.getElementById("mobile-input");
    if (mi) setTimeout(() => mi.focus(), 0);
    return;
  }

  // RESET
  if (command === "reset") {
    ["green","blue","amber"].forEach(t =>
      document.body.classList.remove(`theme-${t}`)
    );
    document.body.classList.add("theme-green");
    typingSpeed = defaultSpeed;
    enqueueLine("Theme reset to GREEN.");
    enqueueLine(`Typing speed reset to ${defaultSpeed} ms/char.`);
    return;
  }

  // HELP
  if (command === "help") {
    enqueueLine("Welcome to Dean’s DOS terminal!");
    enqueueLine("You are currently at the root directory: C:\\Dean");
    enqueueLine("");
    enqueueLine("Navigation:");
    enqueueLine("  DIR                  List folders & files");
    enqueueLine("  CD <folder>          Enter a folder");
    enqueueLine("  CD ..                Go up one level");
    enqueueLine("  <filename>.TXT       View a text file");
    enqueueLine("  <imagename>.JPG      Display an image");
    enqueueLine("");
    enqueueLine("Other commands:");
    enqueueLine("  DATE                 Show current date");
    enqueueLine("  TIME                 Show current time");
    enqueueLine("  COLOR [g,b,a]        Theme: green, blue, amber");
    enqueueLine("  SPEED [1-150]        Typing speed in ms/char");
    enqueueLine("  RESET                Restore defaults");
    enqueueLine("  CLEAR   or   CLS     Clear the screen");
    enqueueLine("");
    enqueueLine("Type HELP at any time to see this again.");
    return;
  }

  // DIR (with padded columns)
  if (command === "dir") {
    // 1. Gather all names
    const folderNames = entry.folders.slice();
    const fileNames   = Object.keys(entry.files);
    const imageNames  = entry.images ? Object.keys(entry.images) : [];
    const allNames    = folderNames.concat(fileNames, imageNames);

    // 2. Compute max length
    const maxLen = allNames.reduce(
      (max, name) => Math.max(max, name.length),
      0
    );

    // 3. Header
    enqueueLine(` Directory of ${getPrompt().slice(0, -1)}`);

    // 4. Folders
    folderNames.forEach(name => {
      const padded = name.padEnd(maxLen, " ");
      enqueueLine(`  ${padded}  <DIR>`);
    });

    // 5. Text files
    fileNames.forEach(name => {
      const padded = name.padEnd(maxLen, " ");
      enqueueLine(`  ${padded}`);
    });

    // 6. Images
    imageNames.forEach(name => {
      const padded = name.padEnd(maxLen, " ");
      enqueueLine(`  ${padded}`);
    });

    return;
  }

  // CD navigation
  if (command.startsWith("cd ")) {
    const target = command.slice(3).toUpperCase();
    if (target === "..") {
      cwdKey = "";
    } else if (entry.folders.includes(target)) {
      cwdKey = target;
    } else {
      enqueueLine("Directory not found.");
      updatePrompt();
      document.getElementById("input-wrapper").style.display = "inline-flex";
      const mi = document.getElementById("mobile-input");
      if (mi) setTimeout(() => mi.focus(), 0);
      return;
    }
    updatePrompt();
    document.getElementById("input-wrapper").style.display = "inline-flex";
    const mi = document.getElementById("mobile-input");
    if (mi) setTimeout(() => mi.focus(), 0);
    return;
  }

  // DATE
  if (command === "date") {
    enqueueLine("Current date: " + new Date().toLocaleDateString());
    return;
  }

  // TIME
  if (command === "time") {
    enqueueLine("Current time: " + new Date().toLocaleTimeString());
    return;
  }

  // COLOR
  if (command.startsWith("color ")) {
    const theme = command.split(" ")[1];
    const valid = ["green","blue","amber"];
    if (valid.includes(theme)) {
      valid.forEach(t =>
        document.body.classList.remove(`theme-${t}`)
      );
      document.body.classList.add(`theme-${theme}`);
      enqueueLine(`Theme set to ${theme.toUpperCase()}.`);
    } else {
      enqueueLine("Unknown theme. Available: GREEN, BLUE, AMBER");
    }
    return;
  }

  // SPEED
  if (command.startsWith("speed ")) {
    const val = parseInt(command.split(" ")[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 150) {
      typingSpeed = val;
      enqueueLine(`Typing speed set to ${val} ms/char.`);
    } else {
      enqueueLine("Invalid speed. Usage: SPEED <1-150>");
    }
    return;
  }

  // IMAGE display
  if (command.endsWith(".jpg")) {
    const fn      = command.toUpperCase();
    const imgPath = entry.images && entry.images[fn];
    if (imgPath) {
      document.getElementById("output").innerHTML +=
        `<img src="${imgPath}" alt="${fn}" style="max-width:100%;margin:1rem 0;">`;
    } else {
      enqueueLine("File not found.");
    }
    updatePrompt();
    document.getElementById("input-wrapper").style.display = "inline-flex";
    const mi = document.getElementById("mobile-input");
    if (mi) setTimeout(() => mi.focus(), 0);
    return;
  }

  // TEXT files
  if (command.endsWith(".txt")) {
    const fn      = command.toUpperCase();
    const content = entry.files[fn];
    if (typeof content !== "undefined") {
      content.split("\n").forEach(line => enqueueLine(line));
    } else {
      enqueueLine("File not found.");
    }
    return;
  }

  // Unknown
  enqueueLine("Unknown command. Type HELP to begin.");
}
