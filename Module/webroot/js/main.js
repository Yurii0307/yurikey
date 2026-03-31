document.addEventListener("DOMContentLoaded", () => {
  console.log("main.js active");

  const BASE_SCRIPT = "/data/adb/modules/Yurikey/Yuri/";
  // Make sure language.js is already loaded so that t and tFormat are available

  let toastTimer;
  let activeToastOutput = "";

  function getScriptExecutor() {
    if (typeof ksu === "object" && typeof ksu.exec === "function") {
      return { type: "ksu", label: t("execution_backend_ksu") };
    }

    const hostExec = window.YuriKeyHost?.execScript || window.execYurikeyScript;
    if (typeof hostExec === "function") {
      return { type: "host", label: t("execution_backend_host"), exec: hostExec };
    }

    return { type: "none", label: t("execution_backend_none") };
  }

  function setOutputMeta(statusKey, backendLabel) {
    const metaEl = document.getElementById("snackbar-output-meta");
    if (!metaEl) return;

    metaEl.textContent = tFormat(statusKey, { backend: backendLabel });
  }

  function showOutputDialog(output, backendLabel = "") {
    const dialog = document.getElementById("snackbar-output-dialog");
    const overlay = document.getElementById("snackbar-output-overlay");
    const outputEl = document.getElementById("snackbar-output-text");
    if (!dialog || !overlay || !outputEl) return;

    outputEl.textContent = output || t("snackbar_no_output");
    setOutputMeta("snackbar_output_meta_ready", backendLabel || t("execution_backend_none"));

    overlay.classList.add("active");
    if (!dialog.open) dialog.showModal();
  }

  function closeOutputDialog() {
    const dialog = document.getElementById("snackbar-output-dialog");
    const overlay = document.getElementById("snackbar-output-overlay");
    if (!dialog || !overlay) return;

    if (dialog.open) dialog.close();
    overlay.classList.remove("active");
  }

  function showToast(message, type = "info", duration = 3000, output = "", backendLabel = "") {
    const snackbar = document.getElementById("snackbar");
    if (!snackbar) return;

    snackbar.textContent = message;
    snackbar.className = `snackbar show ${type}`;
    snackbar.title = output ? t("snackbar_tap_for_output") : "";

    if (output && output.trim()) {
      activeToastOutput = output.trim();
      snackbar.dataset.backendLabel = backendLabel;
      snackbar.classList.add("has-output");
    } else {
      activeToastOutput = "";
      delete snackbar.dataset.backendLabel;
      snackbar.classList.remove("has-output");
    }

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      snackbar.classList.remove("show");
    }, duration);
  }

  function handleScriptResult(rawOutput, scriptName, backendLabel) {
    const raw = typeof rawOutput === "string" ? rawOutput.trim() : "";

    if (!raw) {
      showToast(tFormat("success", { script: scriptName }), "success", 3000, "", backendLabel);
      setOutputMeta("snackbar_output_meta_empty", backendLabel);
      return;
    }

    try {
      const json = JSON.parse(raw);
      if (json.success) {
        const commandOutput = typeof json.output === "string" ? json.output.trim() : "";
        showToast(tFormat("success", { script: scriptName }), "success", 3000, commandOutput, backendLabel);
        setOutputMeta("snackbar_output_meta_ready", backendLabel);
      } else if (json.error) {
        showToast(tFormat("failed", { script: scriptName }) + ` (${json.error})`, "error", 4000, raw, backendLabel);
        setOutputMeta("snackbar_output_meta_failed", backendLabel);
      } else {
        showToast(tFormat("failed", { script: scriptName }) + " (Unknown response)", "error", 4000, raw, backendLabel);
        setOutputMeta("snackbar_output_meta_failed", backendLabel);
      }
    } catch {
      showToast(tFormat("success", { script: scriptName }), "success", 3500, raw, backendLabel);
      setOutputMeta("snackbar_output_meta_ready", backendLabel);
    }
  }

  function runScript(scriptName, basePath, button) {
    const scriptPath = `${basePath}${scriptName}`;
    const executor = getScriptExecutor();

    if (executor.type === "none") {
      showToast(t("execution_unavailable"), "warning", 4500);
      setOutputMeta("snackbar_output_meta_unavailable", executor.label);
      return;
    }

    const originalClass = button.className;
    button.classList.add("executing");

    const cb = `cb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let timeoutId;

    window[cb] = (output) => {
      clearTimeout(timeoutId);
      delete window[cb];
      button.className = originalClass;
      handleScriptResult(output, scriptName, executor.label);
    };

    try {
      showToast(tFormat("executing", { script: scriptName }), "info", 3000, "", executor.label);

      if (executor.type === "ksu") {
        ksu.exec(`sh "${scriptPath}"`, "{}", cb);
      } else {
        Promise.resolve(executor.exec(scriptPath, scriptName))
          .then(result => window[cb](typeof result === "string" ? result : JSON.stringify(result)))
          .catch((error) => {
            clearTimeout(timeoutId);
            delete window[cb];
            button.className = originalClass;
            showToast(tFormat("failed", { script: scriptName }) + ` (${error?.message || "host"})`, "error", 4500);
            setOutputMeta("snackbar_output_meta_failed", executor.label);
          });
      }
    } catch (_e) {
      clearTimeout(timeoutId);
      delete window[cb];
      button.className = originalClass;
      showToast(tFormat("failed", { script: scriptName }), "error", 4500);
      setOutputMeta("snackbar_output_meta_failed", executor.label);
      return;
    }

    timeoutId = setTimeout(() => {
      delete window[cb];
      button.className = originalClass;
      showToast(tFormat("timeout", { script: scriptName }), "error", 4500);
      setOutputMeta("snackbar_output_meta_timeout", executor.label);
    }, 7000);
  }

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

  // Navigation buttons
  document.querySelectorAll(".nav-btn").forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".page")[idx].classList.add("active");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Clock elements
  const clockDateEl = document.getElementById("clock-date");
  const clockTimeEl = document.getElementById("clock-time");
  const clockFormatBtn = document.getElementById("clock-format-btn");
  const clockFormatOptions = document.getElementById("clock-format-options");
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

    if (clockDateEl) clockDateEl.textContent = formattedDate;
    if (clockTimeEl) clockTimeEl.textContent = formattedTime;
  }

  setupClockFormatDropdown();
  updateClock();
  setInterval(updateClock, 1000);

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

  window.updateNetworkStatus = updateNetworkStatus;
  window.showToast = showToast;
  window.showSuccessToast = (message, duration = 3000) => showToast(message, "success", duration);
  window.showErrorToast = (message, duration = 4000) => showToast(message, "error", duration);
  window.showWarningToast = (message, duration = 3500) => showToast(message, "warning", duration);
  window.showInfoToast = (message, duration = 3000) => showToast(message, "info", duration);

  const snackbar = document.getElementById("snackbar");
  const dialog = document.getElementById("snackbar-output-dialog");
  const overlay = document.getElementById("snackbar-output-overlay");
  const closeOutputBtn = document.getElementById("snackbar-output-close");

  snackbar?.addEventListener("click", () => {
    if (!activeToastOutput) return;
    const backendLabel = snackbar.dataset.backendLabel || t("execution_backend_none");
    showOutputDialog(activeToastOutput, backendLabel);
  });

  closeOutputBtn?.addEventListener("click", closeOutputDialog);
  overlay?.addEventListener("click", closeOutputDialog);
  dialog?.addEventListener("close", () => overlay?.classList.remove("active"));

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

  // Initialize network status
  setTimeout(() => {
    updateNetworkStatus();
    setInterval(updateNetworkStatus, 3000);
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
  }, 500);
});
