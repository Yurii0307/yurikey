// === Load Contributors and Apply Translations ===
(function loadContributors() {
  fetch("json/dev.json")
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const container = document.getElementById("contrib-list");
      if (!container || !Array.isArray(data.contributors)) return;

      container.innerHTML = ""; // Clear any existing entries

      // Render each contributor
      data.contributors.forEach(user => {
        const username = user.username || user.name || "unknown";
        const avatar = `https://github.com/${encodeURIComponent(username)}.png`;
        const profileURL = user.url || "#";
        const rawRole = user.role || "Unknown Role";
        const roleKey = `role_${rawRole}`; // Use this for translation lookup

        const card = document.createElement("button");
        card.className = "contrib-card";
        card.setAttribute("type", "button");
        card.addEventListener("click", () => openUrlViaIntent(profileURL));

        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239e9e9e'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        card.innerHTML = `
          <img src="${avatar}" alt="${user.name}" width="48" height="48" loading="lazy" onerror="this.onerror=null;this.src='${defaultAvatar}'" />
          <div class="contrib-name">${user.name}</div>
          <div class="contrib-role" data-i18n="${roleKey}">${rawRole}</div>
        `;

        container.appendChild(card);
      });

      // Re-apply language translation after cards are rendered
      const currentLang = localStorage.getItem("selectedLanguage") || "en";
      setTimeout(() => applyLanguage(currentLang), 50); // delay to ensure DOM is updated
    })
    .catch(err => {
      console.error("Failed to load contributors:", err);
    });
})();
