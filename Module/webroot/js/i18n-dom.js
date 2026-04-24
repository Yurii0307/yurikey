(function initI18nDom() {
  function replaceElementText(el, value) {
    if (el.children.length === 0) {
      el.innerText = value;
      return;
    }

    const hasHtmlContent = el.innerHTML.includes("<");
    if (hasHtmlContent) {
      el.innerHTML = value;
      return;
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (textNode.nodeValue.trim()) {
        textNodes.push(textNode);
      }
    }

    if (textNodes.length > 0) {
      textNodes[0].nodeValue = value;
      for (let index = 1; index < textNodes.length; index += 1) {
        textNodes[index].remove();
      }
      return;
    }

    el.appendChild(document.createTextNode(value));
  }

  function applyTranslationsToDocument(translations) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (translations[key]) {
        replaceElementText(el, translations[key]);
      }
    });
  }

  function syncLanguageButton(currentLang) {
    const langBtn = document.getElementById("lang-btn");
    const activeItem = document.querySelector(`#lang-options li[data-lang='${currentLang}']`);
    if (langBtn && activeItem) {
      langBtn.innerText = activeItem.innerText;
    }
  }

  function persistLanguage(langCode) {
    document.documentElement.lang = langCode;
    localStorage.setItem("selectedLanguage", langCode);
  }

  function dispatchLanguageChanged(langCode, translations) {
    if (typeof window.updateNetworkStatus === "function") {
      setTimeout(() => window.updateNetworkStatus(), 100);
    }

    document.dispatchEvent(new CustomEvent("languageChanged", {
      detail: { language: langCode, translations },
    }));
  }

  window.WebrootI18nDom = {
    applyTranslationsToDocument,
    dispatchLanguageChanged,
    persistLanguage,
    syncLanguageButton,
  };
})();
