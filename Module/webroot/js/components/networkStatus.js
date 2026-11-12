// Network Status Component with Multi-Region Probes
const PROBE_ENDPOINTS = [
  "https://clients3.google.com/generate_204",
  "https://cp.cloudflare.com/generate_204",
  "https://connect.rom.miui.com/generate_204",
];

let lastStatus = null;
let isChecking = false;
let refreshTimer = null;

async function probeUrl(url, timeoutMs = 2500) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(url, {
      method: "GET",
      cache: "no-store",
      mode: "no-cors",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

async function verifyRealInternet() {
  for (const endpoint of PROBE_ENDPOINTS) {
    const ok = await probeUrl(endpoint);
    if (ok) return true;
  }
  return false;
}

async function updateNetworkStatus() {
  const statusRow = document.getElementById("status-row");
  const statusText = document.getElementById("status-bar-text");

  if (!statusRow || !statusText) {
    console.warn("Status elements not found");
    return;
  }

  if (isChecking) return;
  isChecking = true;

  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  refreshTimer = setTimeout(() => {
    statusText.textContent = t("home_refreshing");
    statusRow.title = t("home_refreshing");
  }, 3000);

  try {
    const isProbablyOnline = navigator.onLine;
    const isActuallyOnline = isProbablyOnline ? await verifyRealInternet() : false;

    clearTimeout(refreshTimer);
    refreshTimer = null;

    if (isActuallyOnline) {
      if (lastStatus !== "online") {
        statusRow.classList.remove("offline");
        statusRow.classList.add("online");
        statusText.textContent = t("home_status_online");
        statusRow.title = t("status_online");
        lastStatus = "online";
      } else {
        statusText.textContent = t("home_status_online");
        statusRow.title = t("status_online");
      }
    } else {
      if (lastStatus !== "offline") {
        statusRow.classList.remove("online");
        statusRow.classList.add("offline");
        statusText.textContent = t("home_status_offline");
        statusRow.title = t("status_offline");
        if (lastStatus !== null && !navigator.onLine) {
          showToast(t("status_offline"), "error");
        }
        lastStatus = "offline";
      } else {
        statusText.textContent = t("home_status_offline");
        statusRow.title = t("status_offline");
      }
    }
  } catch (err) {
    console.error("Network check error:", err);
  } finally {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    isChecking = false;
  }
}

// Initialize network status
setTimeout(() => {
  updateNetworkStatus();
  setInterval(updateNetworkStatus, 15000);
  window.addEventListener("online", () => updateNetworkStatus());
  window.addEventListener("offline", () => updateNetworkStatus());
}, 500);

// Export function
window.updateNetworkStatus = updateNetworkStatus;
