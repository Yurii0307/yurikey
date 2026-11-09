// Internationalization Utilities
const LANG_PATH = "lang/";
const DEFAULT_LANG = "en";
let baseTranslations = {};
let translations = {};
window.translations = translations;

// Translation helper function with fallback
function t(key) {
  return window.translations?.[key] || baseTranslations[key] || key;
}
// Interpolation formatter for translation strings
function tFormat(key, vars = {}) {
  let str = t(key);
  Object.keys(vars).forEach(k => {
    str = str.replace(`{${k}}`, vars[k]);
  });
  return str;
}

// Load and apply translations to all elements
async function applyLanguage(langCode) {
  try {
    const isEnglish = !langCode || langCode === "en";
    const [base, localized] = await Promise.all([
      Object.keys(baseTranslations).length
        ? baseTranslations
        : fetch(`${LANG_PATH}en.json?ts=${Date.now()}`).then(r => r.json()).catch(() => ({})),
      !isEnglish
        ? fetch(`${LANG_PATH}${langCode}.json?ts=${Date.now()}`).then(r => r.json()).catch(() => ({}))
        : null
    ]);

    baseTranslations = base;
    translations = Object.assign({}, base, localized || {});
    window.translations = translations;
    // Apply to elements using [data-i18n] attribute
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (translations[key]) {
        if (el.children.length > 0) {
          const hasHTMLContent = el.innerHTML.includes('<');
          if (hasHTMLContent) {
            el.innerHTML = translations[key];
          } else {
            const walker = document.createTreeWalker(
              el,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            let textNodes = [];
            let textNode;
            while (textNode = walker.nextNode()) {
              if (textNode.nodeValue.trim()) {
                textNodes.push(textNode);
              }
            }
            if (textNodes.length > 0) {
              textNodes[0].nodeValue = translations[key];
              for (let i = 1; i < textNodes.length; i++) {
                textNodes[i].remove();
              }
            } else {
              el.appendChild(document.createTextNode(translations[key]));
            }
          }
        } else {
          el.innerText = translations[key];
        }
      }
    });

    // Update refresh button text if available
    const refreshBtn = document.getElementById("refresh-info-btn");
    if (refreshBtn && refreshBtn.getAttribute("data-i18n")) {
      const defaultKey = refreshBtn.getAttribute("data-i18n");
      refreshBtn.innerText = t(defaultKey);
    }

    // Save the selected language in localStorage
    document.documentElement.lang = langCode;
    localStorage.setItem("selectedLanguage", langCode);

    // Call updateNetworkStatus to refresh network status text in new language with a slight delay
    if (typeof window.updateNetworkStatus === "function") {
      setTimeout(() => window.updateNetworkStatus(), 100);
    }

    document.dispatchEvent(new CustomEvent("languageChanged", {
      detail: { language: langCode, translations: translations }
    }));
    document.body.classList.add("i18n-ready");
  } catch (err) {
    console.error("Failed to load language:", err);
    document.body.classList.add("i18n-ready");
  }
}

// Handle dropdown language selection
function setupLanguageDropdown(currentLang) {
  const langBtn = document.getElementById("lang-btn");
  const langOptions = document.getElementById("lang-options");

  const activeItem = document.querySelector(`#lang-options li[data-lang='${currentLang}']`);
  if (langBtn && activeItem) langBtn.innerText = activeItem.innerText;

  // Toggle dropdown visibility
  langBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    langOptions?.classList.toggle("show");
  });

  // Close dropdown if clicked outside
  document.addEventListener("click", (e) => {
    if (!langOptions.contains(e.target) && e.target !== langBtn) {
      langOptions?.classList.remove("show");
    }
  });

  // Handle language option click
  document.querySelectorAll("#lang-options li").forEach(item => {
    item.addEventListener("click", () => {
      const lang = item.getAttribute("data-lang");
      applyLanguage(lang);
      langOptions?.classList.remove("show");
      langBtn.innerText = item.innerText;
    });
  });
}

// Initialize language and dropdown on page load
document.addEventListener("DOMContentLoaded", async () => {
  const savedLang = localStorage.getItem("selectedLanguage") || DEFAULT_LANG;
  await applyLanguage(savedLang);
  setupLanguageDropdown(savedLang);
});

// Export functions to window object
window.t = t;
window.tFormat = tFormat;
window.applyLanguage = applyLanguage;
window.setupLanguageDropdown = setupLanguageDropdown;
