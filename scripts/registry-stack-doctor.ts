#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL,
  FACTORY_WAGER_NPM_REGISTRY_URL,
  FACTORY_WAGER_REGISTRY_ORIGIN,
  factoryRegistryBucketFromEnv,
  factoryWagerLocalRegistryWriteUrlFromEnv,
} from '../config/r2-env.ts';
import { jsonOut } from '../lib/console-depth.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { checkRegistryConfig } from './check-registry-config.ts';

type Check = {
  id: string; // brand-ok — fixed internal doctor check slug, not a domain identity
  ok: boolean;
  detail: string;
};

export async function runRegistryDoctor(root = `${import.meta.dir}/..`) {
  const config = await checkRegistryConfig(root);
  const checks: Check[] = [
    {
      id: 'owned_root_config',
      ok: config.ok,
      detail: config.ok ? '7 owned root contracts aligned' : config.errors.join('; '),
    },
  ];

  try {
    const localWriteUrl = factoryWagerLocalRegistryWriteUrlFromEnv();
    checks.push({ id: 'local_sdk_write_loopback', ok: true, detail: localWriteUrl });
  } catch (error) {
    checks.push({
      id: 'local_sdk_write_loopback',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    ok: checks.every(check => check.ok),
    mode: 'read-only' as const,
    canonical: {
      readOrigin: FACTORY_WAGER_REGISTRY_ORIGIN,
      npmReadUrl: FACTORY_WAGER_NPM_REGISTRY_URL,
      npmReadMethods: ['GET', 'HEAD'] as const,
      localSdkWriteUrl: FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL,
      productionWrite: {
        type: 'r2-sigv4' as const,
        bucket: factoryRegistryBucketFromEnv(),
        credentialSource: 'Proton Pass runtime environment' as const,
      },
    },
    checks,
    nextSteps: [
      'Use bun info or scoped installs against the tokenless npm read URL',
      'Use RegistryClient.publish only with the explicit loopback development gateway',
      'Use bun run factory:publish only with separate production R2 authority',
    ],
  };
}

if (isModuleEntrypoint(import.meta)) {
  const argv = applyUnknownLongOptionGuardFor('registry:doctor', Bun.argv.slice(2));
  if (argv.includes('--fix')) {
    console.error('registry:doctor is read-only; --fix has been retired');
    process.exit(2);
  }
  const result = await runRegistryDoctor();
  if (argv.includes('--json')) jsonOut(result);
  else {
    console.info('Registry Stack Doctor (read-only)');
    for (const check of result.checks) {
      console.info(`- [${check.ok ? 'ok' : 'fail'}] ${check.id}: ${check.detail}`);
    }
    if (!result.ok) {
      console.info('- next:');
      for (const step of result.nextSteps) console.info(`  - ${step}`);
    }
  }
  process.exit(result.ok ? 0 : 2);
}
