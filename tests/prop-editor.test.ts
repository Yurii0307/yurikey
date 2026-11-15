import { test, expect } from "bun:test";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

test("persist_props.sh list emits valid JSON with escaping in a single pass", () => {
  const dir = mkdtempSync(join(tmpdir(), "yurikey-props-"));
  try {
    const getprop = join(dir, "getprop");
    writeFileSync(
      getprop,
      [
        "#!/bin/sh",
        `printf '[persist.sys.fuse]: [true]\\n'`,
        `printf '[persist.weird.quote]: [he said "hi"]\\n'`,
        `printf '[persist.weird.backslash]: [C:\\\\System]\\n'`,
        `printf '[persist.weird.empty]: []\\n'`,
        `printf '[ro.product.model]: [Pixel 9 Pro XL]\\n'`,
        "",
      ].join("\n"),
      { mode: 0o755 }
    );

    const script = join(dir, "persist_props.sh");
    writeFileSync(
      script,
      readFileSync("Module/Yuri/persist_props.sh", "utf-8").replace(
        /^DIFF_FILE=.*$/m,
        `DIFF_FILE="${join(dir, "persist_props.diff")}"`
      )
    );
    writeFileSync(join(dir, "persist_props.diff"), "DISABLED:persist.gone=gone\n");

    const res = spawnSync("sh", [script, "list"], {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });

    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout)).toEqual([
      { name: "persist.sys.fuse", value: "true", disabled: false },
      { name: "persist.weird.quote", value: 'he said "hi"', disabled: false },
      { name: "persist.weird.backslash", value: "C:\\System", disabled: false },
      { name: "persist.weird.empty", value: "", disabled: false },
      { name: "persist.gone", value: "gone", disabled: true },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
