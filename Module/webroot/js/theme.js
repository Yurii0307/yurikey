const THEME_MODE_KEY = "themeMode";
const THEME_PRESET_KEY = "themePreset";

const THEME_PRESETS = {
  ocean: {
    dark: { "--ui-bg": "#111a26", "--ui-card-bg": "#1d2a3a", "--ui-card-border": "#334759", "--ui-pill-bg": "#9ecaff", "--ui-pill-text": "#003258", "--ui-nav-active": "#00497d", "--ui-nav-text": "#d1e4ff", "--ui-select-bg": "#3a546f", "--ui-select-border": "#6f90b2", "--ui-select-panel": "#273a4e", "--ui-select-panel-border": "#587493" },
    light:{ "--ui-bg": "#e9f2ff", "--ui-card-bg": "#f2f7ff", "--ui-card-border": "#c6d8ef", "--ui-pill-bg": "#0061a4", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#0061a4", "--ui-nav-text": "#001d36", "--ui-select-bg": "#d1e4ff", "--ui-select-border": "#b2cbe9", "--ui-select-panel": "#e2eeff", "--ui-select-panel-border": "#c3d8f3" },
  },
  rose: {
    dark: { "--ui-bg": "#221516", "--ui-card-bg": "#362124", "--ui-card-border": "#5a3539", "--ui-pill-bg": "#ffb4a9", "--ui-pill-text": "#690002", "--ui-nav-active": "#930005", "--ui-nav-text": "#ffdad5", "--ui-select-bg": "#5f3a3e", "--ui-select-border": "#9a6c72", "--ui-select-panel": "#452a2d", "--ui-select-panel-border": "#7a4c51" },
    light:{ "--ui-bg": "#fff3f1", "--ui-card-bg": "#ffe8e4", "--ui-card-border": "#efc7c1", "--ui-pill-bg": "#bb1614", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#bb1614", "--ui-nav-text": "#410001", "--ui-select-bg": "#ffdad5", "--ui-select-border": "#e4b7b1", "--ui-select-panel": "#ffe9e5", "--ui-select-panel-border": "#e8c1bc" },
  },
  forest: {
    dark: { "--ui-bg": "#132016", "--ui-card-bg": "#1d3222", "--ui-card-border": "#365441", "--ui-pill-bg": "#78dc77", "--ui-pill-text": "#00390a", "--ui-nav-active": "#005313", "--ui-nav-text": "#94f990", "--ui-select-bg": "#355142", "--ui-select-border": "#6f9a7f", "--ui-select-panel": "#253b2b", "--ui-select-panel-border": "#5d7e68" },
    light:{ "--ui-bg": "#eff9ef", "--ui-card-bg": "#f5fcf4", "--ui-card-border": "#cce3cd", "--ui-pill-bg": "#006e1c", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#006e1c", "--ui-nav-text": "#002204", "--ui-select-bg": "#94f990", "--ui-select-border": "#77d274", "--ui-select-panel": "#def6dd", "--ui-select-panel-border": "#b8dfb7" },
  },
  sunset: {
    dark: { "--ui-bg": "#241911", "--ui-card-bg": "#39291b", "--ui-card-border": "#5d4330", "--ui-pill-bg": "#ffb870", "--ui-pill-text": "#4a2800", "--ui-nav-active": "#693c00", "--ui-nav-text": "#ffdcbe", "--ui-select-bg": "#594131", "--ui-select-border": "#8f6a4e", "--ui-select-panel": "#3f2d20", "--ui-select-panel-border": "#73543d" },
    light:{ "--ui-bg": "#fff4ea", "--ui-card-bg": "#fff8f2", "--ui-card-border": "#ecd3bc", "--ui-pill-bg": "#8b5000", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#8b5000", "--ui-nav-text": "#2c1600", "--ui-select-bg": "#ffdcbe", "--ui-select-border": "#e8bf98", "--ui-select-panel": "#ffeddc", "--ui-select-panel-border": "#edcdb0" },
  },
  violet: {
    dark: { "--ui-bg": "#1f1626", "--ui-card-bg": "#30243a", "--ui-card-border": "#52405f", "--ui-pill-bg": "#f9abff", "--ui-pill-text": "#570066", "--ui-nav-active": "#7b008f", "--ui-nav-text": "#ffd6fe", "--ui-select-bg": "#4f3d5e", "--ui-select-border": "#8b74a0", "--ui-select-panel": "#3a2d47", "--ui-select-panel-border": "#715788" },
    light:{ "--ui-bg": "#f9ecff", "--ui-card-bg": "#fdf5ff", "--ui-card-border": "#e4cdee", "--ui-pill-bg": "#9a25ae", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#9a25ae", "--ui-nav-text": "#35003f", "--ui-select-bg": "#ffd6fe", "--ui-select-border": "#e8b8e8", "--ui-select-panel": "#ffe9ff", "--ui-select-panel-border": "#eecbf1" },
  },
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const int = parseInt(n, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}
function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}
function mix(a, b, t) {
  const c1 = hexToRgb(a), c2 = hexToRgb(b);
  return rgbToHex({ r: Math.round(c1.r + (c2.r - c1.r) * t), g: Math.round(c1.g + (c2.g - c1.g) * t), b: Math.round(c1.b + (c2.b - c1.b) * t) });
}

function getStoredMode() { return localStorage.getItem(THEME_MODE_KEY) || "dark"; }
function getResolvedMode(mode) { return mode === "auto" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : (mode || "dark"); }
function getStoredPreset() {
  const preset = localStorage.getItem(THEME_PRESET_KEY) || "ocean";
  return THEME_PRESETS[preset] ? preset : "ocean";
}
function themeText(key, fallback) { return window.translations?.[key] || fallback; }
function modeLabel(mode) {
  if (mode === "auto") return themeText("theme_mode_auto", "Auto (System)");
  if (mode === "light") return themeText("theme_mode_light", "Light");
  return themeText("theme_mode_dark", "Dark");
}

function withDerived(colors, mode) {
  const base = colors["--ui-pill-bg"];
  const card = colors["--ui-card-bg"] || (mode === "light" ? "#f2f4f8" : "#23293a");
  const pillText = colors["--ui-pill-text"] || (mode === "light" ? "#ffffff" : "#231531");
  return {
    ...colors,
    "--ui-pill-bg-hover": mix(base, mode === "light" ? "#ffffff" : "#f8d8e8", 0.18),
    "--ui-pill-border": mix(base, mode === "light" ? "#ffffff" : "#f9e7f2", 0.35),
    "--ui-nav-text-active": "#ffffff",
    "--ui-snackbar-text": mode === "light" ? "#2f2433" : "#f3edf7",
    "--ui-snackbar-bg": mode === "light" ? mix(card, "#ffffff", 0.36) : mix(card, "#171b26", 0.45),
    "--ui-snackbar-border": mix(base, mode === "light" ? "#6a6f7b" : "#f1f5ff", mode === "light" ? 0.22 : 0.24),
    "--ui-snackbar-info": mix(base, "#4f8af9", mode === "light" ? 0.42 : 0.5),
    "--ui-snackbar-success": mix(base, "#43b77f", mode === "light" ? 0.52 : 0.6),
    "--ui-snackbar-warning": mix(base, "#d88f2b", mode === "light" ? 0.48 : 0.52),
    "--ui-snackbar-error": mix(base, "#c4555e", mode === "light" ? 0.55 : 0.58),
    "--ui-pill-text": pillText,
  };
}

function applyColors(rawColors) {
  const root = document.documentElement;
  Object.entries(rawColors).forEach(([k, v]) => root.style.setProperty(k, v));
}

function applyThemeMode(mode) {
  const resolved = getResolvedMode(mode);
  document.documentElement.setAttribute("data-theme-mode", resolved);
  return resolved;
}

function applyThemePreset(presetName) {
  const mode = document.documentElement.getAttribute("data-theme-mode") || "dark";
  const preset = THEME_PRESETS[presetName] || THEME_PRESETS.ocean;
  applyColors(withDerived(preset[mode] || preset.dark, mode));
  document.querySelectorAll(".theme-preset-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.themePreset === presetName));
}

window.addEventListener("DOMContentLoaded", () => {
  const modeBtn = document.getElementById("theme-mode-btn");
  const modeOptions = document.getElementById("theme-mode-options");

  const mode = getStoredMode();
  modeBtn.innerText = modeLabel(mode);
  applyThemeMode(mode);

  modeBtn.addEventListener("click", (e) => { e.stopPropagation(); modeOptions.classList.toggle("show"); });
  modeOptions.querySelectorAll("li[data-mode]").forEach(item => {
    item.addEventListener("click", () => {
      const m = item.dataset.mode || "dark";
      localStorage.setItem(THEME_MODE_KEY, m);
      modeBtn.innerText = modeLabel(m);
      modeOptions.classList.remove("show");
      applyThemeMode(m);
      applyThemePreset(getStoredPreset());
    });
  });
  document.addEventListener("click", (e) => { if (!modeOptions.contains(e.target) && e.target !== modeBtn) modeOptions.classList.remove("show"); });

  document.querySelectorAll(".theme-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.themePreset;
      if (!p || !THEME_PRESETS[p]) return;
      localStorage.setItem(THEME_PRESET_KEY, p);
      applyThemePreset(p);
    });
  });

  applyThemePreset(getStoredPreset());

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (getStoredMode() === "auto") {
      applyThemeMode("auto");
      applyThemePreset(getStoredPreset());
    }
  });

  document.addEventListener("languageChanged", () => { modeBtn.innerText = modeLabel(getStoredMode()); });
});
