#!/usr/bin/env bun
import { summarizeDeploymentReadiness } from "../deployment/readiness-matrix";
import { ExecutiveVerdict } from "../dashboard/project-health";

const args = process.argv.slice(2);
const showDashboard = args.includes("--dashboard");
const showAlerts = args.includes("--alerts");
const intervalSec = Number.parseInt(getArg("--interval", "5"), 10) || 5;
const once = args.includes("--once");

function snapshot() {
  const dep = summarizeDeploymentReadiness();
  const line = [
    `ts=${new Date().toISOString()}`,
    `health=${ExecutiveVerdict.score}/${ExecutiveVerdict.max}`,
    `ready=${dep.summary.productionReadyCount}`,
    `beta=${dep.summary.betaStagingCount}`,
    `overall=${dep.summary.overallReadiness}`,
  ].join(" ");

  if (showDashboard) {
    console.log("=== Global Deployment Monitor ===");
    console.log(line);
  } else {
    console.log(line);
  }

  if (showAlerts) {
    const alerts: string[] = [];
    if (dep.summary.betaStagingCount > 0) alerts.push("beta components pending");
    if (dep.summary.overallReadiness < 90) alerts.push("overall readiness below 90");
    if (alerts.length > 0) {
      console.log(`alerts=${alerts.join(", ")}`);
    } else {
      console.log("alerts=none");
    }
  }
}

if (once) {
  snapshot();
  process.exit(0);
}

snapshot();
setInterval(snapshot, Math.max(1, intervalSec) * 1000);

function getArg(flag: string, fallback: string): string {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1) || fallback;
  const idx = args.indexOf(flag);
  if (idx < 0 || idx + 1 >= args.length) return fallback;
  return args[idx + 1] || fallback;
}
