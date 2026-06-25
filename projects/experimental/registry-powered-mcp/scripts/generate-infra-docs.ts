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

console.info("# Infrastructure Registry\n");
console.info(`**Account:** \`${CLOUDFLARE.ACCOUNT_ID}\` (${CLOUDFLARE.EMAIL})\n`);

console.info("## Zones\n");
console.info("| Zone | ID | Status |");
console.info("|:-----|:---|:-------|");
Object.values(ZONES).forEach((z) => {
  console.info(`| ${z.name} | \`${z.id}\` | ${z.status.toUpperCase()} |`);
});

console.info("\n## Domains\n");
console.info(generateDomainTable());

console.info("\n## Workers\n");
console.info(generateWorkerTable());

console.info("\n## R2 Buckets\n");
console.info(generateR2Table());

console.info("\n## R2 Assets\n");
Object.entries(R2_ASSETS).forEach(([name, asset]) => {
  console.info(`\n### ${name}\n`);
  console.info("| Key | Type | Description |");
  console.info("|:----|:-----|:------------|");
  asset.files.forEach((f) => {
    console.info(`| \`${f.key}\` | ${f.type} | ${f.description} |`);
  });
});

console.info("\n## Golden Matrix\n");
console.info(generateInfraMatrix());

console.info("\n## Quick Reference URLs\n");
console.info("| Name | URL |");
console.info("|:-----|:----|");
Object.values(DOMAINS).forEach((d) => {
  console.info(`| **${d.fqdn}** | ${d.urls.production} |`);
  console.info(`| └─ Health | ${d.urls.health} |`);
  console.info(`| └─ RSS | ${d.urls.rss} |`);
});
Object.values(WORKERS).forEach((w) => {
  console.info(`| **${w.name}** (dev) | ${w.workersDevUrl} |`);
});
Object.values(R2_BUCKETS).forEach((b) => {
  console.info(`| **${b.name}** (public) | ${b.publicUrl} |`);
});
