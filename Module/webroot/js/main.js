// Main Application Entry Point
// This file orchestrates the loading of all components and utilities

document.addEventListener("DOMContentLoaded", () => {
  console.log("main.js active");

  const BASE_SCRIPT = "/data/adb/modules/Yurikey/Yuri/";

  // Register click events for buttons in Actions Page
  document.querySelectorAll("#actions-page button[data-script]").forEach(button => {
    const scriptName = button.dataset.script;
    if (scriptName) {
      button.addEventListener("click", () => runScript(scriptName, BASE_SCRIPT, button));
    }
  });

  // Register click events for buttons in Advanced Menu Page
  document.querySelectorAll("#advance-menu button[data-script]").forEach(button => {
    const scriptName = button.dataset.script;
    if (scriptName) {
      button.addEventListener("click", () => runScript(scriptName, BASE_SCRIPT, button));
    }
  });
  // Initialize Recent Logs and Logging Settings
  if (window.initLoggingUI) {
    window.initLoggingUI();
  }
});
