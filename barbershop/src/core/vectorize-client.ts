/**
 * Vectorize Client for Bun Server
 * HTTP client to communicate with Cloudflare Vectorize Worker
 * 
 * Automatically loads credentials from Bun.secrets or environment variables
 */

// Helper to get secret from Bun.secrets or environment
async function getSecret(service: string, name: string): Promise<string | undefined> {
  const key = `${service}:${name}`;

  // Try Bun.secrets first
  if (typeof Bun !== 'undefined' && 'secrets' in Bun) {
    try {
      const secrets = Bun.secrets as unknown as { get: (k: string) => Promise<string | undefined> };
      const value = await secrets.get(key);
      if (value) return value;
    } catch {
      // Fall through to environment
    }
  }

  // Fallback to environment variables
  const envVarMap: Record<string, string> = {
    'cloudflare:api_token': 'CLOUDFLARE_API_TOKEN',
    'cloudflare:account_id': 'CLOUDFLARE_ACCOUNT_ID',
  };

  return Bun.env[envVarMap[key] || key.toUpperCase().replace(':', '_')];
}

// Load configuration (supports async secrets)
const VECTORIZE_WORKER_URL = Bun.env.VECTORIZE_WORKER_URL || 'http://localhost:8787';
const VECTORIZE_ENABLED = Bun.env.VECTORIZE_ENABLED === 'true';

export interface BarberMatch {
  id: string;
  score: number;
  metadata?: {
    barber_id?: string;
    status?: string;
    skill_type?: string;
    skills?: string;
    name?: string;
  };
}

export interface DocumentMatch {
  id: string;
  score: number;
  metadata?: {
    doc_id?: string;
    section?: string;
    topic?: string;
    content?: string;
  };
}

export interface CustomerMatch {
  id: string;
  score: number;
  metadata?: {
    customer_id?: string;
    name?: string;
    tier?: string;
    preferredBarber?: string;
    homeShop?: string;
    address?: string;
    zipcode?: string;
  };
}

export class VectorizeClient {
  private workerUrl: string;
  private enabled: boolean;
  private cache: Map<string, { embedding: number[]; timestamp: number }>;
  private cacheTTL: number = 3600000; // 1 hour

  constructor(workerUrl?: string, enabled?: boolean) {
    this.workerUrl = workerUrl || VECTORIZE_WORKER_URL;
    this.enabled = enabled ?? VECTORIZE_ENABLED;
    this.cache = new Map();
  }

  /**
   * Check if Vectorize is enabled and available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.workerUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate embedding for text
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.enabled) {
      throw new Error('Vectorize is not enabled');
    }

    // Check cache
    const cacheKey = `embed:${text}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.embedding;
    }

    try {
      const response = await fetch(`${this.workerUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.embedding as number[];

      // Cache result
      this.cache.set(cacheKey, { embedding, timestamp: Date.now() });

      return embedding;
    } catch (error: any) {
      console.error('Vectorize embed error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Query barbers using semantic search
   */
  async queryBarbers(
    query: string,
    filters?: { status?: string; barber_id?: string },
    topK: number = 10
  ): Promise<BarberMatch[]> {
    if (!this.enabled) {
      throw new Error('Vectorize is not enabled');
    }

    try {
      const response = await fetch(`${this.workerUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topK,
          filters,
          returnMetadata: 'indexed',
          index: 'barbers',
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return (data.matches || []) as BarberMatch[];
    } catch (error: any) {
      console.error('Vectorize query error:', error);
      throw new Error(`Failed to query barbers: ${error.message}`);
    }
  }

  /**
   * Query customers using semantic search
   */
  async queryCustomers(
    query: string,
    filters?: { tier?: string; customer_id?: string; preferredBarber?: string; homeShop?: string },
    topK: number = 10
  ): Promise<CustomerMatch[]> {
    if (!this.enabled) {
      throw new Error('Vectorize is not enabled');
    }

    try {
      const response = await fetch(`${this.workerUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topK,
          filters,
          returnMetadata: 'indexed',
          index: 'customers',
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return (data.matches || []) as CustomerMatch[];
    } catch (error: any) {
      console.error('Vectorize customer query error:', error);
      throw new Error(`Failed to query customers: ${error.message}`);
    }
  }

  /**
   * Query documents using semantic search (RAG)
   * @param query - Search query
   * @param topK - Number of results to return
   * @param enableReranking - Enable reranking for better result quality (default: true)
   */
  async queryDocuments(
    query: string,
    topK: number = 5,
    enableReranking: boolean = true
  ): Promise<DocumentMatch[]> {
    if (!this.enabled) {
      throw new Error('Vectorize is not enabled');
    }

    try {
      const response = await fetch(`${this.workerUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topK,
          returnMetadata: 'all',
          index: 'docs',
          reranking: {
            enabled: enableReranking,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return (data.matches || []) as DocumentMatch[];
    } catch (error: any) {
      console.error('Vectorize docs query error:', error);
      throw new Error(`Failed to query documents: ${error.message}`);
    }
  }

  /**
   * Index a barber's skills
   */
  async indexBarber(barber: {
    id: string;
    name: string;
    skills: string[];
    status: string;
  }): Promise<{ mutationId: string }> {
    if (!this.enabled) {
      throw new Error('Vectorize is not enabled');
    }

    // Generate embedding for combined skills text
    const skillsText = barber.skills.join(', ');
    const embedding = await this.embedText(skillsText);

    // Create vector for each skill
    const vectors = barber.skills.map((skill, index) => ({
      id: `barber-${barber.id}-skill-${index}`,
      values: embedding, // Use same embedding for all skills of this barber
      metadata: {
        barber_id: barber.id,
        status: barber.status,
        skill_type: 'service',
        skills: skillsText,
        name: barber.name,
      },
    }));

    try {
      const response = await fetch(`${this.workerUrl}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectors,
          index: 'barbers',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { mutationId: data.mutationId };
    } catch (error: any) {
      console.error('Vectorize index error:', error);
      throw new Error(`Failed to index barber: ${error.message}`);
    }
  }

  /**
   * Index a customer
   */
  async indexCustomer(customer: {
    id: string;
    name: string;
    tier?: string;
    preferredBarber?: string;
    homeShop?: string;
    address?: string;
    zipcode?: string;
  }): Promise<{ mutationId: string }> {
    if (!this.enabled) {
      throw new Error('Vectorize is not enabled');
    }

    // Build searchable text from customer data
    const searchableText = [
      customer.name,
      customer.tier,
      customer.preferredBarber,
      customer.homeShop,
      customer.address,
      customer.zipcode,
    ]
      .filter(Boolean)
      .join(', ');

    if (!searchableText.trim()) {
      throw new Error('Customer must have at least name to index');
    }

    // Generate embedding
    const embedding = await this.embedText(searchableText);

    try {
      const response = await fetch(`${this.workerUrl}/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectors: [
            {
              id: `customer-${customer.id}`,
              values: embedding,
              metadata: {
                customer_id: customer.id,
                name: customer.name,
                tier: customer.tier || 'NEW',
                preferredBarber: customer.preferredBarber || null,
                homeShop: customer.homeShop || null,
                address: customer.address || null,
                zipcode: customer.zipcode || null,
              },
            },
          ],
          index: 'customers',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { mutationId: data.mutationId };
    } catch (error: any) {
      console.error('Vectorize customer index error:', error);
      throw new Error(`Failed to index customer: ${error.message}`);
    }
  }

  /**
   * Index document chunks
   */
  async indexDocuments(
    chunks: Array<{
      id: string;
      content: string;
      docId: string;
      section: string;
      topic: string;
    }>
  ): Promise<{ mutationId: string }> {
    if (!this.enabled) {
      throw new Error('Vectorize is not enabled');
    }

    // Generate embeddings for all chunks
    const vectors = await Promise.all(
      chunks.map(async (chunk) => {
        const embedding = await this.embedText(chunk.content);
        return {
          id: chunk.id,
          values: embedding,
          metadata: {
            doc_id: chunk.docId,
            section: chunk.section,
            topic: chunk.topic,
            content: chunk.content,
          },
        };
      })
    );

    // Batch insert (5000 vectors per batch)
    const BATCH_SIZE = 5000;
    let lastMutationId: string | undefined;

    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch(`${this.workerUrl}/index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vectors: batch,
            index: 'docs',
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        lastMutationId = data.mutationId;

        // Small delay between batches
        if (i + BATCH_SIZE < vectors.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        console.error(`Vectorize batch index error (batch ${i / BATCH_SIZE + 1}):`, error);
        throw new Error(`Failed to index documents batch: ${error.message}`);
      }
    }

    return { mutationId: lastMutationId || 'unknown' };
  }
}

// Export singleton instance
export const vectorizeClient = new VectorizeClient();
