/**
 * Test Utilities
 * Common helper functions for testing
 */

import type { Server } from "bun";

/**
 * Trigger garbage collection multiple times
 * Useful for testing memory leaks and cleanup
 */
export async function gcTick(count = 10): Promise<void> {
  for (let i = 0; i < count; i++) {
    Bun.gc(true);
    await sleep(1);
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test HTTP server with specified routes
 */
export function createTestServer(options: {
  port?: number;
  routes?: Record<string, any>;
  fetch?: (req: Request) => Response | Promise<Response>;
}): Server {
  const { port = 0, routes, fetch } = options;

  return Bun.serve({
    port,
    fetch: fetch || ((req) => {
      const url = new URL(req.url);
      const handler = routes?.[url.pathname];

      if (handler) {
        return handler(req);
      }

      return new Response("Not Found", { status: 404 });
    }),
  });
}

/**
 * Create a temporary directory for testing
 */
export async function createTempDir(): Promise<string> {
  const tmpDir = `/tmp/test-${crypto.randomUUID()}`;
  await Bun.$`mkdir -p ${tmpDir}`;
  return tmpDir;
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  await Bun.$`rm -rf ${dir}`;
}

/**
 * Wait for a condition to become true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();

  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }
    await sleep(interval);
  }
}

/**
 * Create a mock Request object
 */
export function mockRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options);
}

/**
 * Extract text from Response
 */
export async function responseText(response: Response): Promise<string> {
  return await response.text();
}

/**
 * Extract JSON from Response
 */
export async function responseJson<T = any>(response: Response): Promise<T> {
  return await response.json();
}

/**
 * Assert response status
 */
export function assertStatus(response: Response, expected: number): void {
  if (response.status !== expected) {
    throw new Error(
      `Expected status ${expected}, got ${response.status}`
    );
  }
}
