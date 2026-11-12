// === Function: Open a URL using Android Intent via Unified Bridge ===
function openUrlViaIntent(url) {
  if (window.Bridge && typeof window.Bridge.openUrl === "function") {
    window.Bridge.openUrl(url);
  }
}

// === Function: Attach click listeners to elements with [data-url] ===
function setupIntentLinks(selector = "[data-url]") {
  document.querySelectorAll(selector).forEach(button => {
    const url = button.dataset.url;
    if (url) {
      button.addEventListener("click", () => openUrlViaIntent(url));
    }
  });
}

// === Initialize: Run setup when the DOM is fully loaded ===
window.addEventListener("DOMContentLoaded", () => {
  setupIntentLinks();
});
