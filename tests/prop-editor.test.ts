import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";

test("clear_all_detection_traces.sh does not wipe /data/property", () => {
  const content = readFileSync("Module/Yuri/clear_all_detection_traces.sh", "utf-8");
  expect(content.includes('remove_path "/data/property"')).toBe(false);
  expect(content.includes("system_properties")).toBe(false);
});

test("persist_props.sh backend script supports list, set, disable, enable, and delete", () => {
  const content = readFileSync("Module/Yuri/persist_props.sh", "utf-8");
  expect(content).toContain("list)");
  expect(content).toContain("set)");
  expect(content).toContain("disable)");
  expect(content).toContain("enable)");
  expect(content).toContain("delete)");
});

test("index.html contains property editor dialog and trigger button", () => {
  const content = readFileSync("Module/webroot/index.html", "utf-8");
  expect(content).toContain("open-persist-props-btn");
  expect(content).toContain('id="prop-dialog"');
  expect(content).toContain("propEditor.js");
});

test("dialog layout uses expressive-dialog and shared dialog-actions pattern", () => {
  const html = readFileSync("Module/webroot/index.html", "utf-8");
  expect(html).toContain('id="prop-dialog" class="round expressive-dialog"');
  expect(html).toContain('id="logs-dialog" class="round expressive-dialog"');
  expect(html).toContain('id="language-dialog" class="round expressive-dialog"');

  const css = readFileSync("Module/webroot/css/style.css", "utf-8");
  expect(css).toContain("dialog.expressive-dialog");
  expect(css).toContain(".prop-item");
  expect(css).toContain(".prop-name");
});

test("mock-ksu simulates realistic persistent properties and CLI actions", () => {
  const mockKsu = readFileSync("dev/mock-ksu.js", "utf-8");
  expect(mockKsu).toContain("persist_props.sh");
  expect(mockKsu).toContain("persist.sys.fuse");
  expect(mockKsu).toContain("persist.bluetooth.opus.enabled");
  expect(mockKsu).toContain("JSON.stringify(mockProperties)");
});

