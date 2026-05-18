#!/usr/bin/env bun

// debug-config.ts

import { factorywagerSecretsLifecycle } from '../lib/secrets/config/factorywager-secrets-lifecycle.ts';

async function debugConfig() {
  try {
    console.info('Loading config...');
    const config = await factorywagerSecretsLifecycle.loadConfig(
      'factorywager-secrets-lifecycle.yaml'
    );

    console.info('Config version:', config.version);
    console.info('Rules count:', config.rules.length);
    console.info('Audit config:', JSON.stringify(config.audit, null, 2));
    console.info('Documentation config:', JSON.stringify(config.documentation, null, 2));

    console.info('\nValidating config...');
    const validation = await factorywagerSecretsLifecycle.validateConfig();
    console.info('Validation result:', validation);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugConfig();
