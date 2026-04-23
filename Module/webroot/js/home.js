(function initHomeModule() {
  const CLOCK_FORMAT_KEY = "clockFormat";

  function getClockFormat() {
    return localStorage.getItem(CLOCK_FORMAT_KEY) || "auto";
  }

  function getClockFormatLabel(format) {
    if (format === "24h") return "24-hour (00:00)";
    if (format === "12h") return "12-hour (AM/PM)";
    return "Auto (Device)";
  }

  function initClockFormatDropdown() {
    const clockFormatBtn = document.getElementById("clock-format-btn");
    const clockFormatOptions = document.getElementById("clock-format-options");
    if (!clockFormatBtn || !clockFormatOptions) return;

    clockFormatBtn.innerText = getClockFormatLabel(getClockFormat());

    window.WebrootUI.bindDropdown({
      button: clockFormatBtn,
      menu: clockFormatOptions,
      itemSelector: "li[data-format]",
      onSelect: (item, { close }) => {
        const format = item.dataset.format || "auto";
        localStorage.setItem(CLOCK_FORMAT_KEY, format);
        clockFormatBtn.innerText = getClockFormatLabel(format);
        close();
        updateClock();
        window.showSuccessToast?.(`Clock format: ${getClockFormatLabel(format)}`);
      },
    });
  }

  function updateClock() {
    const clockDateEl = document.getElementById("clock-date");
    const clockTimeEl = document.getElementById("clock-time");
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

    if (clockDateEl) clockDateEl.textContent = formattedDate;
    if (clockTimeEl) clockTimeEl.textContent = formattedTime;
  }

  async function verifyRealInternet() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      await fetch("https://clients3.google.com/generate_204", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        await fetch("https://clients3.google.com/generate_204", {
          method: "GET",
          cache: "no-store",
          mode: "no-cors",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return true;
      } catch {
        return false;
      }
    }
  }

  let lastStatus = null;

  async function updateNetworkStatus() {
    const statusRow = document.getElementById("status-row");
    const statusText = document.getElementById("status-bar-text");
    if (!statusRow || !statusText) return;

    statusText.textContent = t("home_refreshing");
    statusRow.title = t("home_refreshing");

    const isProbablyOnline = navigator.onLine;
    const isActuallyOnline = isProbablyOnline && await verifyRealInternet();

    if (isActuallyOnline && lastStatus !== "online") {
      statusRow.classList.replace("offline", "online");
      statusText.textContent = t("home_status_online");
      statusRow.title = t("status_online");
      lastStatus = "online";
    } else if (!isActuallyOnline && lastStatus !== "offline") {
      statusRow.classList.replace("online", "offline");
      statusText.textContent = t("home_status_offline");
      statusRow.title = t("status_offline");
      window.showErrorToast?.(t("status_offline"));
      lastStatus = "offline";
    } else if (lastStatus === "online") {
      statusText.textContent = t("home_status_online");
      statusRow.title = t("status_online");
    } else if (lastStatus === "offline") {
      statusText.textContent = t("home_status_offline");
      statusRow.title = t("status_offline");
    }
  }

  function initRefreshStatusButton() {
    const refreshBtn = document.getElementById("refresh-info-btn");
    if (!refreshBtn) return;

    refreshBtn.addEventListener("click", () => {
      window.showInfoToast?.(t("home_refreshing"));
      updateNetworkStatus();
      window.loadDeviceInfo?.();
    });
  }

  function initHomePage() {
    initClockFormatDropdown();
    updateClock();
    setInterval(updateClock, 1000);
    initRefreshStatusButton();

    setTimeout(() => {
      updateNetworkStatus();
      setInterval(updateNetworkStatus, 3000);
      window.addEventListener("online", updateNetworkStatus);
      window.addEventListener("offline", updateNetworkStatus);
    }, 500);
  }

  window.updateNetworkStatus = updateNetworkStatus;
  window.WebrootHome = {
    initHomePage,
  };
})();
