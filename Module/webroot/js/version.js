// Log output helper

function appendToOutput(msg) {
  if (window.addLogEntry) {
    window.addLogEntry(msg);
  } else {
    console.log(msg);
  }
}
window.appendToOutput = appendToOutput;

// ========== VERSION MODULE DETECTION ==========
// Reads the 'version' from /data/adb/modules/Yurikey/module.prop
async function loadVersionFromModuleProp() {
  const versionElement = document.getElementById('version-text');
  try {
    const res = await window.Bridge.exec("grep '^version=' /data/adb/modules/Yurikey/module.prop | cut -d'=' -f2");
    if (res.code === 0 && res.stdout.trim()) {
      versionElement.textContent = res.stdout.trim();
    } else {
      throw new Error(res.stderr || "Empty version");
    }
  } catch (error) {
    appendToOutput("[!] Failed to read version from module.prop");
    console.error("Failed to read version:", error);
  }
}

// ========== DOM INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  loadVersionFromModuleProp();
});
