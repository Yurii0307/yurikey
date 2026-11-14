import { test, expect } from "bun:test";
const { Bridge } = require("../Module/webroot/js/utils/bridge.js");

test("Bridge exports required API methods", () => {
  expect(typeof Bridge.isAvailable).toBe("function");
  expect(typeof Bridge.exec).toBe("function");
  expect(typeof Bridge.openUrl).toBe("function");
});

test("Bridge.openUrl rejects non-http protocols", () => {
  expect(() => Bridge.openUrl("javascript:alert(1)")).not.toThrow();
  expect(() => Bridge.openUrl("file:///data/local/tmp")).not.toThrow();
});

test("Bridge.exec keeps a slow result when the transport is synchronous (KernelSU)", async () => {
  const g = globalThis as any;
  const previous = g.ksu;
  g.ksu = {
    exec(_command: string, _options: string, callbackId: string) {
      const end = Date.now() + 80;
      while (Date.now() < end) {}
      setTimeout(() => g[callbackId] && g[callbackId](0, "done", ""), 0);
    },
  };
  try {
    await expect(Bridge.exec("slow", { timeout: 20 })).resolves.toEqual({
      code: 0,
      stdout: "done",
      stderr: "",
    });
  } finally {
    if (previous === undefined) delete g.ksu;
    else g.ksu = previous;
  }
});

test("Bridge.exec still rejects when the callback never arrives", async () => {
  const g = globalThis as any;
  const previous = g.ksu;
  g.ksu = { exec() {} };
  try {
    await expect(Bridge.exec("hang", { timeout: 25 })).rejects.toThrow(/timed out/);
  } finally {
    if (previous === undefined) delete g.ksu;
    else g.ksu = previous;
  }
});
