import { test, expect } from "bun:test";
const { resolveScriptPath } = require("../Module/webroot/js/utils/scriptExecutor.js");

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
