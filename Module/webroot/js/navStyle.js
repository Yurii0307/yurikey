// Navigation style preference: Classic, Expressive, Rounded.
const NAV_STYLE_KEY = "navStyle";
const NAV_STYLES = ["classic", "expressive", "rounded"];
const DEFAULT_NAV_STYLE = "expressive";

function getStoredNavStyle() {
  try {
    const stored = localStorage.getItem(NAV_STYLE_KEY);
    return NAV_STYLES.includes(stored) ? stored : DEFAULT_NAV_STYLE;
  } catch {
    return DEFAULT_NAV_STYLE;
  }
}

function applyNavStyle(style) {
  const resolved = NAV_STYLES.includes(style) ? style : DEFAULT_NAV_STYLE;
  document.documentElement.setAttribute("data-nav-style", resolved);
  return resolved;
}

// Applied while the document head is parsed so the first paint uses the stored style.
applyNavStyle(getStoredNavStyle());

window.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".m3-floating-nav");
  if (!nav) return;

  const pill = nav.querySelector(".nav-pill");
  const picker = document.querySelector(".nav-style-group");
  const buttons = Array.from(document.querySelectorAll(".nav-style-btn"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentStyle = applyNavStyle(getStoredNavStyle());

  function applyPickerState() {
    let selectedIdx = -1;
    buttons.forEach((btn, idx) => {
      const selected = btn.dataset.navStyle === currentStyle;
      if (selected) selectedIdx = idx;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-checked", selected ? "true" : "false");
      btn.tabIndex = selected ? 0 : -1;
    });
    if (picker) {
      picker.classList.toggle("select-first", selectedIdx === 0);
      picker.classList.toggle("select-last", selectedIdx === buttons.length - 1);
    }
  }

  function updatePickerMetrics() {
    if (!picker) return;
    const groupHeight = picker.getBoundingClientRect().height;
    const button = picker.querySelector(".nav-style-btn");
    const buttonHeight = button ? button.getBoundingClientRect().height : 0;
    if (!groupHeight || !buttonHeight) return;
    picker.style.setProperty("--picker-pill-radius", `${groupHeight / 2}px`);
    picker.style.setProperty("--picker-btn-pill-radius", `${buttonHeight / 2}px`);
  }

  function positionPill(animate) {
    if (!pill || currentStyle !== "expressive") return;
    const link = nav.querySelector("a.active") || nav.querySelector("a");
    if (!link) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    if (!linkRect.width) return;

    const shouldAnimate = animate && !reduceMotion.matches;
    if (!shouldAnimate) pill.classList.add("no-anim");

    pill.style.width = `${linkRect.width}px`;
    pill.style.transform = `translate3d(${linkRect.left - navRect.left}px, -50%, 0)`;

    if (!shouldAnimate) {
      void pill.offsetWidth;
      requestAnimationFrame(() => pill.classList.remove("no-anim"));
    }
  }

  function setNavStyle(style) {
    currentStyle = applyNavStyle(style);
    try {
      localStorage.setItem(NAV_STYLE_KEY, currentStyle);
    } catch {}
    applyPickerState();
    positionPill(false);
  }

  buttons.forEach((btn, idx) => {
    btn.addEventListener("click", () => setNavStyle(btn.dataset.navStyle || DEFAULT_NAV_STYLE));

    btn.addEventListener("keydown", (event) => {
      let targetIdx = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        targetIdx = (idx + 1) % buttons.length;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        targetIdx = (idx - 1 + buttons.length) % buttons.length;
      }
      if (targetIdx !== null) {
        event.preventDefault();
        buttons[targetIdx].focus();
        buttons[targetIdx].click();
      }
    });
  });

  updatePickerMetrics();
  applyPickerState();
  requestAnimationFrame(() => positionPill(false));

  document.addEventListener("navigation:change", () => {
    requestAnimationFrame(() => {
      updatePickerMetrics();
      positionPill(true);
    });
  });
  document.addEventListener("languageChanged", () => {
    requestAnimationFrame(() => {
      updatePickerMetrics();
      positionPill(false);
    });
  });
  window.addEventListener("resize", () => {
    updatePickerMetrics();
    positionPill(false);
  });
  window.addEventListener("orientationchange", () => {
    updatePickerMetrics();
    positionPill(false);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      updatePickerMetrics();
      positionPill(false);
    });
  }
});
