// test/utils/mockDeps.ts
import type { Dependencies } from "../src/utils/s3Exports";

// Set global test marker for production monitoring
global.__isDiTestEnvironment = true;

/**
 * Create mock dependencies for S3 exports testing
 */
export function createMockDeps(overrides: Partial<Dependencies> = {}): Dependencies & { _isMock: true } {
  const mockCalls: Array<{ path: string; data: Uint8Array; opts?: any }> = [];
  
  const mockS3Write = async (path: string, data: Uint8Array, opts?: any) => {
    mockCalls.push({ path, data, opts });
    return Promise.resolve();
  };

  const mockDeps: Dependencies & { _isMock: true } = {
    feature: () => false,
    s3Write: mockS3Write,
    env: {},
    _isMock: true, // Explicit marker for production monitoring
    ...overrides,
  };

  // Attach mock calls array for test inspection
  (mockDeps as any)._mockCalls = mockCalls;
  
  return mockDeps;
}

/**
 * Extract mock calls from dependencies for test assertions
 */
export function getMockCalls(deps: Dependencies & { _isMock?: true }): Array<{ path: string; data: Uint8Array; opts?: any }> {
  return (deps as any)._mockCalls || [];
}

/**
 * Create premium-enabled mock dependencies
 */
export function createPremiumMockDeps(env: Record<string, string | undefined> = {}): Dependencies & { _isMock: true } {
  return createMockDeps({
    feature: (flag: string) => flag === "PREMIUM",
    env,
  });
}

/**
 * Create development environment mock dependencies
 */
export function createDevMockDeps(env: Record<string, string | undefined> = {}): Dependencies & { _isMock: true } {
  return createMockDeps({
    feature: () => false,
    env: { SCOPE: "DEVELOPMENT", ...env },
  });
}

/**
 * Create production environment mock dependencies
 */
export function createProdMockDeps(env: Record<string, string | undefined> = {}): Dependencies & { _isMock: true } {
  return createMockDeps({
    feature: () => false,
    env: { SCOPE: "PRODUCTION", ...env },
  });
}

/**
 * Helper to assert content disposition format
 */
export function expectContentDisposition(disposition: string, pattern: RegExp): void {
  expect(disposition).toMatch(pattern);
}

/**
 * Helper to assert premium export format
 */
export function expectPremiumExport(disposition: string, extension: string = "csv"): void {
  expect(disposition).toMatch(new RegExp(`^attachment; filename="premium-export-\\d+\\.${extension}"$`));
}

/**
 * Helper to assert user report format
 */
export function expectUserReport(disposition: string, userId: string, scope: string): void {
  expect(disposition).toBe(`attachment; filename="${scope}-user-${userId}-report.json"`);
}
