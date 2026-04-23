(function initNotificationsModule() {
  let toastTimer;

  function showToast(message, type = "info", duration = 3000) {
    const snackbar = document.getElementById("snackbar");
    if (!snackbar) return;

    snackbar.textContent = message;
    snackbar.className = `snackbar show ${type}`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      snackbar.classList.remove("show");
    }, duration);
  }

  window.showToast = showToast;
  window.showSuccessToast = (message, duration = 3000) => showToast(message, "success", duration);
  window.showErrorToast = (message, duration = 4000) => showToast(message, "error", duration);
  window.showWarningToast = (message, duration = 3500) => showToast(message, "warning", duration);
  window.showInfoToast = (message, duration = 3000) => showToast(message, "info", duration);
})();
