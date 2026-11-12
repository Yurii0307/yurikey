// Device Information Component
const BASE_SCRIPT = "/data/adb/modules/Yurikey/webroot/common/";

// Wait until translation data is loaded
async function waitForTranslations(timeout = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (window.translations && Object.keys(window.translations).length > 0) {
      return;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.warn("translations not loaded in time.");
}

// Wait for valid device-info.json response
async function waitForValidDeviceInfo(maxWait = 4000, interval = 400) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch("json/device-info.json?ts=" + Date.now());
      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();
      const isNone = (val) => !val || val === "none" || val === "-" || val === "Error";
      if (data && (!isNone(data.android) || !isNone(data.kernel) || !isNone(data.root))) return data;
    } catch (err) {}
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error("Timeout waiting for valid device-info.json");
}

// Load device info and display it in the UI
async function loadDeviceInfo() {
  try {
    let data = null;
    try {
      const res = await fetch("json/device-info.json?ts=" + Date.now());
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      data = null;
    }

    const isNone = (val) => !val || val === "none" || val === "-" || val === "Error";
    const hasNone = !data || isNone(data.android) || isNone(data.kernel) || isNone(data.root);

    if (hasNone && window.Bridge && window.Bridge.isAvailable()) {
      try {
        await window.Bridge.exec(`sh "${BASE_SCRIPT}device-info.sh"`);
        data = await waitForValidDeviceInfo();
      } catch (bridgeErr) {
        console.warn("Auto-trigger device-info.sh failed:", bridgeErr);
      }
    }

    if (data) {
      document.getElementById("android-version").innerText = data.android || "-";
      document.getElementById("kernel-version").innerText = data.kernel || "-";
      document.getElementById("root-type").innerText = data.root || "-";
    } else {
      throw new Error("No device info available");
    }
  } catch (err) {
    console.error("loadDeviceInfo() error:", err);
    document.getElementById("android-version").innerText = "Error";
    document.getElementById("kernel-version").innerText = "Error";
    document.getElementById("root-type").innerText = "Error";
  }
}

// Execute an internal shell script with unified Bridge
function execDeviceScript(scriptName, callback) {
  const fullPath = `${BASE_SCRIPT}${scriptName}`;
  if (window.Bridge && typeof window.Bridge.exec === "function") {
    window.Bridge.exec(`sh "${fullPath}"`)
      .catch((err) => console.warn(`Bridge execution failed for ${scriptName}:`, err))
      .finally(() => {
        if (typeof callback === "function") callback();
      });
  } else {
    console.warn("Bridge executor not available.");
    if (typeof callback === "function") callback();
  }
}

let refreshSuccessTimer = null;

// Setup refresh button behavior with translation and animation
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refresh-info-btn");
  if (!refreshBtn) return;

  refreshBtn.addEventListener("click", () => {
    if (refreshBtn.disabled) return;
    refreshBtn.disabled = true;
    if (refreshSuccessTimer) {
      clearTimeout(refreshSuccessTimer);
      refreshSuccessTimer = null;
    }
    refreshBtn.classList.remove("success");
    refreshBtn.classList.add("rotating");

    if (window.showToast) {
      window.showToast(window.t ? window.t("home_refreshing", "Refreshing info...") : "Refreshing info...", "info");
    }
    if (window.updateNetworkStatus) {
      window.updateNetworkStatus();
    }

    const minSpinPromise = new Promise(resolve => setTimeout(resolve, 600));

    execDeviceScript("device-info.sh", async () => {
      try {
        const data = await waitForValidDeviceInfo();
        document.getElementById("android-version").innerText = data.android || "-";
        document.getElementById("kernel-version").innerText = data.kernel || "-";
        document.getElementById("root-type").innerText = data.root || "-";
      } catch (err) {
        console.warn("Could not update device info:", err);
      } finally {
        await minSpinPromise;
        refreshBtn.classList.remove("rotating");
        refreshBtn.classList.add("success");

        refreshSuccessTimer = setTimeout(() => {
          refreshBtn.classList.remove("success");
          refreshBtn.disabled = false;
          refreshSuccessTimer = null;
        }, 2000);
      }
    });
  });
}

// Init device info and action buttons on page load
window.addEventListener("DOMContentLoaded", async () => {
  await waitForTranslations();     // Make sure translations are loaded
  loadDeviceInfo();                // Load initial device info
  setupRefreshButton();            // Setup refresh button

});

window.loadDeviceInfo = loadDeviceInfo;
