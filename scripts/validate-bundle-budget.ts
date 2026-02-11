#!/usr/bin/env bun

import { buildBundleAnalysis, parseArg } from "./lib/bundle-analysis";

const DEFAULT_ENTRY = "scratch/bun-v1.3.9-examples/playground-web/server.ts";
const DEFAULT_MAX_KB = 5120;

async function main() {
  const entry = parseArg("entry", DEFAULT_ENTRY);
  const maxKb = Number.parseFloat(parseArg("max-kb", String(DEFAULT_MAX_KB)));
  if (!Number.isFinite(maxKb) || maxKb <= 0) {
    throw new Error(`invalid --max-kb value: ${maxKb}`);
  }

  const analysis = await buildBundleAnalysis(entry);
  const outputKb = analysis.summary.outputBytes / 1024;
  const ok = outputKb <= maxKb;

  console.log(
    JSON.stringify(
      {
        ok,
        maxKb,
        outputKb: Number(outputKb.toFixed(2)),
        entrypoint: analysis.entrypoint,
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exit(1);
  }
}

await main();
