(function initMockKSU() {
  if (typeof window.ksu !== "undefined") {
    console.info("[Dev] Native ksu object already present.");
    return;
  }

  console.log(
    "%c[Yurikey Dev]%c Mock KernelSU Bridge Active",
    "background: #00497d; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
    "color: #9ecaff; font-weight: bold;"
  );

  window.ksu = {
    exec: function (command, env, callbackId) {
      console.log(
        "%c[ksu.exec]%c " + command,
        "color: #9ecaff; font-weight: bold;",
        "color: inherit;"
      );

      setTimeout(() => {
        let stdout = "";
        let stderr = "";
        let code = 0;

        if (command.includes("module.prop")) {
          stdout = "v2.5 (Dev)";
        } else if (command.includes("device-info.sh")) {
          stdout = "Mock: device-info.sh executed successfully";
        } else {
          stdout = `[Mock] Successfully completed: ${command}`;
        }

        const callback = window[callbackId];
        if (typeof callback === "function") {
          if (callback.length <= 1) {
            callback(stdout);
          } else {
            callback(code, stdout, stderr);
          }
        }
      }, 120);
    },
  };
})();
