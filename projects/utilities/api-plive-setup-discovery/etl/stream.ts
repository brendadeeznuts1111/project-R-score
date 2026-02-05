// etl/stream.ts - Telemetry-driven ETL pipeline
// Bun 1.3 ReadableStream-based ETL with compression and validation

import { file, YAML } from 'bun';
import { z } from 'zod';
import { ReadableStream } from 'stream/web';

const ETLStartRequest = z.object({
  type: z.enum(['JSON', 'YAML', 'BINARY', 'TELEMETRY']),
  data: z.any(),
  dataType: z.enum(['JSON', 'YAML', 'BINARY']).optional()
});

const ETLStartResponse = z.object({
  success: z.boolean(),
  hash: z.string(),
  recordsProcessed: z.number(),
  duration: z.number()
});

// Validate telemetry schema against bun.yaml config
function validateTelemetry(data: any, schema: any): boolean {
  if (!schema || !schema.properties) return true;

  // Basic validation
  if (schema.properties.cpu && typeof data.cpu !== 'number') return false;
  if (schema.properties.mem && typeof data.mem !== 'string') return false;

  return true;
}

// Simple hash function
async function hashData(data: Uint8Array | string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// Simple compression (basic implementation)
async function zstdCompress(data: Uint8Array): Promise<Uint8Array> {
  // TODO: Use actual zstd compression library
  // For now, return as-is
  return data;
}

// Transform telemetry data
async function transformTelemetry(data: any): Promise<any> {
  return {
    ...data,
    transformed: true,
    transformTime: new Date().toISOString(),
    version: '1.3.0'
  };
}

// Start ETL pipeline
export const startETL = async (ws: WebSocket | null, data: any, type: string): Promise<ReadableStream> => {
  const config = YAML.parse(await file('bun.yaml').text());
  const { etl } = config.api;

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();

      try {
        // Validate telemetry payload
        if (type === 'TELEMETRY' && !validateTelemetry(data, etl.schema.telemetry)) {
          controller.error(new Error('Invalid telemetry schema'));
          return;
        }

        // Extract - convert data to appropriate format
        let raw: string;
        if (type === 'YAML') {
          raw = YAML.stringify(data);
        } else if (type === 'BINARY') {
          raw = data instanceof Uint8Array ? new TextDecoder().decode(data) : JSON.stringify(data);
        } else {
          raw = JSON.stringify(data);
        }

        // Compress
        const compressed = await zstdCompress(new TextEncoder().encode(raw));

        // Transform
        const transformed = await transformTelemetry(data);

        // Enqueue transformed data
        controller.enqueue(compressed);

        // Generate hash
        const hash = await hashData(compressed);

        // TODO: Load to registry
        // await registry.storeStream(compressed, {
        //   format: type.toLowerCase(),
        //   metadata: { etl_version: '1.3.0', timestamp: new Date().toISOString() },
        // });

        // Broadcast ETL completion if WebSocket provided
        if (ws) {
          ws.send(JSON.stringify({
            type: 'ETL_DONE',
            hash: hash,
            recordsProcessed: 1,
            duration: Date.now() - startTime
          }));
        }

        controller.close();

      } catch (error) {
        controller.error(error);
      }
    }
  });

  return stream;
};

// HTTP handler for ETL start endpoint
export const handle = async (req: Request) => {
  try {
    const body = await req.json();
    const validatedRequest = ETLStartRequest.parse(body);

    const { type, data, dataType } = validatedRequest;
    const effectiveType = dataType || type;

    // Start ETL stream
    const stream = await startETL(null, data, effectiveType);

    // Read stream to completion
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalSize += value.length;
    }

    const hash = await hashData(new Uint8Array(totalSize));

    const response = ETLStartResponse.parse({
      success: true,
      hash: hash,
      recordsProcessed: 1,
      duration: Date.now() - Date.now() // Simplified
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-ETL-Hash': hash,
        'X-ETL-Size': totalSize.toString()
      }
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
      error: 'ETL processing failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
