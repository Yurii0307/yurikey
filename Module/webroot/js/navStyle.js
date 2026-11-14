// Navigation style preference: Classic, Expressive, Rounded.
const NAV_STYLE_KEY = "navStyle";
const NAV_STYLES = ["classic", "expressive", "rounded"];
const DEFAULT_NAV_STYLE = "expressive";

function applyNavStyle(style) {
  const resolved = NAV_STYLES.includes(style) ? style : DEFAULT_NAV_STYLE;
  document.documentElement.setAttribute("data-nav-style", resolved);
  return resolved;
}

// Applied while the document head is parsed so the first paint uses the stored style.
applyNavStyle(readStoredPreference(NAV_STYLE_KEY, NAV_STYLES, DEFAULT_NAV_STYLE));

window.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".m3-floating-nav");
  if (!nav) return;

  const pill = nav.querySelector(".nav-pill");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentStyle = applyNavStyle(readStoredPreference(NAV_STYLE_KEY, NAV_STYLES, DEFAULT_NAV_STYLE));

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

  const picker = initSegmentedPicker({
    root: document.getElementById("nav-style-picker"),
    valueAttribute: "navStyle",
    values: NAV_STYLES,
    defaultValue: DEFAULT_NAV_STYLE,
    storageKey: NAV_STYLE_KEY,
    onApply(style) {
      currentStyle = applyNavStyle(style);
      positionPill(false);
    },
  });

  requestAnimationFrame(() => positionPill(false));

  function refreshMetrics() {
    picker?.refreshMetrics();
  }

  document.addEventListener("navigation:change", () => {
    requestAnimationFrame(() => {
      refreshMetrics();
      positionPill(true);
    });
  });
  document.addEventListener("languageChanged", () => {
    requestAnimationFrame(() => {
      refreshMetrics();
      positionPill(false);
    });
  });
  window.addEventListener("resize", () => {
    refreshMetrics();
    positionPill(false);
  });
  window.addEventListener("orientationchange", () => {
    refreshMetrics();
    positionPill(false);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      refreshMetrics();
      positionPill(false);
    });
  }
});
