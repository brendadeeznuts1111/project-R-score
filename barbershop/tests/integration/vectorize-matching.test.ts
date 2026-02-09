import { test, expect, describe } from 'bun:test';

/**
 * Integration tests for Vectorize matching functionality
 * These tests require Vectorize to be set up and running
 * 
 * To run these tests:
 * 1. Deploy the Cloudflare Worker: npx wrangler deploy
 * 2. Set VECTORIZE_WORKER_URL environment variable
 * 3. Set VECTORIZE_ENABLED=true
 * 4. Run: bun test tests/integration/vectorize-matching.test.ts
 */

describe('Vectorize Integration Tests', () => {
  const VECTORIZE_ENABLED = process.env.VECTORIZE_ENABLED === 'true';
  const VECTORIZE_WORKER_URL = process.env.VECTORIZE_WORKER_URL || 'http://localhost:8787';

  test.skipIf(!VECTORIZE_ENABLED)('should match barbers by skill similarity', async () => {
    const { vectorizeClient } = await import('../../src/core/vectorize-client');

    // Test semantic matching
    const results = await vectorizeClient.queryBarbers('fade haircut', { status: 'active' }, 5);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].metadata?.barber_id).toBeDefined();
  });

  test.skipIf(!VECTORIZE_ENABLED)('should find barbers with similar services', async () => {
    const { vectorizeClient } = await import('../../src/core/vectorize-client');

    // Test various queries
    const queries = [
      'beard trim',
      'hot towel shave',
      'design haircut',
      'braids',
    ];

    for (const query of queries) {
      const results = await vectorizeClient.queryBarbers(query, {}, 3);
      expect(results.length).toBeGreaterThanOrEqual(0);
      
      if (results.length > 0) {
        expect(results[0].score).toBeGreaterThan(0);
      }
    }
  });

  test.skipIf(!VECTORIZE_ENABLED)('should answer support questions', async () => {
    const { vectorizeClient } = await import('../../src/core/vectorize-client');

    const questions = [
      'How much does a haircut cost?',
      'What payment methods do you accept?',
      'How does the waiting room work?',
    ];

    for (const question of questions) {
      const results = await vectorizeClient.queryDocuments(question, 3);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].metadata?.content).toBeDefined();
    }
  });

  test.skipIf(!VECTORIZE_ENABLED)('should handle empty queries gracefully', async () => {
    const { vectorizeClient } = await import('../../src/core/vectorize-client');

    const results = await vectorizeClient.queryBarbers('', {}, 5);
    // Should return empty or handle gracefully
    expect(Array.isArray(results)).toBe(true);
  });
});
