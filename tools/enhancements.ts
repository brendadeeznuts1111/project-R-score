#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { loadEnhancementRegistry } from '../lib/enhancements/registry.ts';
import { resolveEnhancementRegistry } from '../lib/enhancements/resolver.ts';
import { publicEnhancementSnapshot } from '../lib/enhancements/public.ts';

const PUBLIC_PATH = 'public/.well-known/experiments';
const args = Bun.argv.slice(2);
const command = args[0] ?? 'show';

async function buildPublicArtifact() {
  const registry = await loadEnhancementRegistry();
  const snapshot = resolveEnhancementRegistry(registry, {
    environment: 'production',
    env: {},
    generatedAt: `${registry.version}T00:00:00.000Z`,
  });
  return publicEnhancementSnapshot(snapshot);
}

async function validateEvidence(): Promise<string[]> {
  const registry = await loadEnhancementRegistry();
  const errors: string[] = [];
  for (const item of registry.items) {
    for (const evidencePath of item.evidence) {
      if (!(await Bun.file(evidencePath).exists()))
        errors.push(`${item.id}: missing ${evidencePath}`);
    }
    if (item.introducedIn && !item.intro) errors.push(`${item.id}: introducedIn requires intro`);
    if (!item.introducedIn && item.intro) errors.push(`${item.id}: intro requires introducedIn`);
    if ((item.status === 'stable') !== (item.promotionCriteria === null)) {
      errors.push(`${item.id}: only stable items omit promotion criteria`);
    }
  }
  return errors;
}

async function check(): Promise<void> {
  const errors = await validateEvidence();
  const expected = `${JSON.stringify(await buildPublicArtifact(), null, 2)}\n`;
  const file = Bun.file(PUBLIC_PATH);
  if (!(await file.exists()) || (await file.text()) !== expected) {
    errors.push(`${PUBLIC_PATH}: drifted; run bun run enhancements -- bake`);
  }
  if (errors.length) throw new Error(`Enhancement registry invalid:\n- ${errors.join('\n- ')}`);
  console.info(
    `Enhancement registry valid · ${(await loadEnhancementRegistry()).items.length} items`
  );
}

async function agentTest(): Promise<void> {
  const registry = await loadEnhancementRegistry();
  const off = resolveEnhancementRegistry(registry, {
    environment: 'production',
    env: { ENABLE_BUN_IMAGE: 'false' },
  });
  const on = resolveEnhancementRegistry(registry, {
    environment: 'production',
    env: { ENABLE_BUN_IMAGE: 'true' },
  });
  const offImage = off.items.find(item => item.id === 'bun-image');
  const onImage = on.items.find(item => item.id === 'bun-image');
  if (!offImage || !onImage || offImage.enabled || !onImage.enabled) {
    throw new Error('agent adaptation proof failed for bun-image');
  }
  console.info('agent resolver probe · off → prebuilt fallback · on → Bun.Image');
}

switch (command) {
  case 'bake':
    await Bun.write(PUBLIC_PATH, `${JSON.stringify(await buildPublicArtifact(), null, 2)}\n`);
    console.info(`Wrote ${PUBLIC_PATH}`);
    break;
  case 'check':
    await check();
    break;
  case 'agent-test':
    await agentTest();
    break;
  case 'show': {
    const registry = await loadEnhancementRegistry();
    console.log(
      JSON.stringify(publicEnhancementSnapshot(resolveEnhancementRegistry(registry)), null, 2)
    );
    break;
  }
  default:
    throw new Error(
      `Unknown command ${JSON.stringify(command)}; use show, check, bake, or agent-test`
    );
}
