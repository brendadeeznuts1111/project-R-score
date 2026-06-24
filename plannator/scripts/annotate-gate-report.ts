#!/usr/bin/env bun
/**
 * Generate gate report and open in Plannotator annotate UI (informational).
 */

import { join } from "node:path";
import { DEFAULT_HTML_OUTPUT, REPO_ROOT } from "../lib/gate-report.ts";

async function hasCommand(cmd: string): Promise<boolean> {
  const proc = Bun.spawn({
    cmd: ["sh", "-c", `command -v ${cmd}`],
    stdout: "pipe",
    stderr: "pipe",
  });
  return (await proc.exited) === 0;
}

async function main(): Promise<number> {
  const args = Bun.argv.slice(2);
  const reportPath = args[0]?.startsWith("/")
    ? args[0]
    : join(REPO_ROOT, args[0] ?? "reports/gate-report.html");

  const gate = Bun.spawn({
    cmd: ["bun", "run", "scripts/gate-report.ts", "--output", reportPath],
    cwd: REPO_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  const gateCode = await gate.exited;
  if (gateCode !== 0 && gateCode !== 1) {
    return gateCode;
  }

  if (!(await hasCommand("plannotator"))) {
    console.error("plannotator CLI not found — install Plannotator or open the HTML directly:");
    console.error(`  open ${reportPath}`);
    return gateCode;
  }

  console.log(`Opening in Plannotator: ${reportPath}`);
  const annotate = Bun.spawn({
    cmd: ["plannotator", "annotate", reportPath],
    cwd: REPO_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  const annotateCode = await annotate.exited;
  return annotateCode === 0 ? gateCode : annotateCode;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);