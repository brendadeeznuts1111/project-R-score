#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { jsonOut } from '../lib/console-depth.ts';
import {
  auditRegulationPolicyCatalog,
  REGULATION_POLICY_CATALOG,
} from '../lib/operations/regulation-policy-catalog.ts';

const report = auditRegulationPolicyCatalog();

if (Bun.argv.includes('--json')) {
  jsonOut(report);
} else {
  console.log(
    `policy:audit · ${report.active}/${report.policies} active · ${report.errors} errors · ${report.warnings} warnings`
  );
  for (const issue of report.issues) {
    console.log(`${issue.severity.toUpperCase()} ${issue.code} · ${issue.message}`);
  }
  if (report.issues.length === 0) {
    console.log(`✅ ${REGULATION_POLICY_CATALOG.length} governed policies are consistent`);
  }
}

if (!report.ok) process.exit(1);
