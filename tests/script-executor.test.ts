import { test, expect } from "bun:test";
const { resolveScriptPath, handleScriptResult } = require("../Module/webroot/js/utils/scriptExecutor.js");

test("resolveScriptPath handles standard Yuri scripts", () => {
  const base = "/data/adb/modules/Yurikey/Yuri/";
  expect(resolveScriptPath("yuri_keybox.sh", base)).toBe("/data/adb/modules/Yurikey/Yuri/yuri_keybox.sh");
});

test("resolveScriptPath handles webroot/ common scripts", () => {
  const base = "/data/adb/modules/Yurikey/Yuri/";
  expect(resolveScriptPath("webroot/common/lsposed2.sh", base)).toBe("/data/adb/modules/Yurikey/webroot/common/lsposed2.sh");
});

test("resolveScriptPath retains absolute paths", () => {
  const base = "/data/adb/modules/Yurikey/Yuri/";
  expect(resolveScriptPath("/system/bin/reboot", base)).toBe("/system/bin/reboot");
});

test("a nonzero action status is reported as an error", () => {
  const toasts: { message: string; type: string }[] = [];
  const globals = globalThis as Record<string, unknown>;
  const previousDocument = globals.document;
  const previousToast = globals.showToast;
  globals.document = { getElementById: () => null };
  globals.showToast = (message: string, type: string) => toasts.push({ message, type });
  try {
    handleScriptResult(
      {
        code: 1,
        stdout:
          "2026-11-15 10:00:00 [SET_TARGET] Error: /data/adb/tricky_store/target.txt was updated, but the TEESimulator apps were not updated.\n",
        stderr: "",
      },
      "target_txt.sh",
    );
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe("error");
    expect(toasts[0].message).toContain("TEESimulator apps were not updated");
  } finally {
    if (previousDocument === undefined) delete globals.document;
    else globals.document = previousDocument;
    if (previousToast === undefined) delete globals.showToast;
    else globals.showToast = previousToast;
  }
});
