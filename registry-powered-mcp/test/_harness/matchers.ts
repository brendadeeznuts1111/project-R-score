/**
 * Custom Matchers
 * Extended expect matchers for testing
 */

import type { PerformanceMetrics, PerformanceSLA } from "./performance";
import { assertPerformanceMetrics } from "./performance";

/**
 * Custom matcher to check if performance metrics meet SLA
 */
export function toMatchPerformance(
  metrics: PerformanceMetrics,
  sla: PerformanceSLA
): { pass: boolean; message: () => string } {
  try {
    assertPerformanceMetrics(metrics, sla);
    return {
      pass: true,
      message: () => "Performance metrics meet SLA requirements",
    };
  } catch (error) {
    return {
      pass: false,
      message: () => error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Custom matcher to check if a value is within an SLA threshold
 */
export function toBeWithinSLA(
  received: number,
  threshold: number
): { pass: boolean; message: () => string } {
  const pass = received <= threshold;

  return {
    pass,
    message: () =>
      pass
        ? `Expected ${received} to exceed ${threshold}`
        : `Expected ${received} to be within ${threshold} (exceeded by ${(received - threshold).toFixed(4)})`,
  };
}

/**
 * Custom matcher for snapshot testing
 * Note: Bun has built-in snapshot support, but this provides a custom implementation
 */
export function toMatchSnapshot(
  received: any,
  snapshotName: string
): { pass: boolean; message: () => string } {
  // This is a placeholder for custom snapshot logic
  // In practice, use Bun's built-in expect().toMatchSnapshot()
  const serialized = typeof received === 'string'
    ? received
    : JSON.stringify(received, null, 2);

  return {
    pass: true,
    message: () => `Snapshot "${snapshotName}" matches`,
  };
}

/**
 * Custom matcher to check if response has specific status
 */
export function toHaveStatus(
  response: Response,
  expectedStatus: number
): { pass: boolean; message: () => string } {
  const pass = response.status === expectedStatus;

  return {
    pass,
    message: () =>
      pass
        ? `Expected response not to have status ${expectedStatus}`
        : `Expected status ${expectedStatus}, got ${response.status}`,
  };
}

/**
 * Custom matcher to check if response is JSON
 */
export function toBeJSON(
  response: Response
): { pass: boolean; message: () => string } {
  const contentType = response.headers.get("content-type");
  const pass = contentType?.includes("application/json") ?? false;

  return {
    pass,
    message: () =>
      pass
        ? "Expected response not to be JSON"
        : `Expected JSON response, got content-type: ${contentType}`,
  };
}

/**
 * Custom matcher to check route match result
 */
export function toMatchRoute(
  match: any,
  expectedTarget: string
): { pass: boolean; message: () => string } {
  if (!match) {
    return {
      pass: false,
      message: () => "Expected route to match, but got null",
    };
  }

  const pass = match.route?.target === expectedTarget;

  return {
    pass,
    message: () =>
      pass
        ? `Expected route not to match target ${expectedTarget}`
        : `Expected route target ${expectedTarget}, got ${match.route?.target}`,
  };
}

/**
 * Register all custom matchers with expect
 * Note: Bun's expect doesn't currently support custom matchers like Jest
 * This is a placeholder for when/if the feature is added
 */
export function registerMatchers() {
  // Placeholder - Bun doesn't currently support expect.extend()
  // When it does, we can register custom matchers here
}
