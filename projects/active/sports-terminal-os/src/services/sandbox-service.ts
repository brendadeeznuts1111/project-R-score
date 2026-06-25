/**
 * Sandbox Service
 *
 * Provides isolated A/B testing, scenario simulation, and customer modeling.
 * All sandbox data is stored in dedicated tables completely separate from
 * production data. Supports scenario replay, customer simulation, and
 * AI-generated summary reports.
 *
 * Tables: sandbox_scenarios_v2, sandbox_customers, sandbox_snapshots,
 *         sandbox_ab_tests_v2, sandbox_summary_queue_v2
 */

import { getDb } from "@db/index";
import { logHealth, logCron } from "@utils/tableLogger";
import type { Database, SQLQueryBindings } from "bun:sqlite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScenarioType = "a_b_test" | "simulation" | "regression" | "stress";
export type ScenarioStatus = "draft" | "ready" | "running" | "completed" | "failed";
export type ABTestStatus = "draft" | "running" | "paused" | "completed";
export type ABWinner = "a" | "b" | "tie" | "inconclusive";

export interface SandboxScenario {
  id: number;
  scenarioId: string;
  name: string;
  description?: string;
  scenarioType: ScenarioType;
  config: Record<string, unknown>;
  isActive: boolean;
  runCount: number;
  lastRunAt?: number;
  lastResult?: Record<string, unknown>;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SandboxCustomer {
  id: number;
  customerId: string;
  scenarioId: string;
  name?: string;
  email?: string;
  archetype: string;
  balance: number;
  riskTier: string;
  config?: Record<string, unknown>;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SandboxSnapshot {
  id: number;
  snapshotId: string;
  scenarioId: string;
  customerId?: string;
  snapshotType: string;
  label?: string;
  state: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  createdBy?: string;
  createdAt: number;
}

export interface ABTest {
  id: number;
  testId: string;
  scenarioId: string;
  name: string;
  description?: string;
  variantA: Record<string, unknown>;
  variantB: Record<string, unknown>;
  status: ABTestStatus;
  winner?: ABWinner;
  sampleSizeA: number;
  sampleSizeB: number;
  metricName?: string;
  results?: Record<string, unknown>;
  startedAt?: number;
  endedAt?: number;
  createdBy?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface ABTestResult {
  testId: string;
  variantA: {
    sampleSize: number;
    conversionRate: number;
    avgRevenue: number;
    confidenceInterval: [number, number];
  };
  variantB: {
    sampleSize: number;
    conversionRate: number;
    avgRevenue: number;
    confidenceInterval: [number, number];
  };
  pValue: number;
  winner: ABWinner;
  liftPct: number;
  isStatisticallySignificant: boolean;
  generatedAt: number;
}

export interface SandboxSummary {
  id: number;
  testId: string;
  scenarioId: string;
  status: "pending" | "processing" | "completed" | "failed";
  priority: number;
  promptText?: string;
  summaryText?: string;
  modelUsed?: string;
  tokensUsed?: number;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  processedAt?: number;
  createdAt: number;
}

export interface CreateScenarioInput {
  name: string;
  description?: string;
  scenarioType: ScenarioType;
  config: Record<string, unknown>;
  createdBy?: string;
}

export interface CreateABTestInput {
  scenarioId: string;
  name: string;
  description?: string;
  variantA: Record<string, unknown>;
  variantB: Record<string, unknown>;
  metricName?: string;
  createdBy?: string;
}

// ---------------------------------------------------------------------------
// Scenario CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new sandbox scenario.
 */
export function createScenario(input: CreateScenarioInput): SandboxScenario {
  const db = getDb();
  const scenarioId = `scn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    db.run(
      `INSERT INTO sandbox_scenarios_v2
       (scenario_id, name, description, scenario_type, config_json, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scenarioId,
        input.name,
        input.description || null,
        input.scenarioType,
        JSON.stringify(input.config),
        input.createdBy || null,
        now,
        now,
      ]
    );

    const row = db
      .query("SELECT * FROM sandbox_scenarios_v2 WHERE scenario_id = ?")
      .get(scenarioId) as Record<string, unknown> | null;

    if (!row) throw new Error("Failed to retrieve created scenario");

    logHealth({
      component: "Sandbox",
      status: "ok",
      table: "sandbox_scenarios_v2",
      count: 1,
    });

    return rowToScenario(row);
  } catch (err: any) {
    logHealth({
      component: "Sandbox",
      status: "error",
      error: `createScenario failed: ${err.message}`,
    });
    throw err;
  }
}

/**
 * Get a scenario by its scenarioId.
 */
export function getScenario(scenarioId: string): SandboxScenario | null {
  const db = getDb();
  const row = db
    .query("SELECT * FROM sandbox_scenarios_v2 WHERE scenario_id = ?")
    .get(scenarioId) as Record<string, unknown> | null;

  return row ? rowToScenario(row) : null;
}

/**
 * List all scenarios with optional filtering.
 */
export function listScenarios(
  opts: { type?: ScenarioType; active?: boolean; limit?: number; offset?: number } = {}
): { items: SandboxScenario[]; total: number } {
  const db = getDb();
  const conditions: string[] = ["1=1"];
  const params: SQLQueryBindings[] = [];

  if (opts.type) {
    conditions.push("scenario_type = ?");
    params.push(opts.type);
  }
  if (opts.active !== undefined) {
    conditions.push("is_active = ?");
    params.push(opts.active ? 1 : 0);
  }

  const whereClause = conditions.join(" AND ");

  const countRow = db
    .query(`SELECT COUNT(*) as total FROM sandbox_scenarios_v2 WHERE ${whereClause}`)
    .get(...params) as { total: number } | null;

  let sql = `SELECT * FROM sandbox_scenarios_v2 WHERE ${whereClause} ORDER BY created_at DESC`;
  if (opts.limit) {
    sql += " LIMIT ?";
    params.push(opts.limit);
  }
  if (opts.offset) {
    sql += " OFFSET ?";
    params.push(opts.offset);
  }

  const rows = db.query(sql).all(...params) as Record<string, unknown>[];

  return {
    items: rows.map(rowToScenario),
    total: countRow?.total || 0,
  };
}

/**
 * Run a scenario: execute its simulation and store results.
 */
export function runScenario(scenarioId: string): SandboxScenario {
  const db = getDb();
  const scenario = getScenario(scenarioId);
  if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);

  const now = Math.floor(Date.now() / 1000);

  try {
    // Update status to running
    db.run(
      "UPDATE sandbox_scenarios_v2 SET is_active = 1, last_run_at = ?, updated_at = ? WHERE scenario_id = ?",
      [now, now, scenarioId]
    );

    // Simulate execution based on scenario type
    const simulationResult = simulateScenario(scenario);

    // Store results
    const resultJson = JSON.stringify(simulationResult);
    db.run(
      `UPDATE sandbox_scenarios_v2
       SET last_result_json = ?, run_count = run_count + 1, updated_at = ?
       WHERE scenario_id = ?`,
      [resultJson, now, scenarioId]
    );

    // Store a snapshot
    createSnapshot({
      scenarioId,
      snapshotType: "post_test",
      label: `Run at ${new Date().toISOString()}`,
      state: simulationResult,
      metrics: { durationMs: simulationResult.durationMs, customerCount: simulationResult.customerCount },
    });

    logCron({
      jobName: "sandbox_run",
      recordsProcessed: simulationResult.customerCount as number,
      durationMs: simulationResult.durationMs as number,
    });

    return getScenario(scenarioId)!;
  } catch (err: any) {
    logHealth({
      component: "Sandbox",
      status: "error",
      error: `runScenario failed: ${err.message}`,
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// A/B Testing
// ---------------------------------------------------------------------------

/**
 * Create a new A/B test.
 */
export function createABTest(input: CreateABTestInput): ABTest {
  const db = getDb();
  const testId = `abt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    db.run(
      `INSERT INTO sandbox_ab_tests_v2
       (test_id, scenario_id, name, description, variant_a_json, variant_b_json, metric_name, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testId,
        input.scenarioId,
        input.name,
        input.description || null,
        JSON.stringify(input.variantA),
        JSON.stringify(input.variantB),
        input.metricName || null,
        input.createdBy || null,
        now,
        now,
      ]
    );

    const row = db
      .query("SELECT * FROM sandbox_ab_tests_v2 WHERE test_id = ?")
      .get(testId) as Record<string, unknown> | null;

    if (!row) throw new Error("Failed to retrieve created A/B test");

    return rowToABTest(row);
  } catch (err: any) {
    logHealth({
      component: "Sandbox",
      status: "error",
      error: `createABTest failed: ${err.message}`,
    });
    throw err;
  }
}

/**
 * Get an A/B test by testId.
 */
export function getABTest(testId: string): ABTest | null {
  const db = getDb();
  const row = db
    .query("SELECT * FROM sandbox_ab_tests_v2 WHERE test_id = ?")
    .get(testId) as Record<string, unknown> | null;

  return row ? rowToABTest(row) : null;
}

/**
 * List A/B tests with optional filtering.
 */
export function listABTests(
  opts: { scenarioId?: string; status?: ABTestStatus; limit?: number; offset?: number } = {}
): { items: ABTest[]; total: number } {
  const db = getDb();
  const conditions: string[] = ["1=1"];
  const params: SQLQueryBindings[] = [];

  if (opts.scenarioId) {
    conditions.push("scenario_id = ?");
    params.push(opts.scenarioId);
  }
  if (opts.status) {
    conditions.push("status = ?");
    params.push(opts.status);
  }

  const whereClause = conditions.join(" AND ");

  const countRow = db
    .query(`SELECT COUNT(*) as total FROM sandbox_ab_tests_v2 WHERE ${whereClause}`)
    .get(...params) as { total: number } | null;

  let sql = `SELECT * FROM sandbox_ab_tests_v2 WHERE ${whereClause} ORDER BY created_at DESC`;
  if (opts.limit) {
    sql += " LIMIT ?";
    params.push(opts.limit);
  }
  if (opts.offset) {
    sql += " OFFSET ?";
    params.push(opts.offset);
  }

  const rows = db.query(sql).all(...params) as Record<string, unknown>[];

  return {
    items: rows.map(rowToABTest),
    total: countRow?.total || 0,
  };
}

/**
 * Compute A/B test results with statistical significance.
 */
export function getABResults(testId: string): ABTestResult | null {
  const test = getABTest(testId);
  if (!test) return null;

  // Generate statistically valid results from stored metrics
  const resultsA = test.results?.variantA as Record<string, number> | undefined;
  const resultsB = test.results?.variantB as Record<string, number> | undefined;

  if (!resultsA || !resultsB) {
    // Generate synthetic results based on variant config
    return generateSyntheticABResult(test);
  }

  const conversionA = resultsA.conversionRate || 0.05;
  const conversionB = resultsB.conversionRate || 0.06;
  const nA = test.sampleSizeA || 1000;
  const nB = test.sampleSizeB || 1000;

  // Z-test for proportions
  const seA = Math.sqrt((conversionA * (1 - conversionA)) / nA);
  const seB = Math.sqrt((conversionB * (1 - conversionB)) / nB);
  const z = (conversionB - conversionA) / Math.sqrt(seA ** 2 + seB ** 2);

  // Approximate p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const isSignificant = pValue < 0.05;

  let winner: ABWinner = "inconclusive";
  if (isSignificant) {
    winner = conversionB > conversionA ? "b" : "a";
  } else if (Math.abs(conversionB - conversionA) < 0.001) {
    winner = "tie";
  }

  const liftPct = conversionA > 0 ? ((conversionB - conversionA) / conversionA) * 100 : 0;

  return {
    testId,
    variantA: {
      sampleSize: nA,
      conversionRate: conversionA,
      avgRevenue: resultsA.avgRevenue || 0,
      confidenceInterval: [
        Math.max(0, conversionA - 1.96 * seA),
        Math.min(1, conversionA + 1.96 * seA),
      ],
    },
    variantB: {
      sampleSize: nB,
      conversionRate: conversionB,
      avgRevenue: resultsB.avgRevenue || 0,
      confidenceInterval: [
        Math.max(0, conversionB - 1.96 * seB),
        Math.min(1, conversionB + 1.96 * seB),
      ],
    },
    pValue,
    winner,
    liftPct,
    isStatisticallySignificant: isSignificant,
    generatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Customer Simulation
// ---------------------------------------------------------------------------

/**
 * Create simulated customers for a scenario.
 */
export function createSimulatedCustomers(
  scenarioId: string,
  count: number
): SandboxCustomer[] {
  const db = getDb();
  const scenario = getScenario(scenarioId);
  if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);

  const now = Math.floor(Date.now() / 1000);
  const archetypes = ["recreational", "sharp", "whale", "chase_gambler", "new"];
  const tiers = ["GREEN", "YELLOW", "RED", "BLACK"];
  const customers: SandboxCustomer[] = [];

  try {
    for (let i = 0; i < count; i++) {
      const customerId = `sim_${scenarioId}_${i}_${Date.now()}`;
      const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
      const riskTier = tiers[Math.floor(Math.random() * tiers.length)];
      const balance = Math.floor(Math.random() * 1000000) + 10000;

      db.run(
        `INSERT INTO sandbox_customers
         (customer_id, scenario_id, name, email, archetype, balance, risk_tier, config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          scenarioId,
          `Simulated Player ${i + 1}`,
          `sim${i + 1}@sandbox.local`,
          archetype,
          balance,
          riskTier,
          JSON.stringify({ index: i, seed: Math.random() }),
          now,
          now,
        ]
      );

      const row = db
        .query("SELECT * FROM sandbox_customers WHERE customer_id = ?")
        .get(customerId) as Record<string, unknown>;

      customers.push(rowToCustomer(row));
    }

    logHealth({
      component: "Sandbox",
      status: "ok",
      table: "sandbox_customers",
      count,
    });

    return customers;
  } catch (err: any) {
    logHealth({
      component: "Sandbox",
      status: "error",
      error: `createSimulatedCustomers failed: ${err.message}`,
    });
    throw err;
  }
}

/**
 * Get customer simulation results.
 */
export function getCustomerResults(
  scenarioId: string
): { customers: SandboxCustomer[]; metrics: Record<string, unknown> } {
  const db = getDb();

  const rows = db
    .query("SELECT * FROM sandbox_customers WHERE scenario_id = ?")
    .all(scenarioId) as Record<string, unknown>[];

  const customers = rows.map(rowToCustomer);

  // Compute aggregate metrics
  const metrics = {
    totalCustomers: customers.length,
    avgBalance: customers.length > 0 ? customers.reduce((s, c) => s + c.balance, 0) / customers.length : 0,
    byArchetype: {} as Record<string, number>,
    byRiskTier: {} as Record<string, number>,
  };

  for (const c of customers) {
    metrics.byArchetype[c.archetype] = (metrics.byArchetype[c.archetype] || 0) + 1;
    metrics.byRiskTier[c.riskTier] = (metrics.byRiskTier[c.riskTier] || 0) + 1;
  }

  return { customers, metrics };
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export interface CreateSnapshotInput {
  scenarioId: string;
  customerId?: string;
  snapshotType: string;
  label?: string;
  state: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  createdBy?: string;
}

/**
 * Create a snapshot of sandbox state.
 */
export function createSnapshot(input: CreateSnapshotInput): SandboxSnapshot {
  const db = getDb();
  const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO sandbox_snapshots
     (snapshot_id, scenario_id, customer_id, snapshot_type, label, state_json, metrics_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshotId,
      input.scenarioId,
      input.customerId || null,
      input.snapshotType,
      input.label || null,
      JSON.stringify(input.state),
      JSON.stringify(input.metrics || {}),
      now,
    ]
  );

  const row = db
    .query("SELECT * FROM sandbox_snapshots WHERE snapshot_id = ?")
    .get(snapshotId) as Record<string, unknown>;

  return rowToSnapshot(row);
}

/**
 * Get snapshots for a scenario.
 */
export function getSnapshots(scenarioId: string): SandboxSnapshot[] {
  const db = getDb();
  const rows = db
    .query("SELECT * FROM sandbox_snapshots WHERE scenario_id = ? ORDER BY created_at DESC")
    .all(scenarioId) as Record<string, unknown>[];

  return rows.map(rowToSnapshot);
}

// ---------------------------------------------------------------------------
// Summary Generation
// ---------------------------------------------------------------------------

/**
 * Queue a summary generation job for an A/B test.
 */
export function queueSummary(testId: string, scenarioId: string): SandboxSummary {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO sandbox_summary_queue_v2
     (test_id, scenario_id, status, priority, prompt_text, created_at)
     VALUES (?, ?, 'pending', 100, ?, ?)`,
    [testId, scenarioId, `Generate summary for A/B test ${testId}`, now]
  );

  const row = db
    .query("SELECT * FROM sandbox_summary_queue_v2 WHERE test_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(testId) as Record<string, unknown>;

  return rowToSummary(row);
}

/**
 * Generate summaries for pending items in the queue.
 */
export function generateSummaries(): { processed: number; errors: number } {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  let processed = 0;
  let errors = 0;

  try {
    const pending = db
      .query(
        "SELECT * FROM sandbox_summary_queue_v2 WHERE status = 'pending' AND attempts < max_attempts ORDER BY priority, created_at LIMIT 10"
      )
      .all() as Record<string, unknown>[];

    for (const row of pending) {
      const summary = rowToSummary(row);

      try {
        db.run(
          "UPDATE sandbox_summary_queue_v2 SET status = 'processing', attempts = attempts + 1 WHERE id = ?",
          [summary.id]
        );

        // Generate summary text based on test results
        const test = getABTest(summary.testId);
        const results = test ? getABResults(summary.testId) : null;

        let summaryText = "A/B Test Summary\n================\n\n";
        if (test) {
          summaryText += `Test: ${test.name}\n`;
          summaryText += `Status: ${test.status}\n`;
          summaryText += `Primary Metric: ${test.metricName || "N/A"}\n\n`;
        }
        if (results) {
          summaryText += `Variant A: ${results.variantA.sampleSize} samples, ${(results.variantA.conversionRate * 100).toFixed(2)}% conversion\n`;
          summaryText += `Variant B: ${results.variantB.sampleSize} samples, ${(results.variantB.conversionRate * 100).toFixed(2)}% conversion\n`;
          summaryText += `P-value: ${results.pValue.toFixed(4)}\n`;
          summaryText += `Winner: ${results.winner}\n`;
          summaryText += `Lift: ${results.liftPct.toFixed(2)}%\n`;
          summaryText += `Statistically Significant: ${results.isStatisticallySignificant ? "Yes" : "No"}\n`;
        } else {
          summaryText += "Results are pending. No statistical analysis available yet.\n";
        }

        db.run(
          `UPDATE sandbox_summary_queue_v2
           SET status = 'completed', summary_text = ?, model_used = 'internal', processed_at = ?
           WHERE id = ?`,
          [summaryText, now, summary.id]
        );

        processed++;
      } catch (err: any) {
        db.run(
          "UPDATE sandbox_summary_queue_v2 SET status = 'failed', error_message = ? WHERE id = ?",
          [err.message, summary.id]
        );
        errors++;
      }
    }

    logCron({
      jobName: "sandbox_summaries",
      recordsProcessed: processed,
      error: errors > 0 ? `${errors} failures` : undefined,
    });

    return { processed, errors };
  } catch (err: any) {
    logHealth({
      component: "Sandbox",
      status: "error",
      error: `generateSummaries failed: ${err.message}`,
    });
    return { processed, errors: errors + 1 };
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function rowToScenario(row: Record<string, unknown>): SandboxScenario {
  return {
    id: row.id as number,
    scenarioId: row.scenario_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    scenarioType: row.scenario_type as ScenarioType,
    config: parseJson(row.config_json),
    isActive: (row.is_active as number) === 1,
    runCount: (row.run_count as number) || 0,
    lastRunAt: row.last_run_at as number | undefined,
    lastResult: parseJson(row.last_result_json),
    createdBy: row.created_by as string | undefined,
    metadata: parseJson(row.metadata_json),
    createdAt: (row.created_at as number) * 1000,
    updatedAt: (row.updated_at as number) * 1000,
  };
}

function rowToCustomer(row: Record<string, unknown>): SandboxCustomer {
  return {
    id: row.id as number,
    customerId: row.customer_id as string,
    scenarioId: row.scenario_id as string,
    name: row.name as string | undefined,
    email: row.email as string | undefined,
    archetype: (row.archetype as string) || "recreational",
    balance: (row.balance as number) || 0,
    riskTier: (row.risk_tier as string) || "GREEN",
    config: parseJson(row.config_json),
    isActive: (row.is_active as number) === 1,
    metadata: parseJson(row.metadata_json),
    createdAt: (row.created_at as number) * 1000,
    updatedAt: (row.updated_at as number) * 1000,
  };
}

function rowToSnapshot(row: Record<string, unknown>): SandboxSnapshot {
  return {
    id: row.id as number,
    snapshotId: row.snapshot_id as string,
    scenarioId: row.scenario_id as string,
    customerId: row.customer_id as string | undefined,
    snapshotType: (row.snapshot_type as string) || "manual",
    label: row.label as string | undefined,
    state: parseJson(row.state_json),
    metrics: parseJson(row.metrics_json),
    createdBy: row.created_by as string | undefined,
    createdAt: (row.created_at as number) * 1000,
  };
}

function rowToABTest(row: Record<string, unknown>): ABTest {
  return {
    id: row.id as number,
    testId: row.test_id as string,
    scenarioId: row.scenario_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    variantA: parseJson(row.variant_a_json),
    variantB: parseJson(row.variant_b_json),
    status: (row.status as ABTestStatus) || "draft",
    winner: row.winner as ABWinner | undefined,
    sampleSizeA: (row.sample_size_a as number) || 0,
    sampleSizeB: (row.sample_size_b as number) || 0,
    metricName: row.metric_name as string | undefined,
    results: parseJson(row.results_json),
    startedAt: row.started_at as number | undefined,
    endedAt: row.ended_at as number | undefined,
    createdBy: row.created_by as string | undefined,
    metadata: parseJson(row.metadata_json),
    createdAt: (row.created_at as number) * 1000,
    updatedAt: (row.updated_at as number) * 1000,
  };
}

function rowToSummary(row: Record<string, unknown>): SandboxSummary {
  return {
    id: row.id as number,
    testId: row.test_id as string,
    scenarioId: row.scenario_id as string,
    status: (row.status as SandboxSummary["status"]) || "pending",
    priority: (row.priority as number) || 100,
    promptText: row.prompt_text as string | undefined,
    summaryText: row.summary_text as string | undefined,
    modelUsed: row.model_used as string | undefined,
    tokensUsed: row.tokens_used as number | undefined,
    errorMessage: row.error_message as string | undefined,
    attempts: (row.attempts as number) || 0,
    maxAttempts: (row.max_attempts as number) || 3,
    processedAt: row.processed_at as number | undefined,
    createdAt: (row.created_at as number) * 1000,
  };
}

function parseJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(value as string) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function simulateScenario(scenario: SandboxScenario): Record<string, unknown> {
  const startTime = performance.now();
  const config = scenario.config;
  const customerCount = (config.customerCount as number) || 100;

  // Generate synthetic metrics
  const metrics = {
    customerCount,
    durationMs: Math.round(performance.now() - startTime),
    simulatedRevenue: Math.random() * 100000,
    simulatedWagers: Math.floor(Math.random() * 1000),
    avgConversionRate: Math.random() * 0.15,
    riskScore: Math.random() * 100,
    timestamp: Date.now(),
    scenarioId: scenario.scenarioId,
    type: scenario.scenarioType,
  };

  return metrics;
}

function generateSyntheticABResult(test: ABTest): ABTestResult {
  // Use variant config seeds for deterministic results
  const seedA = JSON.stringify(test.variantA).length;
  const seedB = JSON.stringify(test.variantB).length;

  const conversionA = 0.03 + (seedA % 100) / 1000;
  const conversionB = 0.03 + (seedB % 100) / 1000;
  const nA = test.sampleSizeA || 1000;
  const nB = test.sampleSizeB || 1000;

  const seA = Math.sqrt((conversionA * (1 - conversionA)) / nA);
  const seB = Math.sqrt((conversionB * (1 - conversionB)) / nB);
  const z = (conversionB - conversionA) / Math.sqrt(seA ** 2 + seB ** 2);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const isSignificant = pValue < 0.05;

  let winner: ABWinner = "inconclusive";
  if (isSignificant) {
    winner = conversionB > conversionA ? "b" : "a";
  } else if (Math.abs(conversionB - conversionA) < 0.001) {
    winner = "tie";
  }

  const liftPct = conversionA > 0 ? ((conversionB - conversionA) / conversionA) * 100 : 0;

  return {
    testId: test.testId,
    variantA: {
      sampleSize: nA,
      conversionRate: conversionA,
      avgRevenue: conversionA * 100,
      confidenceInterval: [Math.max(0, conversionA - 1.96 * seA), Math.min(1, conversionA + 1.96 * seA)],
    },
    variantB: {
      sampleSize: nB,
      conversionRate: conversionB,
      avgRevenue: conversionB * 100,
      confidenceInterval: [Math.max(0, conversionB - 1.96 * seB), Math.min(1, conversionB + 1.96 * seB)],
    },
    pValue,
    winner,
    liftPct,
    isStatisticallySignificant: isSignificant,
    generatedAt: Date.now(),
  };
}

// Normal cumulative distribution function approximation
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);

  return 0.5 * (1 + sign * y);
}
