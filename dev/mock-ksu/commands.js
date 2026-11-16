(function () {
  window.__yurikeyDevMock = window.__yurikeyDevMock || {};

  function tokenizeCommand(cmd) {
    const tokens = [];
    let cur = "";
    let quote = null;
    for (let i = 0; i < cmd.length; i++) {
      const ch = cmd[i];
      if (quote) {
        if (ch === quote) quote = null;
        else cur += ch;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === "\\") {
        i += 1;
        if (i < cmd.length) cur += cmd[i];
      } else if (/\s/.test(ch)) {
        if (cur) {
          tokens.push(cur);
          cur = "";
        }
      } else {
        cur += ch;
      }
    }
    if (cur) tokens.push(cur);
    return tokens;
  }

  window.__yurikeyDevMock.createCommandDispatcher = function createCommandDispatcher(properties, teesim) {
    function dispatch(command) {
      const tokens = tokenizeCommand(command);
      const isScript = (token, file) => token === file || token.endsWith("/" + file);

      const result =
        properties.handle(tokens, isScript) ||
        teesim.handleCommon(tokens, isScript) ||
        teesim.handleAction(tokens, isScript) ||
        (tokens.some(t => isScript(t, "module.prop")) ? { code: 0, stdout: "v2.5 (Dev)", stderr: "" } : null) ||
        (tokens.some(t => isScript(t, "device-info.sh"))
          ? { code: 0, stdout: "Mock: device-info.sh executed successfully", stderr: "" }
          : null);

      return result || { code: 0, stdout: `[Mock] Successfully completed: ${command}`, stderr: "" };
    }

    return dispatch;
  };
})();
