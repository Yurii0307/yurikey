import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";

test("yuri_keybox.sh performs atomic update with non-empty check", () => {
  const content = readFileSync("Module/Yuri/yuri_keybox.sh", "utf-8");
  expect(content).toContain("-s");
  expect(content).toContain("<AndroidAttestation");
  expect(content.includes('mv "$TARGET_FILE" "$BACKUP_FILE"\nfi\n\ndownload')).toBe(false);
});

test("customize.sh validates decoded keybox before replacing target", () => {
  const content = readFileSync("Module/customize.sh", "utf-8");
  expect(content).toContain("-s");
  expect(content).toContain("<AndroidAttestation");
});
