// Reusable single-select segmented picker
(function (global) {
  function readStoredPreference(storageKey, values, fallback) {
    try {
      const stored = global.localStorage.getItem(storageKey);
      return values.includes(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStoredPreference(storageKey, value) {
    try {
      global.localStorage.setItem(storageKey, value);
    } catch {}
  }

  function initSegmentedPicker({
    root,
    buttonSelector = ".segmented-picker-btn",
    valueAttribute,
    values,
    defaultValue,
    storageKey,
    onApply,
  }) {
    if (!root) return null;

    const buttons = Array.from(root.querySelectorAll(buttonSelector));
    if (!buttons.length) return null;

    let value = readStoredPreference(storageKey, values, defaultValue);

    function refreshMetrics() {
      const groupHeight = root.getBoundingClientRect().height;
      const buttonHeight = buttons[0].getBoundingClientRect().height;
      if (!groupHeight || !buttonHeight) return;
      root.style.setProperty("--picker-pill-radius", `${groupHeight / 2}px`);
      root.style.setProperty("--picker-btn-pill-radius", `${buttonHeight / 2}px`);
    }

    function render() {
      let selectedIdx = -1;
      buttons.forEach((button, idx) => {
        const selected = button.dataset[valueAttribute] === value;
        if (selected) selectedIdx = idx;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-checked", selected ? "true" : "false");
        button.tabIndex = selected ? 0 : -1;
      });
      root.classList.toggle("select-first", selectedIdx === 0);
      root.classList.toggle("select-last", selectedIdx === buttons.length - 1);
      refreshMetrics();
    }

    function setValue(nextValue) {
      const resolved = values.includes(nextValue) ? nextValue : defaultValue;
      value = resolved;
      writeStoredPreference(storageKey, resolved);
      if (onApply) onApply(resolved);
      render();
    }

    buttons.forEach((button, idx) => {
      button.addEventListener("click", () => {
        setValue(button.dataset[valueAttribute] || defaultValue);
      });

      button.addEventListener("keydown", (event) => {
        let targetIdx = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          targetIdx = (idx + 1) % buttons.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          targetIdx = (idx - 1 + buttons.length) % buttons.length;
        }
        if (targetIdx === null) return;
        event.preventDefault();
        buttons[targetIdx].focus();
        buttons[targetIdx].click();
      });
    });

    render();

    return {
      getValue: () => value,
      setValue,
      refreshMetrics,
    };
  }

  global.initSegmentedPicker = initSegmentedPicker;
  global.readStoredPreference = readStoredPreference;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { initSegmentedPicker, readStoredPreference };
  }
})(typeof window !== "undefined" ? window : globalThis);
