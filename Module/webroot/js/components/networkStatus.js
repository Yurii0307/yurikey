// Network Status Component
let lastStatus = null;

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

async function updateNetworkStatus() {
  const statusRow = document.getElementById("status-row");
  const statusText = document.getElementById("status-bar-text");

  if (!statusRow || !statusText) {
    console.warn("Status elements not found");
    return;
  }

  // Show temporary status while checking
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
    showToast(t("status_offline"), "error");
    lastStatus = "offline";
  } else {
    // Update text only to sync language
    if (lastStatus === "online") {
      statusText.textContent = t("home_status_online");
      statusRow.title = t("status_online");
    } else if (lastStatus === "offline") {
      statusText.textContent = t("home_status_offline");
      statusRow.title = t("status_offline");
    }
  }
}

// Initialize network status
setTimeout(() => {
  updateNetworkStatus();
  setInterval(updateNetworkStatus, 3000);
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
}, 500);

// Export function
window.updateNetworkStatus = updateNetworkStatus;
