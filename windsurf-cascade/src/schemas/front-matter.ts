import { z } from 'zod';

// **Base schema** for all consciousness-aware notes
export const ConsciousnessFrontMatter = z.object({
    id: z.string().uuid().default(() => crypto.randomUUID()),
    timestamp: z.string().datetime().default(() => new Date().toISOString()),
    version: z.enum(['v1', 'v2']).default('v1'),

    // **Somatic metrics** – auto-populated from runtime
    drift: z.number().min(0).max(1).optional(),
    pressure: z.number().min(0).optional(),
    mode: z.enum(['lenient', 'adaptive', 'strict']).optional(),

    // **Classification** – for querying & trending
    type: z.enum([
        'daily-note',
        'incident',
        'adr',
        'refactor',
        'test-result',
        'mcp-event',
        'schema-drift'
    ]),

    // **Tags** – for graph navigation
    tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),

    // **Links** – for Foam/Dataview
    links: z.array(z.string()).default([]),

    // **Status** – workflow state
    status: z.enum(['draft', 'review', 'accepted', 'rejected', 'resolved']).default('draft'),

    // **Priority** – for triage
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
}).strict(); // No extra fields allowed
