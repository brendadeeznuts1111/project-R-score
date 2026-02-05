#!/usr/bin/env bun test

import { describe, test, expect } from "bun:test";

describe("Core Module Import", () => {
  test("should import core module successfully", async () => {
    const core = await import("../../src/core.ts");
    expect(core).toBeDefined();
    expect(core.COMPONENTS).toBeDefined();
    expect(Array.isArray(core.COMPONENTS)).toBe(true);
  });
});