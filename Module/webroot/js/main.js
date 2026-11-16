// Main Application Entry Point
// This file orchestrates the loading of all components and utilities

document.addEventListener("DOMContentLoaded", () => {
  console.log("main.js active");

  const BASE_SCRIPT = "/data/adb/modules/Yurikey/Yuri/";
  const TEESIM_ACTIONS = ["target_txt.sh", "security_patch.sh", "select_app_neccesary.sh"];

  function bindActionButtons(selector) {
    document.querySelectorAll(selector).forEach(button => {
      const scriptName = button.dataset.script;
      if (!scriptName) return;
      button.addEventListener("click", () => {
        if (TEESIM_ACTIONS.includes(scriptName) && typeof window.runTeesimAction === "function") {
          window.runTeesimAction(scriptName, BASE_SCRIPT, button).catch(() => {});
          return;
        }
        runScript(scriptName, BASE_SCRIPT, button);
      });
    });
  }

  // Register click events for buttons in Actions Page
  bindActionButtons("#actions-page button[data-script]");

  // Register click events for buttons in Advanced Menu Page
  bindActionButtons("#advance-menu button[data-script]");

  // Initialize Recent Logs and Logging Settings
  if (window.initLoggingUI) {
    window.initLoggingUI();
  }
});
