/**
 * @fileoverview MCP Secrets API Routes
 * @description REST API endpoints for MCP secrets management
 * @module src/api/mcp/secrets
 *
 * @see {@link https://bun.sh/docs/runtime/bun-apis|Bun.secrets API}
 * @see {@link ../../secrets/mcp|MCP Secrets Storage}
 */

import { secrets } from "bun";
import { mcpApiKeys, mcpSessions } from "../../secrets/mcp";
import { logger } from "../../utils/logger";
import { LOG_CODES } from "../../logging/log-codes";
import { recordSecretAccess } from "../../observability/metrics";

/**
 * Get MCP secrets status for all servers
 * GET /api/mcp/secrets
 */
export async function getMCPSecretsStatus(): Promise<Response> {
  try {
    const servers = await mcpApiKeys.list();

    const status = await Promise.all(
      servers.map(async (server) => {
        const hasApiKey = await mcpApiKeys.has(server);
        const hasCookies = await mcpSessions.has(server);
        return {
          server,
          hasApiKey,
          hasCookies,
        };
      })
    );

    return new Response(JSON.stringify({
      servers: status,
      totalConfigured: status.filter((s) => s.hasApiKey || s.hasCookies).length,
      totalServers: servers.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error(LOG_CODES['HBSE-004'].code, "Failed to get MCP secrets status", error);
    return new Response(JSON.stringify({ error: "Failed to get secrets status" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get MCP server API key
 * GET /api/mcp/secrets/:server/api-key
 */
export async function getMCPServerApiKey(req: Request, server: string): Promise<Response> {
  try {
    // Check if API key exists
    const hasKey = await mcpApiKeys.has(server);

    if (!hasKey) {
      return new Response(JSON.stringify({
        server,
        configured: false,
        message: `No API key configured for MCP server: ${server}`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the API key
    const apiKey = await mcpApiKeys.get(server);

    // Record successful read access
    recordSecretAccess(server, 'read', 'success');

    return new Response(JSON.stringify({
      server,
      configured: true,
      apiKey: apiKey ? "***" + apiKey.slice(-4) : null, // Mask the key
      message: `API key configured for MCP server: ${server}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error(LOG_CODES['HBSE-004'].code, "Failed to get API key", error);
    recordSecretAccess(server, 'read', 'error');
    return new Response(JSON.stringify({ error: "Failed to get API key" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Store MCP server API key
 * POST /api/mcp/secrets/:server/api-key
 */
export async function setMCPServerApiKey(req: Request, server: string): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));

    // Support both 'value' and 'apiKey' for backward compatibility
    const apiKeyValue = body.value || body.apiKey;

    if (!apiKeyValue || typeof apiKeyValue !== "string") {
      return new Response(JSON.stringify({
        error: "Invalid request",
        message: "API key value is required",
        code: LOG_CODES['HBSE-007'].code
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate secret format
    const { validateSecretValue } = await import("../../validation/secret-validator");
    if (!validateSecretValue(apiKeyValue, "api-key")) {
      return new Response(JSON.stringify({
        error: "Invalid API key format",
        message: "API key must be 32-128 characters and contain only alphanumeric characters, underscores, or hyphens",
        code: LOG_CODES['HBSE-007'].code
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await mcpApiKeys.set(server, apiKeyValue);

    // Log successful storage
    logger.info(LOG_CODES['HBSE-001'].code, `API key stored for MCP server: ${server}`, undefined, {
      action: 'secret_stored',
      service: server,
      type: 'api-key',
      actor: req.headers.get('x-operator-id') || 'unknown'
    });

    // Record successful write access
    recordSecretAccess(server, 'write', 'success');

    return new Response(JSON.stringify({
      success: true,
      server,
      message: `API key stored securely for ${server}`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error(LOG_CODES['HBSE-004'].code, "Failed to store API key", error);
    recordSecretAccess(server, 'write', 'error');
    return new Response(JSON.stringify({ error: "Failed to store API key" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Delete MCP server API key
 * DELETE /api/mcp/secrets/:server/api-key
 */
export async function deleteMCPServerApiKey(req: Request, server: string): Promise<Response> {
  try {
    // Check if key exists before deletion
    const exists = await mcpApiKeys.has(server);

    if (!exists) {
      logger.warn(LOG_CODES['HBSE-002'].code, `API key not found for MCP server: ${server}`, undefined, {
        action: 'secret_not_found',
        service: server,
        type: 'api-key'
      });

      return new Response(JSON.stringify({
        success: false,
        server,
        message: `No API key found for ${server}`,
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await mcpApiKeys.del(server);

    logger.info(LOG_CODES['HBSE-001'].code, `API key deleted for MCP server: ${server}`, undefined, {
      action: 'secret_deleted',
      service: server,
      type: 'api-key',
      actor: req.headers.get('x-operator-id') || 'unknown'
    });

    // Record successful delete access
    recordSecretAccess(server, 'delete', 'success');

    return new Response(JSON.stringify({
      success: true,
      server,
      message: `API key deleted for ${server}`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error(LOG_CODES['HBSE-004'].code, "Failed to delete API key", error);
    recordSecretAccess(server, 'delete', 'error');
    return new Response(JSON.stringify({ error: "Failed to delete API key" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get MCP secrets status for a specific server
 * GET /api/mcp/secrets/:server
 */
export async function getMCPServerStatus(server: string): Promise<Response> {
  try {
    const apiKey = await mcpApiKeys.get(server);
    const cookies = await mcpSessions.get(server);

    return new Response(JSON.stringify({
      server,
      hasApiKey: apiKey !== null,
      apiKeyLength: apiKey?.length || 0,
      apiKeyMasked: apiKey
        ? `${apiKey.slice(0, 4)}${"*".repeat(Math.max(0, apiKey.length - 8))}${apiKey.slice(-4)}`
        : null,
      hasCookies: cookies !== null,
      cookieCount: cookies ? Array.from(cookies).length : 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error(LOG_CODES['HBSE-004'].code, "Failed to get server secrets", error);
    return new Response(JSON.stringify({ error: "Failed to get server secrets" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}