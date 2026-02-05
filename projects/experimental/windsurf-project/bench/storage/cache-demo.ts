#!/usr/bin/env bun
// cache-demo.ts - R2 Caching Demo

import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

class R2Cache {
  private manager: BunR2AppleManager;
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor() {
    this.manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET!);
  }

  async get(key: string): Promise<any> {
    // Check memory cache first
    const mem = this.cache.get(key);
    if (mem && mem.expiry > Date.now()) {
      return mem.data;
    }

    // Check R2 cache
    try {
      const data = await this.manager.readAsJson(`cache/${key}.json`);
      this.cache.set(key, { data, expiry: Date.now() + 300000 }); // 5 min
      return data;
    } catch {
      return null;
    }
  }

  async set(key: string, data: any, ttl = 300): Promise<void> {
    // Store in memory
    this.cache.set(key, { data, expiry: Date.now() + ttl * 1000 });
    
    // Store in R2
    await this.manager.uploadAppleID(data, `cache/${key}.json`);
  }

  clear(): void {
    this.cache.clear();
  }
}

async function demo() {
  const cache = new R2Cache();
  
  // Set cache
  await cache.set('test', { value: 'cached data', time: Date.now() });
  
  // Get from cache
  const data = await cache.get('test');
  console.log('Cache hit:', data ? '✅' : '❌');
}

demo();
