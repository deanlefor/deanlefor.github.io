// filesystem.js
// Defines the folder & file structure for the C:\Dean terminal

window.fs = {
  // =================================================================
  // Root Directory (C:\Dean)
  // =================================================================
  "": {
    folders: ["ABOUT", "WORK_HISTORY", "FUN", "CONTACT"],
    files: {
      "README.TXT": 
        "Welcome to Dean Lefor’s DOS-style terminal site!\n" +
        "Type HELP for a list of commands."
    }
  },

  // =================================================================
  // About Me Section
  // =================================================================
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

  // =================================================================
  // Work History Section
  // =================================================================
  "WORK_HISTORY": {
    folders: [],
    files: {
      "DAIGM.TXT":
        "DEPUTY ASSISTANT INSPECTOR GENERAL FOR MANAGEMENT (2025–Present)\\n" +
        "NASA Office of Inspector General – Washington, DC\\n" +
        "\\n" +
        "• Provides executive oversight for NASA OIG’s administrative operations, including budget, IT, human capital, facilities, and internal policy.\\n" +
        "• Leads a cross-functional management team, driving strategic alignment between mission support services and OIG oversight priorities.\\n" +
        "• Oversees execution and compliance of the agency’s multi-million dollar budget while ensuring efficient resource stewardship.\\n" +
        "• Directs enterprise modernization efforts in information technology and workforce development to enhance operational effectiveness.\\n" +
        "• Serves as a senior advisor to the Inspector General and executive leadership, guiding agency-wide initiatives and long-term planning.",
      "RMD_DIRECTOR.TXT":
        "DIRECTOR, RESOURCES MANAGEMENT DIVISION (2024-2025)\\n" +
        "NASA Office of Inspector General - Washington, DC\\n" +
        "\\n" +
        "• Oversees the strategic direction and financial oversight of NASA OIG’s $47.6M budget, including procurement, policy, and resource allocation.\\n" +
        "• Directs an 8-member team, establishing performance metrics and professional development to achieve operational excellence.\\n" +
        "• Leads financial planning and procurement operations for over $9M in federal procurements, ensuring regulatory compliance and cost-effectiveness.\\n" +
        "• Provides strategic leadership for the OIG's travel and procurement training programs to ensure adherence to federal policies.\\n" +
        "• Acts as the primary liaison between NASA OIG Headquarters and its facilities, facilitating collaboration with senior leadership to optimize performance.",
      "PPA_MANAGER.TXT":
        "MANAGER, PROCUREMENT, POLICY, and ADMINISTRATION\\n" +
        "NASA Office of Inspector General - Washington, DC\\n" +
        "\\n" +
        "• Leads procurement, budgeting, and operations, developing strategies to optimize resource use and ensure regulatory compliance.\\n" +
        "• Acts as the primary liaison between headquarters and ten nationwide OIG facilities, ensuring seamless communication and continuity of operations.\\n" +
        "• Directs the coordination of NASA OIG’s Strategic Plan, developing and tracking key performance metrics for internal and Congressional reporting.\\n" +
        "• Chaired the inaugural ‘Return To Work’ committee and contributed to NASA’s ‘Future of Work’ initiatives, shaping strategic workforce planning.\\n" +
        "• Oversees a diverse portfolio of projects, driving process innovation and cross-divisional collaboration using technologies like PowerBI.",
      "PRIOR.TXT":
        "• National Aeronautics and Space Administration (NASA), Office of Inspector General (OIG), Operations Officer (2013-2016)\\n" +
        "• Department of Education, Federal Student Aid, Management Analyst (2008-2013)\\n" +
        "• United States Senate, Budget Committee, Committee Intern (2007)"
    }
  },

  // =================================================================
  // Fun Stuff Section
  // =================================================================
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
        "- Project B: …",
      "SECRET.TXT": 
        "You’ve discovered the secret file! 🎉\n" +
        "I mean, it's not really secret because it is listed with all the files... but...\n" +
        "More surprises await in the FUN folder."
    }
  },

  // =================================================================
  // Contact Info Section
  // =================================================================
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
