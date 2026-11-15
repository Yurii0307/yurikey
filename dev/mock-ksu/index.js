(function initMockKSU() {
  if (typeof window.ksu !== "undefined") {
    delete window.__yurikeyDevMock;
    console.info("[Dev] Native ksu object already present.");
    return;
  }

  console.log(
    "%c[Yurikey Dev]%c Mock KernelSU Bridge Active",
    "background: #00497d; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
    "color: #9ecaff; font-weight: bold;"
  );

  const mock = window.__yurikeyDevMock;
  const properties = mock.createProperties();
  const teesim = mock.createTeesim();
  const dispatch = mock.createCommandDispatcher(properties, teesim);
  delete window.__yurikeyDevMock;

  window.ksu = {
    exec: function (command, env, callbackId) {
      console.log(
        "%c[ksu.exec]%c " + command,
        "color: #9ecaff; font-weight: bold;",
        "color: inherit;"
      );

      setTimeout(() => {
        const { code, stdout, stderr } = dispatch(command);
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
