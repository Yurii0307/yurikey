// Execute a shell script with KernelSU
async function runScript(scriptName, callback) {
  const fullPath = await window.KsuBridge.resolveScriptFile(scriptName, "webroot/common/");
  if (!window.KsuBridge?.runShellScript(fullPath, callback)) {
    console.warn("ksu.exec not available.");
    if (typeof callback === "function") callback();
  }
}

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
      const res = await fetch("/json/device-info.json?ts=" + Date.now());
      if (!res.ok) throw new Error("Fetch failed");

      const data = await res.json();
      if (data.android || data.kernel || data.root) return data;
    } catch (err) {}
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error("Timeout waiting for valid device-info.json");
}

// Load device info and display it in the UI
async function loadDeviceInfo() {
  try {
    const res = await fetch("/json/device-info.json?ts=" + Date.now());
    if (!res.ok) throw new Error("Failed to fetch");

    const data = await res.json();
    document.getElementById("android-version").innerText = data.android || "-";
    document.getElementById("kernel-version").innerText = data.kernel || "-";
    document.getElementById("root-type").innerText = data.root || "-";
  } catch (err) {
    console.error("loadDeviceInfo() error:", err);
    document.getElementById("android-version").innerText = "Error";
    document.getElementById("kernel-version").innerText = "Error";
    document.getElementById("root-type").innerText = "Error";
  }
}

// Setup refresh button behavior with translation and animation
function setupRefreshButton() {
  const refreshBtn = document.getElementById("refresh-info-btn");
  if (!refreshBtn) return;

  const scriptName = refreshBtn.dataset.script;

  refreshBtn.addEventListener("click", async () => {
    if (refreshBtn.disabled) return;
    refreshBtn.disabled = true;
    refreshBtn.classList.add("rotating");

    await runScript(scriptName, async () => {
      try {
        const data = await waitForValidDeviceInfo();
        document.getElementById("android-version").innerText = data.android || "-";
        document.getElementById("kernel-version").innerText = data.kernel || "-";
        document.getElementById("root-type").innerText = data.root || "-";
      } catch (err) {
        console.warn("Could not update device info:", err);
      }

      refreshBtn.classList.remove("rotating");
      refreshBtn.disabled = false;
    });
  });
}

// Init device info and action buttons on page load
window.addEventListener("DOMContentLoaded", async () => {
  await waitForTranslations();     // Make sure translations are loaded
  loadDeviceInfo();                // Load initial device info
  setupRefreshButton();           // Setup refresh button
});

window.loadDeviceInfo = loadDeviceInfo;
