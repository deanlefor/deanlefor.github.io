// commands.js
function handleCommand(command) {
  const entry = window.fs[cwdKey];

  // CLEAR & CLS
  if (["clear","cls"].includes(command)) {
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

  // DIR
  if (command === "dir") {
    enqueueLine(` Directory of ${getPrompt().slice(0,-1)}`);
    entry.folders.forEach(f => enqueueLine("  " + f + "    <DIR>"));
    Object.keys(entry.files).forEach(fn => enqueueLine("  " + fn));
    if (entry.images) Object.keys(entry.images).forEach(img => enqueueLine("  " + img));
    return;
  }

  // CD
  if (command.startsWith("cd ")) {
    const target = command.slice(3).toUpperCase();
    if (target === "..") cwdKey = "";
    else if (entry.folders.includes(target)) cwdKey = target;
    else {
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

  // DATE & TIME & COLOR & SPEED
  if (command === "date")         return enqueueLine("Current date: " + new Date().toLocaleDateString());
  if (command === "time")         return enqueueLine("Current time: " + new Date().toLocaleTimeString());
  if (command.startsWith("color ")) {
    const t = command.split(" ")[1], valid=["green","blue","amber"];
    if (valid.includes(t)) {
      valid.forEach(x=>document.body.classList.remove(`theme-${x}`));
      document.body.classList.add(`theme-${t}`);
      return enqueueLine(`Theme set to ${t.toUpperCase()}.`);
    }
    return enqueueLine("Unknown theme. Available: GREEN, BLUE, AMBER");
  }
  if (command.startsWith("speed ")) {
    const v = parseInt(command.split(" ")[1],10);
    if (!isNaN(v)&&v>=1&&v<=150) {
      typingSpeed=v;
      return enqueueLine(`Typing speed set to ${v} ms/char.`);
    }
    return enqueueLine("Invalid speed. Usage: SPEED <1-150>");
  }

  // IMAGE
  if (command.endsWith(".jpg")) {
    const fn=command.toUpperCase(), img=entry.images&&entry.images[fn];
    if (img) document.getElementById("output").innerHTML += `<img src="${img}" style="max-width:100%;margin:1rem 0;">`;
    else enqueueLine("File not found.");
    updatePrompt();
    document.getElementById("input-wrapper").style.display="inline-flex";
    const mi=document.getElementById("mobile-input");
    if(mi) setTimeout(()=>mi.focus(),0);
    return;
  }

  // TEXT
  if (command.endsWith(".txt")) {
    const fn=command.toUpperCase(), c=entry.files[fn];
    if (c!==undefined) return c.split("\n").forEach(l=>enqueueLine(l));
    return enqueueLine("File not found.");
  }

  // Fallback
  enqueueLine("Unknown command. Type HELP to begin.");
}
