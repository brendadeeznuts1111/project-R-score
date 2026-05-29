#!/usr/bin/env bun

import { getSecretsRuntimeInfo } from '../../lib/security/bun-secrets-adapter';
import { resolveR2InfraConfig } from '../../lib/security/infra-secrets';

async function deploy() {
  console.info('🚀 Starting production deployment preflight...');

  const runtime = getSecretsRuntimeInfo();
  if (!runtime.available) {
    console.error('❌ Bun.secrets unavailable on this platform');
    process.exit(1);
  }
  console.info(`✅ Bun.secrets available (${runtime.backend})`);

  const r2 = await resolveR2InfraConfig();
  const values = [r2.accountId, r2.accessKeyId, r2.secretAccessKey];
  const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].filter(
    (_, i) => !values[i]
  );
  if (missing.length > 0) {
    console.error(`❌ Missing R2 credentials: ${missing.join(', ')}`);
    console.error('   Store via Bun.secrets or set env vars before deploy.');
    process.exit(1);
  }

  console.info(`✅ R2 credentials resolved (bucket: ${r2.bucketName})`);
  console.info('✅ Production deployment preflight completed');
}

deploy().catch(error => {
  console.error('❌ Deployment preflight failed:', error);
  process.exit(1);
});
