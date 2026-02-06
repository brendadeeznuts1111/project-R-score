#!/usr/bin/env bun

import { env } from 'bun';
import { FACTORY_SECRET_SPECS, setFactorySecret } from './factory-secrets';

let writes = 0;
for (const spec of FACTORY_SECRET_SPECS) {
  const value = env[spec.envKey] ?? spec.defaultValue;
  if (!value) continue;
  const ok = await setFactorySecret(spec.id, value);
  if (ok) writes += 1;
}

console.log(`Secrets setup complete. Wrote ${writes} namespaced keys.`);
console.log('Run with USE_BUN_SECRETS=true to read Bun.secrets first.');
