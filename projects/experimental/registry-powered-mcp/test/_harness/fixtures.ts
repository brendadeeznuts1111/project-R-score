/**
 * Fixture Utilities
 * Helpers for loading and creating test fixtures
 */

import type { RegistryConfig } from "../../packages/core/src/parsers/toml-ingressor";

/**
 * Load a fixture file from the _fixtures directory
 */
export async function loadFixture(path: string): Promise<string> {
  const fixturePath = new URL(`../_fixtures/${path}`, import.meta.url).pathname;
  const file = Bun.file(fixturePath);
  return await file.text();
}

/**
 * Load a TOML config fixture
 */
export async function loadConfigFixture(name: string): Promise<string> {
  return await loadFixture(`configs/${name}.toml`);
}

/**
 * Create a fixture from a template with variable substitution
 */
export function createFixture(template: string, data: Record<string, any>): string {
  let result = template;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, String(value));
  }

  return result;
}

/**
 * Generate mock registry data for testing
 */
export function mockRegistryData(options?: {
  packageCount?: number;
  includeScoped?: boolean;
}): any {
  const { packageCount = 3, includeScoped = true } = options || {};

  const packages = [];

  for (let i = 0; i < packageCount; i++) {
    const name = includeScoped && i % 2 === 0
      ? `@test/package-${i}`
      : `package-${i}`;

    packages.push({
      name,
      version: `1.${i}.0`,
      description: `Test package ${i}`,
      author: "Test Author",
      registry: "test-registry",
    });
  }

  return { packages };
}

/**
 * Create a minimal RegistryConfig for testing
 */
export function mockRegistryConfig(overrides?: Partial<RegistryConfig>): RegistryConfig {
  return {
    version: "2.4.1",
    tier: "hardened",
    runtime: "bun-1.3.6_STABLE",
    global_pops: 300,
    performance: {
      bundle_size_kb: 9.64,
      p99_response_ms: 10.8,
      cold_start_ms: 0,
    },
    servers: [
      {
        name: "test-server",
        transport: "stdio",
        command: "bun",
        args: ["run", "test.ts"],
        enabled: true,
      },
    ],
    routes: [
      {
        pattern: "/test/:id",
        target: "test-server",
        method: "GET",
        enabled: true,
      },
    ],
    ...overrides,
  } as RegistryConfig;
}

/**
 * Create a temporary TOML config file
 */
export async function createTempConfig(config: RegistryConfig): Promise<string> {
  const tmpDir = `/tmp/test-${crypto.randomUUID()}`;
  await Bun.$`mkdir -p ${tmpDir}`;

  const configPath = `${tmpDir}/registry.toml`;

  // Convert config to TOML format
  const toml = `
version = "${config.version}"
tier = "${config.tier}"
runtime = "${config.runtime}"
global_pops = ${config.global_pops}

[performance]
bundle_size_kb = ${config.performance.bundle_size_kb}
p99_response_ms = ${config.performance.p99_response_ms}
cold_start_ms = ${config.performance.cold_start_ms}

${config.servers?.map(server => `
[[servers]]
name = "${server.name}"
transport = "${server.transport}"
command = "${server.command}"
args = ${JSON.stringify(server.args)}
enabled = ${server.enabled}
`).join('\n')}

${config.routes?.map(route => `
[[routes]]
pattern = "${route.pattern}"
target = "${route.target}"
method = "${route.method}"
enabled = ${route.enabled}
`).join('\n')}
  `.trim();

  await Bun.write(configPath, toml);
  return configPath;
}
