#!/usr/bin/env bun
/** Read BundleScanReport JSON from stdin → Bun.markdown colored ansi output. */
import { renderSupplyChainAnsi } from "./scan/transpiler/markdown-reporter.ts";
import type { BundleScanReport } from "./scan/transpiler/types.ts";

const text = await Bun.stdin.text();
if (!text.trim()) process.exit(0);
const report = JSON.parse(text) as BundleScanReport;
process.stdout.write(renderSupplyChainAnsi(report, true));