/**
 * skills/weather/test/interactive.test.ts
 * Interactive PTY tests for the weather skill
 */

import { test, expect } from "bun:test";
import { PTYTestRunner, createTestCase } from "../../../src/testing/pty-test-runner";

// =============================================================================
// Basic functionality tests
// =============================================================================

test("weather skill shows help", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "Help displays usage",
      input: "--help",
      expect: "Usage:",
      timeout: 5000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
  expect(result.summary.failed).toBe(0);
});

test("weather skill shows version", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "Version displays",
      input: "--version",
      expect: /\d+\.\d+\.\d+/,
      timeout: 5000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
});

// =============================================================================
// Current weather tests
// =============================================================================

test("weather current command works", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "Current weather for Tokyo",
      input: "current Tokyo",
      expect: /Temperature:/,
      timeout: 10000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
}, 15000);

test("weather current with units flag", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "Current weather in Fahrenheit",
      input: "current London --units f",
      expect: /°F/,
      timeout: 10000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
}, 15000);

// =============================================================================
// Forecast tests
// =============================================================================

test("weather forecast command works", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "3-day forecast for Paris",
      input: "forecast Paris 3",
      expect: /Forecast for|High:|Low:/,
      timeout: 15000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
}, 20000);

// =============================================================================
// Simple output tests
// =============================================================================

test("weather simple command works", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "Simple one-line output",
      input: "simple Berlin",
      expect: /.+/,
      timeout: 10000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
}, 15000);

// =============================================================================
// JSON output tests
// =============================================================================

test("weather JSON output works", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "JSON output format",
      input: "current NYC --json",
      expect: /"temperature":/,
      timeout: 10000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
}, 15000);

// =============================================================================
// Error handling tests
// =============================================================================

test("weather handles invalid command", async () => {
  const result = await PTYTestRunner.testInteractiveSkill("weather", [
    {
      name: "Invalid command shows help",
      input: "invalidcmd",
      expect: /Usage:|Unknown command/,
      timeout: 5000,
    },
  ]);

  expect(result.summary.passed).toBe(1);
});

// =============================================================================
// Generate expect script for CI
// =============================================================================

test("can generate expect script", async () => {
  const script = PTYTestRunner.generateExpectScript("weather", [
    { send: "--help", expect: "Usage:" },
    { send: "current Tokyo", expect: "Temperature:" },
  ]);

  expect(script).toContain("#!/usr/bin/env expect");
  expect(script).toContain("spawn bun run ./skills/weather/src/index.ts");
  expect(script).toContain("expect eof");
});

// =============================================================================
// Generate bash test script for CI
// =============================================================================

test("can generate bash test script", async () => {
  const script = PTYTestRunner.generateBashTestScript("weather", [
    { send: "--help", expect: "Usage:" },
    { send: "current Tokyo", expect: "Temperature:" },
  ]);

  expect(script).toContain("#!/bin/bash");
  expect(script).toContain("set -e");
  expect(script).toContain("All tests passed!");
});

// =============================================================================
// Test template generation
// =============================================================================

test("can generate test template", () => {
  const template = PTYTestRunner.generateTestTemplate("weather");
  const parsed = JSON.parse(template);

  expect(parsed.weather).toBeDefined();
  expect(Array.isArray(parsed.weather)).toBe(true);
  expect(parsed.weather.length).toBeGreaterThan(0);
});
