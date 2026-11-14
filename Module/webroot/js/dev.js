// === HTML Escaping Helper ===
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function getRoleTranslation(role, translations = window.translations || {}) {
  if (!role) return "";
  const directKey = `role_${role}`;
  if (translations && translations[directKey]) return translations[directKey];

  if (role.includes("/")) {
    const parts = role.split("/").map(p => p.trim());
    const translatedParts = parts.map(part => {
      const candidates = [
        `role_${part}`,
        `role_${part} Developer`,
        `role_${part.replace(/ Developer$/, "")}`,
      ];
      for (const k of candidates) {
        if (translations && translations[k]) {
          return translations[k];
        }
      }
      return part;
    });
    return translatedParts.join(" / ");
  }
  return role;
}

function updateRoleTranslations() {
  document.querySelectorAll(".contrib-role[data-role]").forEach(el => {
    const rawRole = el.getAttribute("data-role");
    el.textContent = getRoleTranslation(rawRole, window.translations);
  });
}


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

      const telegramIcon = `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`;
      const githubIcon = `<svg role="img" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;

      // Render each contributor
      data.contributors.forEach(user => {
        const githubUsername = (user.github || user.username || "").replace(/^https?:\/\/github\.com\//, "").replace(/^@/, "");
        const telegramUsername = (user.telegram || user.username || "").replace(/^@/, "");
        const avatarUser = githubUsername || user.name || "unknown";
        const avatar = `https://github.com/${encodeURIComponent(avatarUser)}.png`;
        const rawRole = user.role || "Unknown Role";
        const roleKey = `role_${rawRole}`; // Use this for translation lookup
        const safeName = escapeHtml(user.name || "");
        const safeRole = escapeHtml(rawRole);
        const safeRoleKey = escapeHtml(roleKey);
        const safeGithubUsername = escapeHtml(githubUsername);
        const safeTelegramUsername = escapeHtml(telegramUsername);

        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239e9e9e'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        const ghUrl = githubUsername ? `https://github.com/${encodeURIComponent(githubUsername)}` : "";
        const tgUrl = telegramUsername ? `https://t.me/${encodeURIComponent(telegramUsername)}` : "";

        // If contributor has no Telegram, link directly to GitHub without an overlay
        if (!telegramUsername && ghUrl) {
          const card = document.createElement("a");
          card.className = "contrib-card";
          card.href = ghUrl;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
          card.setAttribute("aria-label", `${user.name} - GitHub: ${githubUsername}`);

          card.innerHTML = `
            <img src="${avatar}" alt="${safeName}" width="48" height="48" loading="lazy" onerror="this.onerror=null;this.src='${defaultAvatar}'" />
            <div class="contrib-name">${safeName}</div>
            <div class="contrib-role" data-i18n="${safeRoleKey}" data-role="${escapeHtml(rawRole)}">${safeRole}</div>
          `;

          card.addEventListener("click", (e) => {
            document.querySelectorAll(".contrib-card.active").forEach(c => {
              c.classList.remove("active");
              c.setAttribute("aria-expanded", "false");
              const ov = c.querySelector(".contrib-overlay");
              if (ov) ov.setAttribute("aria-hidden", "true");
            });

            if (typeof ksu === "object" && typeof ksu.exec === "function") {
              e.preventDefault();
              if (typeof openUrlViaIntent === "function") {
                openUrlViaIntent(ghUrl);
              }
            }
          });

          container.appendChild(card);
          return;
        }

        // Contributor with multiple platforms: overlay buttons
        const card = document.createElement("div");
        card.className = "contrib-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-haspopup", "true");
        card.setAttribute("aria-expanded", "false");
        card.setAttribute("aria-label", user.name || "Contributor");

        let buttonsHtml = "";
        if (tgUrl) {
          buttonsHtml += `
            <a href="${tgUrl}" target="_blank" rel="noopener noreferrer" class="button responsive round small wave contrib-btn" data-url="${tgUrl}" aria-label="Telegram: ${safeTelegramUsername}">
              ${telegramIcon}
              <span>Telegram</span>
            </a>
          `;
        }
        if (ghUrl) {
          buttonsHtml += `
            <a href="${ghUrl}" target="_blank" rel="noopener noreferrer" class="button responsive round small wave contrib-btn" data-url="${ghUrl}" aria-label="GitHub: ${safeGithubUsername}">
              ${githubIcon}
              <span>GitHub</span>
            </a>
          `;
        }

        card.innerHTML = `
          <img src="${avatar}" alt="${safeName}" width="48" height="48" loading="lazy" onerror="this.onerror=null;this.src='${defaultAvatar}'" />
          <div class="contrib-name">${safeName}</div>
          <div class="contrib-role" data-i18n="${safeRoleKey}" data-role="${escapeHtml(rawRole)}">${safeRole}</div>
          <div class="contrib-overlay" aria-hidden="true">
            ${buttonsHtml}
          </div>
        `;

        card.addEventListener("click", (e) => {
          const btn = e.target.closest(".contrib-btn");
          if (btn) {
            e.stopPropagation();
            const url = btn.dataset.url || btn.href;
            if (typeof ksu === "object" && typeof ksu.exec === "function") {
              e.preventDefault();
              if (url && typeof openUrlViaIntent === "function") {
                openUrlViaIntent(url);
              }
            } else if (typeof openUrlViaIntent === "function" && (!btn.href || btn.tagName !== "A")) {
              openUrlViaIntent(url);
            }
            card.classList.remove("active");
            card.setAttribute("aria-expanded", "false");
            const overlay = card.querySelector(".contrib-overlay");
            if (overlay) overlay.setAttribute("aria-hidden", "true");
            return;
          }

          const isActive = card.classList.contains("active");
          document.querySelectorAll(".contrib-card.active").forEach(c => {
            if (c !== card) {
              c.classList.remove("active");
              c.setAttribute("aria-expanded", "false");
              const ov = c.querySelector(".contrib-overlay");
              if (ov) ov.setAttribute("aria-hidden", "true");
            }
          });

          if (isActive) {
            card.classList.remove("active");
            card.setAttribute("aria-expanded", "false");
            const overlay = card.querySelector(".contrib-overlay");
            if (overlay) overlay.setAttribute("aria-hidden", "true");
          } else {
            card.classList.add("active");
            card.setAttribute("aria-expanded", "true");
            const overlay = card.querySelector(".contrib-overlay");
            if (overlay) overlay.setAttribute("aria-hidden", "false");
          }
        });

        card.addEventListener("keydown", (e) => {
          if (e.target === card && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            card.click();
          } else if (e.key === "Escape" && card.classList.contains("active")) {
            e.preventDefault();
            card.classList.remove("active");
            card.setAttribute("aria-expanded", "false");
            const overlay = card.querySelector(".contrib-overlay");
            if (overlay) overlay.setAttribute("aria-hidden", "true");
            card.focus();
          }
        });

        container.appendChild(card);
      });
      // Close active cards when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".contrib-card")) {
          document.querySelectorAll(".contrib-card.active").forEach(c => {
            c.classList.remove("active");
            c.setAttribute("aria-expanded", "false");
            const ov = c.querySelector(".contrib-overlay");
            if (ov) ov.setAttribute("aria-hidden", "true");
          });
        }
      });

      // Re-apply language translation after cards are rendered
      const currentLang = localStorage.getItem("selectedLanguage") || "en";
      setTimeout(async () => {
        if (typeof applyLanguage === "function") {
          await applyLanguage(currentLang);
        }
        updateRoleTranslations();
      }, 50);

      // Hook applyLanguage so future language changes also update composite roles
      if (typeof window.applyLanguage === "function" && !window.applyLanguage._compositeHooked) {
        const origApplyLanguage = window.applyLanguage;
        window.applyLanguage = async function(langCode) {
          const res = await origApplyLanguage(langCode);
          updateRoleTranslations();
          return res;
        };
        window.applyLanguage._compositeHooked = true;
      }
    })
    .catch(err => {
      console.error("Failed to load contributors:", err);
    });
})();
