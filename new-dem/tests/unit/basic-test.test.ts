#!/usr/bin/env bun test

import { describe, test, expect } from "bun:test";

describe("Basic Functionality", () => {
  test("should pass basic assertions", () => {
    expect(1 + 1).toBe(2);
    expect("hello").toContain("ell");
    expect([1, 2, 3]).toHaveLength(3);
  });
});