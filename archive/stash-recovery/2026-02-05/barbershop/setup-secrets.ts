#!/usr/bin/env bun

import { env } from 'bun';
import { FACTORY_SECRET_SPECS, setFactorySecret } from './factory-secrets';
import { logger } from './logger';

let writes = 0;
for (const spec of FACTORY_SECRET_SPECS) {
  const value = env[spec.envKey] ?? spec.defaultValue;
  if (!value) continue;
  const ok = await setFactorySecret(spec.id, value);
  if (ok) writes += 1;
}

logger.info('Secrets setup completed', { 
  keysWritten: writes,
  totalSpecs: FACTORY_SECRET_SPECS.length 
}, 'SETUP');

logger.info('To read from Bun.secrets, run with USE_BUN_SECRETS=true', {}, 'SETUP');
