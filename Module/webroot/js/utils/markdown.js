// Minimal Markdown renderer for the bundled changelog.
// Supports headings, unordered lists, bold, italic, inline code and http(s) links.
// All input is HTML-escaped before any markup is generated.
(function(global) {
  const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
  }

  function renderInline(escaped) {
    const codeSpans = [];
    let text = escaped.replace(/`([^`]+)`/g, (_match, code) => {
      codeSpans.push(code);
      return `\u0000${codeSpans.length - 1}\u0000`;
    });

    text = text
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    return text.replace(/\u0000(\d+)\u0000/g, (_match, index) => `<code>${codeSpans[Number(index)]}</code>`);
  }

  function renderChangelogMarkdown(markdown) {
    const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let inList = false;

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }

    function closeList() {
      if (!inList) return;
      html.push("</ul>");
      inList = false;
    }

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      const heading = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
      if (heading) {
        flushParagraph();
        closeList();
        html.push(`<p class="changelog-heading">${renderInline(escapeHtml(heading[1].trim()))}</p>`);
        continue;
      }

      if (/^\s{0,3}(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
        flushParagraph();
        closeList();
        html.push("<hr>");
        continue;
      }

      const bullet = line.match(/^\s*(?:[-*+]|->|→)\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        if (!inList) {
          html.push('<ul class="changelog-list">');
          inList = true;
        }
        html.push(`<li>${renderInline(escapeHtml(bullet[1].trim()))}</li>`);
        continue;
      }

      closeList();
      paragraph.push(escapeHtml(line.trim()));
    }

    flushParagraph();
    closeList();
    return html.join("");
  }

  global.renderChangelogMarkdown = renderChangelogMarkdown;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { renderChangelogMarkdown };
  }
})(typeof window !== "undefined" ? window : globalThis);
