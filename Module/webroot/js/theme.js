const THEME_MODE_KEY = "themeMode";
const THEME_PRESET_KEY = "themePreset";

const THEME_PRESETS = {
  rose: {
    dark: {
      "--ui-bg": "#11142a",
      "--ui-card-bg": "#292d45",
      "--ui-card-border": "#414867",
      "--ui-pill-bg": "#eba3c2",
      "--ui-pill-bg-hover": "#f0b4cd",
      "--ui-pill-border": "#f4bfd5",
      "--ui-pill-text": "#4f1835",
      "--ui-nav-active": "#7f2750",
      "--ui-nav-text": "#d8d5e9",
      "--ui-nav-text-active": "#ffffff",
    },
    light: {
      "--ui-bg": "#d8d7df",
      "--ui-card-bg": "#f2eef6",
      "--ui-card-border": "#cbc3d4",
      "--ui-pill-bg": "#d685a9",
      "--ui-pill-bg-hover": "#de96b6",
      "--ui-pill-border": "#dca8c1",
      "--ui-pill-text": "#ffffff",
      "--ui-nav-active": "#a24574",
      "--ui-nav-text": "#534661",
      "--ui-nav-text-active": "#ffffff",
    },
  },
  ocean: {
    dark: {
      "--ui-bg": "#101a2b",
      "--ui-card-bg": "#1b2a3d",
      "--ui-card-border": "#30435a",
      "--ui-pill-bg": "#87b7f0",
      "--ui-pill-bg-hover": "#9cc4f4",
      "--ui-pill-border": "#b7d2f7",
      "--ui-pill-text": "#15365a",
      "--ui-nav-active": "#2f5f97",
      "--ui-nav-text": "#d4dfef",
      "--ui-nav-text-active": "#ffffff",
    },
    light: {
      "--ui-bg": "#d7e2ef",
      "--ui-card-bg": "#ecf2f8",
      "--ui-card-border": "#bfd0e3",
      "--ui-pill-bg": "#6b9dd8",
      "--ui-pill-bg-hover": "#7badde",
      "--ui-pill-border": "#93bbe6",
      "--ui-pill-text": "#ffffff",
      "--ui-nav-active": "#356da8",
      "--ui-nav-text": "#36516f",
      "--ui-nav-text-active": "#ffffff",
    },
  },
  forest: {
    dark: {
      "--ui-bg": "#131f1a",
      "--ui-card-bg": "#203128",
      "--ui-card-border": "#355240",
      "--ui-pill-bg": "#8fcf99",
      "--ui-pill-bg-hover": "#a4d9ac",
      "--ui-pill-border": "#bce7c3",
      "--ui-pill-text": "#1e4a2b",
      "--ui-nav-active": "#2f7044",
      "--ui-nav-text": "#d7e8dc",
      "--ui-nav-text-active": "#ffffff",
    },
    light: {
      "--ui-bg": "#dce8df",
      "--ui-card-bg": "#edf5ef",
      "--ui-card-border": "#c1d6c7",
      "--ui-pill-bg": "#77b285",
      "--ui-pill-bg-hover": "#89be95",
      "--ui-pill-border": "#a6d0b1",
      "--ui-pill-text": "#ffffff",
      "--ui-nav-active": "#3c8653",
      "--ui-nav-text": "#3f5d48",
      "--ui-nav-text-active": "#ffffff",
    },
  },
  sunset: {
    dark: {
      "--ui-bg": "#23181c",
      "--ui-card-bg": "#3a282d",
      "--ui-card-border": "#634149",
      "--ui-pill-bg": "#f0b07b",
      "--ui-pill-bg-hover": "#f4c093",
      "--ui-pill-border": "#f7d0b1",
      "--ui-pill-text": "#5b3119",
      "--ui-nav-active": "#a7522a",
      "--ui-nav-text": "#ecd9ce",
      "--ui-nav-text-active": "#ffffff",
    },
    light: {
      "--ui-bg": "#ead9d1",
      "--ui-card-bg": "#f8eee9",
      "--ui-card-border": "#dfc2b3",
      "--ui-pill-bg": "#da9360",
      "--ui-pill-bg-hover": "#e2a374",
      "--ui-pill-border": "#ebba97",
      "--ui-pill-text": "#ffffff",
      "--ui-nav-active": "#b15f36",
      "--ui-nav-text": "#694b3e",
      "--ui-nav-text-active": "#ffffff",
    },
  },
  violet: {
    dark: {
      "--ui-bg": "#171326",
      "--ui-card-bg": "#2a2342",
      "--ui-card-border": "#46386f",
      "--ui-pill-bg": "#c0a0ef",
      "--ui-pill-bg-hover": "#ccb2f2",
      "--ui-pill-border": "#ddcdf8",
      "--ui-pill-text": "#341d62",
      "--ui-nav-active": "#6840a8",
      "--ui-nav-text": "#e3daf1",
      "--ui-nav-text-active": "#ffffff",
    },
    light: {
      "--ui-bg": "#ddd7ef",
      "--ui-card-bg": "#f0ecf9",
      "--ui-card-border": "#ccc2e7",
      "--ui-pill-bg": "#a987de",
      "--ui-pill-bg-hover": "#b89ae5",
      "--ui-pill-border": "#cbb8ef",
      "--ui-pill-text": "#ffffff",
      "--ui-nav-active": "#7a52b9",
      "--ui-nav-text": "#4f456a",
      "--ui-nav-text-active": "#ffffff",
    },
  },
};

function getStoredMode() {
  return localStorage.getItem(THEME_MODE_KEY) || "dark";
}

function getResolvedThemeMode(mode) {
  if (mode === "auto") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode || "dark";
}

function applyThemeMode(mode) {
  const resolvedMode = getResolvedThemeMode(mode);
  document.documentElement.setAttribute("data-theme-mode", resolvedMode);
  return resolvedMode;
}

function applyThemePreset(presetName) {
  const root = document.documentElement;
  const resolvedMode = root.getAttribute("data-theme-mode") || "dark";
  const preset = THEME_PRESETS[presetName] || THEME_PRESETS.rose;
  const colors = preset[resolvedMode] || preset.dark;

  Object.entries(colors).forEach(([key, value]) => root.style.setProperty(key, value));

  document.querySelectorAll(".theme-preset-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.themePreset === presetName);
  });
}

function setupThemeModeDropdown() {
  const modeBtn = document.getElementById("theme-mode-btn");
  const modeOptions = document.getElementById("theme-mode-options");
  if (!modeBtn || !modeOptions) return;

  const savedMode = getStoredMode();
  modeBtn.innerText = savedMode === "auto" ? "Auto (System)" : savedMode[0].toUpperCase() + savedMode.slice(1);
  applyThemeMode(savedMode);

  modeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    modeOptions.classList.toggle("show");
  });

  modeOptions.querySelectorAll("li[data-mode]").forEach(item => {
    item.addEventListener("click", () => {
      const mode = item.dataset.mode || "dark";
      localStorage.setItem(THEME_MODE_KEY, mode);
      modeBtn.innerText = mode === "auto" ? "Auto (System)" : mode[0].toUpperCase() + mode.slice(1);
      modeOptions.classList.remove("show");
      applyThemeMode(mode);
      applyThemePreset(localStorage.getItem(THEME_PRESET_KEY) || "rose");
    });
  });

  document.addEventListener("click", (e) => {
    if (!modeOptions.contains(e.target) && e.target !== modeBtn) {
      modeOptions.classList.remove("show");
    }
  });
}

function setupThemePresets() {
  const savedPreset = localStorage.getItem(THEME_PRESET_KEY) || "rose";
  applyThemePreset(savedPreset);

  document.querySelectorAll(".theme-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.themePreset;
      if (!preset) return;
      localStorage.setItem(THEME_PRESET_KEY, preset);
      applyThemePreset(preset);
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupThemeModeDropdown();
  setupThemePresets();

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (getStoredMode() === "auto") {
      applyThemeMode("auto");
      applyThemePreset(localStorage.getItem(THEME_PRESET_KEY) || "rose");
    }
  });
});
