#!/usr/bin/env bun

type GroupName = "network" | "storage" | "memory" | "ipc";
type ProtocolName = "http" | "https" | "s3" | "file" | "data" | "blob" | "unix";

type ProtocolResult = {
  group: GroupName;
  protocol: ProtocolName;
  script: string;
  iteration: number;
  status: "✅" | "❌";
  ok: boolean;
  exitCode: number;
  latency: string;
  durationMs: number;
  output: string;
  error: string;
};

type ProtocolAggregate = {
  protocol: ProtocolName;
  runs: number;
  pass: number;
  fail: number;
  flaky: boolean;
  p50ms: number;
  p95ms: number;
  maxMs: number;
};

type RunnerOptions = {
  rerunEach: number;
  maxConcurrency: number;
  bail: number;
  jsonOut: string;
  quiet: boolean;
  maxP95Ms: number;
  maxFailures: number;
  baselineJson: string;
  maxP95RegressionMs: number | null;
  maxFailureRegression: number | null;
  includeGroups: Set<GroupName> | null;
  includeProtocols: Set<ProtocolName> | null;
};

const protocolGroups: Record<GroupName, ProtocolName[]> = {
  network: ["http", "https"],
  storage: ["s3", "file"],
  memory: ["data", "blob"],
  ipc: ["unix"],
};

const protocolScriptMap: Record<ProtocolName, string> = {
  http: "test:protocol:http",
  https: "test:protocol:https",
  s3: "test:protocol:s3",
  file: "test:protocol:file",
  data: "test:protocol:data",
  blob: "test:protocol:blob",
  unix: "test:protocol:unix",
};

function getArgValue(name: string): string {
  const direct = Bun.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const idx = Bun.argv.findIndex((arg) => arg === name);
  if (idx >= 0 && idx + 1 < Bun.argv.length) return Bun.argv[idx + 1];
  return "";
}

function parseOptions(): RunnerOptions {
  const rerunEach = Math.max(1, Number.parseInt(getArgValue("--rerun-each") || "1", 10) || 1);
  const maxConcurrency = Math.max(1, Number.parseInt(getArgValue("--max-concurrency") || "6", 10) || 6);
  const bail = Math.max(0, Number.parseInt(getArgValue("--bail") || "0", 10) || 0);
  const maxP95Ms = Math.max(0, Number.parseFloat(getArgValue("--max-p95-ms") || "0") || 0);
  const maxFailures = Math.max(0, Number.parseInt(getArgValue("--max-failures") || "0", 10) || 0);
  const p95RegressionRaw = getArgValue("--max-p95-regression-ms");
  const maxP95RegressionMs =
    p95RegressionRaw === "" ? null : Math.max(0, Number.parseFloat(p95RegressionRaw) || 0);
  const failureRegressionRaw = getArgValue("--max-failure-regression");
  const maxFailureRegression =
    failureRegressionRaw === "" ? null : Math.max(0, Number.parseInt(failureRegressionRaw, 10) || 0);
  const baselineJson = getArgValue("--baseline-json") || "";
  const jsonOut = getArgValue("--json-out") || "";
  const quiet = Bun.argv.includes("--quiet");

  const groupsArg = getArgValue("--groups");
  const includeGroups = groupsArg
    ? new Set(groupsArg.split(",").map((s) => s.trim()).filter(Boolean) as GroupName[])
    : null;

  const protocolsArg = getArgValue("--protocols");
  const includeProtocols = protocolsArg
    ? new Set(protocolsArg.split(",").map((s) => s.trim()).filter(Boolean) as ProtocolName[])
    : null;

  return {
    rerunEach,
    maxConcurrency,
    bail,
    jsonOut,
    quiet,
    maxP95Ms,
    maxFailures,
    baselineJson,
    maxP95RegressionMs,
    maxFailureRegression,
    includeGroups,
    includeProtocols,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return Number(sorted[idx].toFixed(2));
}

async function testProtocol(group: GroupName, protocol: ProtocolName, iteration: number): Promise<ProtocolResult> {
  const script = protocolScriptMap[protocol];
  const started = performance.now();

  try {
    const proc = Bun.spawn(["bun", "run", script], {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr] = await Promise.all([proc.stdout.text(), proc.stderr.text()]);
    const exitCode = await proc.exited;
    const durationMs = Number((performance.now() - started).toFixed(2));

    return {
      group,
      protocol,
      script,
      iteration,
      status: exitCode === 0 ? "✅" : "❌",
      ok: exitCode === 0,
      exitCode,
      latency: `${durationMs.toFixed(2)}ms`,
      durationMs,
      output: stdout.trim(),
      error: stderr.trim(),
    };
  } catch (error) {
    const durationMs = Number((performance.now() - started).toFixed(2));
    return {
      group,
      protocol,
      script,
      iteration,
      status: "❌",
      ok: false,
      exitCode: 1,
      latency: `${durationMs.toFixed(2)}ms`,
      durationMs,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, maxConcurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(maxConcurrency, tasks.length) }, () => worker()));
  return results;
}

function trimScriptNoise(text: string, lines = 4): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("$ bun run"))
    .slice(-lines);
}

function buildAggregates(allResults: ProtocolResult[]): ProtocolAggregate[] {
  const byProtocol = new Map<ProtocolName, ProtocolResult[]>();
  for (const result of allResults) {
    const list = byProtocol.get(result.protocol) || [];
    list.push(result);
    byProtocol.set(result.protocol, list);
  }

  return [...byProtocol.entries()].map(([protocol, list]) => {
    const lat = list.map((r) => r.durationMs);
    const passCount = list.filter((r) => r.ok).length;
    const failCount = list.length - passCount;
    return {
      protocol,
      runs: list.length,
      pass: passCount,
      fail: failCount,
      flaky: passCount > 0 && failCount > 0,
      p50ms: percentile(lat, 50),
      p95ms: percentile(lat, 95),
      maxMs: Number(Math.max(...lat).toFixed(2)),
    };
  });
}

function printSummary(allResults: ProtocolResult[], aggregates: ProtocolAggregate[], options: RunnerOptions) {
  const latestByProtocol = new Map<ProtocolName, ProtocolResult>();
  for (const result of allResults) latestByProtocol.set(result.protocol, result);
  const latest = [...latestByProtocol.values()];

  const tableRows = latest.map((result) => ({
    group: result.group,
    protocol: result.protocol,
    status: result.status,
    latency: result.latency,
    exitCode: result.exitCode,
    iteration: result.iteration,
  }));

  console.log(
    Bun.inspect.table(tableRows, ["group", "protocol", "status", "latency", "exitCode", "iteration"], { colors: true })
  );

  const aggRows = aggregates.map((row) => ({
    ...row,
    flaky: row.flaky ? "YES" : "NO",
  }));
  console.log(
    Bun.inspect.table(aggRows, ["protocol", "runs", "pass", "fail", "flaky", "p50ms", "p95ms", "maxMs"], { colors: true })
  );

  if (options.quiet) return;

  for (const result of latest) {
    console.log(`[${result.group}:${result.protocol}] ${result.status} ${result.latency} | script=${result.script}`);
    if (result.output) {
      for (const line of trimScriptNoise(result.output, 4)) console.log(`  ${line}`);
    }
    if (result.error) {
      for (const line of trimScriptNoise(result.error, 3)) console.log(`  ERR ${line}`);
    }
  }
}

async function loadBaselineAggregates(path: string): Promise<ProtocolAggregate[] | null> {
  if (!path) return null;
  try {
    const text = await Bun.file(path).text();
    const json = JSON.parse(text);

    const candidate = Array.isArray(json?.summary?.perProtocol)
      ? json.summary.perProtocol
      : Array.isArray(json?.aggregates)
        ? json.aggregates
        : null;
    if (!candidate) return null;

    const normalized: ProtocolAggregate[] = candidate
      .map((row: any) => ({
        protocol: String(row.protocol) as ProtocolName,
        runs: Number(row.runs || 0),
        pass: Number(row.pass || 0),
        fail: Number(row.fail || 0),
        flaky: Boolean(row.flaky),
        p50ms: Number(row.p50ms || 0),
        p95ms: Number(row.p95ms || 0),
        maxMs: Number(row.maxMs || 0),
      }))
      .filter((row: ProtocolAggregate) => row.protocol in protocolScriptMap);

    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

async function main() {
  const options = parseOptions();
  const selectedGroups = (Object.entries(protocolGroups) as Array<[GroupName, ProtocolName[]]>).filter(([group]) =>
    options.includeGroups ? options.includeGroups.has(group) : true
  );

  const selectedProtocols = selectedGroups.flatMap(([group, protocols]) =>
    protocols
      .filter((protocol) => (options.includeProtocols ? options.includeProtocols.has(protocol) : true))
      .map((protocol) => ({ group, protocol }))
  );

  if (selectedProtocols.length === 0) {
    console.error("No protocols selected. Use --groups or --protocols with valid values.");
    process.exit(1);
  }

  for (const [group] of selectedGroups) {
    if (!options.quiet) console.log(`\n[${group}] Scheduled`);
  }

  const tasks: Array<() => Promise<ProtocolResult>> = [];
  for (let iteration = 1; iteration <= options.rerunEach; iteration += 1) {
    for (const item of selectedProtocols) {
      tasks.push(() => testProtocol(item.group, item.protocol, iteration));
    }
  }

  const allResults = await runWithConcurrency(tasks, options.maxConcurrency);
  const aggregates = buildAggregates(allResults);
  printSummary(allResults, aggregates, options);

  const totalPassed = allResults.filter((result) => result.ok).length;
  const totalFailed = allResults.length - totalPassed;
  const flakyProtocols = new Set<ProtocolName>();
  for (const protocol of Object.keys(protocolScriptMap) as ProtocolName[]) {
    const runs = allResults.filter((r) => r.protocol === protocol);
    if (runs.length < 2) continue;
    const pass = runs.some((r) => r.ok);
    const fail = runs.some((r) => !r.ok);
    if (pass && fail) flakyProtocols.add(protocol);
  }

  const p95Violations = aggregates
    .map((row) => ({
      protocol: row.protocol,
      p95: row.p95ms,
    }))
    .filter((row) => options.maxP95Ms > 0 && row.p95 > options.maxP95Ms);

  const failuresGateOk = totalFailed <= options.maxFailures;
  const p95GateOk = options.maxP95Ms <= 0 || p95Violations.length === 0;
  const thresholdGateOk = failuresGateOk && p95GateOk;

  const baselineAggregates = await loadBaselineAggregates(options.baselineJson);
  const regressionRows = baselineAggregates
    ? aggregates
        .map((current) => {
          const baseline = baselineAggregates.find((b) => b.protocol === current.protocol);
          if (!baseline) return null;
          return {
            protocol: current.protocol,
            baselineP95ms: baseline.p95ms,
            currentP95ms: current.p95ms,
            p95RegressionMs: Number((current.p95ms - baseline.p95ms).toFixed(2)),
            baselineFail: baseline.fail,
            currentFail: current.fail,
            failureRegression: current.fail - baseline.fail,
          };
        })
        .filter(Boolean) as Array<{
        protocol: ProtocolName;
        baselineP95ms: number;
        currentP95ms: number;
        p95RegressionMs: number;
        baselineFail: number;
        currentFail: number;
        failureRegression: number;
      }>
    : [];
  const p95RegressionViolations = regressionRows.filter(
    (row) => options.maxP95RegressionMs !== null && row.p95RegressionMs > options.maxP95RegressionMs
  );
  const failureRegressionViolations = regressionRows.filter(
    (row) => options.maxFailureRegression !== null && row.failureRegression > options.maxFailureRegression
  );
  const baselineGateOk =
    !baselineAggregates ||
    ((options.maxP95RegressionMs === null || p95RegressionViolations.length === 0) &&
      (options.maxFailureRegression === null || failureRegressionViolations.length === 0));

  console.log(
    `\nProtocol grouped run: ${totalPassed}/${allResults.length} passed | failed=${totalFailed} | flaky=${flakyProtocols.size}`
  );
  if (options.maxP95Ms > 0 || options.maxFailures > 0) {
    console.log(
      `Threshold gate: failures<=${options.maxFailures} (${failuresGateOk ? "OK" : "FAIL"}) | ` +
        `p95<=${options.maxP95Ms || "off"}ms (${p95GateOk ? "OK" : "FAIL"})`
    );
    if (p95Violations.length > 0) {
      console.log(
        `P95 violations: ${p95Violations.map((v) => `${v.protocol}:${v.p95}ms`).join(", ")}`
      );
    }
  }
  if (options.baselineJson) {
    if (!baselineAggregates) {
      console.log(`Baseline gate: baseline not loaded from ${options.baselineJson}`);
    } else {
      console.log(
        `Baseline gate: p95-regression<=${options.maxP95RegressionMs === null ? "off" : options.maxP95RegressionMs}ms (${p95RegressionViolations.length === 0 ? "OK" : "FAIL"}) | ` +
          `failure-regression<=${options.maxFailureRegression === null ? "off" : options.maxFailureRegression} (${failureRegressionViolations.length === 0 ? "OK" : "FAIL"})`
      );
      if (p95RegressionViolations.length > 0) {
        console.log(
          `P95 regression violations: ${p95RegressionViolations
            .map((v) => `${v.protocol}:+${v.p95RegressionMs}ms`)
            .join(", ")}`
        );
      }
      if (failureRegressionViolations.length > 0) {
        console.log(
          `Failure regression violations: ${failureRegressionViolations
            .map((v) => `${v.protocol}:+${v.failureRegression}`)
            .join(", ")}`
        );
      }
    }
  }

  if (options.jsonOut) {
    const payload = {
      generatedAt: new Date().toISOString(),
      options,
      summary: {
        total: allResults.length,
        passed: totalPassed,
        failed: totalFailed,
        flakyProtocols: [...flakyProtocols],
        thresholdGate: {
          enabled: options.maxP95Ms > 0 || options.maxFailures > 0,
          maxP95Ms: options.maxP95Ms,
          maxFailures: options.maxFailures,
          failuresGateOk,
          p95GateOk,
          ok: thresholdGateOk,
          p95Violations,
        },
        perProtocol: aggregates,
        baselineGate: {
          enabled: Boolean(options.baselineJson),
          baselineJson: options.baselineJson,
          baselineLoaded: Boolean(baselineAggregates),
          maxP95RegressionMs: options.maxP95RegressionMs,
          maxFailureRegression: options.maxFailureRegression,
          p95RegressionViolations,
          failureRegressionViolations,
          ok: baselineGateOk,
        },
      },
      baselineComparison: regressionRows,
      aggregates,
      results: allResults,
    };
    await Bun.write(options.jsonOut, JSON.stringify(payload, null, 2));
    console.log(`Wrote JSON report: ${options.jsonOut}`);
  }

  if (options.bail > 0 && totalFailed >= options.bail) {
    process.exit(1);
  }
  process.exit(totalFailed === 0 && thresholdGateOk && baselineGateOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
