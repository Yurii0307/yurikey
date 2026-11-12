import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";

test("service.sh does not wait for sys.boot_completed=0", () => {
  const content = readFileSync("Module/service.sh", "utf-8");
  expect(content).not.toContain("resetprop -w sys.boot_completed 0");
  expect(content).toContain('sys.boot_completed)" = "1"');
});

test("action.sh has shebang and checks all Yuri scripts", () => {
  const content = readFileSync("Module/action.sh", "utf-8");
  expect(content.startsWith("#!/system/bin/sh")).toBe(true);
  expect(content).toContain('"pif.sh"');
  expect(content).toContain('"$MODPATH/webroot/common/device-info.sh"');
});
