#!/usr/bin/env bun

// [SECRETS][MANAGER][SEC-MGR-001][v2.11][ACTIVE]

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { createHmac } from "crypto";

interface SecretEntry {
  key: string;
  value: string;
  created: string;
  rotated?: string;
  expires?: string;
}

interface JWTPayload {
  userId: string;
  role: string;
  exp: number;
  iat: number;
  jti: string;
}

class SecretsManager {
  private secrets: Map<string, SecretEntry> = new Map();
  private jwtSecret: string;
  private secretsFile = '.secrets.json';
  private rotatedSecretsFile = '.secrets.rotated.json';

  constructor() {
    this.jwtSecret = this.generateSecureSecret();
    this.loadSecrets();
  }

  private generateSecureSecret(length: number = 32): string {
    return createHmac('sha256', Date.now().toString())
      .update(Math.random().toString())
      .digest('hex')
      .substring(0, length);
  }

  private loadSecrets(): void {
    if (existsSync(this.secretsFile)) {
      try {
        const data = JSON.parse(readFileSync(this.secretsFile, 'utf-8'));
        if (data.secrets) {
          Object.entries(data.secrets).forEach(([key, entry]: [string, any]) => {
            this.secrets.set(key, entry as SecretEntry);
          });
        }
      } catch (error) {
        console.warn(`⚠️  Failed to load secrets: ${error}`);
      }
    }
  }

  private saveSecrets(): void {
    const data = {
      secrets: Object.fromEntries(this.secrets),
      lastUpdated: new Date().toISOString()
    };
    writeFileSync(this.secretsFile, JSON.stringify(data, null, 2));
  }

  private saveRotatedSecrets(secrets: SecretEntry[]): void {
    const data = {
      rotatedSecrets: secrets,
      rotatedAt: new Date().toISOString()
    };
    writeFileSync(this.rotatedSecretsFile, JSON.stringify(data, null, 2));
  }

  // Secret management
  setSecret(key: string, value: string, expiresDays?: number): void {
    const entry: SecretEntry = {
      key,
      value,
      created: new Date().toISOString(),
      expires: expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : undefined
    };
    this.secrets.set(key, entry);
    this.saveSecrets();
  }

  getSecret(key: string): string | null {
    const entry = this.secrets.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expires && new Date(entry.expires) < new Date()) {
      console.warn(`⚠️  Secret ${key} has expired`);
      return null;
    }

    return entry.value;
  }

  rotateSecret(key: string): boolean {
    const entry = this.secrets.get(key);
    if (!entry) return false;

    // Generate new value
    const newValue = this.generateSecureSecret();

    // Save old value to rotated secrets
    const rotatedEntry = { ...entry, rotated: new Date().toISOString() };
    const rotatedSecrets = this.loadRotatedSecrets();
    rotatedSecrets.push(rotatedEntry);
    this.saveRotatedSecrets(rotatedSecrets);

    // Update current secret
    entry.value = newValue;
    entry.rotated = new Date().toISOString();
    this.secrets.set(key, entry);
    this.saveSecrets();

    console.log(`🔄 Rotated secret: ${key}`);
    return true;
  }

  rotateAllSecrets(): number {
    let rotated = 0;
    for (const [key, entry] of this.secrets) {
      // Check if rotation needed (>30 days old)
      const age = Date.now() - new Date(entry.created).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (age > thirtyDays) {
        this.rotateSecret(key);
        rotated++;
      }
    }
    return rotated;
  }

  private loadRotatedSecrets(): SecretEntry[] {
    if (existsSync(this.rotatedSecretsFile)) {
      try {
        const data = JSON.parse(readFileSync(this.rotatedSecretsFile, 'utf-8'));
        return data.rotatedSecrets || [];
      } catch (error) {
        console.warn(`⚠️  Failed to load rotated secrets: ${error}`);
      }
    }
    return [];
  }

  // JWT functionality
  generateJWT(userId: string, role: string, expiresHours: number = 2): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload: JWTPayload = {
      userId,
      role,
      exp: Math.floor(Date.now() / 1000) + (expiresHours * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: this.generateSecureSecret(16)
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = createHmac('sha256', this.jwtSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verifyJWT(token: string): JWTPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, payload, signature] = parts;

      // Verify signature
      const expectedSignature = createHmac('sha256', this.jwtSecret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        console.warn('JWT signature verification failed');
        return null;
      }

      // Decode payload
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());

      // Check expiration
      if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        console.warn('JWT token expired');
        return null;
      }

      return decodedPayload;
    } catch (error) {
      console.warn(`JWT verification error: ${error}`);
      return null;
    }
  }

  // WebSocket JWT subprotocol handling
  validateWebSocketJWT(subprotocol: string): JWTPayload | null {
    // Expected format: "syndicate-jwt.<token>"
    if (!subprotocol.startsWith('syndicate-jwt.')) {
      return null;
    }

    const token = subprotocol.substring('syndicate-jwt.'.length);
    return this.verifyJWT(token);
  }

  // Immutable audit logging with SHA256 chains
  logImmutable(event: string, data: any): void {
    const auditDir = 'logs/audit';
    const today = new Date().toISOString().split('T')[0];
    const auditFile = join(auditDir, `${today}.audit.json`);
    const hashFile = join(auditDir, `${today}.audit.sha256`);

    // Create audit entry
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      hash: ''
    };

    // Calculate hash including previous hash
    let previousHash = '';
    if (existsSync(hashFile)) {
      try {
        previousHash = readFileSync(hashFile, 'utf-8').trim();
      } catch (error) {
        // Ignore
      }
    }

    entry.hash = createHmac('sha256', previousHash)
      .update(JSON.stringify({ ...entry, hash: '' }))
      .digest('hex');

    // Append to audit file
    let existingEntries: any[] = [];
    if (existsSync(auditFile)) {
      try {
        existingEntries = JSON.parse(readFileSync(auditFile, 'utf-8'));
      } catch (error) {
        // Start fresh if parse fails
      }
    }

    existingEntries.push(entry);
    writeFileSync(auditFile, JSON.stringify(existingEntries, null, 2));

    // Update hash chain
    writeFileSync(hashFile, entry.hash);
  }

  // Tamper detection
  verifyAuditIntegrity(date: string): boolean {
    const auditFile = join('logs/audit', `${date}.audit.json`);
    const hashFile = join('logs/audit', `${date}.audit.sha256`);

    if (!existsSync(auditFile) || !existsSync(hashFile)) {
      return false;
    }

    try {
      const entries = JSON.parse(readFileSync(auditFile, 'utf-8'));
      const expectedHash = readFileSync(hashFile, 'utf-8').trim();

      let currentHash = '';
      for (const entry of entries) {
        const entryWithoutHash = { ...entry };
        delete entryWithoutHash.hash;

        currentHash = createHmac('sha256', currentHash)
          .update(JSON.stringify(entryWithoutHash))
          .digest('hex');
      }

      return currentHash === expectedHash;
    } catch (error) {
      console.warn(`Audit integrity check failed: ${error}`);
      return false;
    }
  }
}

// CLI interface
if (import.meta.main) {
  const sm = new SecretsManager();
  const command = process.argv[2];

  switch (command) {
    case 'set':
      const key = process.argv[3];
      const value = process.argv[4];
      const expires = process.argv[5] ? parseInt(process.argv[5]) : undefined;
      if (!key || !value) {
        console.log('Usage: bun secrets-manager.ts set <key> <value> [expiresDays]');
        process.exit(1);
      }
      sm.setSecret(key, value, expires);
      console.log(`✅ Set secret: ${key}`);
      break;

    case 'get':
      const getKey = process.argv[3];
      if (!getKey) {
        console.log('Usage: bun secrets-manager.ts get <key>');
        process.exit(1);
      }
      const secret = sm.getSecret(getKey);
      if (secret) {
        console.log(secret);
      } else {
        console.log(`❌ Secret ${getKey} not found or expired`);
        process.exit(1);
      }
      break;

    case 'rotate':
      const rotateKey = process.argv[3];
      if (!rotateKey) {
        console.log('Usage: bun secrets-manager.ts rotate <key>');
        process.exit(1);
      }
      const rotated = sm.rotateSecret(rotateKey);
      if (rotated) {
        console.log(`✅ Rotated secret: ${rotateKey}`);
      } else {
        console.log(`❌ Failed to rotate secret: ${rotateKey}`);
        process.exit(1);
      }
      break;

    case 'rotate-all':
      const rotatedCount = sm.rotateAllSecrets();
      console.log(`✅ Rotated ${rotatedCount} secrets`);
      break;

    case 'jwt-generate':
      const userId = process.argv[3];
      const role = process.argv[4];
      const expiresHours = process.argv[5] ? parseInt(process.argv[5]) : 2;
      if (!userId || !role) {
        console.log('Usage: bun secrets-manager.ts jwt-generate <userId> <role> [expiresHours]');
        process.exit(1);
      }
      const token = sm.generateJWT(userId, role, expiresHours);
      console.log(token);
      break;

    case 'jwt-verify':
      const jwtToken = process.argv[3];
      if (!jwtToken) {
        console.log('Usage: bun secrets-manager.ts jwt-verify <token>');
        process.exit(1);
      }
      const payload = sm.verifyJWT(jwtToken);
      if (payload) {
        console.log(`✅ Valid JWT for user ${payload.userId} (${payload.role})`);
        console.log(`Expires: ${new Date(payload.exp * 1000).toISOString()}`);
      } else {
        console.log('❌ Invalid or expired JWT');
        process.exit(1);
      }
      break;

    case 'audit-log':
      const event = process.argv[3];
      const eventData = process.argv[4] || '{}';
      if (!event) {
        console.log('Usage: bun secrets-manager.ts audit-log <event> [data]');
        process.exit(1);
      }
      try {
        const parsedData = JSON.parse(eventData);
        sm.logImmutable(event, parsedData);
        console.log(`✅ Logged audit event: ${event}`);
      } catch (error) {
        console.log(`❌ Failed to parse event data: ${error}`);
        process.exit(1);
      }
      break;

    case 'audit-verify':
      const date = process.argv[3] || new Date().toISOString().split('T')[0];
      const isValid = sm.verifyAuditIntegrity(date);
      console.log(`Audit integrity for ${date}: ${isValid ? '✅ VALID' : '❌ TAMPERED'}`);
      if (!isValid) {
        process.exit(1);
      }
      break;

    default:
      console.log('Available commands:');
      console.log('  set <key> <value> [expiresDays] - Set a secret');
      console.log('  get <key>                        - Get a secret');
      console.log('  rotate <key>                     - Rotate a specific secret');
      console.log('  rotate-all                       - Rotate all old secrets');
      console.log('  jwt-generate <userId> <role> [hours] - Generate JWT token');
      console.log('  jwt-verify <token>               - Verify JWT token');
      console.log('  audit-log <event> [data]         - Log immutable audit event');
      console.log('  audit-verify [date]              - Verify audit integrity');
  }
}

export default SecretsManager;
