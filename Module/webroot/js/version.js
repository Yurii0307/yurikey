// ========== VERSION MODULE DETECTION ==========
// Reads the 'version' from /data/adb/modules/Yurikey/module.prop
async function loadVersionFromModuleProp() {
  const versionElement = document.getElementById('version-text');
  try {
    const version = await window.KsuBridge.exec("grep '^version=' /data/adb/modules/Yurikey/module.prop | cut -d'=' -f2");
    versionElement.textContent = version.trim();
  } catch (error) {
    versionElement.textContent = "Error";
    console.error("Failed to read version from module.prop:", error);
  }
}

// ========== DOM INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  loadVersionFromModuleProp();
});
