#!/usr/bin/env bun

import { FACTORY_SECRET_SPECS, factoryService, probeFactorySecret } from './factory-secrets';
import { logger } from './logger';

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
const report = { total: rows.length, missing: missing.length, rows };

logger.info('Secrets doctor report', report, 'SECRETS');

if (missing.length > 0) {
  logger.warn(`Missing ${missing.length} secrets`, { 
    missing: missing.map(m => m.id) 
  }, 'SECRETS');
  process.exitCode = 1;
} else {
  logger.info('All secrets found and accessible', {}, 'SECRETS');
}
