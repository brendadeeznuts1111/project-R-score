#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
import { resolveR2InfraConfig, resolveProfileSecretsService } from '../lib/security/infra-secrets';
import { resolveUploaderConfigAsync } from '../lib/profile/session-uploader';

function present(value: string | undefined): string {
  return value && value.length > 0 ? 'set' : 'missing';
}

async function main(): Promise<void> {
  const registry = await resolveR2InfraConfig({
    services: [
      Bun.env.REGISTRY_SECRETS_SERVICE || 'com.factorywager.registry',
      Bun.env.FW_R2_SECRETS_SERVICE || 'com.factorywager.r2',
      Bun.env.FW_INFRA_SECRETS_SERVICE || 'com.factorywager.infra',
      'default',
    ],
    bucketFallback: Bun.env.R2_REGISTRY_BUCKET || 'npm-registry',
  });

  const uploader = await resolveUploaderConfigAsync();
  const profileService = resolveProfileSecretsService();

  console.info('Secrets Infra Integration Check');
  console.info('================================');
  console.info(`registry.accountId: ${present(registry.accountId)}`);
  console.info(`registry.accessKeyId: ${present(registry.accessKeyId)}`);
  console.info(`registry.secretAccessKey: ${present(registry.secretAccessKey)}`);
  console.info(`registry.bucketName: ${registry.bucketName || 'missing'}`);
  console.info(`registry.endpoint: ${registry.endpoint || 'missing'}`);
  console.info(`profile.secretsService: ${profileService}`);
  console.info(`profileUploader.bucket: ${uploader.bucket || 'missing'}`);
  console.info(`profileUploader.endpoint: ${uploader.endpoint || 'missing'}`);

  const requiredMissing = [
    !registry.accountId && 'R2_ACCOUNT_ID',
    !registry.accessKeyId && 'R2_ACCESS_KEY_ID',
    !registry.secretAccessKey && 'R2_SECRET_ACCESS_KEY',
  ].filter(Boolean) as string[];

  if (requiredMissing.length > 0) {
    console.error(`FAIL missing required credentials: ${requiredMissing.join(', ')}`);
    process.exit(1);
  }

  console.info('PASS infra/server/r2/profile secrets integration');
}

await main();
