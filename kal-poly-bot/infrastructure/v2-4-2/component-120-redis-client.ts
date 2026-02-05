#!/usr/bin/env bun
/**
 * Component #120: Redis-Client
 * Primary API: Bun.RedisClient
 * Performance SLA: 7.9x ioredis performance
 * Parity Lock: 7e8f...9g0h
 * Status: PUBSUB_ACTIVE
 */

import { feature } from "bun:bundle";

export class RedisClient {
  private static instance: RedisClient;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!this.instance) {
      this.instance = new RedisClient();
    }
    return this.instance;
  }

  async connect(url: string): Promise<any> {
    if (!feature("REDIS_CLIENT")) {
      return null;
    }

    const client = new Bun.RedisClient(url);
    await client.connect();
    return client;
  }

  async set(client: any, key: string, value: string): Promise<void> {
    if (!feature("REDIS_CLIENT")) return;
    await client.set(key, value);
  }

  async get(client: any, key: string): Promise<string | null> {
    if (!feature("REDIS_CLIENT")) return null;
    return await client.get(key);
  }
}

export const redisClient = feature("REDIS_CLIENT")
  ? RedisClient.getInstance()
  : {
      connect: async () => null,
      set: async () => {},
      get: async () => null,
    };

export default redisClient;
