#!/usr/bin/env bun
/**
 * 🔐 bun.secrets CLI for R2 Integration
 *
 * Uses S3-compatible API with proper AWS signature v4 authentication
 *
 * Usage:
 *   bun run bun:secrets:init          - Initialize bun.secrets with R2
 *   bun run bun:secrets:set <k> <v>   - Store secret in R2 via bun.secrets
 *   bun run bun:secrets:get <k>       - Get secret from R2
 *   bun run bun:secrets:list          - List all secrets
 *   bun run bun:secrets:sync          - Sync local bun.secrets to R2
 *   bun run bun:secrets:backup        - Backup all secrets to R2
 */

import { styled } from '../theme/colors';

// R2 Configuration from environment - NO DEFAULTS FOR SECURITY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bun-secrets';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const SECRETS_PREFIX = 'bun-secrets/';

// Access bun.secrets (Bun 1.2+)
const secrets = (Bun as any).secrets;

interface SecretEntry {
  key: string;
  value: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate AWS Signature V4 for R2 S3-compatible API
 */
async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: string
): Promise<Record<string, string>> {
  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate =
    date
      .toISOString()
      .replace(/[:\-]|\.[0-9]{3}/g, '')
      .slice(0, 15) + 'Z';
  const region = 'auto';
  const service = 's3';

  // Create canonical request
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = encodeURI(path);
  const canonicalQuerystring = '';

  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const payloadHash = body
    ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)).then(buf =>
        Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      )
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(canonicalRequest))
    .then(buf =>
      Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join(
    '\n'
  );

  // Calculate signature
  const getSignatureKey = async (
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<ArrayBuffer> => {
    const kDate = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('AWS4' + key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      new TextEncoder().encode(dateStamp)
    );
    const kRegion = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]),
      new TextEncoder().encode(regionName)
    );
    const kService = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]),
      new TextEncoder().encode(serviceName)
    );
    const kSigning = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
      ]),
      new TextEncoder().encode('aws4_request')
    );
    return kSigning;
  };

  const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
    ]),
    new TextEncoder().encode(stringToSign)
  );
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Build authorization header
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;

  return {
    ...headers,
    Host: host,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-SHA256': payloadHash,
    Authorization: authorizationHeader,
  };
}

class BunSecretsR2CLI {
  private async r2Fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${R2_ENDPOINT}${path}`;
    const body = options.body as string | undefined;
    const headers = await signRequest(
      options.method || 'GET',
      path,
      { 'Content-Type': 'application/json', ...options.headers },
      body
    );

    return fetch(url, { ...options, headers });
  }

  async init() {
    console.log(styled('🔐 Initializing bun.secrets with R2...\n', 'accent'));

    // Validate credentials are present
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      console.error(styled('❌ Missing required R2 credentials', 'error'));
      console.error(
        styled('🚨 SECURITY: All R2 credentials must be set as environment variables', 'error')
      );
      console.log('Required environment variables:');
      console.log('  export R2_ACCOUNT_ID="your-account-id"');
      console.log('  export R2_ACCESS_KEY_ID="your-access-key-id"');
      console.log('  export R2_SECRET_ACCESS_KEY="your-secret-access-key"');
      console.log('  export R2_BUCKET_NAME="your-bucket-name" (optional, defaults to bun-secrets)');
      console.log('\n📖 For security, never commit credentials to version control.');
      process.exit(1);
    }

    // Validate credential format
    if (R2_ACCESS_KEY_ID.length < 16 || R2_SECRET_ACCESS_KEY.length < 16) {
      console.error(styled('❌ Invalid credential format detected', 'error'));
      console.error(styled('🚨 Credentials appear to be malformed', 'error'));
      process.exit(1);
    }

    // Check bun.secrets
    if (!secrets) {
      console.log(styled('⚠️  bun.secrets not available (requires Bun 1.2+)', 'warning'));
      console.log(styled('   Using R2-backed secrets only\n', 'muted'));
    } else {
      console.log(styled('✅ bun.secrets available', 'success'));
    }

    // Test R2 connection
    try {
      const resp = await this.r2Fetch(`/${R2_BUCKET}?location=`);
      if (resp.ok || resp.status === 403 || resp.status === 404) {
        console.log(styled('✅ R2 connection established', 'success'));
        console.log(styled(`   Account: ${R2_ACCOUNT_ID.slice(0, 8)}...`, 'muted'));
        console.log(styled(`   Bucket:  ${R2_BUCKET}`, 'muted'));
        console.log(styled(`   Prefix:  ${SECRETS_PREFIX}\n`, 'muted'));
      } else {
        throw new Error(`Status ${resp.status}`);
      }
    } catch (error: any) {
      console.error(styled(`❌ R2 connection failed: ${error.message}`, 'error'));
      process.exit(1);
    }

    console.log(styled('🚀 Ready! Use:', 'info'));
    console.log(styled('   bun run bun:secrets:set <key> <value>', 'muted'));
    console.log(styled('   bun run bun:secrets:get <key>', 'muted'));
    console.log(styled('   bun run bun:secrets:list', 'muted'));
  }

  async set(key: string, value: string) {
    if (!key || !value) {
      console.error(styled('❌ Usage: bun:secrets:set <key> <value>', 'error'));
      process.exit(1);
    }

    const entry: SecretEntry = {
      key,
      value,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in R2 (primary storage)
    try {
      const resp = await this.r2Fetch(`/${R2_BUCKET}/${SECRETS_PREFIX}${key}.json`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      });

      if (!resp.ok) {
        throw new Error(`Status ${resp.status}`);
      }

      console.log(styled(`☁️  Stored in R2: ${key}`, 'success'));
    } catch (e: any) {
      console.error(styled(`❌ R2 store failed: ${e.message}`, 'error'));
      process.exit(1);
    }

    console.log(styled(`✅ Secret "${key}" saved`, 'success'));
  }

  async get(key: string) {
    if (!key) {
      console.error(styled('❌ Usage: bun:secrets:get <key>', 'error'));
      process.exit(1);
    }

    // Try bun.secrets first
    if (secrets) {
      try {
        const value = await secrets.get(key);
        if (value) {
          console.log(styled(`\n🔑 ${key}`, 'accent'));
          console.log(styled(`   Source: bun.secrets (local)`, 'muted'));
          console.log(
            styled(`   Value:  ${value.slice(0, 50)}${value.length > 50 ? '...' : ''}`, 'info')
          );
          return;
        }
      } catch {
        // Fall through to R2
      }
    }

    // Get from R2
    try {
      const resp = await this.r2Fetch(`/${R2_BUCKET}/${SECRETS_PREFIX}${key}.json`);
      if (resp.ok) {
        const entry: SecretEntry = await resp.json();
        console.log(styled(`\n🔑 ${key}`, 'accent'));
        console.log(styled(`   Source: R2`, 'muted'));
        console.log(
          styled(
            `   Value:  ${entry.value.slice(0, 50)}${entry.value.length > 50 ? '...' : ''}`,
            'info'
          )
        );

        // Note: bun.secrets local caching disabled due to API version differences
      } else if (resp.status === 404) {
        console.log(styled(`❌ Secret "${key}" not found`, 'error'));
      } else {
        throw new Error(`Status ${resp.status}`);
      }
    } catch (e: any) {
      console.error(styled(`❌ Get failed: ${e.message}`, 'error'));
      process.exit(1);
    }
  }

  async list() {
    console.log(styled('📋 Listing secrets...\n', 'accent'));

    // List local bun.secrets
    if (secrets) {
      try {
        const keys = (await secrets.list?.()) || [];
        console.log(styled(`💾 bun.secrets (${keys.length}):`, 'info'));
        for (const key of keys) {
          console.log(styled(`   • ${key}`, 'muted'));
        }
        console.log();
      } catch {
        console.log(styled('💾 bun.secrets: (list not supported)\n', 'muted'));
      }
    }

    // List R2 secrets
    try {
      const resp = await this.r2Fetch(`/${R2_BUCKET}?list-type=2&prefix=${SECRETS_PREFIX}`);
      if (resp.ok) {
        const xml = await resp.text();
        const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)]
          .map(m => m[1].replace(SECRETS_PREFIX, '').replace('.json', ''))
          .filter(k => !k.includes('/'));

        console.log(styled(`☁️  R2 secrets (${keys.length}):`, 'info'));
        for (const key of keys) {
          console.log(styled(`   • ${key}`, 'muted'));
        }
      } else {
        throw new Error(`Status ${resp.status}`);
      }
    } catch (e: any) {
      console.error(styled(`❌ R2 list failed: ${e.message}`, 'error'));
    }
  }

  async sync() {
    console.log(styled('🔄 Syncing local bun.secrets to R2...\n', 'accent'));

    if (!secrets) {
      console.error(styled('❌ bun.secrets not available', 'error'));
      process.exit(1);
    }

    try {
      // Try to get keys from bun.secrets
      let keys: string[] = [];
      try {
        keys = (await secrets.list?.()) || [];
      } catch {
        console.log(styled('⚠️  bun.secrets.list() not available', 'warning'));
        console.log(styled('   Provide keys manually or use set command', 'muted'));
        process.exit(1);
      }

      console.log(styled(`Found ${keys.length} local secrets\n`, 'info'));

      let successCount = 0;
      for (const key of keys) {
        try {
          const value = await secrets.get(key);
          if (value) {
            await this.set(key, value);
            successCount++;
          }
        } catch (e: any) {
          console.log(styled(`   ⚠️  ${key}: ${e.message}`, 'warning'));
        }
      }

      console.log(styled(`\n✅ Synced ${successCount}/${keys.length} secrets to R2`, 'success'));
    } catch (e: any) {
      console.error(styled(`❌ Sync failed: ${e.message}`, 'error'));
      process.exit(1);
    }
  }

  async backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `${SECRETS_PREFIX}backups/${timestamp}.json`;

    console.log(styled('💾 Backing up secrets to R2...\n', 'accent'));

    try {
      // Get all secrets from R2
      const resp = await this.r2Fetch(`/${R2_BUCKET}?list-type=2&prefix=${SECRETS_PREFIX}`);
      const secretsData: Record<string, any> = {};

      if (resp.ok) {
        const xml = await resp.text();
        const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)]
          .map(m => m[1])
          .filter(
            k => k.startsWith(SECRETS_PREFIX) && !k.includes('/backups/') && k.endsWith('.json')
          );

        console.log(styled(`Found ${keys.length} secrets to backup`, 'info'));

        for (const key of keys) {
          try {
            const dataResp = await this.r2Fetch(`/${R2_BUCKET}/${key}`);
            if (dataResp.ok) {
              const data = await dataResp.json();
              secretsData[key.replace(SECRETS_PREFIX, '').replace('.json', '')] = data;
            }
          } catch (e) {
            console.log(styled(`   ⚠️  Failed to read: ${key}`, 'warning'));
          }
        }
      }

      // Store backup
      const backupData = {
        timestamp: new Date().toISOString(),
        count: Object.keys(secretsData).length,
        secrets: secretsData,
      };

      const backupResp = await this.r2Fetch(`/${R2_BUCKET}/${backupKey}`, {
        method: 'PUT',
        body: JSON.stringify(backupData, null, 2),
      });

      if (!backupResp.ok) {
        throw new Error(`Status ${backupResp.status}`);
      }

      console.log(styled(`\n✅ Backup created:`, 'success'));
      console.log(styled(`   Path: ${backupKey}`, 'muted'));
      console.log(styled(`   Secrets: ${Object.keys(secretsData).length}`, 'muted'));
    } catch (e: any) {
      console.error(styled(`❌ Backup failed: ${e.message}`, 'error'));
      process.exit(1);
    }
  }
}

// CLI
const cli = new BunSecretsR2CLI();
const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case 'init':
    await cli.init();
    break;
  case 'set':
    await cli.set(args[0], args[1]);
    break;
  case 'get':
    await cli.get(args[0]);
    break;
  case 'list':
    await cli.list();
    break;
  case 'sync':
    await cli.sync();
    break;
  case 'backup':
    await cli.backup();
    break;
  default:
    console.log(styled('🔐 bun.secrets CLI for R2\n', 'accent'));
    console.log(styled('Commands:', 'info'));
    console.log(styled('  init              Initialize bun.secrets with R2', 'muted'));
    console.log(styled('  set <k> <v>       Store secret', 'muted'));
    console.log(styled('  get <k>           Get secret', 'muted'));
    console.log(styled('  list              List all secrets', 'muted'));
    console.log(styled('  sync              Sync local → R2', 'muted'));
    console.log(styled('  backup            Backup all to R2', 'muted'));
    console.log(styled('\nEnvironment:', 'info'));
    console.log(styled('  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY', 'muted'));
}
