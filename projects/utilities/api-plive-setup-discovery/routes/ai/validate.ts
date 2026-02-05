// routes/ai/validate.ts - Validate AI-generated headers/configs against bun.yaml schema
import { z } from 'zod';
import { aiRegistryService } from '../../src/api/services/ai-registry-service';

const AIValidateRequest = z.object({
  header: z.string(),
  config: z.string()
});

const AIValidateResponse = z.object({
  valid: z.boolean(),
  errors: z.array(z.string())
});

export const handle = async (req: Request) => {
  try {
    const body = await req.json();
    const request = AIValidateRequest.parse(body);

    const result = await aiRegistryService.validate(request.header, request.config);

    const status = result.valid ? 200 : 400;

    return new Response(JSON.stringify(AIValidateResponse.parse(result)), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      valid: false,
      errors: [error.message || 'Validation failed']
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
