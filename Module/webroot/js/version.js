// ========== VERSION MODULE DETECTION ==========
// Reads the 'version' from the active module.prop
async function loadVersionFromModuleProp() {
  const versionElement = document.getElementById('version-text');
  try {
    const moduleProp = await window.KsuBridge.resolveModuleFile("module.prop");
    const version = await window.KsuBridge.exec(`grep '^version=' '${moduleProp}' | cut -d'=' -f2`);
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
