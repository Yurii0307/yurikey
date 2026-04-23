(function initScriptRunnerModule() {
  const SCRIPT_HISTORY_KEY = "scriptHistoryLogs";

  function getScriptExecutor() {
    if (typeof window.YuriKeyHost?.execScript === "function") {
      return (scriptPath, scriptName, callback) => {
        Promise.resolve(window.YuriKeyHost.execScript(scriptPath, scriptName))
          .then((result) => callback(typeof result === "string" ? result : JSON.stringify(result)))
          .catch(() => callback(""));
      };
    }

    if (typeof window.execYurikeyScript === "function") {
      return (scriptPath, scriptName, callback) => {
        Promise.resolve(window.execYurikeyScript(scriptPath, scriptName))
          .then((result) => callback(typeof result === "string" ? result : JSON.stringify(result)))
          .catch(() => callback(""));
      };
    }

    if (window.KsuBridge?.hasExec()) {
      return (scriptPath, _scriptName, callbackName) =>
        window.KsuBridge.execWithCallback(`sh "${scriptPath}"`, (...args) => window[callbackName]?.(...args));
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
    localStorage.setItem(SCRIPT_HISTORY_KEY, JSON.stringify(items.slice(0, 80)));
  }

  function addScriptHistory(scriptName, outputText) {
    const cleanOutput = (outputText || "").trim();
    if (!cleanOutput) return;

    const history = readHistory();
    history.unshift({
      script: scriptName,
      output: cleanOutput,
      time: new Date().toLocaleString(),
    });
    writeHistory(history);
  }

  function renderHistoryDialog() {
    const contentEl = document.getElementById("script-history-content");
    if (!contentEl) return;

    const history = readHistory();
    if (!history.length) {
      contentEl.textContent = t("script_history_empty");
      return;
    }

    contentEl.innerHTML = history.map((item) => {
      const script = item.script || "script";
      const time = item.time || "";
      const output = window.WebrootUI.escapeHtml(item.output || "").replace(/\n/g, "<br>");
      return `<div><strong>[${time}] ${script}</strong><br>${output}</div><hr>`;
    }).join("");
  }

  function openHistoryDialog() {
    const dialog = document.getElementById("script-history-dialog");
    const overlay = document.getElementById("script-history-overlay");
    if (!dialog || !overlay) return;

    renderHistoryDialog();
    overlay.classList.add("active");
    if (!dialog.open) dialog.showModal();
  }

  function closeHistoryDialog() {
    const dialog = document.getElementById("script-history-dialog");
    const overlay = document.getElementById("script-history-overlay");
    if (!dialog || !overlay) return;

    if (dialog.open) dialog.close();
    overlay.classList.remove("active");
  }

  function handleScriptResult(rawOutput, scriptName) {
    const raw = typeof rawOutput === "string" ? rawOutput.trim() : "";

    if (!raw) {
      window.showSuccessToast?.(tFormat("success", { script: scriptName }), 3000);
      return;
    }

    try {
      const json = JSON.parse(raw);
      if (json.success) {
        const commandOutput = typeof json.output === "string" ? json.output.trim() : "";
        addScriptHistory(scriptName, commandOutput || tFormat("success", { script: scriptName }));
        window.showSuccessToast?.(tFormat("success", { script: scriptName }), 3000);
      } else {
        addScriptHistory(scriptName, raw);
        window.showErrorToast?.(t("script_execution_failed_generic"), 4000);
      }
    } catch {
      addScriptHistory(scriptName, raw);
      window.showSuccessToast?.(tFormat("success", { script: scriptName }), 3500);
    }
  }

  async function runScript(scriptName, basePath, button) {
    const executeScript = getScriptExecutor();
    const originalClass = button?.className || "";
    if (button) button.classList.add("executing");

    const callbackId = `cb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let timeoutId;

    window[callbackId] = (output) => {
      clearTimeout(timeoutId);
      delete window[callbackId];
      if (button) button.className = originalClass;
      handleScriptResult(output, scriptName);
    };

    try {
      if (!executeScript) {
        throw new Error("executor-unavailable");
      }

      const scriptPath = await window.KsuBridge.resolveScriptFile(scriptName, basePath);
      window.showInfoToast?.(tFormat("executing", { script: scriptName }));
      executeScript(scriptPath, scriptName, callbackId);
    } catch {
      clearTimeout(timeoutId);
      delete window[callbackId];
      if (button) button.className = originalClass;
      addScriptHistory(scriptName, t("script_execution_failed_generic"));
      window.showErrorToast?.(t("script_execution_failed_generic"), 4500);
      return;
    }

    timeoutId = setTimeout(() => {
      delete window[callbackId];
      if (button) button.className = originalClass;
      addScriptHistory(scriptName, tFormat("timeout", { script: scriptName }));
      window.showErrorToast?.(t("script_execution_failed_generic"), 4500);
    }, 7000);
  }

  function bindScriptButtons(selector, basePath) {
    document.querySelectorAll(selector).forEach((button) => {
      const scriptName = button.dataset.script;
      if (!scriptName) return;
      button.addEventListener("click", () => runScript(scriptName, basePath, button));
    });
  }

  function initScriptHistoryDialog() {
    const historyCard = document.getElementById("module-version-card");
    const historyDialog = document.getElementById("script-history-dialog");
    const historyOverlay = document.getElementById("script-history-overlay");
    const historyCloseBtn = document.getElementById("script-history-close");
    const historyClearBtn = document.getElementById("script-history-clear");

    historyCard?.addEventListener("click", openHistoryDialog);
    historyCloseBtn?.addEventListener("click", closeHistoryDialog);
    historyOverlay?.addEventListener("click", closeHistoryDialog);
    historyDialog?.addEventListener("close", () => historyOverlay?.classList.remove("active"));
    historyClearBtn?.addEventListener("click", () => {
      writeHistory([]);
      renderHistoryDialog();
    });
  }

  window.WebrootScripts = {
    bindScriptButtons,
    initScriptHistoryDialog,
    runScript,
  };
})();
