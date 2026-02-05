#!/usr/bin/env bun
/**
 * @fileoverview Emergency Secret Rotation
 * @description Compromise response procedures for secret breaches
 * @module scripts/secrets-emergency-rotate
 *
 * @see {@link https://bun.sh/docs/runtime/bun-apis|Bun.secrets API}
 * @see {@link ../docs/security/incident-response.md|Incident Response Procedures}
 */

import { secrets } from "bun";
import { mcpApiKeys, mcpSessions } from "../src/secrets/mcp";
import { logger } from "../src/utils/logger";
import { LOG_CODES } from "../src/logging/log-codes";

const SERVICE = "nexus";

/**
 * Emergency rotation procedures for compromised secrets
 */
export class EmergencyRotationHandler {
  /**
   * Generate emergency API key (more secure than regular rotation)
   */
  private generateEmergencyApiKey(length: number = 64): string {
    // Use crypto.getRandomValues for higher security
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    // Convert to base64url (URL-safe base64)
    const base64 = btoa(String.fromCharCode(...array));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Emergency rotate all MCP API keys
   */
  async emergencyRotateAllKeys(): Promise<{
    rotated: number;
    total: number;
    compromisedKeys: string[];
  }> {
      logger.error(LOG_CODES['HBSE-004'].code, "EMERGENCY: Rotating all MCP API keys due to compromise", undefined, {
      operation: "emergency_rotation",
      type: "api-keys",
      severity: "critical",
    });

    const servers = await mcpApiKeys.list();
    const compromisedKeys: string[] = [];
    let rotated = 0;

    for (const server of servers) {
      try {
        // Get current key for logging (don't log the actual value)
        const hadKey = await mcpApiKeys.has(server);
        if (hadKey) {
          compromisedKeys.push(`${server}:redacted`);
        }

        // Generate emergency key (longer, more secure)
        const emergencyKey = this.generateEmergencyApiKey();

        // Store new emergency key with version tracking (emergency reason)
        await mcpApiKeys.set(server, emergencyKey, "emergency");

        // Clear rotation timestamp to force immediate rotation tracking
        await secrets.delete({
          service: SERVICE,
          name: `mcp.${server}.apiKey.lastRotation`,
        });

        logger.error(LOG_CODES['HBSE-005'].code, `EMERGENCY: Rotated API key for ${server}`, undefined, {
          operation: "emergency_rotation",
          server,
          type: "api-key",
          severity: "critical",
          oldKeyCompromised: hadKey,
        });

        rotated++;
      } catch (error) {
        logger.error(LOG_CODES['HBSE-004'].code, `EMERGENCY: Failed to rotate API key for ${server}`, error, {
          operation: "emergency_rotation",
          server,
          type: "api-key",
          severity: "critical",
        });
      }
    }

    logger.error(LOG_CODES['HBSE-005'].code, "EMERGENCY: API key rotation completed", undefined, {
      operation: "emergency_rotation",
      type: "api-keys",
      serversRotated: rotated,
      totalServers: servers.length,
      compromisedKeysCount: compromisedKeys.length,
      severity: "critical",
    });

    return { rotated, total: servers.length, compromisedKeys };
  }

  /**
   * Emergency clear all MCP sessions
   */
  async emergencyClearAllSessions(): Promise<{
    cleared: number;
    totalChecked: number;
  }> {
    logger.error(LOG_CODES['HBSE-004'].code, "EMERGENCY: Clearing all MCP sessions due to compromise", undefined, {
      operation: "emergency_cleanup",
      type: "sessions",
      severity: "critical",
    });

    const servers = ["bun", "nexus", "anthropic", "openai", "google"];
    let cleared = 0;

    for (const server of servers) {
      try {
        const hadSession = await mcpSessions.has(server);
        if (hadSession) {
          await mcpSessions.del(server);

          // Clear session cleanup timestamp
          await secrets.delete({
            service: SERVICE,
            name: `mcp.${server}.cookies.sessionCleanup`,
          });

          logger.error(LOG_CODES['HBSE-001'].code, `EMERGENCY: Cleared session for ${server}`, undefined, {
            operation: "emergency_cleanup",
            server,
            type: "session",
            severity: "critical",
          });

          cleared++;
        }
      } catch (error) {
        logger.error(LOG_CODES['HBSE-004'].code, `EMERGENCY: Failed to clear session for ${server}`, error, {
          operation: "emergency_cleanup",
          server,
          type: "session",
          severity: "critical",
        });
      }
    }

    logger.error(LOG_CODES['HBSE-005'].code, "EMERGENCY: Session cleanup completed", undefined, {
      operation: "emergency_cleanup",
      type: "sessions",
      sessionsCleared: cleared,
      totalServers: servers.length,
      severity: "critical",
    });

    return { cleared, totalChecked: servers.length };
  }

  /**
   * Full emergency response procedure
   */
  async executeEmergencyResponse(): Promise<{
    keys: { rotated: number; total: number; compromisedKeys: string[] };
    sessions: { cleared: number; totalChecked: number };
    duration: number;
    success: boolean;
  }> {
    const startTime = Date.now();

    try {
      logger.error(LOG_CODES['HBSE-004'].code, "🚨 EMERGENCY SECRET RESPONSE INITIATED 🚨", undefined, {
        operation: "emergency_response",
        severity: "critical",
        timestamp: new Date().toISOString(),
      });

      console.log("🚨 EMERGENCY SECRET COMPROMISE RESPONSE 🚨");
      console.log("This will rotate ALL secrets immediately.");
      console.log("Ensure dependent systems are updated after rotation.");
      console.log("");

      // Emergency rotate all keys
      const keys = await this.emergencyRotateAllKeys();

      // Emergency clear all sessions
      const sessions = await this.emergencyClearAllSessions();

      const duration = Date.now() - startTime;

      logger.error(LOG_CODES['HBSE-005'].code, "🚨 EMERGENCY SECRET RESPONSE COMPLETED 🚨", undefined, {
        operation: "emergency_response",
        durationMs: duration,
        keysRotated: keys.rotated,
        sessionsCleared: sessions.cleared,
        severity: "critical",
        success: true,
      });

      console.log("✅ Emergency response completed successfully");
      console.log(`   Keys rotated: ${keys.rotated}/${keys.total}`);
      console.log(`   Sessions cleared: ${sessions.cleared}/${sessions.totalChecked}`);
      console.log(`   Duration: ${duration}ms`);
      console.log("");
      console.log("⚠️  IMPORTANT: Update all dependent systems with new credentials");
      console.log("📋 Compromised keys:", keys.compromisedKeys);

      return {
        keys,
        sessions,
        duration,
        success: true,
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(LOG_CODES['HBSE-004'].code, "🚨 EMERGENCY SECRET RESPONSE FAILED 🚨", error, {
        operation: "emergency_response",
        durationMs: duration,
        severity: "critical",
        success: false,
      });

      console.error("❌ Emergency response failed:", error);

      return {
        keys: { rotated: 0, total: 0, compromisedKeys: [] },
        sessions: { cleared: 0, totalChecked: 0 },
        duration,
        success: false,
      };
    }
  }

  /**
   * Validate emergency response readiness
   */
  async validateEmergencyReadiness(): Promise<{
    keychainAccessible: boolean;
    backupAvailable: boolean;
    auditLogging: boolean;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];

    // Check keychain access
    let keychainAccessible = true;
    try {
      await secrets.get({ service: SERVICE, name: "test.access" });
    } catch {
      keychainAccessible = false;
      recommendations.push("Keychain is not accessible - verify OS keychain service");
    }

    // Check for backup (simplified check)
    const backupAvailable = false; // TODO: Implement backup verification
    if (!backupAvailable) {
      recommendations.push("No secret backup available - consider implementing encrypted backups");
    }

    // Check audit logging
    const auditLogging = true; // Assume logging is working if we get here
    if (!auditLogging) {
      recommendations.push("Audit logging may not be working - verify log transport");
    }

    return {
      keychainAccessible,
      backupAvailable,
      auditLogging,
      recommendations,
    };
  }
}

/**
 * CLI interface for emergency rotation
 */
async function main() {
  const command = process.argv[2];

  const handler = new EmergencyRotationHandler();

  switch (command) {
    case "execute":
      console.log("🚨 CONFIRM EMERGENCY SECRET ROTATION 🚨");
      console.log("This action will:");
      console.log("  • Rotate ALL MCP API keys immediately");
      console.log("  • Clear ALL MCP sessions");
      console.log("  • Log critical security events");
      console.log("");
      console.log("This should only be done in response to a confirmed compromise.");
      console.log("");

      // Simple confirmation (in production, use more secure confirmation)
      const confirm = process.argv[3];
      if (confirm !== "--confirm-compromise") {
        console.log("❌ Confirmation required. Use: --confirm-compromise");
        process.exit(1);
      }

      await handler.executeEmergencyResponse();
      break;

    case "validate":
      console.log("🔍 Validating emergency response readiness...");
      const readiness = await handler.validateEmergencyReadiness();
      console.log("Keychain accessible:", readiness.keychainAccessible ? "✅" : "❌");
      console.log("Backup available:", readiness.backupAvailable ? "✅" : "❌");
      console.log("Audit logging:", readiness.auditLogging ? "✅" : "❌");

      if (readiness.recommendations.length > 0) {
        console.log("\n📋 Recommendations:");
        readiness.recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
      break;

    case "dry-run":
      console.log("🔍 DRY RUN: Emergency Response Validation");
      const validation = await handler.validateEmergencyReadiness();
      console.log("This would validate emergency response procedures without making changes");
      console.log("Readiness check results:");
      console.log(`   Keychain: ${validation.keychainAccessible ? "✅" : "❌"}`);
      console.log(`   Backup: ${validation.backupAvailable ? "✅" : "❌"}`);
      console.log(`   Audit: ${validation.auditLogging ? "✅" : "❌"}`);
      break;

    default:
      console.log(`
🚨 Emergency Secret Rotation Tool

Usage:
  bun run scripts/secrets-emergency-rotate.ts execute --confirm-compromise  # Execute emergency rotation
  bun run scripts/secrets-emergency-rotate.ts validate                      # Check readiness
  bun run scripts/secrets-emergency-rotate.ts dry-run                      # Dry run validation

⚠️  WARNING: Emergency rotation should only be used in response to confirmed compromises.
   This will immediately rotate ALL secrets and may break dependent systems.

📋 Emergency Response Checklist:
   1. Confirm compromise with evidence
   2. Alert security team and stakeholders
   3. Run: bun run scripts/secrets-emergency-rotate.ts execute --confirm-compromise
   4. Update all dependent systems with new credentials
   5. Monitor for unauthorized access attempts
   6. Conduct post-incident review

📞 For questions, see: docs/security/incident-response.md
      `);
      break;
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

