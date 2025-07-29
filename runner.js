// runner.js
window.onload = () => {
  // FIX: Call the viewport handler to manage mobile screen height and
  // ensure the terminal is always the correct size.
  handleViewportChanges();
  runBootSplash();
  attachInputHandlers();
};
