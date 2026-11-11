// Script Execution Utilities
const SCRIPT_HISTORY_KEY = "scriptHistoryLogs";

function getScriptExecutor() {
  if (typeof window.YuriKeyHost?.execScript === "function") {
    return (scriptPath, scriptName, cb) => {
      Promise.resolve(window.YuriKeyHost.execScript(scriptPath, scriptName))
        .then(result => cb(typeof result === "string" ? result : JSON.stringify(result)))
        .catch(() => cb(""));
    };
  }

  if (typeof window.execYurikeyScript === "function") {
    return (scriptPath, scriptName, cb) => {
      Promise.resolve(window.execYurikeyScript(scriptPath, scriptName))
        .then(result => cb(typeof result === "string" ? result : JSON.stringify(result)))
        .catch(() => cb(""));
    };
  }

  if (typeof ksu === "object" && typeof ksu.exec === "function") {
    return (scriptPath, _scriptName, cbName) => ksu.exec(`sh "${scriptPath}"`, "{}", cbName);
  }

  return null;
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SCRIPT_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  try {
    localStorage.setItem(SCRIPT_HISTORY_KEY, JSON.stringify(items.slice(0, 80)));
  } catch {}
}

function getScriptBasename(scriptName) {
  if (!scriptName || typeof scriptName !== "string") return "script";
  return scriptName.split("/").pop();
}

function addScriptHistory(scriptName, outputText, isSuccess = true) {
  const cleanOutput = (outputText || "").trim();
  if (!cleanOutput) return;

  const history = readHistory();
  history.unshift({
    script: getScriptBasename(scriptName),
    output: cleanOutput,
    time: new Date().toLocaleString(),
    success: Boolean(isSuccess),
  });
  writeHistory(history);
  renderRecentLogs();
}

function renderRecentLogs() {
  const contentEl = document.getElementById("recent-logs-content");
  if (!contentEl) return;

  const history = readHistory();
  if (!history.length) {
    const emptyText = window.t ? window.t("home_no_logs", "No logs recorded yet.") : "No logs recorded yet.";
    contentEl.innerHTML = `<div class="recent-logs-empty"><i class="empty-icon">history</i><span data-i18n="home_no_logs">${emptyText}</span></div>`;
    return;
  }

  contentEl.innerHTML = history.slice(0, 20).map(item => {
    const script = getScriptBasename(item.script)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const time = (item.time || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const output = (item.output || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const isError = typeof item.success === "boolean"
      ? !item.success
      : /error|failed|fault|exception|\[!\]/i.test(output);
    const badgeClass = isError ? "log-badge badge-error" : "log-badge badge-success";
    const statusIcon = isError ? "error" : "terminal";
    return `<div class="log-item ${isError ? "log-item-error" : ""}"><div class="log-item-header"><span class="${badgeClass}"><i>${statusIcon}</i><span>${script}</span></span><span class="log-time">${time}</span></div><pre class="log-output">${output}</pre></div>`;
  }).join("");
}

function openLogsDialog() {
  const dialog = document.getElementById("logs-dialog");
  const overlay = document.getElementById("logs-dialog-overlay");
  if (!dialog) return;

  renderRecentLogs();
  dialog.classList.add("active");
  if (overlay) overlay.classList.add("active");
  if (!dialog.open && typeof dialog.show === "function") {
    try { dialog.show(); } catch {}
  }
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
}

function closeLogsDialog() {
  const dialog = document.getElementById("logs-dialog");
  const overlay = document.getElementById("logs-dialog-overlay");
  if (!dialog) return;

  dialog.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
  if (dialog.open && typeof dialog.close === "function") {
    try { dialog.close(); } catch {}
  }
}

function toggleLogsDialog() {
  const dialog = document.getElementById("logs-dialog");
  if (dialog && (dialog.classList.contains("active") || dialog.open)) {
    closeLogsDialog();
  } else {
    openLogsDialog();
  }
}

function initLoggingUI() {
  renderRecentLogs();

  const logsFab = document.getElementById("logs-fab");
  if (logsFab) {
    logsFab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleLogsDialog();
    });
  }

  const closeBtn = document.getElementById("logs-dialog-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLogsDialog();
    });
  }

  const overlay = document.getElementById("logs-dialog-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLogsDialog();
    });
  }

  // Click outside dialog to close
  document.addEventListener("click", (e) => {
    const dialog = document.getElementById("logs-dialog");
    const fab = document.getElementById("logs-fab");
    if (!dialog || !dialog.classList.contains("active")) return;
    if (dialog.contains(e.target) || fab?.contains(e.target)) return;
    closeLogsDialog();
  });

  // Navigation bar click closes dialog and switches tab
  document.querySelectorAll(".m3-floating-nav a, nav.bottom a, .toolbar a").forEach(link => {
    link.addEventListener("click", () => {
      closeLogsDialog();
    });
  });

  const copyBtn = document.getElementById("logs-dialog-copy");
  let copySuccessTimer = null;
  if (copyBtn) {
    copyBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const history = readHistory();
      const text = history.length
        ? history.map(h => `[${h.time}] ${getScriptBasename(h.script)}\n${h.output}`).join("\n\n")
        : (window.t ? window.t("home_no_logs", "No logs recorded yet.") : "No logs recorded yet.");

      const runCopyAnimation = () => {
        if (copySuccessTimer) {
          clearTimeout(copySuccessTimer);
          copySuccessTimer = null;
        }
        copyBtn.classList.add("success");
        copySuccessTimer = setTimeout(() => {
          copyBtn.classList.remove("success");
          copySuccessTimer = null;
        }, 2000);

        if (window.showToast) {
          window.showToast(window.t ? window.t("logs_copied", "Logs copied to clipboard") : "Logs copied to clipboard", "success", 2000);
        }
      };

      const handleCopyFailure = () => {
        if (window.showToast) {
          window.showToast(window.t ? window.t("copy_failed", "Failed to copy logs") : "Failed to copy logs", "error", 2000);
        }
      };

      const fallbackCopy = () => {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (successful) {
            runCopyAnimation();
          } else {
            handleCopyFailure();
          }
        } catch {
          handleCopyFailure();
        }
      };

      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text).then(runCopyAnimation).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
  }

  const clearBtn = document.getElementById("logs-dialog-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      writeHistory([]);
      renderRecentLogs();
      if (window.showToast) {
        window.showToast(window.t ? window.t("logs_cleared", "Logs cleared") : "Logs cleared", "info", 2000);
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const dialog = document.getElementById("logs-dialog");
      if (dialog?.classList.contains("active") || dialog?.open) {
        closeLogsDialog();
      }
    }
  });

  const logViewerToggle = document.getElementById("log-viewer-toggle");
  function syncLogViewerState() {
    let isEnabled = false;
    try {
      isEnabled = localStorage.getItem("logViewerEnabled") === "true";
    } catch {}
    if (logViewerToggle) {
      logViewerToggle.checked = isEnabled;
    }
    if (logsFab) {
      logsFab.style.display = isEnabled ? "inline-flex" : "none";
    }
    if (!isEnabled) {
      closeLogsDialog();
    }
  }

  if (logViewerToggle) {
    logViewerToggle.addEventListener("change", (e) => {
      try {
        localStorage.setItem("logViewerEnabled", e.target.checked ? "true" : "false");
      } catch (err) {
        console.warn("Failed to save logViewerEnabled preference:", err);
      }
      syncLogViewerState();
    });
  }

  syncLogViewerState();
}

if (typeof window !== "undefined") {
  window.initLoggingUI = initLoggingUI;
  window.renderRecentLogs = renderRecentLogs;
  window.openLogsDialog = openLogsDialog;
  window.closeLogsDialog = closeLogsDialog;
  window.openHistoryDialog = openLogsDialog;
  window.closeHistoryDialog = closeLogsDialog;
}

function renderHistoryDialog() {
  renderRecentLogs();
}

const openHistoryDialog = openLogsDialog;
const closeHistoryDialog = closeLogsDialog;
function resolveScriptPath(scriptName, basePath) {
  const MODULE_ROOT = "/data/adb/modules/Yurikey/";
  if (scriptName.startsWith("/")) return scriptName;
  if (scriptName.startsWith("webroot/")) {
    return `${MODULE_ROOT}${scriptName}`;
  }
  return `${basePath}${scriptName}`;
}

function handleScriptResult(result, scriptName) {
  let code = 0;
  let stdout = "";
  let stderr = "";

  if (result && typeof result === "object") {
    code = typeof result.code === "number" ? result.code : 0;
    stdout = typeof result.stdout === "string" ? result.stdout : "";
    stderr = typeof result.stderr === "string" ? result.stderr : "";
  } else if (typeof result === "string") {
    stdout = result;
  }

  const raw = stdout.trim();

  const getFailedMsg = () =>
    (typeof window !== "undefined" && typeof window.t === "function"
      ? window.t("script_execution_failed_generic")
      : (typeof t === "function" ? t("script_execution_failed_generic") : "Script failed"));

  const getSuccessMsg = () =>
    (typeof window !== "undefined" && typeof window.tFormat === "function"
      ? window.tFormat("success", { script: scriptName })
      : (typeof tFormat === "function" ? tFormat("success", { script: scriptName }) : `Script ${scriptName} completed`));

  const triggerToast = (msg, type = "info", duration = 3000) => {
    if (typeof showToast === "function") {
      showToast(msg, type, duration);
    } else if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(msg, type, duration);
    }
  };

  if (code !== 0) {
    const errorText = (stderr || stdout || "").trim();
    const errorMsg = errorText || getFailedMsg();
    addScriptHistory(scriptName, errorText || errorMsg, false);
    triggerToast(errorMsg, "error", 4000);
    return;
  }

  if (!raw) {
    if (stderr && stderr.trim()) {
      const errTrim = stderr.trim();
      addScriptHistory(scriptName, errTrim, false);
      triggerToast(errTrim, "error", 4000);
      return;
    }
    triggerToast(getSuccessMsg(), "success", 3000);
    return;
  }

  try {
    const json = JSON.parse(raw);
    if (json.success) {
      const commandOutput = typeof json.output === "string" ? json.output.trim() : (json.output ? JSON.stringify(json.output) : "");
      addScriptHistory(scriptName, commandOutput || getSuccessMsg(), true);
      triggerToast(getSuccessMsg(), "success", 3000);
    } else {
      const errOutput = typeof json.output === "string" ? json.output.trim() : (json.error ? String(json.error) : raw);
      addScriptHistory(scriptName, errOutput || raw, false);
      triggerToast(errOutput || getFailedMsg(), "error", 4000);
    }
  } catch {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const errorLine = lines.find(line => line.startsWith("Error:") || line.startsWith("[!]"));
    if (errorLine) {
      addScriptHistory(scriptName, raw, false);
      triggerToast(errorLine, "error", 4000);
    } else {
      addScriptHistory(scriptName, raw, true);
      triggerToast(getSuccessMsg(), "success", 3000);
    }
  }
}

function runScript(scriptName, basePath, button) {
  const scriptPath = resolveScriptPath(scriptName, basePath);
  const executeScript = getScriptExecutor();

  const originalClass = button.className;
  button.classList.add("executing");

  const cb = `cb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  let timeoutId;

  window[cb] = (arg1, arg2, arg3) => {
    clearTimeout(timeoutId);
    delete window[cb];
    button.className = originalClass;

    let code = 0;
    let stdout = "";
    let stderr = "";

    if (typeof arg2 !== "undefined" || typeof arg3 !== "undefined") {
      code = typeof arg1 === "number" ? arg1 : 0;
      stdout = typeof arg2 === "string" ? arg2 : "";
      stderr = typeof arg3 === "string" ? arg3 : "";
    } else {
      // Single argument bridge or JSON result
      stdout = typeof arg1 === "string" ? arg1 : (arg1 ? JSON.stringify(arg1) : "");
    }

    handleScriptResult({ code, stdout, stderr }, scriptName);
  };

  try {
    if (!executeScript) {
      throw new Error("executor-unavailable");
    }

    const execMsg = typeof tFormat === "function" ? tFormat("executing", { script: scriptName }) : `Executing ${scriptName}`;
    if (typeof showToast === "function") {
      showToast(execMsg, "info");
    } else if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(execMsg, "info");
    }
    executeScript(scriptPath, scriptName, cb);
  } catch (_e) {
    clearTimeout(timeoutId);
    delete window[cb];
    button.className = originalClass;
    const failedMsg = typeof t === "function" ? t("script_execution_failed_generic") : "Script failed";
    addScriptHistory(scriptName, failedMsg, false);
    if (typeof showToast === "function") {
      showToast(failedMsg, "error", 4500);
    } else if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(failedMsg, "error", 4500);
    }
    return;
  }

  timeoutId = setTimeout(() => {
    delete window[cb];
    button.className = originalClass;
    const timeoutMsg = typeof tFormat === "function" ? tFormat("timeout", { script: scriptName }) : "Timeout";
    addScriptHistory(scriptName, timeoutMsg, false);
    const failedMsg = typeof t === "function" ? t("script_execution_failed_generic") : "Script failed";
    if (typeof showToast === "function") {
      showToast(failedMsg, "error", 4500);
    } else if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(failedMsg, "error", 4500);
    }
  }, 7000);
}

// Export functions to window / global object
const _global = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : undefined);
if (_global) {
  _global.getScriptExecutor = getScriptExecutor;
  _global.readHistory = readHistory;
  _global.writeHistory = writeHistory;
  _global.addScriptHistory = addScriptHistory;
  _global.renderRecentLogs = renderRecentLogs;
  _global.initLoggingUI = initLoggingUI;
  _global.renderHistoryDialog = renderHistoryDialog;
  _global.openHistoryDialog = openHistoryDialog;
  _global.closeHistoryDialog = closeHistoryDialog;
  _global.resolveScriptPath = resolveScriptPath;
  _global.handleScriptResult = handleScriptResult;
  _global.runScript = runScript;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getScriptExecutor,
    readHistory,
    writeHistory,
    addScriptHistory,
    renderRecentLogs,
    initLoggingUI,
    renderHistoryDialog,
    openHistoryDialog,
    closeHistoryDialog,
    resolveScriptPath,
    handleScriptResult,
    runScript,
  };
}
