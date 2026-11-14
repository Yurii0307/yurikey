// Collapse button labels that wrap onto multiple lines into a shorter alternative
const collapsibleLabels = new WeakSet();

function lineCount(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getClientRects().length;
}

function refreshCollapsedLabel(btn) {
  const long = btn.querySelector("[data-label-long]");
  const short = btn.querySelector("[data-label-short]");
  if (!long || !short || !btn.getClientRects().length) return;

  btn.classList.remove("is-collapsed");
  btn.classList.toggle("is-collapsed", lineCount(long) > 1);
}

function refreshCollapsedLabels() {
  document.querySelectorAll("button[data-collapsible-label]").forEach(refreshCollapsedLabel);
}

function setupCollapsibleLabels() {
  document.querySelectorAll("button[data-collapsible-label]").forEach(btn => {
    if (collapsibleLabels.has(btn)) return;
    collapsibleLabels.add(btn);
    refreshCollapsedLabel(btn);
    new ResizeObserver(() => refreshCollapsedLabel(btn)).observe(btn);
  });
}

document.addEventListener("DOMContentLoaded", setupCollapsibleLabels);
document.addEventListener("languageChanged", refreshCollapsedLabels);

window.setupCollapsibleLabels = setupCollapsibleLabels;
window.refreshCollapsedLabels = refreshCollapsedLabels;
