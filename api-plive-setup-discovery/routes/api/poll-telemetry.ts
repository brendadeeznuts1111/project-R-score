// routes/api/poll-telemetry.ts - Polling backup for v2.9 compatibility
// HTTP polling fallback endpoint for clients that don't support WebSocket

import { file, YAML } from 'bun';
import { z } from 'zod';

const TelemetryPollResponse = z.object({
  telemetry: z.array(z.any()),
  timestamp: z.string(),
  nextPoll: z.number(),
  hasMore: z.boolean()
});

// In-memory telemetry buffer (replace with Redis/DB in production)
const telemetryBuffer: Array<{ data: any; timestamp: string }> = [];
const MAX_BUFFER_SIZE = 1000;

// Mock telemetry retrieval
function getTelemetrySince(lastTimestamp: string): any[] {
  if (!lastTimestamp) {
    return telemetryBuffer.slice(-10); // Last 10 entries
  }

  return telemetryBuffer.filter(item => item.timestamp > lastTimestamp);
}

export const handle = async (req: Request) => {
  try {
    const config = YAML.parse(await file('bun.yaml').text());
    const { connectivity } = config.api;
    const pollInterval = parseInt(connectivity.fallbacks.polling.interval) * 1000;

    const url = new URL(req.url);
    const lastTimestamp = url.searchParams.get('since') || '';

    // Get telemetry since last poll
    const telemetry = getTelemetrySince(lastTimestamp);
    const hasMore = telemetry.length >= 10; // Assume more if we got full batch

    const response = TelemetryPollResponse.parse({
      telemetry,
      timestamp: new Date().toISOString(),
      nextPoll: pollInterval,
      hasMore
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Poll-Interval': pollInterval.toString()
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Polling failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
