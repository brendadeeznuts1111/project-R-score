#!/usr/bin/env bun

// debug-config.ts

import { factorywagerSecretsLifecycle } from '../lib/secrets/config/factorywager-secrets-lifecycle.ts';

async function debugConfig() {
  try {
    console.log('Loading config...');
    const config = await factorywagerSecretsLifecycle.loadConfig(
      'factorywager-secrets-lifecycle.yaml'
    );

    console.log('Config version:', config.version);
    console.log('Rules count:', config.rules.length);
    console.log('Audit config:', JSON.stringify(config.audit, null, 2));
    console.log('Documentation config:', JSON.stringify(config.documentation, null, 2));

    console.log('\nValidating config...');
    const validation = await factorywagerSecretsLifecycle.validateConfig();
    console.log('Validation result:', validation);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugConfig();
