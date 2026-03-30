const THEME_MODE_KEY = "themeMode";
const THEME_PRESET_KEY = "themePreset";
const THEME_USE_BEER_KEY = "themeUseBeerPalette";
const THEME_BEER_COLOR_KEY = "themeBeerColor";

const THEME_PRESETS = {
  ocean: {
    dark: { "--ui-bg": "#101a2b", "--ui-card-bg": "#1b2a3d", "--ui-card-border": "#30435a", "--ui-pill-bg": "#87b7f0", "--ui-pill-text": "#15365a", "--ui-nav-active": "#2f5f97", "--ui-nav-text": "#d4dfef" },
    light:{ "--ui-bg": "#d7e2ef", "--ui-card-bg": "#ecf2f8", "--ui-card-border": "#bfd0e3", "--ui-pill-bg": "#6b9dd8", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#356da8", "--ui-nav-text": "#36516f" },
  },
  rose: {
    dark: { "--ui-bg": "#11142a", "--ui-card-bg": "#292d45", "--ui-card-border": "#414867", "--ui-pill-bg": "#eba3c2", "--ui-pill-text": "#4f1835", "--ui-nav-active": "#7f2750", "--ui-nav-text": "#d8d5e9" },
    light:{ "--ui-bg": "#d8d7df", "--ui-card-bg": "#f2eef6", "--ui-card-border": "#cbc3d4", "--ui-pill-bg": "#d685a9", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#a24574", "--ui-nav-text": "#534661" },
  },
  forest: {
    dark: { "--ui-bg": "#131f1a", "--ui-card-bg": "#203128", "--ui-card-border": "#355240", "--ui-pill-bg": "#8fcf99", "--ui-pill-text": "#1e4a2b", "--ui-nav-active": "#2f7044", "--ui-nav-text": "#d7e8dc" },
    light:{ "--ui-bg": "#dce8df", "--ui-card-bg": "#edf5ef", "--ui-card-border": "#c1d6c7", "--ui-pill-bg": "#77b285", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#3c8653", "--ui-nav-text": "#3f5d48" },
  },
  sunset: {
    dark: { "--ui-bg": "#23181c", "--ui-card-bg": "#3a282d", "--ui-card-border": "#634149", "--ui-pill-bg": "#f0b07b", "--ui-pill-text": "#5b3119", "--ui-nav-active": "#a7522a", "--ui-nav-text": "#ecd9ce" },
    light:{ "--ui-bg": "#ead9d1", "--ui-card-bg": "#f8eee9", "--ui-card-border": "#dfc2b3", "--ui-pill-bg": "#da9360", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#b15f36", "--ui-nav-text": "#694b3e" },
  },
  violet: {
    dark: { "--ui-bg": "#171326", "--ui-card-bg": "#2a2342", "--ui-card-border": "#46386f", "--ui-pill-bg": "#c0a0ef", "--ui-pill-text": "#341d62", "--ui-nav-active": "#6840a8", "--ui-nav-text": "#e3daf1" },
    light:{ "--ui-bg": "#ddd7ef", "--ui-card-bg": "#f0ecf9", "--ui-card-border": "#ccc2e7", "--ui-pill-bg": "#a987de", "--ui-pill-text": "#ffffff", "--ui-nav-active": "#7a52b9", "--ui-nav-text": "#4f456a" },
  },
};

const DEFAULT_BEER_COLOR = "#2196f3";

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
function isBeerMode() { return localStorage.getItem(THEME_USE_BEER_KEY) === "1"; }
function getResolvedMode(mode) { return mode === "auto" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : (mode || "dark"); }
function themeText(key, fallback) { return window.translations?.[key] || fallback; }
function modeLabel(mode) {
  if (mode === "auto") return themeText("theme_mode_auto", "Auto (System)");
  if (mode === "light") return themeText("theme_mode_light", "Light");
  return themeText("theme_mode_dark", "Dark");
}

function withDerived(colors, mode) {
  const base = colors["--ui-pill-bg"];
  const pillText = colors["--ui-pill-text"] || (mode === "light" ? "#ffffff" : "#231531");
  return {
    ...colors,
    "--ui-pill-bg-hover": mix(base, mode === "light" ? "#ffffff" : "#f8d8e8", 0.18),
    "--ui-pill-border": mix(base, mode === "light" ? "#ffffff" : "#f9e7f2", 0.35),
    "--ui-nav-text-active": "#ffffff",
    "--ui-snackbar-text": mode === "light" ? "#2f2433" : "#f3edf7",
    "--ui-snackbar-info": mix(base, "#4f8af9", mode === "light" ? 0.42 : 0.5),
    "--ui-snackbar-success": mix(base, "#43b77f", mode === "light" ? 0.52 : 0.6),
    "--ui-snackbar-warning": mix(base, "#d88f2b", mode === "light" ? 0.48 : 0.52),
    "--ui-snackbar-error": mix(base, "#c4555e", mode === "light" ? 0.55 : 0.58),
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
  if (isBeerMode()) return;
  const mode = document.documentElement.getAttribute("data-theme-mode") || "dark";
  const preset = THEME_PRESETS[presetName] || THEME_PRESETS.ocean;
  applyColors(withDerived(preset[mode] || preset.dark, mode));
  document.querySelectorAll(".theme-preset-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.themePreset === presetName));
}

function applyBeerPalette(hex) {
  const mode = document.documentElement.getAttribute("data-theme-mode") || "dark";
  const dark = mode === "dark";
  const colors = {
    "--ui-pill-bg": hex,
    "--ui-pill-text": dark ? "#111" : "#fff",
    "--ui-nav-active": mix(hex, dark ? "#2a2a2a" : "#4a4a4a", 0.35),
    "--ui-nav-text": dark ? "#d8d5e9" : "#534661",
    "--ui-bg": dark ? mix(hex, "#0d1022", 0.9) : mix(hex, "#ece9f2", 0.82),
    "--ui-card-bg": dark ? mix(hex, "#1f2438", 0.82) : mix(hex, "#f5f1f8", 0.85),
    "--ui-card-border": dark ? mix(hex, "#3a3f58", 0.72) : mix(hex, "#d5c9dc", 0.74),
    "--ui-select-bg": dark ? mix(hex, "#3e3445", 0.72) : mix(hex, "#e8deeb", 0.72),
    "--ui-select-panel": dark ? mix(hex, "#282230", 0.78) : mix(hex, "#efe7f2", 0.78),
  };
  applyColors(withDerived(colors, mode));
  document.querySelectorAll(".beer-color-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.beerColor === hex));
}

function toggleBeerPanel(enabled) {
  const panel = document.getElementById("beer-color-panel");
  const presets = document.querySelector(".theme-presets");
  if (panel) panel.classList.toggle("active", enabled);
  if (presets) presets.style.display = enabled ? "none" : "grid";
}

window.addEventListener("DOMContentLoaded", () => {
  const modeBtn = document.getElementById("theme-mode-btn");
  const modeOptions = document.getElementById("theme-mode-options");
  const switchEl = document.getElementById("theme-default-switch");

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
      if (isBeerMode()) applyBeerPalette(localStorage.getItem(THEME_BEER_COLOR_KEY) || DEFAULT_BEER_COLOR);
      else applyThemePreset(localStorage.getItem(THEME_PRESET_KEY) || "ocean");
    });
  });
  document.addEventListener("click", (e) => { if (!modeOptions.contains(e.target) && e.target !== modeBtn) modeOptions.classList.remove("show"); });

  const savedPreset = localStorage.getItem(THEME_PRESET_KEY) || "ocean";
  document.querySelectorAll(".theme-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.themePreset;
      if (!p) return;
      localStorage.setItem(THEME_PRESET_KEY, p);
      applyThemePreset(p);
    });
  });

  switchEl.checked = isBeerMode();
  toggleBeerPanel(switchEl.checked);
  switchEl.addEventListener("change", () => {
    localStorage.setItem(THEME_USE_BEER_KEY, switchEl.checked ? "1" : "0");
    toggleBeerPanel(switchEl.checked);
    if (switchEl.checked) {
      applyBeerPalette(localStorage.getItem(THEME_BEER_COLOR_KEY) || DEFAULT_BEER_COLOR);
    } else {
      applyThemePreset(localStorage.getItem(THEME_PRESET_KEY) || "ocean");
    }
  });

  document.querySelectorAll(".beer-color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.beerColor || DEFAULT_BEER_COLOR;
      localStorage.setItem(THEME_BEER_COLOR_KEY, color);
      applyBeerPalette(color);
    });
  });

  if (isBeerMode()) applyBeerPalette(localStorage.getItem(THEME_BEER_COLOR_KEY) || DEFAULT_BEER_COLOR);
  else applyThemePreset(savedPreset);

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (getStoredMode() === "auto") {
      applyThemeMode("auto");
      if (isBeerMode()) applyBeerPalette(localStorage.getItem(THEME_BEER_COLOR_KEY) || DEFAULT_BEER_COLOR);
      else applyThemePreset(localStorage.getItem(THEME_PRESET_KEY) || "ocean");
    }
  });

  document.addEventListener("languageChanged", () => { modeBtn.innerText = modeLabel(getStoredMode()); });
});
