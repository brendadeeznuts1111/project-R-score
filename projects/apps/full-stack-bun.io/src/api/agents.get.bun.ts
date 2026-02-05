/**
 * Agents API Endpoint
 * GET /api/agents - List and query agents
 */

import { structuredLog } from "../shared/utils";
import { Database } from "bun:sqlite";
import { z } from "zod";
import { inspect } from "bun";

const querySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

export async function GET(request: Request) {
  const startTime = performance.now();

  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);

    const query = querySchema.parse(queryParams);

    const db = new Database("agents.db", { readonly: true });

    // Build dynamic query
    let sql = `
      SELECT id, name, type, scope, status, parent, created_at, updated_at
      FROM agents
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query.type) {
      sql += " AND type = ?";
      params.push(query.type);
    }

    if (query.status) {
      sql += " AND status = ?";
      params.push(query.status);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(query.limit, query.offset);

    const agents = db.query(sql).all(...params);

    // Get total count for pagination
    let countSql = "SELECT COUNT(*) as total FROM agents WHERE 1=1";
    const countParams: any[] = [];

    if (query.type) {
      countSql += " AND type = ?";
      countParams.push(query.type);
    }

    if (query.status) {
      countSql += " AND status = ?";
      countParams.push(query.status);
    }

    const totalResult = db.query(countSql).get(...countParams) as { total: number };

    db.close();

    const responseTime = performance.now() - startTime;

    const response = {
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        scope: agent.scope,
        status: agent.status,
        parent: agent.parent,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      })),
      pagination: {
        total: totalResult.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: (query.offset + query.limit) < totalResult.total
      },
      metadata: {
        responseTime: `${responseTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    };

    structuredLog("Agents query completed", {
      count: agents.length,
      total: totalResult.total,
      filters: { type: query.type, status: query.status },
      responseTime
    });

    return Response.json(response, {
      headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
    });

  } catch (error) {
    const responseTime = performance.now() - startTime;

    structuredLog("Agents query failed", { error: inspect(error), responseTime });

    if (error instanceof z.ZodError) {
      return Response.json({
        error: "Invalid query parameters",
        details: error.errors
      }, {
        status: 400,
        headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
      });
    }

    return Response.json({
      error: "Failed to query agents",
      details: error.message
    }, {
      status: 500,
      headers: { "x-response-time": `${responseTime.toFixed(2)}ms` }
    });
  }
}
