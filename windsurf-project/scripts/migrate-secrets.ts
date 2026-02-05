#!/usr/bin/env bun
// scripts/migrate-secrets.ts
import { secrets } from 'bun';

const SERVICE = 'windsurf-r2-empire-USER-default';
const keys = ['R2_BUCKET', 'DUOPLUS_API_KEY', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];

console.log(`🔐 Migrating .env to Bun Secrets for service: ${SERVICE}`);

for (const key of keys) {
  const value = Bun.env[key];
  if (value) {
    await secrets.set({ service: SERVICE, name: key, value });
    console.log(`✅ Migrated ${key}`);
  } else {
    console.warn(`⚠️ Warning: ${key} not found in Bun.env`);
  }
}

console.log('\n🎉 Local keychain populated!');
