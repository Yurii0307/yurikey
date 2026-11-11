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

const THEME_PRESETS = {
  ocean: {
    dark: { "--ui-bg": "#111a26", "--ui-card-bg": "#1d2a3a", "--ui-card-border": "#334759", "--ui-pill-bg": "#9ecaff", "--ui-pill-text": "#003258", "--ui-select-bg": "#3a546f", "--ui-select-border": "#6f90b2", "--ui-select-panel": "#273a4e", "--ui-select-panel-border": "#587493", "--ui-text": "#f3edf7", "--ui-muted": "#c2d0e3" },
    light:{ "--ui-bg": "#e9f2ff", "--ui-card-bg": "#f2f7ff", "--ui-card-border": "#c6d8ef", "--ui-pill-bg": "#0061a4", "--ui-pill-text": "#ffffff", "--ui-select-bg": "#d1e4ff", "--ui-select-border": "#b2cbe9", "--ui-select-panel": "#e2eeff", "--ui-select-panel-border": "#c3d8f3", "--ui-text": "#101c28", "--ui-muted": "#44607d" },
  },
  rose: {
    dark: { "--ui-bg": "#221516", "--ui-card-bg": "#362124", "--ui-card-border": "#5a3539", "--ui-pill-bg": "#ffb4a9", "--ui-pill-text": "#690002", "--ui-select-bg": "#5f3a3e", "--ui-select-border": "#9a6c72", "--ui-select-panel": "#452a2d", "--ui-select-panel-border": "#7a4c51", "--ui-text": "#fdf2f4", "--ui-muted": "#d6b4b8" },
    light:{ "--ui-bg": "#fff0ee", "--ui-card-bg": "#fff8f7", "--ui-card-border": "#f2cec8", "--ui-pill-bg": "#ba1a1a", "--ui-pill-text": "#ffffff", "--ui-select-bg": "#ffdad5", "--ui-select-border": "#e8b8b0", "--ui-select-panel": "#ffe9e5", "--ui-select-panel-border": "#ebc2bb", "--ui-text": "#2c1517", "--ui-muted": "#7d4d54" },
  },
  forest: {
    dark: { "--ui-bg": "#132016", "--ui-card-bg": "#1d3222", "--ui-card-border": "#365441", "--ui-pill-bg": "#78dc77", "--ui-pill-text": "#00390a", "--ui-select-bg": "#355142", "--ui-select-border": "#6f9a7f", "--ui-select-panel": "#253b2b", "--ui-select-panel-border": "#5d7e68", "--ui-text": "#edf6ee", "--ui-muted": "#a4c7a9" },
    light:{ "--ui-bg": "#eff9ef", "--ui-card-bg": "#f5fcf4", "--ui-card-border": "#cce3cd", "--ui-pill-bg": "#006e1c", "--ui-pill-text": "#ffffff", "--ui-select-bg": "#d2edd4", "--ui-select-border": "#b0d7b4", "--ui-select-panel": "#def6dd", "--ui-select-panel-border": "#b8dfb7", "--ui-text": "#132416", "--ui-muted": "#3d6844" },
  },
  sunset: {
    dark: { "--ui-bg": "#241911", "--ui-card-bg": "#39291b", "--ui-card-border": "#5d4330", "--ui-pill-bg": "#ffb870", "--ui-pill-text": "#4a2800", "--ui-select-bg": "#594131", "--ui-select-border": "#8f6a4e", "--ui-select-panel": "#3f2d20", "--ui-select-panel-border": "#73543d", "--ui-text": "#fdf3eb", "--ui-muted": "#d5b399" },
    light:{ "--ui-bg": "#fff4ea", "--ui-card-bg": "#fff8f2", "--ui-card-border": "#ecd3bc", "--ui-pill-bg": "#8b5000", "--ui-pill-text": "#ffffff", "--ui-select-bg": "#ffdcbe", "--ui-select-border": "#e8bf98", "--ui-select-panel": "#ffeddc", "--ui-select-panel-border": "#edcdb0", "--ui-text": "#2d1a0e", "--ui-muted": "#795438" },
  },
  violet: {
    dark: { "--ui-bg": "#1f1626", "--ui-card-bg": "#30243a", "--ui-card-border": "#52405f", "--ui-pill-bg": "#f9abff", "--ui-pill-text": "#570066", "--ui-select-bg": "#4f3d5e", "--ui-select-border": "#8b74a0", "--ui-select-panel": "#3a2d47", "--ui-select-panel-border": "#715788", "--ui-text": "#f7edfc", "--ui-muted": "#c8a8d7" },
    light:{ "--ui-bg": "#f9ecff", "--ui-card-bg": "#fdf5ff", "--ui-card-border": "#e4cdee", "--ui-pill-bg": "#9a25ae", "--ui-pill-text": "#ffffff", "--ui-select-bg": "#ffd6fe", "--ui-select-border": "#e8b8e8", "--ui-select-panel": "#ffe9ff", "--ui-select-panel-border": "#eecbf1", "--ui-text": "#281430", "--ui-muted": "#6e467b" },
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

function getDeviceMode() {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getStoredMode() {
  const stored = localStorage.getItem(THEME_MODE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return getDeviceMode();
}
function getResolvedMode(mode) {
  if (mode === "dark" || mode === "light") return mode;
  return getDeviceMode();
}
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
    "--ui-pill-bg-hover": mix(base, "#ffffff", 0.18),
    "--ui-pill-border": mix(base, "#ffffff", 0.35),
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
  if (document.body) {
    document.body.classList.remove("dark", "light");
    document.body.classList.add(resolved);
  }
  return resolved;
}

function applyThemePreset(presetName) {
  const mode = document.documentElement.getAttribute("data-theme-mode") || "dark";
  const preset = THEME_PRESETS[presetName] || THEME_PRESETS.ocean;
  const colors = withDerived(preset[mode] || preset.dark, mode);
  applyColors(colors);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && colors["--ui-bg"]) {
    meta.setAttribute("content", colors["--ui-bg"]);
  }
  document.querySelectorAll(".theme-preset-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.themePreset === presetName));
}

function updateThemeModeCards(selectedMode) {
  const cards = document.querySelectorAll(".theme-mode-card");
  cards.forEach(card => {
    const isSelected = card.dataset.mode === selectedMode;
    card.classList.toggle("active", isSelected);
    card.setAttribute("aria-checked", isSelected ? "true" : "false");
  });
}

function setupThemeModeGrid() {
  const cards = Array.from(document.querySelectorAll(".theme-mode-card"));
  if (!cards.length) return;

  const currentMode = getStoredMode();
  updateThemeModeCards(currentMode);

  cards.forEach((card, idx) => {
    card.addEventListener("click", () => {
      const mode = card.dataset.mode || "dark";
      localStorage.setItem(THEME_MODE_KEY, mode);
      updateThemeModeCards(mode);
      applyThemeMode(mode);
      applyThemePreset(getStoredPreset());
    });

    card.addEventListener("keydown", (e) => {
      let targetIdx = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        targetIdx = (idx + 1) % cards.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        targetIdx = (idx - 1 + cards.length) % cards.length;
      }
      if (targetIdx !== null) {
        e.preventDefault();
        cards[targetIdx].focus();
        cards[targetIdx].click();
      }
    });
  });
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
  const mode = getStoredMode();
  applyThemeMode(mode);
  setupThemeModeGrid();

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
    const stored = localStorage.getItem(THEME_MODE_KEY);
    if (!stored || stored === "auto") {
      const m = getDeviceMode();
      applyThemeMode(m);
      applyThemePreset(getStoredPreset());
      updateThemeModeCards(m);
    }
  });

  document.addEventListener("languageChanged", () => {
    updateThemeModeCards(getStoredMode());
  });
});
