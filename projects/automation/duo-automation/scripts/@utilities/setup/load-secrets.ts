#!/usr/bin/env bun
// scripts/load-secrets.ts
import { secretManager } from '../src/secrets/manager';

// ✅ ONE-LINER: Auto-populate Bun.env from secrets
await secretManager.syncToEnv();

console.info('✅ Secrets synced to Bun.env');
console.info('🔐 Active tokens:', (secretManager.getTokenHashes()).size);
