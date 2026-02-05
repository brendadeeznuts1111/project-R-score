#!/usr/bin/env bun
/**
 * Nebula-Flow™ Atlas-Agent
 * Runs inside VM - zero touch after first boot
 * < 30 MB RAM, no root, no UI
 */

import { Database } from "sqlite";
import { ethers } from "ethers";
import { randomBytes } from "crypto";
import { AtlasSchema } from './schema.js';

const DEVICE_ID   = process.env.DUOPLUS_DEVICE_ID!;
const BIRTH_KEY   = process.env.BIRTH_KEY!;               // 32-byte hex
const ATLAS_DB    = "/data/local/tmp/atlas.db";
const LOG_FILE    = "/data/local/tmp/atlas.log";
const DUOPLUS_TOKEN = process.env.DUOPLUS_TOKEN!;

if (!DEVICE_ID || !BIRTH_KEY || !DUOPLUS_TOKEN) {
  console.error("❌ Missing required env vars: DUOPLUS_DEVICE_ID, BIRTH_KEY, DUOPLUS_TOKEN");
  process.exit(1);
}

// Initialize local DB
const db = new Database(ATLAS_DB);
await db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    ts INTEGER, type TEXT, payload TEXT
  );
  CREATE TABLE IF NOT EXISTS local_state (
    key TEXT PRIMARY KEY, value TEXT
  );
`);

async function log(type: string, payload: any) {
  const entry = JSON.stringify({ ts: Date.now(), type, payload }) + "\n";
  await Bun.write(LOG_FILE, entry, { flag: "a" });
  await db.run(`INSERT INTO events (ts, type, payload) VALUES (?, ?, ?)`,
               Date.now(), type, JSON.stringify(payload));
}

// Check if already born
const born = await db.get(`SELECT value FROM local_state WHERE key = 'born'`);
if (!born) {
  console.log("🍼 Birth sequence starting...");

  // 1. Generate birth certificate
  const wallet = ethers.Wallet.createRandom();
  const birth = {
    deviceId: DEVICE_ID,
    handle: process.env.HANDLE || `$${randomBytes(6).toString('hex')}`,
    appleId: process.env.APPLE_ID,
    venmo: process.env.VENMO_HANDLE,
    cashapp: process.env.CASHAPP_TAG,
    paypal: process.env.PAYPAL_EMAIL,
    privacyPan: process.env.PRIVACY_PAN,
    ethAddr: wallet.address,
    mnemonic: await wallet.encrypt(BIRTH_KEY),
    birthTs: Date.now(),
  };

  // Register with Atlas
  await AtlasSchema.registerDevice({
    id: birth.deviceId,
    handle: birth.handle,
    apple_id: birth.appleId,
    venmo: birth.venmo,
    cashapp: birth.cashapp,
    paypal: birth.paypal,
    privacy_pan: birth.privacyPan,
    eth_addr: birth.ethAddr,
    mnemonic_enc: birth.mnemonic,
    birth_ts: birth.birthTs,
    month_volume: 0,
    status: 'active',
    atlas_json: JSON.stringify(birth)
  });

  // Mark as born
  await db.run(`INSERT INTO local_state (key, value) VALUES ('born', 'true')`);

  await log("birth", birth);
  console.log("✅ Birth certificate registered");
}

// 2. Daily snapshot cron (14:00 UTC)
setInterval(async () => {
  const now = new Date();
  if (now.getUTCHours() === 14 && now.getUTCMinutes() === 0) {
    try {
      await createSnapshot();
      await thinSnapshots();
      await exportAtlasTar();
    } catch (error) {
      await log("cron-error", { error: error.message });
    }
  }
}, 60_000); // Check every minute

async function createSnapshot() {
  const snapId = `snap-${Date.now()}`;
  const response = await fetch(`https://api.duoplus.com/v1/devices/${DEVICE_ID}/snapshots`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DUOPLUS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: snapId }),
  });

  if (!response.ok) {
    throw new Error(`Snapshot failed: ${response.status}`);
  }

  await AtlasSchema.recordSnapshot(DEVICE_ID, snapId, snapId);
  await log("snapshot", { snapId });
  console.log(`📸 Snapshot created: ${snapId}`);
}

async function thinSnapshots() {
  const result = await AtlasSchema.thinSnapshots(DEVICE_ID);
  if (result.deleted > 0) {
    await log("thin", result);
    console.log(`🗑️  Thinned ${result.deleted} old snapshots`);
  }
}

async function exportAtlasTar() {
  try {
    // Get device data
    const device = await AtlasSchema.getDeviceById(DEVICE_ID);
    if (!device) return;

    // Create tarball of critical files
    const tarCmd = `tar -czf - -C /data/local/tmp atlas.db id_scan.enc env eth_wallet.txt 2>/dev/null || true`;
    const tar = await Bun.$`${tarCmd}`.arrayBuffer();

    // Encrypt with birth key
    const key = await crypto.subtle.importKey(
      "raw",
      Buffer.from(BIRTH_KEY, "hex"),
      { name: "AES-GCM" },
      false,
      ["encrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      tar
    );

    // Upload to cold storage
    const filename = `${DEVICE_ID}-${Date.now()}.tar.gz`;
    const uploadResponse = await fetch(`https://api.filebase.com/v1/buckets/nebula-flow/objects/${filename}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${process.env.FILEBASE_TOKEN}`,
        "Content-Type": "application/gzip"
      },
      body: encrypted,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    // Calculate checksum
    const hash = await crypto.subtle.digest("SHA-256", encrypted);
    const checksum = Buffer.from(hash).toString('hex');

    await AtlasSchema.recordColdExport(DEVICE_ID, filename, encrypted.byteLength, checksum);
    await log("cold-export", { filename, size: encrypted.byteLength, checksum });

    console.log(`🗂️  Cold export completed: ${filename}`);
  } catch (error) {
    await log("export-error", { error: error.message });
    console.error(`❌ Export failed: ${error.message}`);
  }
}

// 3. Volume tracking (update monthly volume)
setInterval(async () => {
  try {
    // This would integrate with your yield tracking system
    // For now, just log heartbeat
    await log("heartbeat", { uptime: process.uptime() });
  } catch (error) {
    console.error(`❌ Heartbeat error: ${error.message}`);
  }
}, 300_000); // Every 5 minutes

console.log("🌌 Atlas-Agent active - monitoring device lifecycle");
console.log(`📍 Device ID: ${DEVICE_ID}`);
console.log(`📅 Birth key: ${BIRTH_KEY.substring(0, 8)}...`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await log("shutdown", { reason: "SIGTERM" });
  process.exit(0);
});

process.on('SIGINT', async () => {
  await log("shutdown", { reason: "SIGINT" });
  process.exit(0);
});