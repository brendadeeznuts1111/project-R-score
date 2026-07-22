#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/secrets — Bun.secrets
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
  const missing: string[] = [];
  if (!r2.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!r2.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  // Account falls back to CLOUDFLARE_DEFAULTS via resolveR2InfraConfig / r2-env.
  if (!r2.accountId) missing.push('R2_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID');
  if (missing.length > 0) {
    console.error(`❌ Missing R2 credentials: ${missing.join(', ')}`);
    console.error('   Store via Bun.secrets or set env vars (see config/r2-env.ts).');
    process.exit(1);
  }

  console.info(`✅ R2 credentials resolved (account: ${r2.accountId}, bucket: ${r2.bucketName})`);
  console.info('✅ Production deployment preflight completed');
}

deploy().catch(error => {
  console.error('❌ Deployment preflight failed:', error);
  process.exit(1);
});
