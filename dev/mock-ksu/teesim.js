(function () {
  window.__yurikeyDevMock = window.__yurikeyDevMock || {};

  window.__yurikeyDevMock.createTeesim = function createTeesim() {
    const config = {
      profiles: {
        default: {
          keybox: "keybox.xml",
          patchLevel: { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05" },
          apps: ["com.google.android.gms", "com.android.vending"],
          autoIncludeNewApps: false,
        },
        banking: {
          keybox: "banking.xml",
          patchLevel: { system: "today", vendor: "YYYY-MM-05", boot: "YYYY-MM-05" },
          apps: ["com.bank.app"],
          autoIncludeNewApps: false,
        },
      },
    };
    window.mockTeesimConfig = config;

    const TARGETS = [
      "android",
      "com.android.vending",
      "com.google.android.gms",
      "com.google.android.gsf",
      "com.example.chat",
      "com.example.browser",
    ];
    const NECESSARY = ["android", "com.android.vending", "com.google.android.gms", "com.google.android.gsf"];
    const SCRIPTS = ["target_txt.sh", "security_patch.sh", "select_app_neccesary.sh"];

    function patchDate() {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth() + 1;
      if (now.getDate() < 10) {
        month -= 1;
        if (month === 0) {
          month = 12;
          year -= 1;
        }
      }
      return `${year}-${String(month).padStart(2, "0")}-05`;
    }

    function runAction(script, profile) {
      const target = profile ? config.profiles[profile] : undefined;
      if (!target) {
        return { code: 1, stdout: "", stderr: `Error: TEESimulator profile "${profile || ""}" not found\n` };
      }
      if (script === "security_patch.sh") {
        const date = patchDate();
        target.patchLevel = { ...target.patchLevel, system: "system_property", vendor: date, boot: date };
        return { code: 0, stdout: `[Mock] TEESimulator profile "${profile}" patch level set to ${date}\n`, stderr: "" };
      }
      const apps = script === "target_txt.sh" ? TARGETS.slice() : NECESSARY.slice();
      target.apps = apps;
      return {
        code: 0,
        stdout: `[Mock] TEESimulator profile "${profile}" apps set to ${apps.length} packages\n`,
        stderr: "",
      };
    }

    function handleCommon(tokens, isScript) {
      if (!tokens.some(t => isScript(t, "teesim_common.sh"))) return null;

      const command = tokens.find(t => t === "list-profiles" || t === "select");
      if (command !== "list-profiles" && command !== "select") {
        return { code: 0, stdout: "", stderr: "" };
      }

      const names = Object.keys(config.profiles);
      return {
        code: 0,
        stdout: command === "list-profiles" ? JSON.stringify(names) : names[0] + "\n",
        stderr: "",
      };
    }

    function handleAction(tokens, isScript) {
      const script = SCRIPTS.find(name => tokens.some(t => isScript(t, name)));
      if (!script) return null;

      const profileIndex = tokens.indexOf("--teesim-profile");
      const profile = profileIndex === -1 ? "" : tokens[profileIndex + 1] || "";
      return runAction(script, profile);
    }

    return { handleCommon, handleAction };
  };
})();
