/**
 * Golden Matrix Status Endpoint Tests
 * Tests the comprehensive v1.3.3 status endpoint
 */

import { describe, test, expect } from "harness";
import { createInfrastructureHandlers, getStatusCollector } from "../../packages/core/src/infrastructure/index";

describe('Golden Matrix Status Endpoint', () => {
  describe('/mcp/infrastructure/status/v1.3.3', () => {
    test('returns comprehensive status with all components', async () => {
      const collector = getStatusCollector();
      const handlers = createInfrastructureHandlers(collector);

      const request = {
        url: 'http://localhost/mcp/infrastructure/status/v1.3.3',
        method: 'GET'
      } as any;

      const response = await handlers.handleRequest(request);
      expect(response).not.toBeNull();
      const resp = response as Response;
      expect(resp.status).toBe(200);

      const result = await resp.json() as any;
      expect(result).toHaveProperty('version', '1.3.3-STABLE-FINAL');
      expect(result).toHaveProperty('totalComponents');
      expect(result).toHaveProperty('activeComponents');
      expect(result).toHaveProperty('zeroCostEliminated');
      expect(result).toHaveProperty('securityHardening');
      expect(result).toHaveProperty('packageManager');
      expect(result).toHaveProperty('nativeStability');
      expect(result).toHaveProperty('protocolCompliance');
      expect(result).toHaveProperty('status', 'GOLDEN_MATRIX_LOCKED_85_COMPONENTS');

      // Package manager section
      expect(result.packageManager).toHaveProperty('speed', '2x_faster');
      expect(result.packageManager).toHaveProperty('configVersion', 'v1');
      expect(result.packageManager).toHaveProperty('emailForwarding');
      expect(result.packageManager).toHaveProperty('selectiveHoisting');

      // Native stability
      expect(result.nativeStability).toHaveProperty('napiThreads', 'safe');
      expect(result.nativeStability).toHaveProperty('workerTermination', 'reliable');
      expect(result.nativeStability).toHaveProperty('sourcemaps', 'integrity_validated');

      // Protocol compliance
      expect(result.protocolCompliance).toHaveProperty('websocket', 'RFC_6455');
      expect(result.protocolCompliance).toHaveProperty('yaml', 'YAML_1.2');

      // Database fixes and security patches
      expect(result).toHaveProperty('databaseFixes');
      expect(result).toHaveProperty('securityPatches');
      expect(result.databaseFixes).toHaveProperty('mysql');
      expect(result.databaseFixes).toHaveProperty('redis');
      expect(result.databaseFixes).toHaveProperty('s3');
      expect(result.securityPatches).toHaveProperty('cloudflare', 3);
      expect(result.securityPatches).toHaveProperty('cve', 7);
      expect(result.securityPatches).toHaveProperty('nativeStability', 5);
    });

    test('includes package manager components in totals', async () => {
      const collector = getStatusCollector();
      const handlers = createInfrastructureHandlers(collector);

      const request = {
        url: 'http://localhost/mcp/infrastructure/status/v1.3.3',
        method: 'GET'
      } as any;

      const response = await handlers.handleRequest(request);
      expect(response).not.toBeNull();
      const resp = response as Response;
      const result = await resp.json() as any;

      // Should include the 6 new package manager components
      expect(typeof result.totalComponents).toBe('number');
      expect(result.totalComponents).toBeGreaterThanOrEqual(30);
      expect(result.packageManager.emailForwarding).toBe(true);
      expect(result.packageManager.selectiveHoisting).toBe(true);
    });
  });
});