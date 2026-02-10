#!/usr/bin/env bun

const phase = process.argv[2] || "canary";
const ts = new Date().toISOString();

const outputs: Record<string, Record<string, unknown>> = {
  canary: {
    ok: true,
    phase: "deploy:beta:canary",
    strategy: "canary",
    target: "staging",
    note: "Beta canary rollout simulation completed.",
  },
  monitor: {
    ok: true,
    phase: "monitor:beta:canary",
    telemetry: { errorRatePct: 0.2, p95Ms: 180, uptimePct: 99.95 },
    note: "Canary monitoring window passed.",
  },
  full: {
    ok: true,
    phase: "deploy:beta:full",
    strategy: "staged-full",
    target: "staging",
    note: "Beta full staging rollout simulation completed.",
  },
};

const payload = outputs[phase];
if (!payload) {
  console.error(`Unknown beta phase: ${phase}`);
  process.exit(1);
}

console.log(JSON.stringify({ generatedAt: ts, ...payload }, null, 2));
