// routes/ai/batch.ts - Batch generate and store multiple AI-driven rules/configs
import { z } from 'zod';
import { aiRegistryService } from '../../src/api/services/ai-registry-service';

const AIGenerationRequest = z.object({
  title: z.string(),
  scope: z.string(),
  type: z.string(),
  context: z.record(z.any()).optional()
});

const AIBatchRequest = z.array(AIGenerationRequest);

const AIBatchResponse = z.array(z.object({
  header: z.string(),
  grepable: z.string(),
  config: z.string(),
  metadata: z.object({
    hash: z.string(),
    timestamp: z.string()
  })
}));

export const handle = async (req: Request) => {
  try {
    const body = await req.json();
    const requests = AIBatchRequest.parse(body);

    // Process in parallel using Bun.Worker (Phase 3 optimization)
    const results = await aiRegistryService.generateBatch(requests);

    return new Response(JSON.stringify(AIBatchResponse.parse(results)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || 'Batch generation failed'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
