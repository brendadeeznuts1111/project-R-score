#!/usr/bin/env bun
// secrets-loader.ts (Enhanced - Per-User/Team + Windows Enterp)
import { secrets } from 'bun';

const BASE_SERVICE = 'windsurf-r2-empire';
const PLATFORM_SCOPE = process.platform === 'win32' ? 'ENTERPRISE' : 'USER';

export async function scopedService(team: string = 'default'): Promise<string> {
  return `${BASE_SERVICE}-${PLATFORM_SCOPE}-${team}`;  // windsurt-r2-empire-ENTERPRISE-team1
}

export interface ScopedSecrets {
  r2Bucket: string;
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  duoPlusKey: string;
}

export async function loadScopedSecrets(team: string = 'default'): Promise<ScopedSecrets> {
  const service = await scopedService(team);
  console.log(`\n🔐 Scoped Service: ${service} (Per-user ${PLATFORM_SCOPE})`);

  const getScoped = async (name: string, envFallbackKey?: string) => {
    // Phase 1.1: Keychain Foundation (indexable OS store)
    let val = await secrets.get({ service, name });

    // Phase 1.1.2: Sync Bridge (Environment Ingestion)
    if (!val && envFallbackKey) {
      const envVal = Bun.env[envFallbackKey];
      if (envVal) {
        console.log(`🔐 Auto-Ingest: Mirroring ${envFallbackKey} -> Keychain (${service})`);
        await secrets.set({ service, name, value: envVal });
        val = envVal;
      }
    }

    // Phase 1.1.22: Self-Healing Recovery Loop (Zero-Failure)
    if (!val && process.env.PRODUCTION_SIM === '1') {
      const mockVal = `sim-${name.toLowerCase().replace('_', '-')}`;
      console.log(`🩹 Self-Healing (1.1.22): Providing surrogate data for ${name}`);
      await secrets.set({ service, name, value: mockVal });
      val = mockVal;
    }

    return val;
  };

  let creds: ScopedSecrets = {
    r2Bucket: await getScoped('R2_BUCKET', 'R2_BUCKET') || '',
    r2Endpoint: await getScoped('R2_ENDPOINT', 'R2_ENDPOINT') || '',
    r2AccessKeyId: await getScoped('R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID') || '',
    r2SecretAccessKey: await getScoped('R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY') || '',
    duoPlusKey: await getScoped('DUOPLUS_API_KEY', 'DUOPLUS_API_KEY') || ''
  };

  // Helper to prompt if missing
  const ensureSecret = async (name: string, key: keyof ScopedSecrets, label: string) => {
    if (!creds[key] && process.stdout.isTTY && process.env.INTERACTIVE !== '0') {
      const val = prompt(`Team "${team}" ${label}:`) || '';
      if (val) {
        await secrets.set({ service, name, value: val });
        creds[key] = val;
        console.log(`✅ Team "${team}" ${label} scoped (CRED_PERSIST_ENTERPRISE)`);
      }
    }
  };

  await ensureSecret('R2_BUCKET', 'r2Bucket', 'R2_BUCKET');
  await ensureSecret('R2_ENDPOINT', 'r2Endpoint', 'R2_ENDPOINT');
  await ensureSecret('R2_ACCESS_KEY_ID', 'r2AccessKeyId', 'R2_ACCESS_KEY_ID');
  await ensureSecret('R2_SECRET_ACCESS_KEY', 'r2SecretAccessKey', 'R2_SECRET_ACCESS_KEY');
  await ensureSecret('DUOPLUS_API_KEY', 'duoPlusKey', 'DUOPLUS_API_KEY');

  return creds;
}

// Support CLI execution
if (import.meta.main) {
  const team = process.argv[2] || 'default';
  const creds = await loadScopedSecrets(team);
  console.log(`\n--- Team: ${team} ---`);
  console.log(`R2 Bucket:   ${creds.r2Bucket ? creds.r2Bucket.slice(0, 8) + '***' : '⚠️ Missing'}`);
  console.log(`R2 Endpoint: ${creds.r2Endpoint ? creds.r2Endpoint : '⚠️ Missing'}`);
  console.log(`DuoPlus Key: ${creds.duoPlusKey ? '********' : '⚠️ Missing'}`);
}
