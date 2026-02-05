// Feed Project - Tests
import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  transform,
  getFieldMapping,
  generateCssVariables,
  validateConfig,
} from "../src/field-mapping";
import {
  substituteEnvVars,
  substituteInObject,
  extractEnvVars,
  validateEnvVars,
} from "../src/env-substitutor";
import { createServer, registerDashboard } from "../src/server";
import type { DashboardConfig, EnhancedDashboardConfig } from "../src/types";
import { FIELD_MAPPINGS, HSL_COLORS } from "../src/types";

// Test fixture
const testConfig: DashboardConfig = {
  id: "test-dashboard",
  path: "$env:DASH_ROOT/dashboard",
  template: "$env:DASH_ROOT/templates/main.html",
  status: "active",
  category: "core",
  version: "1.0.0",
  name: "Test Dashboard",
  description: "A test dashboard",
  tags: ["test", "demo"],
};

describe("field-mapping", () => {
  beforeEach(() => {
    // Set test env var
    process.env.DASH_ROOT = "/app";
  });

  test("transforms DashboardConfig to EnhancedDashboardConfig", () => {
    const result = transform(testConfig);

    expect(result.id).toBe("test-dashboard");
    expect(result._fieldMappings).toBeDefined();
    expect(typeof result._fieldMappings).toBe("object");
  });

  test("applies correct HSL color to each field", () => {
    const result = transform(testConfig);

    expect(result._fieldMappings.id.color).toBe(HSL_COLORS.CORE_BLUE);
    expect(result._fieldMappings.path.color).toBe(HSL_COLORS.COMMAND_CH1);
    expect(result._fieldMappings.status.color).toBe(HSL_COLORS.EVENT_CH3);
    expect(result._fieldMappings.version.color).toBe(HSL_COLORS.VERSION_TEAL);
  });

  test("applies correct meta tag to each field", () => {
    const result = transform(testConfig);

    expect(result._fieldMappings.id.metaTag).toBe("DOMAIN");
    expect(result._fieldMappings.path.metaTag).toBe("DYNAMIC");
    expect(result._fieldMappings.template.metaTag).toBe("RELATIVE");
    expect(result._fieldMappings.status.metaTag).toBe("ACTIVE");
  });

  test("attaches _fieldMappings metadata", () => {
    const result = transform(testConfig);

    expect(Object.keys(result._fieldMappings)).toHaveLength(9);
    for (const mapping of FIELD_MAPPINGS) {
      expect(result._fieldMappings[mapping.field]).toBeDefined();
    }
  });

  test("validates required fields", () => {
    const validResult = validateConfig(testConfig);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    const invalidConfig = { ...testConfig, id: "", name: "" };
    const invalidResult = validateConfig(invalidConfig);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
  });

  test("getFieldMapping returns correct mapping", () => {
    const idMapping = getFieldMapping("id");
    expect(idMapping?.metaTag).toBe("DOMAIN");
    expect(idMapping?.hslColor).toBe(HSL_COLORS.CORE_BLUE);

    const unknown = getFieldMapping("nonexistent");
    expect(unknown).toBeUndefined();
  });
});

describe("env-substitutor", () => {
  beforeEach(() => {
    process.env.DASH_ROOT = "/app";
    process.env.API_KEY = "secret123";
  });

  test("replaces $env:VAR with actual value", () => {
    const result = substituteEnvVars("$env:DASH_ROOT/path");
    expect(result).toBe("/app/path");
  });

  test("handles multiple env vars in string", () => {
    const result = substituteEnvVars("$env:DASH_ROOT/api/$env:API_KEY");
    expect(result).toBe("/app/api/secret123");
  });

  test("extracts env var names from string", () => {
    const vars = extractEnvVars("$env:DASH_ROOT and $env:API_KEY here");
    expect(vars).toContain("DASH_ROOT");
    expect(vars).toContain("API_KEY");
    expect(vars).toHaveLength(2);
  });

  test("validates env vars are defined", () => {
    const result1 = validateEnvVars(["DASH_ROOT", "API_KEY"]);
    expect(result1.valid).toBe(true);
    expect(result1.missing).toHaveLength(0);

    const result2 = validateEnvVars(["DASH_ROOT", "NONEXISTENT_VAR"]);
    expect(result2.valid).toBe(false);
    expect(result2.missing).toContain("NONEXISTENT_VAR");
  });

  test("deep substitutes in objects", () => {
    const obj = {
      path: "$env:DASH_ROOT/test",
      nested: {
        url: "$env:API_KEY",
      },
      array: ["$env:DASH_ROOT"],
    };

    const result = substituteInObject(obj);
    expect(result.path).toBe("/app/test");
    expect(result.nested.url).toBe("secret123");
    expect(result.array[0]).toBe("/app");
  });

  test("keeps pattern when env var undefined", () => {
    const result = substituteEnvVars("$env:UNDEFINED_VAR/path");
    expect(result).toBe("$env:UNDEFINED_VAR/path");
  });
});

describe("css-generation", () => {
  test("generates CSS custom properties from field colors", () => {
    process.env.DASH_ROOT = "/app";
    const enhanced = transform(testConfig);
    const cssVars = generateCssVariables(enhanced);

    expect(cssVars["--field-id-color"]).toBe(HSL_COLORS.CORE_BLUE);
    expect(cssVars["--field-status-color"]).toBe(HSL_COLORS.EVENT_CH3);
  });

  test("uses correct variable naming convention", () => {
    process.env.DASH_ROOT = "/app";
    const enhanced = transform(testConfig);
    const cssVars = generateCssVariables(enhanced);

    for (const key of Object.keys(cssVars)) {
      expect(key).toMatch(/^--field-[a-z]+-color$/);
    }
  });
});

describe("server", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(() => {
    server = createServer();
    baseUrl = `http://localhost:${server.port}`;

    // Register a test dashboard
    process.env.DASH_ROOT = "/app";
    const enhanced = transform(testConfig);
    registerDashboard(enhanced);
  });

  afterAll(() => {
    server.stop();
  });

  test("GET /health returns field count", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.fields).toBe(9);
  });

  test("GET /api/fields returns all mappings", async () => {
    const res = await fetch(`${baseUrl}/api/fields`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(9);
  });

  test("GET /api/fields/:name returns specific mapping", async () => {
    const res = await fetch(`${baseUrl}/api/fields/id`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.field).toBe("id");
    expect(data.metaTag).toBe("DOMAIN");
    expect(data.hslColor).toBe(HSL_COLORS.CORE_BLUE);
  });

  test("GET /api/fields/:name returns 404 for unknown field", async () => {
    const res = await fetch(`${baseUrl}/api/fields/unknown`);
    expect(res.status).toBe(404);
  });

  test("GET /api/dashboard/:id returns enhanced config", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/test-dashboard`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("test-dashboard");
    expect(data._fieldMappings).toBeDefined();
  });

  test("GET /api/dashboard/:id/css returns CSS variables", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/test-dashboard/css`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data["--field-id-color"]).toBe(HSL_COLORS.CORE_BLUE);
  });

  test("GET /api/dashboard/:id returns 404 for unknown dashboard", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/unknown`);
    expect(res.status).toBe(404);
  });
});
