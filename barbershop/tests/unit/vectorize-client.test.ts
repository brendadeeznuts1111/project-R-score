import { test, expect, describe, beforeEach } from 'bun:test';
import { VectorizeClient } from '../../src/core/vectorize-client';

describe('VectorizeClient', () => {
  let client: VectorizeClient;
  const mockWorkerUrl = 'http://localhost:8787';

  beforeEach(() => {
    client = new VectorizeClient(mockWorkerUrl, false); // Disabled for testing
  });

  test('should check availability', async () => {
    // Mock fetch for health check
    global.fetch = async () => {
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    } as any;

    const available = await client.isAvailable();
    expect(available).toBe(true);
  });

  test('should handle unavailable service', async () => {
    global.fetch = async () => {
      throw new Error('Network error');
    } as any;

    const client = new VectorizeClient(mockWorkerUrl, true);
    const available = await client.isAvailable();
    expect(available).toBe(false);
  });

  test('should generate embeddings', async () => {
    const mockEmbedding = new Array(768).fill(0.1);
    global.fetch = async () => {
      return new Response(JSON.stringify({ embedding: mockEmbedding }), { status: 200 });
    } as any;

    const client = new VectorizeClient(mockWorkerUrl, true);
    const embedding = await client.embedText('test text');
    expect(embedding).toEqual(mockEmbedding);
    expect(embedding.length).toBe(768);
  });

  test('should query barbers', async () => {
    const mockMatches = [
      {
        id: 'barber-1',
        score: 0.95,
        metadata: {
          barber_id: 'barber_123',
          status: 'active',
          skills: 'Haircut, Beard Trim',
          name: 'John Barber',
        },
      },
    ];

    global.fetch = async () => {
      return new Response(JSON.stringify({ matches: mockMatches }), { status: 200 });
    } as any;

    const client = new VectorizeClient(mockWorkerUrl, true);
    const results = await client.queryBarbers('haircut', { status: 'active' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('barber-1');
    expect(results[0].score).toBe(0.95);
  });

  test('should handle errors gracefully', async () => {
    global.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 500 });
    } as any;

    const client = new VectorizeClient(mockWorkerUrl, true);
    await expect(client.embedText('test')).rejects.toThrow();
  });

  test('should cache embeddings', async () => {
    const mockEmbedding = new Array(768).fill(0.1);
    let fetchCount = 0;

    global.fetch = async () => {
      fetchCount++;
      return new Response(JSON.stringify({ embedding: mockEmbedding }), { status: 200 });
    } as any;

    const client = new VectorizeClient(mockWorkerUrl, true);
    
    // First call
    await client.embedText('test text');
    expect(fetchCount).toBe(1);
    
    // Second call should use cache
    await client.embedText('test text');
    expect(fetchCount).toBe(1); // Should still be 1 due to caching
  });
});
