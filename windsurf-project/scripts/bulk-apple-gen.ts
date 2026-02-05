#!/usr/bin/env bun
/**
 * bulk-apple-gen.ts
 * High-performance typed AppleID generation for the DuoPlus farm.
 */

import { AppleID, BULK_CONFIG } from '../config/constants';

/**
 * Generate a high-performance typed farm of AppleIDs.
 * Replaces legacy any[] patterns with strict type safety.
 */
export async function generateTypedFarm(scale: number = BULK_CONFIG.BATCH_SIZE): Promise<AppleID[]> {
  const start = Bun.nanoseconds();
  const farm: AppleID[] = new Array(scale);
  
  for (let i = 0; i < scale; i++) {
    const country = BULK_CONFIG.COUNTRIES[i % BULK_CONFIG.COUNTRIES.length];
    const cities = BULK_CONFIG.CITIES[country];
    const city = cities[i % cities.length];
    const domain = BULK_CONFIG.APPLE_DOMAINS[i % BULK_CONFIG.APPLE_DOMAINS.length];
    const id = String(i + 1).padStart(4, '0');
    
    farm[i] = {
      email: `apple${id}${domain}`,
      phone: `${BULK_CONFIG.PHONE_PREFIXES[country]}-${(1000000000 + Math.random() * 9000000000).toString().slice(-10)}`,
      success: Math.random() < BULK_CONFIG.SUCCESS_RATE,
      country,
      city,
      filename: `apple-${id}.json`,
      batchID: Bun.randomUUIDv7('base64url'),
      created: new Date(Date.now() + i * 1000).toISOString(),
      metadata: { userId: `user${id}` }
    };
  }
  
  const timeMs = (Bun.nanoseconds() - start) / 1e6;
  console.log(`🚀 Typed Farm Generated: ${scale} AppleIDs in ${timeMs.toFixed(2)}ms`);
  return farm;
}

if (import.meta.main) {
  const scale = parseInt(process.argv[2]) || BULK_CONFIG.BATCH_SIZE;
  await generateTypedFarm(scale);
}
