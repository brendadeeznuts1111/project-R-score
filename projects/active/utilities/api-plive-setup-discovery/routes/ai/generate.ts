// routes/ai/generate.ts - Generate AI-driven headers and YAML configs
import { z } from 'zod';
import { aiRegistryService } from '../../src/api/services/ai-registry-service';

const AIGenerateRequest = z.object({
  title: z.string(),
  scope: z.string(),
  type: z.string(),
  context: z.record(z.any()).optional()
});

const AIGenerateResponse = z.object({
  header: z.string(),
  grepable: z.string(),
  config: z.string(),
  metadata: z.object({
    hash: z.string(),
    timestamp: z.string()
  })
});

export const handle = async (req: Request) => {
  try {
    const body = await req.json();
    const request = AIGenerateRequest.parse(body);

    const result = await aiRegistryService.generate(request);

    return new Response(JSON.stringify(AIGenerateResponse.parse(result)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: error.message || 'Generation failed'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
