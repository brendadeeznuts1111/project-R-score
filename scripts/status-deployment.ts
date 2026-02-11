#!/usr/bin/env bun

import { summarizeDeploymentReadiness } from "../deployment/readiness-matrix";
import { ExecutiveVerdict } from "../dashboard/project-health";

const args = process.argv.slice(2);
const simple = args.includes("--simple");
const report = summarizeDeploymentReadiness();

if (simple) {
  console.log(
    [
      `health=${ExecutiveVerdict.score}/${ExecutiveVerdict.max}`,
      `ready=${report.summary.productionReadyCount}`,
      `beta=${report.summary.betaStagingCount}`,
      `overallReadiness=${report.summary.overallReadiness}`,
      `generatedAt=${report.generatedAt}`,
    ].join(" ")
  );
  process.exit(0);
}

console.log(JSON.stringify(report, null, 2));
