(function initKsuBridge() {
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

  window.KsuBridge = { exec, execWithCallback, fireAndForget, runShellScript, hasExec };
})();
