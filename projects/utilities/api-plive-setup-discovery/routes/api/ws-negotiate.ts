// routes/api/ws-negotiate.ts - Handshake for data types + topics
// WebSocket negotiation endpoint for subprotocol and data type handshake

import { file, YAML } from 'bun';
import { z } from 'zod';

const WSNegotiateRequest = z.object({
  requestedTopics: z.array(z.string()).optional(),
  preferredTypes: z.array(z.enum(['JSON', 'YAML', 'BINARY', 'TELEMETRY', 'STREAM'])).optional(),
  subprotocol: z.string().optional()
});

const WSNegotiateResponse = z.object({
  subprotocol: z.string(),
  supportedTypes: z.array(z.string()),
  assignedTopics: z.array(z.string()),
  compression: z.array(z.string()),
  heartbeatInterval: z.number(),
  wsUrl: z.string()
});

export const handle = async (req: Request) => {
  try {
    const body = await req.json();
    const request = WSNegotiateRequest.parse(body);

    const config = YAML.parse(await file('bun.yaml').text());
    const { connectivity } = config.api;

    // Determine supported data types
    const supportedTypes = request.preferredTypes 
      ? request.preferredTypes.filter(type => connectivity.ws.dataTypes.includes(type))
      : connectivity.ws.dataTypes;

    // Assign topics (auto-subscribe to requested ones)
    const assignedTopics = request.requestedTopics 
      ? request.requestedTopics.filter(topic => 
          connectivity.ws.topics.some((t: any) => 
            typeof t === 'string' ? t === topic : Object.keys(t)[0] === topic
          )
        )
      : ['telemetry.live']; // Default

    // Determine compression support
    const compression: string[] = [];
    if (connectivity.ws.compression.permessageDeflate) {
      compression.push('permessage-deflate');
    }
    if (connectivity.ws.compression.zstd) {
      compression.push('zstd');
    }

    // Build response
    const response = WSNegotiateResponse.parse({
      subprotocol: request.subprotocol || connectivity.ws.subprotocol,
      supportedTypes,
      assignedTopics,
      compression,
      heartbeatInterval: parseInt(connectivity.ws.heartbeat.interval) * 1000,
      wsUrl: `ws://localhost:${connectivity.ws.port}/ws/telemetry`
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
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
      error: 'Negotiation failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
