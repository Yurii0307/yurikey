(function initI18nCore() {
  const LANG_PATH = "lang/";
  const DEFAULT_LANG = "en";

  let translations = {};
  window.translations = translations;

  function t(key) {
    return window.translations?.[key] || key;
  }

  function tFormat(key, vars = {}) {
    let str = t(key);
    Object.keys(vars).forEach((name) => {
      str = str.replace(`{${name}}`, vars[name]);
    });
    return str;
  }

  function getLanguageFetchUrl(langCode) {
    if (langCode === DEFAULT_LANG) {
      return `${LANG_PATH}source/string.json?ts=${Date.now()}`;
    }
    return `${LANG_PATH}${langCode}.json?ts=${Date.now()}`;
  }

  function setTranslations(nextTranslations) {
    translations = nextTranslations || {};
    window.translations = translations;
  }

  async function loadTranslations(langCode) {
    const response = await fetch(getLanguageFetchUrl(langCode));
    const json = await response.json();
    setTranslations(json);
    return json;
  }

  window.t = t;
  window.tFormat = tFormat;
  window.WebrootI18n = {
    DEFAULT_LANG,
    getTranslations: () => translations,
    loadTranslations,
    setTranslations,
  };
})();
