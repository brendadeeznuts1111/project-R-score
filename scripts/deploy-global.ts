#!/usr/bin/env bun

import { DeploymentOrchestrator } from "../pipeline/deployment-orchestrator";
import { summarizeDeploymentReadiness } from "../deployment/readiness-matrix";

const args = process.argv.slice(2);

if (import.meta.main) {
  const confirm = hasFlag("--confirm");
  const regions = Number.parseInt(getArg("--regions", "5"), 10);

  if (!confirm) {
    console.error("Refusing to deploy without --confirm.");
    process.exit(2);
  }

  if (!Number.isFinite(regions) || regions < 1) {
    console.error("Invalid --regions value.");
    process.exit(2);
  }

  const readiness = summarizeDeploymentReadiness();
  const maxReadyRegions = Math.max(
    1,
    ...readiness.matrix.productionReady.map((c) => c.deploymentPlan.regions.length)
  );
  if (regions > maxReadyRegions) {
    console.error(
      `Requested regions=${regions} exceeds current ready max=${maxReadyRegions}.`
    );
    process.exit(2);
  }

  const orchestrator = new DeploymentOrchestrator();
  const result = await orchestrator.deployAll();
  console.log(
    JSON.stringify(
      {
        requestedRegions: regions,
        readinessSummary: readiness.summary,
        deployment: result.metrics,
      },
      null,
      2
    )
  );
}

function getArg(flag: string, fallback: string): string {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || fallback;
  const idx = args.indexOf(flag);
  if (idx < 0 || idx + 1 >= args.length) return fallback;
  return args[idx + 1] || fallback;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag) || args.some((a) => a.startsWith(`${flag}=`));
}
