import { test, expect } from "bun:test";
const { renderChangelogMarkdown } = require("../Module/webroot/js/utils/markdown.js");

test("renders headings, lists, emphasis, code and links", () => {
  const html = renderChangelogMarkdown(
    "### v1.2.3\n\n- **bold** and *italic*\n- use `cmd`\n\n[All changes](https://example.com/x)"
  );
  expect(html).toContain('<p class="changelog-heading">v1.2.3</p>');
  expect(html).toContain("<ul class=\"changelog-list\">");
  expect(html).toContain("<li><strong>bold</strong> and <em>italic</em></li>");
  expect(html).toContain("<li>use <code>cmd</code></li>");
  expect(html).toContain('<a href="https://example.com/x" target="_blank" rel="noopener noreferrer">All changes</a>');
});

test("supports legacy arrow bullets", () => {
  const html = renderChangelogMarkdown("-> one\n→ two");
  expect(html).toContain("<li>one</li>");
  expect(html).toContain("<li>two</li>");
});

test("escapes raw HTML and rejects non-http links", () => {
  const html = renderChangelogMarkdown('<img src=x onerror=alert(1)> [bad](javascript:alert(1))');
  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;img");
  expect(html).not.toContain('href="javascript:');
});

test("joins paragraph lines and returns empty output for blank input", () => {
  expect(renderChangelogMarkdown("first line\nsecond line")).toBe("<p>first line second line</p>");
  expect(renderChangelogMarkdown("")).toBe("");
});
