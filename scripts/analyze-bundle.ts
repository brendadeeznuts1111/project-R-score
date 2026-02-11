#!/usr/bin/env bun

import { buildBundleAnalysis, parseArg } from "./lib/bundle-analysis";

const DEFAULT_ENTRY = "scratch/bun-v1.3.9-examples/playground-web/server.ts";

async function main() {
  const entry = parseArg("entry", DEFAULT_ENTRY);
  const analysis = await buildBundleAnalysis(entry);
  console.log(JSON.stringify(analysis, null, 2));
}

await main();
