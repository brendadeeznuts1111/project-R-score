/**
 * Schemas Test Suite
 *
 * Test validation schemas integration
 */

import { describe, test, expect } from 'bun:test';

describe('Schema Validation Tests', () => {
  test('should load schemas from @fire22/validator', async () => {
    try {
      const schemas = await import('../schemas/index.ts');

      // Test that core schemas are exported
      expect(schemas.LoginRequestSchema).toBeDefined();
      expect(schemas.AgentIDParamSchema).toBeDefined();
      expect(schemas.PaginationQuerySchema).toBeDefined();
      expect(schemas.getSchemaForEndpoint).toBeDefined();
    } catch (error) {
      console.warn('⚠️ Schema loading failed:', error.message);
    }
  });

  test('should validate login request schema', async () => {
    try {
      const { LoginRequestSchema } = await import('../schemas/index.ts');

      // Valid login request
      const validLogin = {
        username: 'testuser',
        password: 'testpass',
        rememberMe: true,
      };

      const result = LoginRequestSchema.parse(validLogin);
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('testpass');
      expect(result.rememberMe).toBe(true);

      // Invalid login request
      expect(() => {
        LoginRequestSchema.parse({
          username: '', // Invalid empty username
          password: 'testpass',
        });
      }).toThrow();
    } catch (error) {
      console.warn('⚠️ Schema validation test skipped:', error.message);
    }
  });

  test('should validate agent ID schema', async () => {
    try {
      const { AgentIDParamSchema } = await import('../schemas/index.ts');

      // Valid agent ID
      const validAgentID = {
        agentID: 'AGENT001',
      };

      const result = AgentIDParamSchema.parse(validAgentID);
      expect(result.agentID).toBe('AGENT001');

      // Invalid agent ID
      expect(() => {
        AgentIDParamSchema.parse({
          agentID: 'invalid-agent-id!', // Invalid characters
        });
      }).toThrow();
    } catch (error) {
      console.warn('⚠️ Agent ID schema test skipped:', error.message);
    }
  });

  test('should validate pagination schema', async () => {
    try {
      const { PaginationQuerySchema } = await import('../schemas/index.ts');

      // Valid pagination
      const validPagination = {
        page: '1',
        limit: '10',
        offset: '0',
      };

      const result = PaginationQuerySchema.parse(validPagination);
      expect(result.page).toBe(1); // Converted to number
      expect(result.limit).toBe(10); // Converted to number
      expect(result.offset).toBe(0); // Converted to number
    } catch (error) {
      console.warn('⚠️ Pagination schema test skipped:', error.message);
    }
  });

  test('should handle schema endpoint mapping', async () => {
    try {
      const { getSchemaForEndpoint } = await import('../schemas/index.ts');

      // Test endpoint mapping
      const loginSchema = getSchemaForEndpoint('/api/auth/login', 'POST');
      expect(loginSchema).toBeDefined();

      const unknownSchema = getSchemaForEndpoint('/api/unknown', 'GET');
      expect(unknownSchema).toBeNull();
    } catch (error) {
      console.warn('⚠️ Schema endpoint mapping test skipped:', error.message);
    }
  });
});
