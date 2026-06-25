import { test, expect } from "bun:test";
import { NetworkAllowList } from "../../config/network-allowlist";
import { AllowListViolationError } from "../../config/errors";

test("allow-list blocks untrusted domains", () => {
  const allowList = new NetworkAllowList("prod");

  expect(() => allowList.validate("https://evil.com")).toThrow(AllowListViolationError);
  expect(() => allowList.validate("https://api.duoplus.com")).not.toThrow();
});

test("port ranges work for local dev", () => {
  const devList = new NetworkAllowList("dev");

  expect(devList.validate("http://localhost:3000")).toBe(true);
  expect(devList.validate("http://localhost:9000")).toBe(true);
  expect(() => devList.validate("http://localhost:2999")).toThrow(AllowListViolationError);
});
