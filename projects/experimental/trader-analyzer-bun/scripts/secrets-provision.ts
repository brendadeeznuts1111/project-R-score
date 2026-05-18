#!/usr/bin/env bun
/**
 * @fileoverview Secrets Provisioning Script
 * @description Seed initial secrets for production/staging environments
 * @module scripts/secrets-provision
 *
 * @see {@link https://bun.sh/docs/runtime/bun-apis|Bun.secrets API}
 * @see {@link ../docs/operators/secrets-management.md|Secrets Management Guide}
 */

import { secrets } from "bun";
import { parseArgs } from "util";
import { logger } from "../src/utils/logger";
import { LOG_CODES } from "../src/logging/log-codes";

const SERVICE = "nexus";

/**
 * Provision secrets for a specific environment
 */
async function provisionSecrets(environment: string): Promise<void> {
  console.info(`🔐 Provisioning secrets for environment: ${environment}\n`);

  const requiredSecrets = [
    { name: "mcp.bun.apiKey", description: "Bun MCP API key" },
    { name: "mcp.github.apiKey", description: "GitHub MCP API key" },
    { name: "mcp.nexus.apiKey", description: "Nexus MCP API key" },
  ];

  console.info("Required secrets:");
  for (const secret of requiredSecrets) {
    const exists = await secrets.get({ service: SERVICE, name: secret.name });
    if (exists) {
      console.info(`  ✅ ${secret.name} - Already provisioned`);
    } else {
      console.info(`  ⚠️  ${secret.name} - Missing (${secret.description})`);
    }
  }

  console.info("\n💡 To set missing secrets:");
  console.info("  bun run secrets:set --service=nexus --name=<secret-name> --value=<value>\n");

  if (environment === "production") {
    console.info("⚠️  PRODUCTION ENVIRONMENT:");
    console.info("  - Ensure all secrets are set before deployment");
    console.info("  - Verify access controls are configured");
    console.info("  - Test rotation cron is scheduled\n");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs({
    args,
    options: {
      environment: { type: "string", short: "e" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });

  if (parsed.values.help) {
    console.info(`
🔐 Secrets Provisioning Script

USAGE:
  bun run secrets:provision --environment=<env>

ENVIRONMENTS:
  - production  - Production environment secrets
  - staging     - Staging environment secrets
  - development - Development environment secrets

EXAMPLES:
  bun run secrets:provision --environment=production
  bun run secrets:provision --environment=staging

This script checks which secrets are provisioned and provides guidance
on setting missing secrets.
    `);
    return;
  }

  const environment = parsed.values.environment || "development";
  await provisionSecrets(environment);
}

if (import.meta.main) {
  main().catch((error) => {
    logger.error(LOG_CODES["HBSE-004"].code, "Secrets provisioning failed", error);
    console.error("❌ Failed to provision secrets");
    process.exit(1);
  });
}
