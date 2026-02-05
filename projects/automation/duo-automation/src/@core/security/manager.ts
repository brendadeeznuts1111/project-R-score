// src/secrets/manager.ts
import { join } from 'path';
import { z } from 'zod';

// ✅ SECRET SCHEMA (validation)
const SecretSchema = z.object({
  tokens: z.record(z.string(), z.string().min(16)), // Must be 16+ chars
  duoPlus: z.string().min(16),
  r2: z.object({
    accessKey: z.string().min(16),
    secretKey: z.string().min(16),
    endpoint: z.string().url(),
    bucket: z.string().min(3),
  }),
});

const SERVICE_NAME = 'windsurf-r2-empire';

export class BunSecretManager {
  private static instance: BunSecretManager;
  private secrets: z.infer<typeof SecretSchema> | null = null;
  private hashedTokens = new Map<string, string>(); // token → hash
  private tokenCache = new Map<string, { userId: string; role: string; expires: number }>();
  private CACHE_TTL = 3600_000; // 1 hour
  private initPromise: Promise<void>;

  private constructor() {
    this.initPromise = this.initialize();
  }

  static getInstance(): BunSecretManager {
    if (!BunSecretManager.instance) {
      BunSecretManager.instance = new BunSecretManager();
    }
    return BunSecretManager.instance;
  }

  private async initialize() {
    this.secrets = await this.loadSecrets();
    await this.prehashTokens();
  }

  // ✅ Load from OS store (Bun.secrets) > Bun.secret (encrypted) > env
  private async loadSecrets(): Promise<z.infer<typeof SecretSchema>> {
    // 1. Try OS Native Store (Bun.secrets) - High Priority
    try {
      const nativeTokensStr = await (globalThis as any).Bun?.secrets?.get(SERVICE_NAME, 'rbac-tokens');
      const nativeFactoryWager = await (globalThis as any).Bun?.secrets?.get(SERVICE_NAME, 'factory-wager-key');
      const nativeR2 = await (globalThis as any).Bun?.secrets?.get(SERVICE_NAME, 'r2-config');

      if (nativeTokensStr && nativeFactoryWager && nativeR2) {
        console.log('🔐 Loading from OS Native Store (Keychain/Vault)');
        return SecretSchema.parse({
          tokens: JSON.parse(nativeTokensStr),
          duoPlus: nativeFactoryWager,
          r2: JSON.parse(nativeR2),
        });
      }
    } catch (e) {
      // Fall through
    }

    // 2. Try Bun.secret (encrypted at rest, only in Bun 1.3.5+)
    try {
      const secretStore = (globalThis as any).Bun?.secret?.store;
      if (secretStore?.tokens) {
        console.log('🔐 Using Bun.secret encrypted store');
        return SecretSchema.parse(secretStore);
      }
    } catch {
      // Fall through to env
    }

    // 3. Try .env.secrets file (chmod 600, gitignored) or Bun.env
    try {
      const secretsFile = Bun.file('.env.secrets');
      if (await secretsFile.exists() || Bun.env.SECRET_TOKENS) {
        console.log(' Loading from .env or .env.secrets');
        return SecretSchema.parse({
          tokens: JSON.parse(Bun.env.SECRET_TOKENS || Bun.env.RBAC_TOKENS || '{}'),
          duoPlus: Bun.env.SECRET_FACTORY_WAGER_KEY || Bun.env.FACTORY_WAGER_API_KEY || '',
          r2: {
            accessKey: Bun.env.SECRET_R2_ACCESS_KEY || Bun.env.S3_ACCESS_KEY_ID || '',
            secretKey: Bun.env.SECRET_R2_SECRET_KEY || Bun.env.S3_SECRET_ACCESS_KEY || '',
            endpoint: Bun.env.SECRET_R2_ENDPOINT || Bun.env.S3_ENDPOINT || '',
            bucket: Bun.env.SECRET_R2_BUCKET || Bun.env.S3_BUCKET || '',
          },
        });
      }
    } catch (e: any) {
      // Catch and log error
      console.error('Error loading from .env or .env.secrets:', e.message);
    }

    // Fallback to plain .env defaults (development only)
    console.warn(' Using plain .env - not recommended for production');
    return SecretSchema.parse({
      tokens: JSON.parse(Bun.env.RBAC_TOKENS || '{}'),
      duoPlus: Bun.env.FACTORY_WAGER_API_KEY || 'demo-key-placeholder-32-chars-long-minimum',
      r2: {
        accessKey: Bun.env.S3_ACCESS_KEY_ID || 'AKIAEXAMPLEPLACEHOLDER',
        secretKey: Bun.env.S3_SECRET_ACCESS_KEY || 'secretkeyplaceholder40charslongminimumminimum',
        endpoint: Bun.env.S3_ENDPOINT || 'https://example.com',
        bucket: Bun.env.S3_BUCKET || 'bucket',
      },
    });
  }

  // ✅ Pre-hash all tokens for secure comparison (timing-safe)
  private async prehashTokens() {
    if (!this.secrets) return;
    for (const [userId, token] of Object.entries(this.secrets.tokens)) {
      this.hashedTokens.set(token, await Bun.password.hash(token, 'bcrypt'));
    }
  }

  // ✅ Authenticate token (hashed comparison, cached)
  async authenticate(token: string): Promise<{ userId: string; role: string } | null> {
    await this.initPromise;
    
    // Check cache first
    const cached = this.tokenCache.get(token);
    if (cached && cached.expires > Date.now()) {
      return { userId: cached.userId, role: cached.role };
    }

    if (!this.secrets) return null;

    // ✅ Find user by token (O(n) but tokens are hashed)
    for (const [userId, storedToken] of Object.entries(this.secrets.tokens)) {
      const hash = this.hashedTokens.get(storedToken);
      if (hash && await Bun.password.verify(token, hash)) {
        const config = await this.getRBACConfig();
        const user = config.users[userId];
        if (!user) continue; 
        
        const role = user.role;
        this.tokenCache.set(token, { userId, role, expires: Date.now() + this.CACHE_TTL });
        return { userId, role };
      }
    }

    return null;
  }

  // ✅ Store secrets into OS Native Store
  async persistToNativeStore() {
    await this.initPromise;
    if (!this.secrets) return;

    try {
      await (globalThis as any).Bun?.secrets?.set(SERVICE_NAME, 'rbac-tokens', JSON.stringify(this.secrets.tokens));
      await (globalThis as any).Bun?.secrets?.set(SERVICE_NAME, 'factory-wager-key', this.secrets.duoPlus);
      await (globalThis as any).Bun?.secrets?.set(SERVICE_NAME, 'r2-config', JSON.stringify(this.secrets.r2));
      console.log('✅ Ported secrets to OS Native Store (Keychain/Vault)');
    } catch (e: any) {
      console.error('❌ Failed to persist to OS Native Store:', e.message);
    }
  }

  // ✅ Get RBAC config (auto-reload if changed)
  public async getRBACConfig() {
    const configPath = join(process.cwd(), 'config', 'rbac.json');
    const data = await Bun.file(configPath).text();
    return JSON.parse(data);
  }

  // ✅ Get secret by key
  getSecret(key: keyof z.infer<typeof SecretSchema>): unknown {
    return this.secrets ? this.secrets[key] : null;
  }

  // ✅ Rotate a token (immediate cache invalidation)
  async rotateToken(userId: string): Promise<string> {
    await this.initPromise;
    const newToken = `sk_live_${userId}_${(globalThis as any).Bun.randomUUIDv7()}`.slice(0, 64);
    
    // Update RBAC config
    const configPath = join(process.cwd(), 'config', 'rbac.json');
    const configData = await Bun.file(configPath).text();
    const config = JSON.parse(configData);
    if (config.users[userId]) {
      config.users[userId].token = newToken;
      await Bun.write(configPath, JSON.stringify(config, null, 2));
    }
    
    // Update local secrets
    if (this.secrets) this.secrets.tokens[userId] = newToken;
    
    this.tokenCache.clear();
    this.hashedTokens.clear();
    await this.prehashTokens();
    
    console.log(`🔁 Token rotated for ${userId}`);
    return newToken;
  }

  getTokenHashes(): Map<string, string> {
    return new Map(this.hashedTokens);
  }

  async syncToEnv() {
    await this.initPromise;
    if (!this.secrets) return;
    
    Bun.env.FACTORY_WAGER_API_KEY = this.secrets.duoPlus;
    Bun.env.S3_ACCESS_KEY_ID = this.secrets.r2.accessKey;
    Bun.env.S3_SECRET_ACCESS_KEY = this.secrets.r2.secretKey;
    Bun.env.S3_ENDPOINT = this.secrets.r2.endpoint;
    Bun.env.S3_BUCKET = this.secrets.r2.bucket;
  }
}

export const secretManager = BunSecretManager.getInstance();
