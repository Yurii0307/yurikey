import { test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LANG_DIR = "Module/webroot/lang";

test("Base English translation (en.json) exists and parses", () => {
  const enRaw = readFileSync(join(LANG_DIR, "en.json"), "utf-8");
  const en = JSON.parse(enRaw) as Record<string, unknown>;
  expect(typeof en).toBe("object");
  expect(en["home_version"]).toBeDefined();
});

test("All language JSON files are valid and non-empty", () => {
  const files = readdirSync(LANG_DIR).filter(f => f.endsWith(".json"));
  expect(files.length).toBeGreaterThanOrEqual(25);

  for (const file of files) {
    const content = readFileSync(join(LANG_DIR, file), "utf-8");
    let parsed: unknown;
    expect(() => {
      parsed = JSON.parse(content);
    }).not.toThrow();
    expect(typeof parsed).toBe("object");
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed as Record<string, unknown>).length).toBeGreaterThan(0);
  }
});
