const THEME_MODE_KEY = "themeMode";
const THEME_PRESET_KEY = "themePreset";

const SNACKBAR_COLOR_KEYS = {
  info: "snackbarInfoColor",
  success: "snackbarSuccessColor",
  warning: "snackbarWarningColor",
  error: "snackbarErrorColor",
  text: "snackbarTextColor",
};

const SNACKBAR_DEFAULTS = {
  info: "#2196f3",
  success: "#43a047",
  warning: "#f9a825",
  error: "#e53935",
  text: "#ffffff",
};
const THEME_PRESETS = window.THEME_PRESETS || {};

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
  const pillText = colors["--ui-pill-text"] || (mode === "light" ? "#ffffff" : "#231531");
  return {
    ...colors,
    "--ui-pill-bg-hover": mix(base, mode === "light" ? "#ffffff" : "#f8d8e8", 0.18),
    "--ui-pill-border": mix(base, mode === "light" ? "#ffffff" : "#f9e7f2", 0.35),
    "--ui-nav-text-active": "#ffffff",
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


function normalizeHex(value, fallback = "#2196f3") {
  const raw = (value || "").trim();
  const match = raw.match(/^#?[0-9a-fA-F]{6}$/);
  if (!match) return fallback;
  return raw.startsWith("#") ? raw.toLowerCase() : `#${raw.toLowerCase()}`;
}

function hexToRgbTuple(hex) {
  const n = normalizeHex(hex).replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function rgbToHexTuple(r, g, b) {
  return `#${[r, g, b].map(v => Number(v).toString(16).padStart(2, "0")).join("")}`;
}

function setSnackbarColor(type, value) {
  const key = SNACKBAR_COLOR_KEYS[type];
  const normalized = normalizeHex(value, SNACKBAR_DEFAULTS[type]);
  localStorage.setItem(key, normalized);
  document.documentElement.style.setProperty(`--snackbar-${type}`, normalized);

  const input = document.getElementById(`snackbar-${type}-color`);
  const preview = document.getElementById(`snackbar-${type}-preview`);
  if (input) input.value = normalized;
  if (preview) preview.style.background = normalized;
  return normalized;
}

function applySnackbarColors() {
  Object.entries(SNACKBAR_COLOR_KEYS).forEach(([type, key]) => {
    const value = localStorage.getItem(key) || SNACKBAR_DEFAULTS[type];
    setSnackbarColor(type, value);
  });
}

function bindSnackbarColorInputs() {
  Object.keys(SNACKBAR_COLOR_KEYS).forEach(type => {
    const input = document.getElementById(`snackbar-${type}-color`);
    if (!input) return;

    input.addEventListener("change", () => setSnackbarColor(type, input.value));
    input.addEventListener("blur", () => setSnackbarColor(type, input.value));
  });
}

function bindSnackbarColorTool() {
  const target = document.getElementById("snackbar-color-target");
  const hexInput = document.getElementById("snackbar-color-tool-hex");
  const preview = document.getElementById("snackbar-color-tool-preview");
  const rangeR = document.getElementById("snackbar-color-r");
  const rangeG = document.getElementById("snackbar-color-g");
  const rangeB = document.getElementById("snackbar-color-b");
  const applyBtn = document.getElementById("snackbar-color-tool-apply");
  if (!target || !hexInput || !preview || !rangeR || !rangeG || !rangeB || !applyBtn) return;

  const syncFromHex = (hex) => {
    const rgb = hexToRgbTuple(hex);
    rangeR.value = rgb.r;
    rangeG.value = rgb.g;
    rangeB.value = rgb.b;
    preview.style.background = normalizeHex(hex);
    hexInput.value = normalizeHex(hex);
  };

  const syncFromTarget = () => {
    const type = target.value || "info";
    const input = document.getElementById(`snackbar-${type}-color`);
    syncFromHex(input?.value || SNACKBAR_DEFAULTS[type]);
  };

  const syncFromRanges = () => {
    const hex = rgbToHexTuple(rangeR.value, rangeG.value, rangeB.value);
    preview.style.background = hex;
    hexInput.value = hex;
  };

  target.addEventListener("change", syncFromTarget);
  [rangeR, rangeG, rangeB].forEach(range => range.addEventListener("input", syncFromRanges));
  hexInput.addEventListener("input", () => {
    if (/^#?[0-9a-fA-F]{6}$/.test(hexInput.value.trim())) {
      syncFromHex(hexInput.value);
    }
  });

  applyBtn.addEventListener("click", () => {
    const type = target.value || "info";
    const applied = setSnackbarColor(type, hexInput.value);
    syncFromHex(applied);
  });

  syncFromTarget();
}

window.addEventListener("DOMContentLoaded", () => {
  const modeBtn = document.getElementById("theme-mode-btn");
  const modeOptions = document.getElementById("theme-mode-options");

  const mode = getStoredMode();
  modeBtn.innerText = modeLabel(mode);
  applyThemeMode(mode);

  window.WebrootUI?.bindDropdown({
    button: modeBtn,
    menu: modeOptions,
    itemSelector: "li[data-mode]",
    onSelect: (item, { close }) => {
      const m = item.dataset.mode || "dark";
      localStorage.setItem(THEME_MODE_KEY, m);
      modeBtn.innerText = modeLabel(m);
      close();
      applyThemeMode(m);
      applyThemePreset(getStoredPreset());
    },
  });

  document.querySelectorAll(".theme-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.themePreset;
      if (!p || !THEME_PRESETS[p]) return;
      localStorage.setItem(THEME_PRESET_KEY, p);
      applyThemePreset(p);
    });
  });

  applyThemePreset(getStoredPreset());
  applySnackbarColors();
  bindSnackbarColorInputs();
  bindSnackbarColorTool();

  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (getStoredMode() === "auto") {
      applyThemeMode("auto");
      applyThemePreset(getStoredPreset());
    }
  });

  document.addEventListener("languageChanged", () => { modeBtn.innerText = modeLabel(getStoredMode()); });
});
