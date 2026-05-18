#!/usr/bin/env bun
import { z } from 'zod';

const EnvSchema = z.object({
  STUFF_PORT: z.string().optional(),
  STUFF_HOSTNAME: z.string().optional(),
  STUFF_API_TOKEN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional()
});

type EnvConfig = z.infer<typeof EnvSchema>;

const environments = {
  dev: { STUFF_PORT: '3456', STUFF_HOSTNAME: 'localhost', NODE_ENV: 'development' },
  staging: { STUFF_PORT: '8080', STUFF_HOSTNAME: 'staging.example.com', NODE_ENV: 'production' },
  prod: { STUFF_PORT: '443', STUFF_HOSTNAME: 'api.example.com', NODE_ENV: 'production' }
};

function diffEnvs(current: EnvConfig, target: EnvConfig, targetName: string) {
  console.info(`\n📊 Environment Diff: Current → ${targetName}\n`);

  const allKeys = new Set([...Object.keys(current), ...Object.keys(target)]);
  let changes = 0;

  for (const key of allKeys) {
    const curr = current[key as keyof EnvConfig];
    const targ = target[key as keyof EnvConfig];

    if (curr !== targ) {
      changes++;
      console.info(`\x1b[33m${key}\x1b[0m:`);
      console.info(`  Current: ${curr ?? '(unset)'}`);
      console.info(`  Target:  ${targ ?? '(unset)'}`);

      if (!curr && targ) {
        console.info(`  ⚠️  Missing in current environment`);
      }
    }
  }

  if (changes === 0) {
    console.info('✅ No differences found');
  } else {
    console.info(`\n⚠️  ${changes} differences detected`);
  }
}

// Load current env
const current = EnvSchema.parse({
  STUFF_PORT: process.env.STUFF_PORT,
  STUFF_HOSTNAME: process.env.STUFF_HOSTNAME,
  STUFF_API_TOKEN: process.env.STUFF_API_TOKEN ? '[SET]' : undefined,
  NODE_ENV: process.env.NODE_ENV
});

// Compare with prod
diffEnvs(current, environments.prod, 'Production');

// Safety check
if (!current.STUFF_API_TOKEN && current.NODE_ENV !== 'development') {
  console.error('\n❌ CRITICAL: API_TOKEN missing in non-development environment');
  process.exit(1);
}
