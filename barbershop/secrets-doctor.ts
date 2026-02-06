#!/usr/bin/env bun

import { FACTORY_SECRET_SPECS, factoryService, probeFactorySecret } from './factory-secrets';

const rows = [];
for (const spec of FACTORY_SECRET_SPECS) {
  const probe = await probeFactorySecret(spec.id);
  rows.push({
    id: spec.id,
    service: factoryService(spec.component),
    name: spec.name,
    source: probe.source,
    found: probe.found
  });
}

const missing = rows.filter((r) => !r.found);
console.log(JSON.stringify({ total: rows.length, missing: missing.length, rows }, null, 2));
if (missing.length > 0) process.exitCode = 1;
