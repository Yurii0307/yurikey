(function initWebrootUI() {
  function getElement(target) {
    if (!target) return null;
    if (typeof target === "string") return document.querySelector(target);
    return target;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function bindDropdown({ button, menu, itemSelector = "li", onSelect }) {
    const toggleButton = getElement(button);
    const dropdownMenu = getElement(menu);
    if (!toggleButton || !dropdownMenu) return null;

    const close = () => dropdownMenu.classList.remove("show");
    const toggle = () => dropdownMenu.classList.toggle("show");

    toggleButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    });

    document.addEventListener("click", (event) => {
      if (!dropdownMenu.contains(event.target) && event.target !== toggleButton) {
        close();
      }
    });

    dropdownMenu.querySelectorAll(itemSelector).forEach((item) => {
      item.addEventListener("click", () => {
        onSelect?.(item, { button: toggleButton, menu: dropdownMenu, close });
      });
    });

    return { close, toggle };
  }

  function initPageNavigation() {
    const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
    const pages = Array.from(document.querySelectorAll(".page"));
    if (!navButtons.length || !pages.length) return;

    navButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        navButtons.forEach((navButton) => navButton.classList.remove("active"));
        pages.forEach((page) => page.classList.remove("active"));

        button.classList.add("active");
        pages[index]?.classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  window.WebrootUI = {
    bindDropdown,
    escapeHtml,
    initPageNavigation,
  };
})();
