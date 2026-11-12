import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";

test("select_app_neccesary.sh has valid shebang and does not use return at top level", () => {
  const content = readFileSync("Module/Yuri/select_app_neccesary.sh", "utf-8");
  expect(content.startsWith("#!/system/bin/sh")).toBe(true);
  expect(content).toContain("[SELECT_APP]");
  expect(content.includes("return 1")).toBe(false);
});

test("widevinel1.sh does not grant world-writable permissions", () => {
  const content = readFileSync("Module/webroot/common/widevinel1.sh", "utf-8");
  expect(content.includes("chmod 777")).toBe(false);
  expect(content).toContain("chmod 700");
});

test("duplicate webroot/common/boot_hash.sh is removed", () => {
  expect(existsSync("Module/webroot/common/boot_hash.sh")).toBe(false);
});
