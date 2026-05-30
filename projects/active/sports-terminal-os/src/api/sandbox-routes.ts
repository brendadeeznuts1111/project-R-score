/**
 * Sandbox API Routes
 *
 * Provides A/B testing, scenario simulation, and customer modeling endpoints.
 * All data is isolated in dedicated sandbox tables.
 *
 * Routes:
 *   GET  /api/sandbox/v2/scenarios           — List scenarios
 *   POST /api/sandbox/v2/save                — Create scenario
 *   POST /api/sandbox/v2/run                 — Run scenario
 *   GET  /api/sandbox/v2/scenarios/:id       — Get scenario
 *   GET  /api/sandbox/v2/ab-tests            — List A/B tests
 *   POST /api/sandbox/v2/ab-test             — Create A/B test
 *   GET  /api/sandbox/v2/ab-tests/:id        — Get A/B test results
 *   POST /api/sandbox/v2/generate-summaries  — Generate summaries
 */

import {
  createScenario,
  runScenario,
  getScenario,
  listScenarios,
  createABTest,
  getABTest,
  listABTests,
  getABResults,
  createSimulatedCustomers,
  getCustomerResults,
  getSnapshots,
  generateSummaries,
  queueSummary,
  type CreateScenarioInput,
  type CreateABTestInput,
  type ScenarioType,
  type ABTestStatus,
} from "@services/sandbox-service";
import { logHealth, logCron } from "@utils/tableLogger";
import { generateRequestId, createTimer } from "@middleware/security";

// ---------------------------------------------------------------------------
// Route Router
// ---------------------------------------------------------------------------

export async function handleSandboxRequest(
  req: Request,
  pathname: string
): Promise<Response> {
  const requestId = generateRequestId();
  const timer = createTimer();

  try {
    // GET /api/sandbox/v2/scenarios — List scenarios
    if (pathname === "/api/sandbox/v2/scenarios" && req.method === "GET") {
      return handleListScenarios(req, requestId, timer);
    }

    // POST /api/sandbox/v2/save — Create scenario
    if (pathname === "/api/sandbox/v2/save" && req.method === "POST") {
      return handleCreateScenario(req, requestId, timer);
    }

    // POST /api/sandbox/v2/run — Run scenario
    if (pathname === "/api/sandbox/v2/run" && req.method === "POST") {
      return handleRunScenario(req, requestId, timer);
    }

    // GET /api/sandbox/v2/scenarios/:id — Get scenario
    const scenarioMatch = pathname.match(/^\/api\/sandbox\/v2\/scenarios\/([^/]+)$/);
    if (scenarioMatch && req.method === "GET") {
      return handleGetScenario(scenarioMatch[1]!, requestId, timer);
    }

    // GET /api/sandbox/v2/ab-tests — List A/B tests
    if (pathname === "/api/sandbox/v2/ab-tests" && req.method === "GET") {
      return handleListABTests(req, requestId, timer);
    }

    // POST /api/sandbox/v2/ab-test — Create A/B test
    if (pathname === "/api/sandbox/v2/ab-test" && req.method === "POST") {
      return handleCreateABTest(req, requestId, timer);
    }

    // GET /api/sandbox/v2/ab-tests/:id — Get A/B test results
    const abTestMatch = pathname.match(/^\/api\/sandbox\/v2\/ab-tests\/([^/]+)$/);
    if (abTestMatch && req.method === "GET") {
      return handleGetABTestResults(abTestMatch[1]!, requestId, timer);
    }

    // POST /api/sandbox/v2/generate-summaries — Generate summaries
    if (pathname === "/api/sandbox/v2/generate-summaries" && req.method === "POST") {
      return handleGenerateSummaries(requestId, timer);
    }

    // POST /api/sandbox/v2/simulate — Create simulated customers
    if (pathname === "/api/sandbox/v2/simulate" && req.method === "POST") {
      return handleSimulateCustomers(req, requestId, timer);
    }

    // GET /api/sandbox/v2/snapshots/:id — Get snapshots
    const snapshotMatch = pathname.match(/^\/api\/sandbox\/v2\/snapshots\/([^/]+)$/);
    if (snapshotMatch && req.method === "GET") {
      return handleGetSnapshots(snapshotMatch[1]!, requestId, timer);
    }

    return jsonError("Sandbox endpoint not found", 404, requestId);
  } catch (err: any) {
    logHealth({
      component: "Sandbox",
      status: "error",
      error: `Sandbox route error: ${err.message}`,
    });
    return jsonError(err.message, 500, requestId);
  }
}

// ---------------------------------------------------------------------------
// Scenario Handlers
// ---------------------------------------------------------------------------

async function handleListScenarios(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") as ScenarioType | null;
  const active = url.searchParams.has("active")
    ? url.searchParams.get("active") === "true"
    : undefined;
  const limit = url.searchParams.has("limit")
    ? parseInt(url.searchParams.get("limit")!, 10)
    : 50;
  const offset = url.searchParams.has("offset")
    ? parseInt(url.searchParams.get("offset")!, 10)
    : 0;

  const result = listScenarios({ type: type ?? undefined, active, limit, offset });

  return Response.json(
    {
      success: true,
      scenarios: result.items,
      total: result.total,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

async function handleCreateScenario(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const body = await req.json();

  const input: CreateScenarioInput = {
    name: body.name,
    description: body.description,
    scenarioType: body.scenarioType || "simulation",
    config: body.config || {},
    createdBy: body.createdBy || "api",
  };

  if (!input.name) {
    return jsonError("name is required", 400, requestId);
  }

  const scenario = createScenario(input);

  logHealth({
    component: "Sandbox",
    status: "ok",
    table: "sandbox_scenarios_v2",
    count: 1,
  });

  return Response.json(
    {
      success: true,
      scenario,
      requestId,
      durationMs: timer(),
    },
    { status: 201 }
  );
}

async function handleRunScenario(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const body = await req.json();
  const scenarioId = body.scenarioId;

  if (!scenarioId) {
    return jsonError("scenarioId is required", 400, requestId);
  }

  const scenario = runScenario(scenarioId);

  logCron({
    jobName: "sandbox_run",
    recordsProcessed: 1,
    durationMs: timer(),
  });

  return Response.json(
    {
      success: true,
      scenario,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

async function handleGetScenario(
  scenarioId: string,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const scenario = getScenario(scenarioId);

  if (!scenario) {
    return jsonError(`Scenario not found: ${scenarioId}`, 404, requestId);
  }

  // Include snapshots
  const snapshots = getSnapshots(scenarioId);

  return Response.json(
    {
      success: true,
      scenario,
      snapshots,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// A/B Test Handlers
// ---------------------------------------------------------------------------

async function handleListABTests(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const url = new URL(req.url);
  const scenarioId = url.searchParams.get("scenarioId") || undefined;
  const status = url.searchParams.get("status") as ABTestStatus | null;
  const limit = url.searchParams.has("limit")
    ? parseInt(url.searchParams.get("limit")!, 10)
    : 50;
  const offset = url.searchParams.has("offset")
    ? parseInt(url.searchParams.get("offset")!, 10)
    : 0;

  const result = listABTests({ scenarioId, status: status ?? undefined, limit, offset });

  return Response.json(
    {
      success: true,
      abTests: result.items,
      total: result.total,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

async function handleCreateABTest(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const body = await req.json();

  const input: CreateABTestInput = {
    scenarioId: body.scenarioId,
    name: body.name,
    description: body.description,
    variantA: body.variantA || {},
    variantB: body.variantB || {},
    metricName: body.metricName,
    createdBy: body.createdBy || "api",
  };

  if (!input.scenarioId || !input.name) {
    return jsonError("scenarioId and name are required", 400, requestId);
  }

  const test = createABTest(input);

  return Response.json(
    {
      success: true,
      abTest: test,
      requestId,
      durationMs: timer(),
    },
    { status: 201 }
  );
}

async function handleGetABTestResults(
  testId: string,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const test = getABTest(testId);

  if (!test) {
    return jsonError(`A/B test not found: ${testId}`, 404, requestId);
  }

  const results = getABResults(testId);

  // Also fetch summaries
  const { getDb } = await import("@db/index");
  const db = getDb();
  const summaries = db
    .query("SELECT * FROM sandbox_summary_queue_v2 WHERE test_id = ? ORDER BY created_at DESC")
    .all(testId);

  return Response.json(
    {
      success: true,
      test,
      results,
      summaries,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Simulation Handlers
// ---------------------------------------------------------------------------

async function handleSimulateCustomers(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const body = await req.json();
  const scenarioId = body.scenarioId;
  const count = body.count || 100;

  if (!scenarioId) {
    return jsonError("scenarioId is required", 400, requestId);
  }

  if (count < 1 || count > 10000) {
    return jsonError("count must be between 1 and 10000", 400, requestId);
  }

  const customers = createSimulatedCustomers(scenarioId, count);

  logCron({
    jobName: "sandbox_simulate",
    recordsProcessed: count,
    durationMs: timer(),
  });

  return Response.json(
    {
      success: true,
      customersCreated: customers.length,
      scenarioId,
      requestId,
      durationMs: timer(),
    },
    { status: 201 }
  );
}

async function handleGetSnapshots(
  scenarioId: string,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const snapshots = getSnapshots(scenarioId);

  return Response.json(
    {
      success: true,
      snapshots,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Summary Handlers
// ---------------------------------------------------------------------------

async function handleGenerateSummaries(
  requestId: string,
  timer: () => number
): Promise<Response> {
  const result = generateSummaries();

  logCron({
    jobName: "sandbox_generate_summaries",
    recordsProcessed: result.processed,
    durationMs: timer(),
  });

  return Response.json(
    {
      success: true,
      processed: result.processed,
      errors: result.errors,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonError(message: string, status: number, requestId: string): Response {
  return Response.json(
    {
      success: false,
      error: message,
      code: status === 404 ? "NOT_FOUND" : status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status }
  );
}

// ---------------------------------------------------------------------------
// Path matching
// ---------------------------------------------------------------------------

export function isSandboxPath(pathname: string): boolean {
  return pathname.startsWith("/api/sandbox/v2/");
}
