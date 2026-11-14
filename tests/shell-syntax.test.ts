import { test, expect } from "bun:test";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function findShFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findShFiles(fullPath));
    } else if (file.endsWith(".sh")) {
      results.push(fullPath);
    }
  }
  return results;
}

test("All shell scripts pass syntax validation (sh -n)", () => {
  const shFiles = findShFiles("Module");
  expect(shFiles.length).toBeGreaterThan(5);

  const errors: string[] = [];
  for (const file of shFiles) {
    const res = spawnSync("sh", ["-n", file], { encoding: "utf-8" });
    if (res.status !== 0) {
      errors.push(`${file}: ${res.stderr}`);
    }
  }
  expect(errors).toEqual([]);
});
