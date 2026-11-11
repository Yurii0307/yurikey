// Clock Component
const CLOCK_FORMAT_KEY = "clockFormat";

function getDeviceClockFormat() {
  try {
    const resolved = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
    if (typeof resolved.hour12 === "boolean") {
      return resolved.hour12 ? "12h" : "24h";
    }
  } catch (e) {}
  const sample = new Date().toLocaleTimeString(undefined, { hour: "numeric" });
  return /am|pm/i.test(sample) ? "12h" : "24h";
}

function getClockFormat() {
  const stored = localStorage.getItem(CLOCK_FORMAT_KEY);
  if (stored === "12h" || stored === "24h") {
    return stored;
  }
  return getDeviceClockFormat();
}

function getClockFormatLabel(format) {
  if (format === "24h") return typeof window.t === "function" ? window.t("clock_format_24h", "24-hour") : "24-hour";
  return typeof window.t === "function" ? window.t("clock_format_12h", "12-hour") : "12-hour";
}

function formatClockTime(date, format) {
  if (format === "24h") {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}
function renderClockTimeHTML(date, format) {
  const raw = formatClockTime(date, format);
  const match = raw.match(/^(.*?)\s+([A-Za-z/.\s]+)$/);
  if (match) {
    return `<span class="clock-time-digits">${match[1]}</span><span class="clock-time-period">${match[2]}</span>`;
  }
  return `<span class="clock-time-digits">${raw}</span>`;
}

function updateClockFormatCards(selectedFormat) {
  const cards = document.querySelectorAll(".clock-format-card");
  cards.forEach(card => {
    const isSelected = (card.dataset.format || "auto") === selectedFormat;
    card.classList.toggle("active", isSelected);
    card.setAttribute("aria-checked", isSelected ? "true" : "false");
  });
}

function setupClockFormatGrid() {
  const cards = Array.from(document.querySelectorAll(".clock-format-card"));
  if (!cards.length) return;

  const currentFormat = getClockFormat();
  updateClockFormatCards(currentFormat);

  cards.forEach((card, idx) => {
    card.addEventListener("click", () => {
      const format = card.dataset.format || "auto";
      localStorage.setItem(CLOCK_FORMAT_KEY, format);
      updateClockFormatCards(format);
      updateClock();
      if (typeof showToast === "function") {
        showToast(`Clock format: ${getClockFormatLabel(format)}`, "success");
      }
    });

    card.addEventListener("keydown", (e) => {
      let targetIdx = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        targetIdx = (idx + 1) % cards.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        targetIdx = (idx - 1 + cards.length) % cards.length;
      }
      if (targetIdx !== null) {
        e.preventDefault();
        cards[targetIdx].focus();
        cards[targetIdx].click();
      }
    });
  });
}

document.addEventListener("languageChanged", () => {
  updateClockFormatCards(getClockFormat());
});
function updateClock() {
  const now = new Date();
  const format = getClockFormat();

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  const formattedTime = formatClockTime(now, format);

  const clockDateEl = document.getElementById("clock-date");
  const clockTimeEl = document.getElementById("clock-time");
  
  if (clockDateEl) clockDateEl.textContent = formattedDate;
  if (clockTimeEl) clockTimeEl.textContent = formattedTime;
  // Update live preview in each format card
  const preview12h = document.getElementById("clock-preview-12h");
  const preview24h = document.getElementById("clock-preview-24h");

  if (preview12h) preview12h.innerHTML = renderClockTimeHTML(now, "12h");
  if (preview24h) preview24h.innerHTML = renderClockTimeHTML(now, "24h");
}

// Initialize clock
document.addEventListener("DOMContentLoaded", () => {
  setupClockFormatGrid();
  updateClock();
  setInterval(updateClock, 1000);
});

// Export functions
window.updateClock = updateClock;
window.setupClockFormatGrid = setupClockFormatGrid;
window.setupClockFormatDropdown = setupClockFormatGrid;
