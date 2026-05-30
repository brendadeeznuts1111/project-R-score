#!/usr/bin/env bun
/**
 * Database Seeder
 *
 * Seeds the database with initial data after migrations have run.
 * Safe to run multiple times — uses INSERT OR IGNORE to prevent duplicates.
 *
 * Usage:
 *   bun run db:seed
 *   bun run db:reset  (runs migrate --reset + seed)
 */

import { getDb, closeDb } from "./index";
import { logHealth } from "@utils/tableLogger";

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SEED_TOKENS = [
  {
    token_id: "default-jwt-secret",
    token_type: "jwt_secret",
    token_hash: "[AUTO-GENERATED-ON-FIRST-BOOT]",
    scope: "system",
    description: "Auto-generated JWT secret — run generate-jwt-secret.ts",
    is_active: 1,
  },
];

const SEED_RULES = [
  {
    rule_id: "rule_high_win_rate",
    name: "High Win Rate Alert",
    description: "Flag players with >55% win rate over 50+ wagers",
    rule_type: "threshold",
    condition_json: JSON.stringify({ field: "winRate", operator: ">", value: 0.55, minWagers: 50 }),
    action_json: JSON.stringify({ type: "flag_for_review", params: { tier: "RED" } }),
    priority: 10,
    is_active: 1,
    tags_json: JSON.stringify(["risk", "win-rate"]),
  },
  {
    rule_id: "rule_steam_detection",
    name: "Steam Movement Detection",
    description: "Detect rapid odds movement across multiple books",
    rule_type: "pattern",
    condition_json: JSON.stringify({ field: "lineMovementSpeed", operator: ">", value: 3, unit: "ticks_per_minute" }),
    action_json: JSON.stringify({ type: "alert", params: { severity: "HIGH", notify: "telegram" } }),
    priority: 5,
    is_active: 1,
    tags_json: JSON.stringify(["steam", "odds"]),
  },
  {
    rule_id: "rule_vip_whale",
    name: "VIP Whale Detection",
    description: "Tag high-balance, high-volume players as whales",
    rule_type: "threshold",
    condition_json: JSON.stringify({ field: "balance", operator: ">", value: 10000000 }),
    action_json: JSON.stringify({ type: "tag_archetype", params: { archetype: "whale" } }),
    priority: 20,
    is_active: 1,
    tags_json: JSON.stringify(["archetype", "vip"]),
  },
];

const SEED_WEBHOOK_CONFIGS = [
  {
    webhook_id: "default-risk-alerts",
    name: "Default Risk Alert Webhook",
    url: "http://localhost:3001/webhooks/risk",
    method: "POST",
    event_types_json: JSON.stringify(["risk_alert", "enforcement_alert"]),
    retry_policy_json: JSON.stringify({ max_retries: 3, backoff_ms: 1000 }),
    is_active: 0, // Disabled by default
    timeout_ms: 5000,
  },
];

const SEED_RISK_CONFIG = [
  {
    config_key: "max_exposure_default",
    config_value: "5000000",
    config_type: "integer",
    description: "Default max exposure per player (cents)",
  },
  {
    config_key: "alert_threshold_high",
    config_value: "0.75",
    config_type: "float",
    description: "Risk score threshold for HIGH alert",
  },
  {
    config_key: "alert_threshold_critical",
    config_value: "0.90",
    config_type: "float",
    description: "Risk score threshold for CRITICAL alert",
  },
  {
    config_key: "auto_enforce_enabled",
    config_value: "false",
    config_type: "boolean",
    description: "Enable automatic limit enforcement",
  },
];

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

function seedTokens(db: ReturnType<typeof getDb>): void {
  const insert = db.query(`
    INSERT OR IGNORE INTO tokens (token_id, token_type, token_hash, scope, description, is_active)
    VALUES ($token_id, $token_type, $token_hash, $scope, $description, $is_active)
  `);

  for (const token of SEED_TOKENS) {
    insert.run(token as any);
  }

  logHealth({ component: "Seed", table: "tokens", count: SEED_TOKENS.length });
}

function seedRules(db: ReturnType<typeof getDb>): void {
  const insert = db.query(`
    INSERT OR IGNORE INTO rules (
      rule_id, name, description, rule_type, condition_json, action_json,
      priority, is_active, tags_json
    ) VALUES (
      $rule_id, $name, $description, $rule_type, $condition_json, $action_json,
      $priority, $is_active, $tags_json
    )
  `);

  for (const rule of SEED_RULES) {
    insert.run(rule as any);
  }

  logHealth({ component: "Seed", table: "rules", count: SEED_RULES.length });
}

function seedWebhookConfigs(db: ReturnType<typeof getDb>): void {
  const insert = db.query(`
    INSERT OR IGNORE INTO webhook_configs (
      webhook_id, name, url, method, event_types_json, retry_policy_json, is_active, timeout_ms
    ) VALUES (
      $webhook_id, $name, $url, $method, $event_types_json, $retry_policy_json, $is_active, $timeout_ms
    )
  `);

  for (const config of SEED_WEBHOOK_CONFIGS) {
    insert.run(config as any);
  }

  logHealth({ component: "Seed", table: "webhook_configs", count: SEED_WEBHOOK_CONFIGS.length });
}

function seedRiskConfig(db: ReturnType<typeof getDb>): void {
  // risk_config may not exist in all migration sets, so wrap in try/catch
  try {
    const insert = db.query(`
      INSERT OR IGNORE INTO risk_config (config_key, config_value, config_type, description)
      VALUES ($config_key, $config_value, $config_type, $description)
    `);

    for (const config of SEED_RISK_CONFIG) {
      insert.run(config as any);
    }

    logHealth({ component: "Seed", table: "risk_config", count: SEED_RISK_CONFIG.length });
  } catch {
    logHealth({ component: "Seed", table: "risk_config", status: "skipped" });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("🌱 Seeding database...\n");

  try {
    const db = getDb();

    seedTokens(db);
    seedRules(db);
    seedWebhookConfigs(db);
    seedRiskConfig(db);

    console.log("\n✅ Seeding complete.");
    logHealth({ component: "Seed", status: "complete" });

    closeDb();
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ Seeding failed: ${err.message}`);
    closeDb();
    process.exit(1);
  }
}

main();
