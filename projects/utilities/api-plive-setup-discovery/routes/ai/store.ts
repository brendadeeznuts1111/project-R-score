// routes/ai/store.ts - Store AI-generated content in registry with zstd compression
import { z } from 'zod';
import { aiRegistryService } from '../../src/api/services/ai-registry-service';

const AIStoreRequest = z.object({
  content: z.string(),
  metadata: z.object({
    hash: z.string().optional(),
    version: z.string().optional()
  }),
  secrets: z.record(z.string()).optional()
});

const AIStoreResponse = z.object({
  path: z.string(),
  success: z.boolean()
});

export const handle = async (req: Request) => {
  try {
    const body = await req.json();
    const request = AIStoreRequest.parse(body);

    const path = await aiRegistryService.store(request.content, request.metadata, request.secrets);

    return new Response(JSON.stringify(AIStoreResponse.parse({
      path,
      success: true
    })), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      path: '',
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
