// Clock Component
const CLOCK_FORMAT_KEY = "clockFormat";

function getClockFormat() {
  return localStorage.getItem(CLOCK_FORMAT_KEY) || "auto";
}

function getClockFormatLabel(format) {
  if (format === "24h") return "24-hour (00:00)";
  if (format === "12h") return "12-hour (AM/PM)";
  return "Auto (Device)";
}

function setupClockFormatDropdown() {
  const clockFormatBtn = document.getElementById("clock-format-btn");
  const clockFormatOptions = document.getElementById("clock-format-options");
  
  if (!clockFormatBtn || !clockFormatOptions) return;

  const currentFormat = getClockFormat();
  clockFormatBtn.innerText = getClockFormatLabel(currentFormat);

  clockFormatBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clockFormatOptions.classList.toggle("show");
  });

  document.addEventListener("click", (e) => {
    if (!clockFormatOptions.contains(e.target) && e.target !== clockFormatBtn) {
      clockFormatOptions.classList.remove("show");
    }
  });

  clockFormatOptions.querySelectorAll("li[data-format]").forEach(item => {
    item.addEventListener("click", () => {
      const format = item.dataset.format || "auto";
      localStorage.setItem(CLOCK_FORMAT_KEY, format);
      clockFormatBtn.innerText = getClockFormatLabel(format);
      clockFormatOptions.classList.remove("show");
      updateClock();
      showToast(`Clock format: ${getClockFormatLabel(format)}`, "success");
    });
  });
}

function updateClock() {
  const now = new Date();
  const format = getClockFormat();

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  let formattedTime;
  if (format === "24h") {
    formattedTime = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
  } else if (format === "12h") {
    formattedTime = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);
  } else {
    formattedTime = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const clockDateEl = document.getElementById("clock-date");
  const clockTimeEl = document.getElementById("clock-time");
  
  if (clockDateEl) clockDateEl.textContent = formattedDate;
  if (clockTimeEl) clockTimeEl.textContent = formattedTime;
}

// Initialize clock
document.addEventListener("DOMContentLoaded", () => {
  setupClockFormatDropdown();
  updateClock();
  setInterval(updateClock, 1000);
});

// Export functions
window.updateClock = updateClock;
