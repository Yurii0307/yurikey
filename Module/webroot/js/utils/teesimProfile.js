// TEESimulator profile picker.
// The three actions that edit /data/adb/teesim/config.json write a single profile, so the WebUI
// reads the profile list through the privileged bridge, asks which profile to use when there is
// more than one, and passes the choice to the shell script as a quoted argument.
(function (global) {
  const COMMON_SCRIPT = "/data/adb/modules/Yurikey/Yuri/teesim_common.sh";
  const EXEC_TIMEOUT = 7000;
  const EXIT_ABSENT = 3;
  const ACTIONS = ["target_txt.sh", "security_patch.sh", "select_app_neccesary.sh"];

  let dialogState = null;
  let actionInFlight = false;

  function tr(key, fallback) {
    if (typeof global.t === "function") return global.t(key, fallback);
    return fallback || key;
  }

  function trFormat(key, vars, fallback) {
    if (typeof global.tFormat === "function") return global.tFormat(key, vars, fallback);
    let out = tr(key, fallback);
    Object.keys(vars || {}).forEach(k => {
      out = out.split(`{${k}}`).join(vars[k]);
    });
    return out;
  }

  function toast(message, type, duration) {
    if (typeof global.showToast === "function") {
      global.showToast(message, type, duration);
    }
  }

  function recordFailure(scriptName, message) {
    if (typeof global.addScriptHistory === "function") {
      global.addScriptHistory(scriptName, message, false);
    }
  }

  // POSIX single quoting: nothing inside the quotes is expanded by the shell.
  function shellQuote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }

  function readProfiles() {
    if (!global.Bridge || typeof global.Bridge.exec !== "function" || !global.Bridge.isAvailable()) {
      return Promise.reject(new Error("executor-unavailable"));
    }
    return global.Bridge.exec(`sh ${shellQuote(COMMON_SCRIPT)} list-profiles`, { timeout: EXEC_TIMEOUT })
      .then(result => {
        if (result.code === EXIT_ABSENT) {
          return { available: false, profiles: [] };
        }
        if (result.code !== 0) {
          const detail = (result.stderr || result.stdout || "").trim();
          throw new Error(detail || tr("teesim_profile_read_failed", "Could not read the TEESimulator configuration."));
        }
        let parsed;
        try {
          parsed = JSON.parse((result.stdout || "").trim());
        } catch {
          throw new Error(tr("teesim_profile_read_failed", "Could not read the TEESimulator configuration."));
        }
        if (!Array.isArray(parsed) || parsed.some(name => typeof name !== "string")) {
          throw new Error(tr("teesim_profile_read_failed", "Could not read the TEESimulator configuration."));
        }
        return { available: true, profiles: parsed };
      });
  }

  function getDialogParts() {
    return {
      dialog: document.getElementById("teesim-dialog"),
      overlay: document.getElementById("teesim-dialog-overlay"),
      list: document.getElementById("teesim-profile-list"),
      hint: document.getElementById("teesim-dialog-hint"),
      confirm: document.getElementById("teesim-dialog-confirm"),
      cancel: document.getElementById("teesim-dialog-cancel"),
      close: document.getElementById("teesim-dialog-close"),
    };
  }

  function closeProfileDialog(result) {
    if (!dialogState) return;
    const state = dialogState;
    dialogState = null;
    const parts = getDialogParts();
    state.cleanup();
    parts.dialog?.classList.remove("active");
    parts.overlay?.classList.remove("active");
    if (parts.dialog?.open && typeof parts.dialog.close === "function") {
      try { parts.dialog.close(); } catch {}
    }
    if (state.previousFocus && typeof state.previousFocus.focus === "function" && document.contains(state.previousFocus)) {
      state.previousFocus.focus();
    }
    state.resolve(result);
  }

  function chooseProfile(profiles) {
    if (dialogState) return Promise.resolve(null);
    const parts = getDialogParts();
    if (!parts.dialog || !parts.list || !parts.confirm) {
      return Promise.resolve(null);
    }

    return new Promise(resolve => {
      const previousFocus = document.activeElement;
      let index = 0;
      const buttons = [];

      parts.list.textContent = "";
      profiles.forEach((name, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "teesim-profile-option";
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", i === 0 ? "true" : "false");
        button.dataset.profile = name;
        const label = document.createElement("span");
        label.className = "teesim-profile-name";
        label.textContent = name;
        const check = document.createElement("i");
        check.className = "teesim-profile-check";
        check.textContent = "check";
        check.setAttribute("aria-hidden", "true");
        button.append(label, check);
        button.addEventListener("click", () => select(i));
        button.addEventListener("dblclick", () => {
          select(i);
          closeProfileDialog(profiles[index]);
        });
        parts.list.append(button);
        buttons.push(button);
      });

      const confirmLabel = () => {
        parts.confirm.textContent = trFormat("teesim_profile_confirm", { profile: profiles[index] }, `Update ${profiles[index]}`);
      };

      const select = next => {
        index = (next + profiles.length) % profiles.length;
        buttons.forEach((button, i) => {
          button.setAttribute("aria-checked", i === index ? "true" : "false");
        });
        confirmLabel();
      };

      const onKeyDown = event => {
        if (event.key === "Escape") {
          event.preventDefault();
          closeProfileDialog(null);
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          select(index + 1);
          buttons[index].focus();
          return;
        }
        if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          select(index - 1);
          buttons[index].focus();
        }
      };

      const onConfirm = event => {
        event.preventDefault();
        closeProfileDialog(profiles[index]);
      };
      const onCancel = event => {
        event.preventDefault();
        closeProfileDialog(null);
      };

      document.addEventListener("keydown", onKeyDown);
      parts.confirm.addEventListener("click", onConfirm);
      parts.cancel?.addEventListener("click", onCancel);
      parts.close?.addEventListener("click", onCancel);
      parts.overlay?.addEventListener("click", onCancel);

      dialogState = {
        resolve,
        previousFocus,
        cleanup() {
          document.removeEventListener("keydown", onKeyDown);
          parts.confirm.removeEventListener("click", onConfirm);
          parts.cancel?.removeEventListener("click", onCancel);
          parts.close?.removeEventListener("click", onCancel);
          parts.overlay?.removeEventListener("click", onCancel);
        },
      };

      select(0);
      parts.hint.textContent = tr("teesim_profile_hint", "These actions update one TEESimulator profile. Pick the one to change.");
      parts.dialog.classList.add("active");
      parts.overlay?.classList.add("active");
      if (!parts.dialog.open && typeof parts.dialog.show === "function") {
        try { parts.dialog.show(); } catch {}
      }
      buttons[index]?.focus();
    });
  }

  function sameProfiles(a, b) {
    return a.length === b.length && a.every((name, i) => name === b[i]);
  }

  function executeWithProfile(scriptName, basePath, button, profile) {
    const scriptPath = typeof global.resolveScriptPath === "function"
      ? global.resolveScriptPath(scriptName, basePath)
      : `${basePath}${scriptName}`;
    const command = `sh ${shellQuote(scriptPath)} --teesim-profile ${shellQuote(profile)}`;
    const originalClass = button ? button.className : "";
    if (button) button.classList.add("executing");
    toast(trFormat("executing", { script: scriptName }, `Executing ${scriptName}`), "info");

    return global.Bridge.exec(command, { timeout: EXEC_TIMEOUT })
      .then(result => {
        if (button) button.className = originalClass;
        if (typeof global.handleScriptResult === "function") {
          global.handleScriptResult(result, scriptName);
        }
      })
      .catch(() => {
        if (button) button.className = originalClass;
        const message = tr("script_execution_failed_generic", "Script execution failed.");
        recordFailure(scriptName, message);
        toast(message, "error", 4500);
      });
  }

  async function runTeesimAction(scriptName, basePath, button) {
    if (actionInFlight) return;
    actionInFlight = true;
    try {
      await runTeesimActionOnce(scriptName, basePath, button);
    } finally {
      try {
        if (dialogState) closeProfileDialog(null);
      } finally {
        actionInFlight = false;
      }
    }
  }

  async function runTeesimActionOnce(scriptName, basePath, button) {
    let first;
    try {
      first = await readProfiles();
    } catch (err) {
      const message = (err && err.message) || tr("teesim_profile_read_failed", "Could not read the TEESimulator configuration.");
      recordFailure(scriptName, message);
      toast(message, "error", 4500);
      return;
    }

    if (!first.available) {
      if (typeof global.runScript === "function") {
        global.runScript(scriptName, basePath, button);
      }
      return;
    }

    if (first.profiles.length === 0) {
      const message = tr("teesim_profile_empty", "This TEESimulator config has no profiles.");
      recordFailure(scriptName, message);
      toast(message, "error", 4500);
      return;
    }

    let selected = first.profiles[0];
    if (first.profiles.length > 1) {
      selected = await chooseProfile(first.profiles);
      if (!selected) {
        toast(tr("teesim_profile_cancelled", "No profile picked, nothing was run."), "info", 3000);
        return;
      }
    }

    let second;
    try {
      second = await readProfiles();
    } catch {
      second = { available: false, profiles: [] };
    }
    const unchanged = second.available && sameProfiles(second.profiles, first.profiles);
    if (!unchanged || !second.profiles.includes(selected)) {
      const message = tr("teesim_profile_changed", "The TEESimulator configuration changed. Nothing was run.");
      recordFailure(scriptName, message);
      toast(message, "error", 4500);
      return;
    }

    await executeWithProfile(scriptName, basePath, button, selected);
  }

  global.runTeesimAction = runTeesimAction;
  global.isTeesimAction = name => ACTIONS.indexOf(name) !== -1;
  global.readTeesimProfiles = readProfiles;
  global.chooseTeesimProfile = chooseProfile;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      runTeesimAction,
      shellQuote,
      readProfiles,
      chooseProfile,
      ACTIONS,
      isTeesimAction: name => ACTIONS.indexOf(name) !== -1,
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
