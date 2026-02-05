#!/usr/bin/env bun
/**
 * Nebula-Flow™ Atlas Restore
 * Restore device from cold storage tarball
 */

import { AtlasSchema } from '../src/atlas/schema.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args[0] !== '--from-tar' || !args[1].includes('--birth-key')) {
    console.log(`
🌌 Nebula-Flow™ Atlas Restore

Usage:
  bun run cli/atlas-restore.ts --from-tar s3://nebula-flow/starlight-abc123.tar.gz --birth-key \$BIRTH_KEY

Options:
  --from-tar URL      S3/Filebase URL of encrypted tarball
  --birth-key KEY     32-byte hex birth key for decryption

Example:
  bun run cli/atlas-restore.ts \\
    --from-tar https://api.filebase.com/v1/buckets/nebula-flow/objects/starlight-abc123-123456789.tar.gz \\
    --birth-key 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
`);
    process.exit(1);
  }

  const tarUrl = args[1];
  const birthKey = args[3];

  if (!tarUrl || !birthKey) {
    console.error("❌ Missing required arguments");
    process.exit(1);
  }

  console.log("🔄 Starting Atlas restore...");
  console.log(`📦 Tarball: ${tarUrl}`);
  console.log(`🔑 Birth key: ${birthKey.substring(0, 16)}...`);

  try {
    // Download encrypted tarball
    console.log("📥 Downloading encrypted tarball...");
    const response = await fetch(tarUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const encrypted = await response.arrayBuffer();

    // Decrypt with birth key
    console.log("🔓 Decrypting with birth key...");
    const key = await crypto.subtle.importKey(
      "raw",
      Buffer.from(birthKey, "hex"),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // Extract IV from beginning of encrypted data (first 12 bytes)
    const encryptedArray = new Uint8Array(encrypted);
    const iv = encryptedArray.slice(0, 12);
    const ciphertext = encryptedArray.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    // Extract tarball to temp directory
    console.log("📂 Extracting tarball...");
    const tempDir = `/tmp/atlas-restore-${Date.now()}`;
    await Bun.$`mkdir -p ${tempDir}`;
    await Bun.$`cd ${tempDir} && cat > restore.tar.gz`.stdin(decrypted);
    await Bun.$`cd ${tempDir} && tar -xzf restore.tar.gz`;

    // Read atlas.db and restore data
    console.log("🗂️  Restoring Atlas data...");
    const { Database } = await import("sqlite");
    const restoreDb = new Database(`${tempDir}/atlas.db`);

    // Get device record
    const deviceRow = await restoreDb.get(`SELECT * FROM starlight LIMIT 1`);
    if (!deviceRow) {
      throw new Error("No device record found in tarball");
    }

    // Restore to main Atlas
    await AtlasSchema.registerDevice({
      id: deviceRow.id,
      handle: deviceRow.handle,
      apple_id: deviceRow.apple_id,
      venmo: deviceRow.venmo,
      cashapp: deviceRow.cashapp,
      paypal: deviceRow.paypal,
      privacy_pan: deviceRow.privacy_pan,
      eth_addr: deviceRow.eth_addr,
      mnemonic_enc: deviceRow.mnemonic_enc,
      birth_ts: deviceRow.birth_ts,
      last_snap_ts: deviceRow.last_snap_ts,
      month_volume: deviceRow.month_volume,
      status: 'active', // Restore as active
      atlas_json: deviceRow.atlas_json
    });

    // Restore events
    const events = await restoreDb.all(`SELECT * FROM events`);
    for (const event of events) {
      await AtlasSchema.logEvent(deviceRow.id, event.type, JSON.parse(event.payload));
    }

    // Recreate device from last snapshot
    console.log("🔄 Recreating device from last snapshot...");

    const lastSnap = await restoreDb.get(`
      SELECT * FROM snapshots
      WHERE device_id = ?
      ORDER BY ts DESC
      LIMIT 1
    `, [deviceRow.id]);

    if (lastSnap) {
      // Clone from snapshot
      const cloneResponse = await fetch(`https://api.duoplus.com/v1/devices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DUOPLUS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: deviceRow.handle,
          snapshotId: lastSnap.name
        }),
      });

      if (!cloneResponse.ok) {
        throw new Error(`Device recreation failed: ${cloneResponse.status}`);
      }

      const { id: newDeviceId } = await cloneResponse.json();

      // Push restored environment
      const env = await Bun.file(`${tempDir}/env`).text();
      await fetch(`https://api.duoplus.com/v1/devices/${newDeviceId}/push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DUOPLUS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: [{
            path: "/data/local/tmp/env",
            content: env
          }]
        }),
      });

      // Push Atlas agent
      const agentCode = await Bun.file("src/atlas/agent.ts").text();
      await fetch(`https://api.duoplus.com/v1/devices/${newDeviceId}/push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DUOPLUS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: [{
            path: "/data/local/tmp/atlas-agent.js",
            content: agentCode
          }]
        }),
      });

      // Start Atlas agent
      await fetch(`https://api.duoplus.com/v1/devices/${newDeviceId}/exec`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DUOPLUS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command: "cd /data/local/tmp && bun run atlas-agent.js",
          timeout: 30000
        }),
      });

      console.log(`✅ Device ${deviceRow.handle} restored as ${newDeviceId}`);
      console.log("🔄 Atlas agent restarted - device is now self-monitoring");
    }

    // Cleanup
    await Bun.$`rm -rf ${tempDir}`;

    console.log("🎉 Atlas restore completed successfully!");
    console.log(`📍 Device: ${deviceRow.handle}`);
    console.log(`🆔 ID: ${deviceRow.id}`);
    console.log(`⏰ Birth: ${new Date(deviceRow.birth_ts).toLocaleString()}`);

  } catch (error: any) {
    console.error(`❌ Restore failed: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}