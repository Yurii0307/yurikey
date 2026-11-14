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
