#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
import { jsonOut } from '../lib/console-depth';
import {
  evaluateReadiness,
  loadDomainHealthSummary,
  type ReadinessResult,
} from './lib/domain-health-read';

type Options = {
  domain: string;
  source: 'local' | 'r2';
  strictP95?: number;
  json: boolean;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {
    domain: (Bun.env.SEARCH_BENCH_DOMAIN || 'factory-wager.com').trim().toLowerCase(),
    source: 'local',
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--domain') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value) options.domain = value;
      i += 1;
      continue;
    }
    if (arg === '--source') {
      const value = (argv[i + 1] || '').trim().toLowerCase();
      if (value === 'local' || value === 'r2') options.source = value;
      i += 1;
      continue;
    }
    if (arg === '--strict-p95') {
      const value = Number.parseFloat(argv[i + 1] || '');
      if (Number.isFinite(value) && value > 0) options.strictP95 = value;
      i += 1;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
  }

  return options;
}

export function readinessExitCode(readiness: ReadinessResult): 0 | 2 | 3 {
  if (readiness.blocked) return 2;
  if (readiness.status === 'critical') return 3;
  if (readiness.status === 'degraded') return 2;
  return 0;
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));

  const summary = await loadDomainHealthSummary({
    domain: options.domain,
    source: options.source,
    strictP95: options.strictP95,
  });
  const readiness = evaluateReadiness(summary, options.strictP95);

  const payload = {
    domain: options.domain,
    source: options.source,
    strictP95Threshold: options.strictP95 ?? null,
    summary,
    readiness,
  };

  if (options.json) {
    jsonOut(payload);
  } else {
    console.info(`Project Online Readiness: ${options.domain}`);
    console.info(`Source: ${options.source}`);
    console.info(`State: ${readiness.state}`);
    console.info(`Status: ${readiness.status}`);
    console.info(`Ready: ${readiness.ready}`);
    console.info(`Overall score: ${readiness.metrics.overallScore}`);
    if (Number.isFinite(readiness.metrics.strictP95Ms)) {
      console.info(`Strict p95: ${readiness.metrics.strictP95Ms}ms`);
    }
    if (readiness.reasons.length > 0) {
      console.info('Reasons:');
      for (const reason of readiness.reasons) {
        console.info(`- ${reason}`);
      }
    }
  }

  process.exit(readinessExitCode(readiness));
}

if (import.meta.main) {
  main().catch(error => {
    console.error(
      `[project-online-readiness] ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  });
}
