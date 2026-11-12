// Persistent Properties Interactive Editor Component
(function() {
  let allProps = [];
  function openPropDialog() {
    const dialog = document.getElementById("prop-dialog");
    const overlay = document.getElementById("prop-dialog-overlay");
    if (!dialog) return;

    document.body.classList.add("prop-dialog-open");
    dialog.classList.add("active");
    overlay?.classList.add("active");
    if (!dialog.open && typeof dialog.show === "function") {
      try { dialog.show(); } catch {}
    }
    loadProperties();
  }

  function closePropDialog() {
    const dialog = document.getElementById("prop-dialog");
    const overlay = document.getElementById("prop-dialog-overlay");
    if (!dialog) return;

    document.body.classList.remove("prop-dialog-open");
    dialog.classList.remove("active");
    overlay?.classList.remove("active");
    if (dialog.open && typeof dialog.close === "function") {
      try { dialog.close(); } catch {}
    }
  }

  async function loadProperties() {
    const container = document.getElementById("prop-list-container");
    if (!container) return;
    container.innerHTML = `
      <div class="prop-loading">
        <i class="loading-icon">sync</i>
        <span>Loading properties...</span>
      </div>
    `;

    try {
      if (typeof window.Bridge?.exec === "function") {
        const res = await window.Bridge.exec("sh /data/adb/modules/Yurikey/Yuri/persist_props.sh list");
        allProps = JSON.parse(res?.stdout || "[]");
      } else {
        allProps = [];
      }
      renderPropsList(document.getElementById("prop-search")?.value?.trim() || "");
    } catch (err) {
      container.innerHTML = `<div class="prop-error"><i class="empty-icon">error</i><span>Failed to load properties: ${escapeHtml(err.message)}</span></div>`;
    }
  }

  function renderPropsList(filterQuery = "") {
    const container = document.getElementById("prop-list-container");
    if (!container) return;

    const q = filterQuery.toLowerCase();
    const filtered = allProps.filter(p => p.name.toLowerCase().includes(q) || (p.value || "").toLowerCase().includes(q));

    if (!filtered.length) {
      const emptyText = window.i18n?.t?.("persist_props_empty") || "No matching persistent properties found.";
      container.innerHTML = `
        <div class="prop-empty">
          <i class="empty-icon">search_off</i>
          <span>${escapeHtml(emptyText)}</span>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(p => `
      <div class="prop-item ${p.disabled ? 'prop-disabled' : ''}">
        <div class="prop-info">
          <div class="prop-name">${escapeHtml(p.name)}</div>
          <div class="prop-value">${escapeHtml(p.value !== '' && p.value !== undefined ? p.value : '(empty)')}</div>
        </div>
        <div class="prop-actions">
          <label class="switch" title="${p.disabled ? 'Enable property' : 'Disable property'}">
            <input type="checkbox" data-prop="${escapeHtml(p.name)}" ${p.disabled ? '' : 'checked'} class="prop-toggle" />
            <span></span>
          </label>
          <button type="button" class="circle transparent wave prop-edit-btn" data-prop="${escapeHtml(p.name)}" data-val="${escapeHtml(p.value || '')}" title="Edit Value" aria-label="Edit Value">
            <i>edit</i>
          </button>
          <button type="button" class="circle transparent wave prop-delete-btn" data-prop="${escapeHtml(p.name)}" title="Delete" aria-label="Delete">
            <i>delete</i>
          </button>
        </div>
      </div>
    `).join("");

    bindItemEvents();
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function shQuote(value) {
    return `'${String(value).replace(/'/g, "'\\''")}'`;
  }

  function runPropAction(action, ...args) {
    const argv = args.map(shQuote).join(" ");
    const suffix = argv ? ` ${argv}` : "";
    return window.Bridge.exec(
      `sh /data/adb/modules/Yurikey/Yuri/persist_props.sh ${action}${suffix}`
    );
  }

  function bindItemEvents() {
    document.querySelectorAll(".prop-toggle").forEach(toggle => {
      toggle.addEventListener("change", async (e) => {
        const prop = e.target.dataset.prop;
        const enable = e.target.checked;
        const action = enable ? "enable" : "disable";
        if (window.Bridge) {
          await runPropAction(action, prop);
        } else {
          const item = allProps.find(p => p.name === prop);
          if (item) item.disabled = !enable;
        }
        loadProperties();
      });
    });

    document.querySelectorAll(".prop-delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const prop = e.currentTarget.dataset.prop;
        const confirmMsg = (window.i18n?.t?.("persist_props_confirm_delete", { name: prop })) || `Delete property ${prop}?`;
        if (!confirm(confirmMsg)) return;
        if (window.Bridge) {
          await runPropAction("delete", prop);
        } else {
          allProps = allProps.filter(p => p.name !== prop);
        }
        loadProperties();
      });
    });

    document.querySelectorAll(".prop-edit-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const prop = e.currentTarget.dataset.prop;
        const currentVal = e.currentTarget.dataset.val || "";
        const newVal = prompt(`Edit value for ${prop}:`, currentVal);
        if (newVal === null) return;
        if (window.Bridge) {
          await runPropAction("set", prop, newVal);
        } else {
          const item = allProps.find(p => p.name === prop);
          if (item) {
            item.value = newVal;
            item.disabled = false;
          }
        }
        loadProperties();
      });
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("open-persist-props-btn")?.addEventListener("click", openPropDialog);
      document.getElementById("prop-dialog-close")?.addEventListener("click", closePropDialog);
      document.getElementById("prop-dialog-overlay")?.addEventListener("click", closePropDialog);
      document.getElementById("prop-search")?.addEventListener("input", (e) => {
        renderPropsList(e.target.value.trim());
      });

      document.getElementById("prop-add-btn")?.addEventListener("click", async () => {
        const propName = prompt("Enter persistent property name (e.g. persist.foo.bar):");
        if (!propName || !propName.trim()) return;
        const cleanName = propName.trim();
        const propVal = prompt(`Enter value for ${cleanName}:`, "");
        if (propVal === null) return;
        if (window.Bridge) {
          await runPropAction("set", cleanName, propVal);
        } else {
          const existing = allProps.find(p => p.name === cleanName);
          if (existing) {
            existing.value = propVal;
            existing.disabled = false;
          } else {
            allProps.unshift({ name: cleanName, value: propVal, disabled: false });
          }
        }
        loadProperties();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const dialog = document.getElementById("prop-dialog");
          if (dialog?.classList.contains("active") || dialog?.open) {
            closePropDialog();
          }
        }
      });

      document.addEventListener("click", (e) => {
        const dialog = document.getElementById("prop-dialog");
        const openBtn = document.getElementById("open-persist-props-btn");
        if (!dialog || !dialog.classList.contains("active")) return;
        if (dialog.contains(e.target) || openBtn?.contains(e.target)) return;
        closePropDialog();
      });
    });
  }
})();
