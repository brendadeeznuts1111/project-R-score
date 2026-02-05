import { z } from 'zod';

// **Enhanced schema** compatible with existing Odds-mono-map vault
export const EnhancedFrontMatter = z.object({
    // **Consciousness metrics** – auto-populated from runtime
    id: z.string().uuid().optional(),
    timestamp: z.string().datetime().optional(),
    consciousnessVersion: z.enum(['v1', 'v2']).default('v1'),
    drift: z.number().min(0).max(1).optional(),
    pressure: z.number().min(0).optional(),
    mode: z.enum(['lenient', 'adaptive', 'strict']).optional(),

    // **Existing vault fields** – maintain compatibility
    type: z.string().default('daily-note'),
    title: z.string().optional(),
    section: z.string().optional(),
    category: z.string().optional(),
    priority: z.union([
        z.enum(['low', 'medium', 'high', 'critical']),
        z.string()
    ]).default('medium'),
    status: z.union([
        z.enum(['draft', 'review', 'accepted', 'rejected', 'resolved', 'active']),
        z.string()
    ]).default('draft'),

    // **Tags** – support both string and array formats
    tags: z.union([
        z.array(z.string()),
        z.string().transform(val => val.split(',').map(t => t.trim()))
    ]).default([]),

    // **Links** – for Foam/Dataview
    links: z.array(z.string()).default([]),

    // **Metadata** – existing vault fields (optional for compatibility)
    created: z.string().optional(),
    updated: z.string().optional(),
    author: z.string().optional(),
    teamMember: z.string().optional(),
    fileVersion: z.string().optional(),
    dashboardType: z.string().optional(),
    relatedFiles: z.array(z.string()).optional(),
    validationRules: z.array(z.string()).optional(),
    templateVersion: z.string().optional(),
}).passthrough(); // Allow extra fields for compatibility

// **Strict consciousness schema** for new files
export const StrictConsciousnessFrontMatter = z.object({
    id: z.string().uuid().default(() => crypto.randomUUID()),
    timestamp: z.string().datetime().optional(),
    consciousnessVersion: z.enum(['v1', 'v2']).default('v1'),

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
        'schema-drift',
        'dashboard',
        'documentation',
        'template'
    ]),

    // **Tags** – for graph navigation
    tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),

    // **Links** – for Foam/Dataview
    links: z.array(z.string()).default([]),

    // **Status** – workflow state
    status: z.union([
        z.enum(['draft', 'review', 'accepted', 'rejected', 'resolved', 'active']),
        z.string()
    ]).default('draft'),

    // **Priority** – for triage
    priority: z.union([
        z.enum(['low', 'medium', 'high', 'critical']),
        z.string()
    ]).default('medium'),
}).passthrough(); // Allow extra fields for compatibility
