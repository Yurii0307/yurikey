import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const MOCK_SCRIPTS = [
  "dev/mock-ksu/properties.js",
  "dev/mock-ksu/teesim.js",
  "dev/mock-ksu/commands.js",
  "dev/mock-ksu/index.js",
];

type MockProperty = { name: string; value: string; disabled: boolean };

type MockTeesimProfile = {
  keybox: string;
  patchLevel: Record<string, string>;
  apps: string[];
  autoIncludeNewApps: boolean;
};

type MockWindow = Record<string, unknown> & {
  ksu?: { exec: (command: string, env: unknown, callbackId: string) => void };
  mockPersistentProperties?: MockProperty[];
  mockTeesimConfig?: { profiles: Record<string, MockTeesimProfile> };
};

type MockTimer = { run: () => void; delay: number };

type MockRuntime = {
  window: MockWindow;
  logs: string[];
  timers: MockTimer[];
  runTimers: () => void;
};

function loadMock(scripts: string[] = MOCK_SCRIPTS, preloaded: MockWindow = {}): MockRuntime {
  const window: MockWindow = { ...preloaded };
  const logs: string[] = [];
  const timers: MockTimer[] = [];

  const context = vm.createContext({
    window,
    console: {
      log: (...args: unknown[]) => logs.push(args.join(" ")),
      info: (...args: unknown[]) => logs.push(args.join(" ")),
      warn: () => {},
      error: () => {},
    },
    setTimeout: (fn: () => void, delay: number) => {
      timers.push({ run: fn, delay });
      return timers.length;
    },
    clearTimeout: () => {},
  });

  for (const script of scripts) {
    new vm.Script(readFileSync(script, "utf-8"), { filename: script }).runInContext(context);
  }

  return {
    window,
    logs,
    timers,
    runTimers: () => {
      for (const timer of timers.splice(0)) timer.run();
    },
  };
}

function ksuBridge(runtime: MockRuntime) {
  const bridge = runtime.window.ksu;
  if (!bridge) throw new Error("window.ksu is missing");
  return bridge;
}

let callbackSeq = 0;

function execMock(runtime: MockRuntime, command: string, callback: (...args: unknown[]) => void) {
  const callbackId = `__mockCallback${++callbackSeq}`;
  runtime.window[callbackId] = callback;
  ksuBridge(runtime).exec(command, {}, callbackId);
  return callbackId;
}

function execStdout(runtime: MockRuntime, command: string): string {
  let stdout = "";
  execMock(runtime, command, (out: unknown) => {
    stdout = String(out);
  });
  runtime.runTimers();
  return stdout;
}

function execResult(runtime: MockRuntime, command: string) {
  let result = { code: -1, stdout: "", stderr: "" };
  execMock(runtime, command, function (code: unknown, stdout: unknown, stderr: unknown) {
    result = { code: Number(code), stdout: String(stdout), stderr: String(stderr) };
  });
  runtime.runTimers();
  return result;
}

function parseProperties(json: string): MockProperty[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error(`Expected a property array, got: ${json}`);
  return parsed.map(entry => {
    if (typeof entry !== "object" || entry === null) throw new Error(`Bad property entry: ${JSON.stringify(entry)}`);
    const { name, value, disabled } = entry as Record<string, unknown>;
    if (typeof name !== "string" || typeof value !== "string" || typeof disabled !== "boolean") {
      throw new Error(`Bad property entry: ${JSON.stringify(entry)}`);
    }
    return { name, value, disabled };
  });
}

describe("mock KernelSU bridge", () => {
  test("schedules the callback after 120ms and supports the single-argument form", () => {
    const runtime = loadMock();
    const calls: unknown[][] = [];
    execMock(runtime, "getprop persist.sys.fuse", (...args) => calls.push(args));

    expect(calls).toEqual([]);
    expect(runtime.timers).toHaveLength(1);
    expect(runtime.timers[0].delay).toBe(120);

    runtime.runTimers();
    expect(calls).toEqual([["[Mock] Successfully completed: getprop persist.sys.fuse"]]);
    expect(runtime.window.__yurikeyDevMock).toBeUndefined();
  });

  test("supports the three-argument callback form", () => {
    const runtime = loadMock();
    const calls: unknown[][] = [];
    execMock(
      runtime,
      "sh /data/adb/modules/Yurikey/Yuri/teesim_common.sh list-profiles",
      function (code: unknown, stdout: unknown, stderr: unknown) {
        calls.push([code, stdout, stderr]);
      }
    );

    runtime.runTimers();
    expect(calls).toEqual([[0, '["default","banking"]', ""]]);
  });

  test("leaves an existing native ksu bridge untouched", () => {
    const native = { exec: () => "native" };
    const runtime = loadMock(MOCK_SCRIPTS, { ksu: native });

    expect(runtime.window.ksu).toBe(native);
    expect(runtime.logs.some(line => line.includes("Native ksu object already present."))).toBe(true);
    expect(runtime.window.mockPersistentProperties).toBeUndefined();
    expect(runtime.window.mockTeesimConfig).toBeUndefined();
  });

  test("falls back for unrecognized commands", () => {
    const runtime = loadMock();
    expect(execStdout(runtime, "sh /data/adb/modules/Yurikey/Yuri/unknown.sh --flag")).toBe(
      "[Mock] Successfully completed: sh /data/adb/modules/Yurikey/Yuri/unknown.sh --flag"
    );
    expect(execStdout(runtime, "sh /data/adb/modules/Yurikey/module.prop")).toBe("v2.5 (Dev)");
    expect(execStdout(runtime, "sh /data/adb/modules/Yurikey/webroot/common/device-info.sh")).toBe(
      "Mock: device-info.sh executed successfully"
    );
  });

  test("lists the initial properties and keeps the fixture's disabled handling", () => {
    const runtime = loadMock();
    const list = parseProperties(execStdout(runtime, "sh /data/adb/modules/Yurikey/Yuri/persist_props.sh list"));

    expect(list[0]).toEqual({ name: "persist.sys.fuse", value: "true", disabled: false });
    expect(list.find(p => p.name === "persist.bluetooth.opus.enabled")).toEqual({
      name: "persist.bluetooth.opus.enabled",
      value: "true",
      disabled: false,
    });
    expect(list.find(p => p.name === "persist.vendor.qfp")).toEqual({
      name: "persist.vendor.qfp",
      value: "",
      disabled: false,
    });
    // The fixture marks this property disabled, but the mock lists every live entry as enabled.
    expect(list.find(p => p.name === "persist.hyperceiler.log.level")).toEqual({
      name: "persist.hyperceiler.log.level",
      value: "debug",
      disabled: false,
    });
    expect(runtime.window.mockPersistentProperties).toEqual(list);
  });

  test("sets, disables, enables and deletes properties in sequence", () => {
    const runtime = loadMock();
    const script = "sh /data/adb/modules/Yurikey/Yuri/persist_props.sh";

    expect(execStdout(runtime, `${script} set persist.mock.quoted "hello world"`)).toBe('{"success": true}');
    let list = parseProperties(execStdout(runtime, `${script} list`));
    expect(list[0]).toEqual({ name: "persist.mock.quoted", value: "hello world", disabled: false });
    expect(runtime.window.mockPersistentProperties).toEqual(list);

    expect(execStdout(runtime, `${script} disable persist.mock.quoted`)).toBe('{"success": true}');
    list = parseProperties(execStdout(runtime, `${script} list`));
    expect(list[0].name).not.toBe("persist.mock.quoted");
    expect(list[list.length - 1]).toEqual({ name: "persist.mock.quoted", value: "hello world", disabled: true });

    expect(execStdout(runtime, `${script} enable persist.mock.quoted`)).toBe('{"success": true}');
    list = parseProperties(execStdout(runtime, `${script} list`));
    expect(list[0]).toEqual({ name: "persist.mock.quoted", value: "hello world", disabled: false });

    expect(execStdout(runtime, `${script} delete persist.mock.quoted`)).toBe('{"success": true}');
    list = parseProperties(execStdout(runtime, `${script} list`));
    expect(list.some(p => p.name === "persist.mock.quoted")).toBe(false);
    expect(runtime.window.mockPersistentProperties).toEqual(list);
  });

  test("preserves an empty property value on set", () => {
    const runtime = loadMock();
    const script = "sh /data/adb/modules/Yurikey/Yuri/persist_props.sh";

    expect(execStdout(runtime, `${script} set persist.vendor.qfp`)).toBe('{"success": true}');
    const list = parseProperties(execStdout(runtime, `${script} list`));
    expect(list.find(p => p.name === "persist.vendor.qfp")).toEqual({
      name: "persist.vendor.qfp",
      value: "",
      disabled: false,
    });
  });

  test("lists and selects TEESimulator profiles", () => {
    const runtime = loadMock();
    const script = "sh /data/adb/modules/Yurikey/Yuri/teesim_common.sh";

    expect(JSON.parse(execStdout(runtime, `${script} list-profiles`))).toEqual(["default", "banking"]);
    expect(execStdout(runtime, `${script} select banking`)).toBe("default\n");
    expect(execStdout(runtime, `${script} unknown`)).toBe("");
    expect(runtime.window.mockTeesimConfig?.profiles.default.apps).toEqual([
      "com.google.android.gms",
      "com.android.vending",
    ]);
  });

  test("updates TEESimulator app targets and reports unknown profiles", () => {
    const runtime = loadMock();

    expect(execResult(runtime, "sh /data/adb/modules/Yurikey/Yuri/target_txt.sh --teesim-profile banking")).toEqual({
      code: 0,
      stdout: '[Mock] TEESimulator profile "banking" apps set to 6 packages\n',
      stderr: "",
    });
    expect(runtime.window.mockTeesimConfig?.profiles.banking.apps).toEqual([
      "android",
      "com.android.vending",
      "com.google.android.gms",
      "com.google.android.gsf",
      "com.example.chat",
      "com.example.browser",
    ]);

    expect(execResult(runtime, "sh /data/adb/modules/Yurikey/Yuri/security_patch.sh --teesim-profile ghost")).toEqual({
      code: 1,
      stdout: "",
      stderr: 'Error: TEESimulator profile "ghost" not found\n',
    });
  });
});
