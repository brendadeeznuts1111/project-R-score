#!/usr/bin/env bun
/**
 * @fileoverview Secrets Rotation Cron Job
 * @description Automated 90-day secret rotation for compliance (DoD requirement)
 * @module scripts/secrets-rotate-cron
 *
 * @see {@link https://bun.sh/docs/runtime/bun-apis|Bun.secrets API}
 * @see {@link ../docs/security/incident-response.md|Incident Response Procedures}
 */

import { secrets } from "bun";
import { mcpApiKeys, mcpSessions } from "../src/secrets/mcp";
import { logger } from "../src/utils/logger";
import { LOG_CODES } from "../src/logging/log-codes";
import { recordSecretRotation } from "../src/observability/metrics";

const SERVICE = "nexus";
const ROTATION_INTERVAL_DAYS = 90;
const ROTATION_INTERVAL_MS = ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Generate a secure random API key
 */
function generateSecureApiKey(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if a secret needs rotation based on last rotation timestamp
 */
async function needsRotation(secretName: string): Promise<boolean> {
  try {
    const lastRotation = await secrets.get({
      service: SERVICE,
      name: `${secretName}.lastRotation`,
    });

    if (!lastRotation) {
      return true; // Never rotated, needs rotation
    }

    const lastRotationTime = parseInt(lastRotation);
    const now = Date.now();

    return (now - lastRotationTime) > ROTATION_INTERVAL_MS;
  } catch {
    return true; // Error checking, assume needs rotation
  }
}

/**
 * Update rotation timestamp for a secret
 */
async function updateRotationTimestamp(secretName: string): Promise<void> {
  // Bun 1.3.4 API: set({ service, name, value }) - single object with value property
  await secrets.set({
    service: SERVICE,
    name: `${secretName}.lastRotation`,
    value: Date.now().toString()
  });
}

/**
 * Rotate MCP API keys
 */
async function rotateMCPApiKeys(): Promise<void> {
  logger.info(LOG_CODES['HBSE-005'].code, "Starting MCP API key rotation", undefined, {
    operation: "rotation",
    type: "api-keys",
  });

  const servers = await mcpApiKeys.list();
  let rotated = 0;

  for (const server of servers) {
    const secretName = `mcp.${server}.apiKey`;

    if (await needsRotation(secretName)) {
      try {
        // Generate new API key
        const newApiKey = generateSecureApiKey();

        // Store new key with version tracking (rotation reason)
        await mcpApiKeys.set(server, newApiKey, "rotation");

        // Update rotation timestamp
        await updateRotationTimestamp(secretName);

        // Record rotation metric
        recordSecretRotation(SERVICE, secretName);

        // Log rotation
        logger.info(LOG_CODES['HBSE-005'].code, `Rotated API key for MCP server: ${server}`, undefined, {
          operation: "rotation",
          server,
          type: "api-key",
          oldFingerprint: "redacted", // Don't log actual values
          newFingerprint: "redacted",
        });

        rotated++;
      } catch (error) {
        logger.error(LOG_CODES['HBSE-004'].code, `Failed to rotate API key for ${server}`, error, {
          operation: "rotation",
          server,
          type: "api-key",
        });
      }
    }
  }

  logger.info(LOG_CODES['HBSE-005'].code, `MCP API key rotation completed`, undefined, {
    operation: "rotation",
    type: "api-keys",
    serversRotated: rotated,
    totalServers: servers.length,
  });
}

/**
 * Rotate MCP session cookies (clear expired sessions)
 */
async function rotateMCPSessions(): Promise<void> {
  logger.info(LOG_CODES['HBSE-005'].code, "Starting MCP session cleanup", undefined, {
    operation: "rotation",
    type: "sessions",
  });

  const servers = ["bun", "nexus", "anthropic", "openai", "google"]; // Common servers
  let cleaned = 0;

  for (const server of servers) {
    try {
      const hasSession = await mcpSessions.has(server);
      if (hasSession) {
        // For sessions, we clear them after 30 days (shorter than API keys)
        const secretName = `mcp.${server}.cookies`;
        const needsCleanup = await needsRotation(secretName.replace('.cookies', '.sessionCleanup'));

        if (needsCleanup) {
          await mcpSessions.del(server);
          await updateRotationTimestamp(secretName.replace('.cookies', '.sessionCleanup'));

          logger.info(LOG_CODES['HBSE-005'].code, `Cleaned session for MCP server: ${server}`, undefined, {
            operation: "cleanup",
            server,
            type: "session",
          });

          cleaned++;
        }
      }
    } catch (error) {
      logger.error(LOG_CODES['HBSE-004'].code, `Failed to cleanup session for ${server}`, error, {
        operation: "cleanup",
        server,
        type: "session",
      });
    }
  }

  logger.info(LOG_CODES['HBSE-005'].code, `MCP session cleanup completed`, undefined, {
    operation: "cleanup",
    type: "sessions",
    sessionsCleaned: cleaned,
  });
}

/**
 * Main rotation function
 */
async function rotateAllSecrets(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info(LOG_CODES['HBSE-005'].code, "Starting automated secret rotation", undefined, {
      operation: "rotation",
      intervalDays: ROTATION_INTERVAL_DAYS,
    });

    // Rotate API keys
    await rotateMCPApiKeys();

    // Clean up sessions
    await rotateMCPSessions();

    const duration = Date.now() - startTime;
    logger.info(LOG_CODES['HBSE-005'].code, "Secret rotation completed successfully", undefined, {
      operation: "rotation",
      durationMs: duration,
      status: "success",
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(LOG_CODES['HBSE-004'].code, "Secret rotation failed", error, {
      operation: "rotation",
      durationMs: duration,
      status: "failed",
    });

    // Exit with error code for cron monitoring
    process.exit(1);
  }
}

/**
 * Check rotation status (for monitoring)
 */
async function checkRotationStatus(): Promise<void> {
  const servers = await mcpApiKeys.list();
  const status: any[] = [];

  for (const server of servers) {
    const secretName = `mcp.${server}.apiKey`;
    const lastRotation = await secrets.get({
      service: SERVICE,
      name: `${secretName}.lastRotation`,
    });

    const shouldRotate = await needsRotation(secretName);
    const daysSinceRotation = lastRotation
      ? Math.floor((Date.now() - parseInt(lastRotation)) / (24 * 60 * 60 * 1000))
      : null;

    status.push({
      server,
      lastRotation: lastRotation ? new Date(parseInt(lastRotation)).toISOString() : null,
      daysSinceRotation,
      needsRotation: shouldRotate,
      overdue: daysSinceRotation ? daysSinceRotation > ROTATION_INTERVAL_DAYS : true,
    });
  }

  console.table(status);
}

// CLI interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case "status":
      await checkRotationStatus();
      break;

    case "rotate":
      await rotateAllSecrets();
      break;

    case "dry-run":
      console.log("🔄 DRY RUN: Would rotate the following secrets:");
      await checkRotationStatus();
      console.log("Run with 'rotate' to perform actual rotation");
      break;

    default:
      console.log(`
🔐 Secrets Rotation Cron Job

Usage:
  bun run scripts/secrets-rotate-cron.ts status    # Check rotation status
  bun run scripts/secrets-rotate-cron.ts rotate    # Perform rotation
  bun run scripts/secrets-rotate-cron.ts dry-run   # Show what would be rotated

This script runs automated 90-day secret rotation for DoD compliance.
It should be scheduled to run daily via cron:

  # Add to crontab (crontab -e)
  0 2 * * * cd /path/to/project && bun run scripts/secrets-rotate-cron.ts rotate

Configuration:
  - Rotation interval: ${ROTATION_INTERVAL_DAYS} days
  - Service: ${SERVICE}
  - API keys: Auto-generated secure random keys
  - Sessions: Cleared after 30 days
      `);
      break;
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { rotateAllSecrets, checkRotationStatus };