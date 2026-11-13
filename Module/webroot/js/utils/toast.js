// Toast Notification Utilities
const TOAST_ICONS = {
  success: "check",
  error: "error",
  warning: "warning",
  info: "info",
};
const TOAST_DEFAULT_DURATION = 3000;
let toastTimer;

// The toast's final width is the track's width; the message is laid out at
// that width from the first frame so text never reflows during the expand.
function syncToastTrackWidth() {
  const track = document.querySelector(".toast-track");
  if (!track) return;
  document.documentElement.style.setProperty("--toast-track-width", `${track.clientWidth}px`);
}

function showToast(message, type = "info", duration = TOAST_DEFAULT_DURATION) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  syncToastTrackWidth();

  const status = TOAST_ICONS[type] ? type : "info";
  const icon = document.getElementById("toast-icon");
  const text = document.getElementById("toast-message");

  if (icon) icon.textContent = TOAST_ICONS[status];
  if (text) text.textContent = message;
  toast.dataset.status = status;

  clearTimeout(toastTimer);

  if (!toast.classList.contains("show")) {
    void toast.offsetWidth;
    toast.classList.add("show");
  }

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// Export toast functions to window object
window.showToast = showToast;
window.showSuccessToast = (message, duration = 3000) => showToast(message, "success", duration);
window.showErrorToast = (message, duration = 4000) => showToast(message, "error", duration);
window.showWarningToast = (message, duration = 3500) => showToast(message, "warning", duration);
window.showInfoToast = (message, duration = 3000) => showToast(message, "info", duration);

document.addEventListener("DOMContentLoaded", syncToastTrackWidth);
window.addEventListener("resize", syncToastTrackWidth);
