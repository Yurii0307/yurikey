(function initKsuBridge() {
  const MODULE_BASE_CANDIDATES = [
    "/data/adb/modules_update/Yurikey",
    "/data/adb/modules/Yurikey",
    "/data/adb/modules/yurikey",
  ];

  function createCallback(handler) {
    const callbackId = `cb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    window[callbackId] = (...args) => {
      delete window[callbackId];
      handler(...args);
    };
    return callbackId;
  }

  function hasExec() {
    return typeof window.ksu === "object" && typeof window.ksu.exec === "function";
  }

  function exec(command) {
    return new Promise((resolve, reject) => {
      if (!hasExec()) {
        reject(new Error("ksu.exec unavailable"));
        return;
      }

      const callbackId = createCallback((code, out, err) => {
        if (code) {
          reject(err || "Unknown error");
          return;
        }
        resolve(out);
      });

      window.ksu.exec(command, "{}", callbackId);
    });
  }

  function execWithCallback(command, handler) {
    if (!hasExec()) {
      return false;
    }

    const callbackId = createCallback((...args) => {
      if (typeof handler === "function") {
        handler(...args);
      }
    });

    window.ksu.exec(command, "{}", callbackId);
    return true;
  }

  function fireAndForget(command, onComplete) {
    if (!hasExec()) {
      if (typeof onComplete === "function") onComplete(false);
      return false;
    }

    const callbackId = createCallback(() => {
      if (typeof onComplete === "function") onComplete(true);
    });

    window.ksu.exec(command, "{}", callbackId);
    return true;
  }

  function runShellScript(path, onComplete) {
    return fireAndForget(`sh '${path}'`, onComplete);
  }

  async function resolveModuleBasePath() {
    if (!hasExec()) {
      return MODULE_BASE_CANDIDATES[1];
    }

    try {
      const resolved = await exec(
        "for base in /data/adb/modules_update/Yurikey /data/adb/modules/Yurikey /data/adb/modules/yurikey; do " +
        "[ -d \"$base\" ] && { printf '%s' \"$base\"; break; }; " +
        "done"
      );
      return (resolved || "").trim() || MODULE_BASE_CANDIDATES[1];
    } catch {
      for (const basePath of MODULE_BASE_CANDIDATES) {
        try {
          const resolved = await exec(`test -d '${basePath}' && printf '%s' '${basePath}'`);
          if ((resolved || "").trim()) {
            return basePath;
          }
        } catch {}
      }
      return MODULE_BASE_CANDIDATES[1];
    }
  }

  async function resolveModuleFile(subpath = "") {
    const basePath = await resolveModuleBasePath();
    return subpath ? `${basePath}/${subpath}` : basePath;
  }

  async function resolveScriptFile(scriptName, defaultDir = "") {
    const normalizedScript = String(scriptName || "").replace(/^\/+/, "").replace(/^\.\//, "");
    const normalizedDefaultDir = String(defaultDir || "").replace(/^\/+/, "");
    const moduleRelativePath = normalizedScript.includes("/")
      ? normalizedScript
      : `${normalizedDefaultDir}${normalizedScript}`;
    return resolveModuleFile(moduleRelativePath);
  }

  window.KsuBridge = {
    exec,
    execWithCallback,
    fireAndForget,
    runShellScript,
    hasExec,
    resolveModuleBasePath,
    resolveModuleFile,
    resolveScriptFile,
  };
})();
