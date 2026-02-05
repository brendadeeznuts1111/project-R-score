#!/usr/bin/env bun
/**
 * Generate Infrastructure Documentation
 * Creates markdown tables from infrastructure constants
 */

import {
  CLOUDFLARE,
  ZONES,
  R2_BUCKETS,
  WORKERS,
  DOMAINS,
  R2_ASSETS,
  INFRA_MATRIX,
  generateDomainTable,
  generateWorkerTable,
  generateR2Table,
  generateInfraMatrix,
} from "../packages/core/src/infra/constants";

console.log("# Infrastructure Registry\n");
console.log(`**Account:** \`${CLOUDFLARE.ACCOUNT_ID}\` (${CLOUDFLARE.EMAIL})\n`);

console.log("## Zones\n");
console.log("| Zone | ID | Status |");
console.log("|:-----|:---|:-------|");
Object.values(ZONES).forEach((z) => {
  console.log(`| ${z.name} | \`${z.id}\` | ${z.status.toUpperCase()} |`);
});

console.log("\n## Domains\n");
console.log(generateDomainTable());

console.log("\n## Workers\n");
console.log(generateWorkerTable());

console.log("\n## R2 Buckets\n");
console.log(generateR2Table());

console.log("\n## R2 Assets\n");
Object.entries(R2_ASSETS).forEach(([name, asset]) => {
  console.log(`\n### ${name}\n`);
  console.log("| Key | Type | Description |");
  console.log("|:----|:-----|:------------|");
  asset.files.forEach((f) => {
    console.log(`| \`${f.key}\` | ${f.type} | ${f.description} |`);
  });
});

console.log("\n## Golden Matrix\n");
console.log(generateInfraMatrix());

console.log("\n## Quick Reference URLs\n");
console.log("| Name | URL |");
console.log("|:-----|:----|");
Object.values(DOMAINS).forEach((d) => {
  console.log(`| **${d.fqdn}** | ${d.urls.production} |`);
  console.log(`| └─ Health | ${d.urls.health} |`);
  console.log(`| └─ RSS | ${d.urls.rss} |`);
});
Object.values(WORKERS).forEach((w) => {
  console.log(`| **${w.name}** (dev) | ${w.workersDevUrl} |`);
});
Object.values(R2_BUCKETS).forEach((b) => {
  console.log(`| **${b.name}** (public) | ${b.publicUrl} |`);
});
