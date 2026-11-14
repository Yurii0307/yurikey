// Unified Root & Host Execution Bridge
(function(global) {
  function getRawBridge() {
    if (typeof global.YuriKeyHost?.execScript === "function") {
      return {
        run(cmd, cb) {
          Promise.resolve(global.YuriKeyHost.execScript(cmd))
            .then(out => cb(0, typeof out === "string" ? out : JSON.stringify(out), ""))
            .catch(err => cb(1, "", String(err)));
          return null;
        },
        cancel() {}
      };
    }
    if (typeof global.execYurikeyScript === "function") {
      return {
        run(cmd, cb) {
          Promise.resolve(global.execYurikeyScript(cmd))
            .then(out => cb(0, typeof out === "string" ? out : JSON.stringify(out), ""))
            .catch(err => cb(1, "", String(err)));
          return null;
        },
        cancel() {}
      };
    }
    if (typeof global.ksu === "object" && typeof global.ksu.exec === "function") {
      return {
        run(cmd, cb) {
          const cbName = `cb_bridge_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          global[cbName] = (arg1, arg2, arg3) => {
            delete global[cbName];
            if (typeof arg2 !== "undefined" || typeof arg3 !== "undefined") {
              const code = typeof arg1 === "number" ? arg1 : 0;
              const stdout = typeof arg2 === "string" ? arg2 : "";
              const stderr = typeof arg3 === "string" ? arg3 : "";
              cb(code, stdout, stderr);
            } else {
              const stdout = typeof arg1 === "string" ? arg1 : (arg1 ? JSON.stringify(arg1) : "");
              cb(0, stdout, "");
            }
          };
          try {
            global.ksu.exec(cmd, "{}", cbName);
          } catch (err) {
            delete global[cbName];
            throw err;
          }
          return cbName;
        },
        cancel(cbName) {
          if (cbName) delete global[cbName];
        }
      };
    }
    return null;
  }

  const Bridge = {
    isAvailable() {
      return getRawBridge() !== null;
    },

    exec(command, { timeout = 7000 } = {}) {
      return new Promise((resolve, reject) => {
        const raw = getRawBridge();
        if (!raw) {
          reject(new Error("No root execution bridge available (ksu / host unavailable)"));
          return;
        }

        let finished = false;
        let cbName = null;
        const timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          raw.cancel(cbName);
          reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
        }, timeout);

        try {
          cbName = raw.run(command, (code, stdout, stderr) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            resolve({ code, stdout, stderr });
          });
        } catch (err) {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            raw.cancel(cbName);
            reject(err);
          }
        }
      });
    },

    openUrl(url) {
      if (!url || typeof url !== "string") return;
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        console.warn("Disallowed URL protocol:", trimmed);
        return;
      }

      if (Bridge.isAvailable()) {
        const safeUrl = trimmed.replace(/'/g, "'\\''");
        const intentCmd = `nohup am start -a android.intent.action.VIEW -d '${safeUrl}' >/dev/null 2>&1 &`;
        Bridge.exec(intentCmd).catch(() => {});
      } else {
        try {
          if (typeof window !== "undefined" && typeof window.open === "function") {
            const opened = window.open(trimmed, "_blank", "noopener,noreferrer");
            if (!opened && window.location) window.location.href = trimmed;
          }
        } catch {
          if (typeof window !== "undefined" && window.location) {
            window.location.href = trimmed;
          }
        }
      }
    }
  };

  global.Bridge = Bridge;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Bridge };
  }
})(typeof window !== "undefined" ? window : globalThis);
