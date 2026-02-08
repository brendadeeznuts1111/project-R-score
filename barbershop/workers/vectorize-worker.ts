/**
 * Cloudflare Worker for Vectorize Operations
 * Handles embedding generation, vector queries, and indexing
 */

export interface Env {
  VECTORIZE_INDEX: VectorizeIndex;
  DOCS_INDEX: VectorizeIndex;
  CUSTOMERS_INDEX: VectorizeIndex;
  AI: Ai; // AI binding provides access to AI Search via autorag()
}

interface EmbedRequest {
  text: string;
}

interface QueryRequest {
  query: string;
  topK?: number;
  filters?: Record<string, any>;
  returnMetadata?: 'all' | 'indexed' | 'none';
  index?: 'barbers' | 'docs' | 'customers';
  reranking?: {
    enabled?: boolean;
    model?: string;
  };
}

interface IndexRequest {
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
    namespace?: string;
  }>;
  index?: 'barbers' | 'docs' | 'customers';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/health' && request.method === 'GET') {
        return Response.json({ status: 'ok', service: 'vectorize-worker' }, { headers: corsHeaders });
      }

      // Generate embeddings
      if (path === '/embed' && request.method === 'POST') {
        const body: EmbedRequest = await request.json();
        const embedding = await generateEmbedding(env.AI, body.text);
        return Response.json({ embedding }, { headers: corsHeaders });
      }

      // Query vectors
      if (path === '/query' && request.method === 'POST') {
        const body: QueryRequest = await request.json();
        
        // Use AI Search for docs if available, otherwise fallback to Vectorize
        if (body.index === 'docs' && env.AI) {
          try {
            // Check if AI Search instance is available via AI binding
            const instanceId = 'barbershop-knowledge-base';
            if (typeof (env.AI as any).autorag === 'function') {
              const aiSearchInstance = (env.AI as any).autorag(instanceId);
              if (aiSearchInstance) {
                const results = await queryAISearch(env, body);
                return Response.json(results, { headers: corsHeaders });
              }
            }
          } catch (error) {
            // Fallback to Vectorize if AI Search fails
            console.warn('AI Search not available, falling back to Vectorize:', error);
          }
        }
        
        const results = await queryVectors(env, body);
        return Response.json(results, { headers: corsHeaders });
      }

      // Index vectors
      if (path === '/index' && request.method === 'POST') {
        const body: IndexRequest = await request.json();
        const result = await indexVectors(env, body);
        return Response.json(result, { headers: corsHeaders });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (error: any) {
      console.error('Vectorize worker error:', error);
      return Response.json(
        { error: error.message || 'Internal server error' },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

/**
 * Generate embedding using Workers AI
 */
async function generateEmbedding(ai: Ai, text: string): Promise<number[]> {
  const response = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: [text],
  });

  if (!response || !response.data || !Array.isArray(response.data[0])) {
    throw new Error('Invalid embedding response from Workers AI');
  }

  return response.data[0] as number[];
}

/**
 * Query vectors from Vectorize index
 */
async function queryVectors(env: Env, request: QueryRequest): Promise<any> {
  const { query, topK = 10, filters, returnMetadata = 'indexed', index = 'barbers' } = request;

  // Generate embedding for query
  const embedding = await generateEmbedding(env.AI, query);

  // Select index
  let vectorizeIndex: VectorizeIndex;
  if (index === 'docs') {
    vectorizeIndex = env.DOCS_INDEX;
  } else if (index === 'customers') {
    vectorizeIndex = env.CUSTOMERS_INDEX;
  } else {
    vectorizeIndex = env.VECTORIZE_INDEX; // barbers
  }

  // Build query options
  const queryOptions: any = {
    topK,
    returnMetadata,
  };

  if (filters) {
    queryOptions.filter = filters;
  }

  // Query Vectorize
  const results = await vectorizeIndex.query(embedding, queryOptions);

  return {
    matches: results.matches,
    count: results.count,
  };
}

/**
 * Query AI Search (for knowledge base documents)
 */
async function queryAISearch(env: Env, request: QueryRequest): Promise<any> {
  const { query, topK = 5, reranking } = request;
  
  try {
    // AI Search instance ID - should match the instance created in dashboard/API
    const instanceId = 'barbershop-knowledge-base';
    
    // Access AI Search via AI binding: env.AI.autorag(instanceId)
    // Note: "autorag" is the legacy name, still used in API
    if (!env.AI || typeof (env.AI as any).autorag !== 'function') {
      throw new Error('AI Search binding not available');
    }
    
    const aiSearchInstance = (env.AI as any).autorag(instanceId);
    
    if (!aiSearchInstance) {
      throw new Error(`AI Search instance "${instanceId}" not found`);
    }
    
    // Build search options
    const searchOptions: any = {
      query,
      max_num_results: topK,
      rewrite_query: true,
    };
    
    // Enable reranking by default (improves result quality for knowledge base queries)
    // Reranking reorders results based on semantic relevance using a secondary model
    // See: https://developers.cloudflare.com/ai-search/configuration/reranking/
    if (reranking?.enabled !== false) {
      searchOptions.reranking = {
        enabled: true,
        model: reranking?.model || '@cf/baai/bge-reranker-base',
      };
    }
    
    // Use search() method to get results without AI generation
    const results = await aiSearchInstance.search(searchOptions);
    
    // Transform AI Search results to match DocumentMatch format
    const matches = (results.data || []).map((item: any) => ({
      id: item.file_id || item.filename || 'unknown',
      score: item.score || 0,
      metadata: {
        doc_id: item.filename || item.file_id,
        section: item.attributes?.folder || 'general',
        topic: item.attributes?.folder?.split('/')[0] || 'general',
        content: item.content?.[0]?.text || '',
      },
    }));
    
    return {
      matches,
      count: matches.length,
    };
  } catch (error: any) {
    console.error('AI Search query error:', error);
    throw new Error(`AI Search query failed: ${error.message}`);
  }
}

/**
 * Index vectors into Vectorize
 */
async function indexVectors(env: Env, request: IndexRequest): Promise<any> {
  const { vectors, index = 'barbers' } = request;

  // Select index
  let vectorizeIndex: VectorizeIndex;
  if (index === 'docs') {
    vectorizeIndex = env.DOCS_INDEX;
  } else if (index === 'customers') {
    vectorizeIndex = env.CUSTOMERS_INDEX;
  } else {
    vectorizeIndex = env.VECTORIZE_INDEX; // barbers
  }

  // Convert to Vectorize format
  const vectorizeVectors = vectors.map((v) => ({
    id: v.id,
    values: v.values,
    metadata: v.metadata || {},
    namespace: v.namespace,
  }));

  // Insert vectors (V2 returns mutationId)
  const result = await vectorizeIndex.insert(vectorizeVectors);

  return {
    mutationId: result.mutationId,
    count: vectors.length,
  };
}
