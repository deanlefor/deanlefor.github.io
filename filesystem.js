// filesystem.js
// Defines the folder & file structure for the C:\Dean terminal

window.fs = {
  "": {
    folders: ["ABOUT", "WORK_HISTORY", "FUN", "CONTACT"],
    files: {
      "README.TXT": 
        "Welcome to Dean Lefor’s DOS-style terminal site!\n" +
        "Type HELP for a list of commands.",
      "SECRET.TXT": 
        "You’ve discovered the secret file! 🎉\n" +
        "More surprises await in the FUN folder."
    }
  },
  "ABOUT": {
    folders: [],
    files: {
      "SITE.TXT":
        "This website emulates an IBM PC running DOS.\n" +
        "Built with pure HTML, CSS, and JavaScript.",
      "ME.TXT":
        "Dean Lefor is a public servant and scholar exploring AI,\n" +
        "oversight, and public trust.",
      "EDUCATION.TXT":
        "PhD in Public Policy, University X\n" +
        "M.A. in Y, University Z\n" +
        "B.S. in W, College Q"
    },
    images: {
      "DEAN1.JPG": "ABOUT/dean1.jpg",
      "DEAN2.JPG": "ABOUT/dean2.jpg",
      "DEAN3.JPG": "ABOUT/dean3.jpg"
    }
  },
  "WORK_HISTORY": {
    folders: [],
    files: {
      "DAIGM.TXT":
        "Deputy Assistant Inspector General for Management (DAIGM)\n" +
        "– Led initiatives on … (details to come)",
      "RMD-DIRECTOR.TXT":
        "Director, Risk Management Division (RMD)\n" +
        "– Oversaw … (details to come)"
      // Add more roles as needed
    }
  },
  "FUN": {
    folders: [],
    files: {
      "GAMES.TXT":
        "Retro terminal games coming soon!\n" +
        "Try commands like SNAKE or PONG in future updates.",
      "ASCII-ART.TXT":
        "  ,_,\n" +
        " (O,O)\n" +
        " (   )\n" +
        "  `\"`   Here's some owl ASCII art!",
      "PROJECTS.TXT":
        "Side projects:\n" +
        "- Project A: …\n" +
        "- Project B: …"
    }
  },
  "CONTACT": {
    folders: [],
    files: {
      "CONTACT.TXT":
        "Email: webmaster@deanlefor.com\n" +
        "LinkedIn: https://linkedin.com/\n" +
        "Twitter: @xxxxxxxxxxx"
    }
  }
};
