/**
 * MCP Package Manager Endpoints Tests
 * Tests the REST API endpoint handlers for Components #65-70
 */

import { describe, test, expect } from "harness";
import { handlePackageManagerRequest } from "../../packages/core/src/infrastructure/status-collector";

describe('MCP Package Manager Endpoint Handlers', () => {
  describe('handlePackageManagerRequest function', () => {
    test('handles /mcp/pm/optimize-install endpoint', async () => {
      const request = {
        url: 'http://localhost/mcp/pm/optimize-install',
        method: 'POST',
        json: async () => ({ packageJson: './package.json' })
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('optimized');
      expect(result).toHaveProperty('skipWait');
      expect(result).toHaveProperty('performanceGain');
    });

    test('handles /mcp/pm/registry-auth endpoint', async () => {
      const request = {
        url: 'http://localhost/mcp/pm/registry-auth?registry=https://registry.example.com',
        method: 'GET'
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('token');
    });

    test('handles /mcp/pm/hoist-patterns endpoint', async () => {
      const request = {
        url: 'http://localhost/mcp/pm/hoist-patterns',
        method: 'GET'
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('public');
      expect(result).toHaveProperty('internal');
      expect(Array.isArray(result.public)).toBe(true);
    });

    test('handles /mcp/build/test-determinism endpoint', async () => {
      const request = {
        url: 'http://localhost/mcp/build/test-determinism',
        method: 'POST',
        json: async () => ({ bunDir: 'node_modules/.bun' })
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('deterministic');
      expect(result).toHaveProperty('crossVolumeHandled');
    });

    test('handles /mcp/pm/pack endpoint', async () => {
      const request = {
        url: 'http://localhost/mcp/pm/pack',
        method: 'POST',
        json: async () => ({ packagePath: './package.json', enforceBin: true })
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('tarballSize');
      expect(result).toHaveProperty('binFilesIncluded');
    });

    test('returns 405 for wrong HTTP method', async () => {
      const request = {
        url: 'http://localhost/mcp/pm/hoist-patterns',
        method: 'POST',
        json: async () => ({})
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(405);
    });

    test('returns 404 for unknown endpoint', async () => {
      const request = {
        url: 'http://localhost/mcp/pm/unknown-endpoint',
        method: 'GET'
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(404);

      const result = await response.json();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Package manager endpoint not found');
    });

    test('returns 400 for invalid JSON in POST', async () => {
      const request = {
        url: 'http://localhost/mcp/pm/optimize-install',
        method: 'POST',
        json: async () => { throw new Error('Invalid JSON'); }
      } as any;

      const response = await handlePackageManagerRequest(request);
      expect(response.status).toBe(400);
    });
  });
});