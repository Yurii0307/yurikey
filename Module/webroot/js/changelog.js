// Loads the changelog bundled with the installed module and renders it on the Home page.
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("changelog-content");
  if (!container || typeof window.renderChangelogMarkdown !== "function") return;

  const loading = document.getElementById("changelog-loading");
  const error = document.getElementById("changelog-error");

  try {
    const response = await fetch(`changelog.md?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const markdown = (await response.text()).trim();
    if (!markdown) throw new Error("Empty changelog");

    container.innerHTML = window.renderChangelogMarkdown(markdown);
    loading?.remove();
    error?.remove();
  } catch (err) {
    console.warn("Changelog unavailable:", err);
    loading?.setAttribute("hidden", "");
    error?.removeAttribute("hidden");
  }
});
