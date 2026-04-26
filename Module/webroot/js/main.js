// Main Application Entry Point
// This file orchestrates the loading of all components and utilities

document.addEventListener("DOMContentLoaded", () => {
  console.log("main.js active");

  const BASE_SCRIPT = "/data/adb/modules/Yurikey/Yuri/";

  // Register click events for buttons in Actions Page
  document.querySelectorAll("#actions-page .menu-btn[data-script]").forEach(button => {
    const scriptName = button.dataset.script;
    if (scriptName) {
      button.addEventListener("click", () => runScript(scriptName, BASE_SCRIPT, button));
    }
  });

  // Register click events for buttons in Advanced Menu Page
  document.querySelectorAll("#advance-menu .menu-btn[data-script]").forEach(button => {
      const scriptName = button.dataset.script;
      if (scriptName) {
          button.addEventListener("click", () => runScript(scriptName, BASE_SCRIPT, button));
      }
  });

  const historyCard = document.getElementById("module-version-card");
  const historyDialog = document.getElementById("script-history-dialog");
  const historyOverlay = document.getElementById("script-history-overlay");
  const historyCloseBtn = document.getElementById("script-history-close");
  const historyClearBtn = document.getElementById("script-history-clear");

  historyCard?.addEventListener("click", openHistoryDialog);
  historyCloseBtn?.addEventListener("click", closeHistoryDialog);
  historyOverlay?.addEventListener("click", closeHistoryDialog);
  historyDialog?.addEventListener("close", () => historyOverlay?.classList.remove("active"));
  historyClearBtn?.addEventListener("click", () => {
    writeHistory([]);
    renderHistoryDialog();
  });

  // Refresh info button event
  const refreshBtn = document.getElementById("refresh-info-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      showToast(t("home_refreshing"), "info");
      updateNetworkStatus();
      if (window.loadDeviceInfo) {
        window.loadDeviceInfo();
      }
    });
  }
});
