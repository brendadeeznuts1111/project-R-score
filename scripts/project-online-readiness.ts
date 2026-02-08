#!/usr/bin/env bun

import { evaluateReadiness, loadDomainHealthSummary } from './lib/domain-health-read';

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

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

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
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(`Project Online Readiness: ${options.domain}`);
    console.log(`Source: ${options.source}`);
    console.log(`Status: ${readiness.status}`);
    console.log(`Ready: ${readiness.ready}`);
    console.log(`Overall score: ${readiness.metrics.overallScore}`);
    if (Number.isFinite(readiness.metrics.strictP95Ms)) {
      console.log(`Strict p95: ${readiness.metrics.strictP95Ms}ms`);
    }
    if (readiness.reasons.length > 0) {
      console.log('Reasons:');
      for (const reason of readiness.reasons) {
        console.log(`- ${reason}`);
      }
    }
  }

  if (readiness.status === 'critical') process.exit(3);
  if (readiness.status === 'degraded') process.exit(2);
  process.exit(0);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[project-online-readiness] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
