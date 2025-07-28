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
        "I mean, it's not really secret because it is listed with all the files... but...\n" +
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
        "I'm a public sector leader and Ph.D. student passionate about the intersection of technology, oversight, and public trust. With nearly two decades of experience in the federal government, my work is centered on ethical governance, effective operational management, and exploring the future of AI in public administration.\n" +
        "When I'm not deep in research or my professional work, I enjoy more creative pursuits. You can often find me behind a camera, dabbling in web development, or experimenting with AI to find new ways to make complex ideas more accessible to everyone.",
      "EDUCATION.TXT":
        "- (Starting Fall 2025) Ph.D. in Public Administration and Public Affairs, Virginia Tech (2030?)\n" +
        "- Master of Public Administration, University of North Dakota (2008)\n" +
        "- Bachelor of Science, Business Administration (Finance Emphasis), North Dakota State University (2006)\n" +
        "- Bachelor of Science, Psychology, North Dakota State University (2006)"
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
        "Deputy Assistant Inspector General for Management (DAIGM) (2025-current)\n" +
        "– Led initiatives on … (details to come)",
      "RMD_DIRECTOR.TXT":
        "Director, Resources Management Division (RMD) (2024-2025)\n" +
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
      "ASCII_ART.TXT":
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
