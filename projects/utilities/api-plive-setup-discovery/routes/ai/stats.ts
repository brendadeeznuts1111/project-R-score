// routes/ai/stats.ts - Retrieve AI generation stats
import { aiRegistryService } from '../../src/api/services/ai-registry-service';
import { z } from 'zod';

const AIStatsResponse = z.object({
  accuracy: z.number(),
  operations: z.number(),
  throughput: z.number(),
  errorRate: z.number()
});

export const handle = async (req: Request) => {
  try {
    const stats = aiRegistryService.getStats();

    return new Response(JSON.stringify(AIStatsResponse.parse(stats)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || 'Stats retrieval failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};