export class SignalStore {
  private redis: Bun.RedisClient | null = null;
  private isInitialized: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  }

  async init(): Promise<void> {
    if (!this.isInitialized) {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      this.redis = Bun.redis(redisUrl);
      this.isInitialized = true;
    }
  }

  private ensureRedis(): Bun.RedisClient {
    if (!this.redis) {
      throw new Error("SignalStore not initialized. Call init() first.");
    }
    return this.redis;
  }

  async getDeviceAge(deviceId: string): Promise<number> {
    await this.init();
    const r = this.ensureRedis();
    const age = await r.get(`age:${deviceId}`);
    return age ? parseInt(age) : 0;
  }

  async getLocationVariance(ip: string): Promise<number> {
    await this.init();
    const r = this.ensureRedis();
    return await r.zCard(`ip_history:${ip}`);
  }

  async getRecentFunding(deviceId: string): Promise<number> {
    await this.init();
    const r = this.ensureRedis();
    const total = await r.get(`funding_24h:${deviceId}`);
    return total ? parseFloat(total) : 0;
  }

  async recordLeg(deviceId: string, amount: number): Promise<void> {
    await this.init();
    const r = this.ensureRedis();
    const key = `funding_24h:${deviceId}`;
    await r.incrByFloat(key, amount);
    await r.expire(key, 86400); // TTL 24 h
  }

  async getVelocity(deviceId: string): Promise<number> {
    await this.init();
    const r = this.ensureRedis();
    const key = `velocity:${deviceId}`;
    const count = await r.get(key);
    return count ? parseFloat(count) : 0;
  }

  async recordVelocity(deviceId: string): Promise<void> {
    await this.init();
    const r = this.ensureRedis();
    const key = `velocity:${deviceId}`;
    await r.incr(key);
    await r.expire(key, 3600); // TTL 1 hour
  }

  async retireDevice(deviceId: string): Promise<void> {
    await this.init();
    const r = this.ensureRedis();
    const keys = [
      `age:${deviceId}`,
      `funding_24h:${deviceId}`,
      `velocity:${deviceId}`,
    ];
    
    if (keys.length > 0) {
      await r.del(keys);
    }
  }

  async close(): Promise<void> {
    if (this.isInitialized && this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isInitialized = false;
    }
  }
}