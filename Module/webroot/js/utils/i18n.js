// Internationalization Utilities
const LANG_PATH = "lang/";
const DEFAULT_LANG = "en";
let baseTranslations = {};
let translations = {};
window.translations = translations;

// Translation helper function with fallback
function t(key, fallback = "") {
  return window.translations?.[key] || baseTranslations[key] || fallback || key;
}
// Interpolation formatter for translation strings
function tFormat(key, vars = {}, fallback = "") {
  let str = t(key, fallback);
  Object.keys(vars).forEach(k => {
    str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
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

    // Apply to elements using [data-i18n-title] attribute
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      if (translations[key]) {
        el.setAttribute("title", translations[key]);
        el.setAttribute("aria-label", translations[key]);
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
    updateLanguageUI(langCode);
  } catch (err) {
    console.error("Failed to load language:", err);
    document.body.classList.add("i18n-ready");
  }
}

// Update language picker trigger and dialog state
function updateLanguageUI(langCode) {
  const currentLangText = document.getElementById("current-lang-text");
  const activeBtn = document.querySelector(`.lang-option-btn[data-lang='${langCode}']`);

  document.querySelectorAll(".lang-option-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === langCode);
  });

  if (currentLangText && activeBtn) {
    const flag = activeBtn.querySelector(".lang-flag")?.textContent?.trim() || "";
    const name = activeBtn.querySelector(".lang-name")?.textContent?.trim() || "";
    currentLangText.textContent = `${flag} ${name}`.trim();
  }
}

// Open/close language dialog
function openLanguageDialog() {
  const dialog = document.getElementById("language-dialog");
  const overlay = document.getElementById("language-dialog-overlay");
  if (!dialog) return;

  dialog.classList.add("active");
  overlay?.classList.add("active");
  if (!dialog.open && typeof dialog.show === "function") {
    try { dialog.show(); } catch {}
  }
}

function closeLanguageDialog() {
  const dialog = document.getElementById("language-dialog");
  const overlay = document.getElementById("language-dialog-overlay");
  if (!dialog) return;

  dialog.classList.remove("active");
  overlay?.classList.remove("active");
  if (dialog.open && typeof dialog.close === "function") {
    try { dialog.close(); } catch {}
  }
}

// Initialize language picker dialog and search
function setupLanguagePicker(currentLang) {
  updateLanguageUI(currentLang);

  const langBtn = document.getElementById("lang-btn");
  if (langBtn) {
    langBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLanguageDialog();
    });
  }

  // Also allow clicking the language card title
  const langTitle = langBtn?.closest("article")?.querySelector(".card-title");
  if (langTitle) {
    langTitle.style.cursor = "pointer";
    langTitle.addEventListener("click", () => {
      openLanguageDialog();
    });
  }

  const closeBtn = document.getElementById("language-dialog-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLanguageDialog();
    });
  }

  const overlay = document.getElementById("language-dialog-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLanguageDialog();
    });
  }

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const dialog = document.getElementById("language-dialog");
      if (dialog?.classList.contains("active") || dialog?.open) {
        closeLanguageDialog();
      }
    }
  });

  // Handle language option click
  document.querySelectorAll(".lang-option-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lang = btn.getAttribute("data-lang");
      if (lang) {
        applyLanguage(lang);
        closeLanguageDialog();
      }
    });
  });

  // Real-time language search filter
  const searchInput = document.getElementById("language-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      document.querySelectorAll("#lang-options [data-lang-item]").forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? "" : "none";
      });
    });
  }
}

const setupLanguageDropdown = setupLanguagePicker;

// Initialize language and picker on page load
document.addEventListener("DOMContentLoaded", async () => {
  const savedLang = localStorage.getItem("selectedLanguage") || DEFAULT_LANG;
  await applyLanguage(savedLang);
  setupLanguagePicker(savedLang);
});

// Export functions to window object
window.t = t;
window.tFormat = tFormat;
window.applyLanguage = applyLanguage;
window.setupLanguagePicker = setupLanguagePicker;
window.setupLanguageDropdown = setupLanguageDropdown;
window.updateLanguageUI = updateLanguageUI;
window.openLanguageDialog = openLanguageDialog;
window.closeLanguageDialog = closeLanguageDialog;
