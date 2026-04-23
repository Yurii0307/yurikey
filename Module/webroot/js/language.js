async function applyLanguage(langCode) {
  try {
    const json = await window.WebrootI18n.loadTranslations(langCode);
    window.WebrootI18nDom.applyTranslationsToDocument(json);

    const refreshBtn = document.getElementById("refresh-info-btn");
    if (refreshBtn && refreshBtn.getAttribute("data-i18n")) {
      const defaultKey = refreshBtn.getAttribute("data-i18n");
      refreshBtn.innerText = t(defaultKey);
    }

    window.WebrootI18nDom.persistLanguage(langCode);
    window.WebrootI18nDom.dispatchLanguageChanged(langCode, json);
  } catch (err) {
    console.error("Failed to load language:", err);
  }
}

function setupLanguageDropdown(currentLang) {
  const langBtn = document.getElementById("lang-btn");
  const langOptions = document.getElementById("lang-options");

  window.WebrootI18nDom.syncLanguageButton(currentLang);

  window.WebrootUI?.bindDropdown({
    button: langBtn,
    menu: langOptions,
    itemSelector: "li[data-lang]",
    onSelect: (item, { close }) => {
      const lang = item.getAttribute("data-lang");
      applyLanguage(lang);
      close();
      langBtn.innerText = item.innerText;
    },
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const savedLang = localStorage.getItem("selectedLanguage") || window.WebrootI18n.DEFAULT_LANG;
  await applyLanguage(savedLang);
  setupLanguageDropdown(savedLang);
});
