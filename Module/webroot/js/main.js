document.addEventListener("DOMContentLoaded", () => {
  window.WebrootUI?.initPageNavigation();
  window.WebrootScripts?.bindScriptButtons("#actions-page .menu-btn[data-script]", "Yuri/");
  window.WebrootScripts?.bindScriptButtons("#advance-menu .menu-btn[data-script]", "Yuri/");
  window.WebrootScripts?.initScriptHistoryDialog();
  window.WebrootHome?.initHomePage();
});
