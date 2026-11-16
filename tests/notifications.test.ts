import { test, expect } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const {
  NOTIFICATION_MODE_KEY,
  buildAndroidNotificationCommand,
  getNotificationMode,
  sendAndroidNotification,
} = require("../Module/webroot/js/utils/notifications.js");

// Test doubles replace browser globals; restore the previous owner state afterwards.
function stubGlobal(key: string, value: unknown): () => void {
  const target = globalThis as unknown as Record<string, unknown>;
  const hadOwn = Object.prototype.hasOwnProperty.call(globalThis, key);
  const previous = target[key];
  Reflect.set(globalThis, key, value);
  return () => {
    if (hadOwn) Reflect.set(globalThis, key, previous);
    else Reflect.deleteProperty(globalThis, key);
  };
}

test("notification mode defaults to toast and ignores unknown values", () => {
  const store = new Map<string, string>();
  const restore = stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });

  try {
    expect(getNotificationMode()).toBe("toast");
    store.set(NOTIFICATION_MODE_KEY, "android");
    expect(getNotificationMode()).toBe("android");
    store.set(NOTIFICATION_MODE_KEY, "bogus");
    expect(getNotificationMode()).toBe("toast");
  } finally {
    restore();
  }
});

test("Android notification command survives shell quoting", () => {
  const dir = mkdtempSync(join(tmpdir(), "yurikey-notify-"));
  try {
    writeFileSync(join(dir, "su"), '#!/bin/sh\nexec sh -c "$4"\n');
    writeFileSync(join(dir, "cmd"), '#!/bin/sh\nprintf \'%s\\n\' "$@"\n');
    chmodSync(join(dir, "su"), 0o755);
    chmodSync(join(dir, "cmd"), 0o755);

    const command = buildAndroidNotificationCommand("It's done, line \"two\"", "Yurikey's");
    const output = execFileSync("sh", ["-c", command], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${dir}:${process.env.PATH ?? ""}` },
    });

    expect(output.trimEnd().split("\n")).toEqual([
      "notification",
      "post",
      "-t",
      "Yurikey's",
      "yurikey",
      "It's done, line \"two\"",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Android notifications are delivered sequentially", async () => {
  const gate = Promise.withResolvers<void>();
  let inFlight = 0;
  let maxInFlight = 0;

  const restore = stubGlobal("Bridge", {
    isAvailable: () => true,
    exec: async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await gate.promise;
      inFlight -= 1;
      return { code: 0, stdout: "", stderr: "" };
    },
  });

  try {
    const first = sendAndroidNotification("first");
    await Promise.resolve();
    const second = sendAndroidNotification("second");
    expect(maxInFlight).toBe(1);

    gate.resolve();
    await Promise.all([first, second]);
    expect(maxInFlight).toBe(1);
  } finally {
    restore();
  }
});
