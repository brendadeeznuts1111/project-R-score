#!/usr/bin/env bun
/**
 * Demo: Nebula-Flow™ Device Atlas
 * Shows the complete device lifecycle management system
 */

import chalk from 'chalk';
import { AtlasSchema } from '../src/atlas/schema.js';
import { ethers } from 'ethers';

async function demoAtlas() {
  console.info(chalk.hex("#FF6B35").bold(`
╔══════════════════════════════════════════════╗
║        🗂  NEBULA-FLOW™ DEVICE ATLAS         ║
║     Device Lifecycle Management System      ║
╚══════════════════════════════════════════════╝
`));

  console.info(chalk.blue.bold("🗂️  Atlas Components:"));
  console.info(`
${chalk.green("✅")} SQLite Schema       - Device metadata & events
${chalk.green("✅")} Atlas-Agent™        - Zero-touch VM monitoring
${chalk.green("✅")} Automated Snapshots - Daily → Weekly → Monthly
${chalk.green("✅")} Cold Storage        - Encrypted tarballs to S3
${chalk.green("✅")} Inventory System    - Real-time fleet overview
${chalk.green("✅")} Restore Capability  - 3-minute device resurrection
`);

  console.info(chalk.cyan.bold("📊 Database Schema:"));

  console.info(`
┌─────────────────────────────────────────────┐
│ starlight (main table)                      │
├─────────────────────────────────────────────┤
│ id              TEXT PRIMARY KEY            │
│ handle          TEXT UNIQUE ($sarah123)     │
│ apple_id        TEXT                        │
│ venmo           TEXT                        │
│ cashapp         TEXT                        │
│ paypal          TEXT                        │
│ privacy_pan     TEXT                        │
│ eth_addr        TEXT                        │
│ mnemonic_enc    TEXT (AES-256)              │
│ birth_ts        INTEGER                     │
│ last_snap_ts    INTEGER                     │
│ month_volume    REAL DEFAULT 0              │
│ status          TEXT (active/retired/destroyed)
│ atlas_json      TEXT (birth certificate)    │
└─────────────────────────────────────────────┘
`);

  // Create some demo data
  console.info(chalk.yellow.bold("🔄 Creating demo Starlight-IDs..."));

  const demoDevices = [
    { handle: "$sarah123", volume: 1250.50 },
    { handle: "$mike456", volume: 890.25 },
    { handle: "$jane789", volume: 2100.75 },
    { handle: "$alex101", volume: 675.00 },
    { handle: "$emma202", volume: 1580.30 }
  ];

  for (let i = 0; i < demoDevices.length; i++) {
    const device = demoDevices[i];
    const wallet = ethers.Wallet.createRandom();

    // Vary birth dates for age distribution
    const birthTs = Date.now() - (i * 7 * 24 * 60 * 60 * 1000); // 1 week apart

    await AtlasSchema.registerDevice({
      id: `demo-device-${i + 1}`,
      handle: device.handle,
      apple_id: `demo${i}@icloud.com`,
      venmo: device.handle,
      cashapp: device.handle,
      paypal: `${device.handle}@paypal.com`,
      privacy_pan: `4532${i.toString().padStart(4, '0')}0000000000`,
      eth_addr: wallet.address,
      mnemonic_enc: await wallet.encrypt("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"),
      birth_ts: birthTs,
      month_volume: device.volume,
      status: 'active',
      atlas_json: JSON.stringify({
        deviceId: `demo-device-${i + 1}`,
        handle: device.handle,
        ethAddr: wallet.address,
        birthTs: birthTs
      })
    });

    // Add some snapshots
    const snapCount = Math.floor(Math.random() * 10) + 1;
    for (let s = 0; s < snapCount; s++) {
      const snapTs = birthTs + (s * 24 * 60 * 60 * 1000); // Daily snapshots
      await AtlasSchema.recordSnapshot(
        `demo-device-${i + 1}`,
        `snap-${i + 1}-${s}`,
        `snap-${i + 1}-${s}`
      );
    }

    console.info(`  ${chalk.green("✅")} Created ${device.handle} (${device.volume.toFixed(2)} vol, ${snapCount} snaps)`);
  }

  // Add some cold exports
  for (let i = 0; i < 3; i++) {
    await AtlasSchema.recordColdExport(
      `demo-device-${i + 1}`,
      `demo-device-${i + 1}-${Date.now() - (i * 24 * 60 * 60 * 1000)}.tar.gz`,
      1024 * 1024 * (i + 1), // 1MB, 2MB, 3MB
      `checksum${i}`
    );
  }

  console.info("");
  console.info(chalk.magenta.bold("📊 Atlas Inventory:"));

  const inventory = AtlasSchema.getInventory();

  console.info("┌──────────┬──────┬─────────┬──────────┬──────────┐");
  console.info("│ Age days │ Count│ Active  │ Vol $k   │ Snaps    │");
  console.info("├──────────┼──────┼─────────┼──────────┼──────────┤");

  inventory.ageGroups.forEach(group => {
    console.info(`│ ${group.range.padEnd(8)} │ ${group.count.toString().padStart(4)} │ ${group.active.toString().padStart(7)} │ ${(group.volume/1000).toFixed(1).padStart(8)} │ ${group.snaps.toString().padStart(8)} │`);
  });

  console.info("└──────────┴──────┴─────────┴──────────┴──────────┘");

  const lastExport = inventory.total.lastExport ?
    `${Math.floor((Date.now() - inventory.total.lastExport) / 60000)} min ago` : "never";

  console.info("");
  console.info(`Total Starlight-IDs: ${inventory.total.count}`);
  console.info(`Total cold tarballs: ${inventory.total.coldExports} (encrypted)`);
  console.info(`Last export: ${lastExport}`);

  console.info("");
  console.info(chalk.green.bold("🚀 Integration Commands:"));

  console.info(`
// Start dashboard & access Atlas
${chalk.gray("$")} bun run dashboard
${chalk.gray("// Press 'd' for Device Commander")}
${chalk.gray("// Press 'a' for Atlas Inventory")}

// Restore device from cold storage
${chalk.gray("$")} bun run atlas-restore \\
  --from-tar s3://nebula-flow/starlight-abc123.tar.gz \\
  --birth-key 1234567890abcdef1234567890abcdef

// Deploy Atlas-Agent to device (after clone)
${chalk.gray("$")} echo "DUOPLUS_DEVICE_ID=abc123
BIRTH_KEY=1234567890abcdef...
DUOPLUS_TOKEN=token..." > env
${chalk.gray("$")} # Push env, then run agent
${chalk.gray("// In Device Commander: select device, press 'p', then 'r'")}
`);

  console.info("");
  console.info(chalk.blue.bold("🔄 Automated Lifecycle:"));

  console.info(`
${chalk.cyan("📅 Daily (14:00 UTC):")}
  • Create snapshot
  • Thin old snapshots (daily→weekly→monthly)
  • Export encrypted tarball to cold storage

${chalk.cyan("📊 Real-time Tracking:")}
  • Birth certificates (immutable)
  • Event logging (clone, snap, push, sweep, profit)
  • Volume tracking & health monitoring

${chalk.cyan("🗂️  Cold Storage:")}
  • AES-256 encrypted tarballs
  • Filebase S3 or your preferred storage
  • 90-day retention for destroyed devices
`);

  console.info("");
  console.info(chalk.green.bold("💡 Key Benefits:"));

  console.info(`
• ${chalk.yellow("Zero-touch operation")} - Atlas-Agent runs automatically
• ${chalk.yellow("Complete lifecycle")} - Birth to death to resurrection
• ${chalk.yellow("Encrypted backups")} - Cold storage with birth-key encryption
• ${chalk.yellow("Real-time inventory")} - Always know your fleet status
• ${chalk.yellow("3-minute restore")} - Never lose a device permanently
• ${chalk.yellow("Immutable history")} - Every event logged & timestamped
`);

  console.info("");
  console.info(chalk.magenta.bold("🎯 Production Deployment:"));

  console.info(`
1. ${chalk.cyan("Device Creation:")}
   - Clone from base snapshot
   - Push Atlas-Agent + env vars
   - Start agent: \`bun run atlas-agent.js\`

2. ${chalk.cyan("Monitoring:")}
   - Daily snapshots at 14:00 UTC
   - Automatic thinning by age
   - Encrypted cold exports

3. ${chalk.cyan("Inventory:")}
   - Press 'a' in Device Commander
   - Real-time fleet overview
   - Volume & health tracking

4. ${chalk.cyan("Disaster Recovery:")}
   - Download tarball from cold storage
   - Run restore command
   - Device back online in 3 minutes
`);

  console.info("");
  console.info(chalk.green.bold("🎉 Nebula-Flow™ Device Atlas Ready!"));
  console.info(chalk.gray("Run 'bun run dashboard' to access the Device Commander"));
  console.info(chalk.gray("Press 'd' then 'a' to see the Atlas Inventory"));
}

if (import.meta.main) {
  demoAtlas().catch(console.error);
}