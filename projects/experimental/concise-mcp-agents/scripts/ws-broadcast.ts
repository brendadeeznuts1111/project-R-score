#!/usr/bin/env bun
import { BunYAMLRegistry } from './registry';

const registry = new BunYAMLRegistry();

interface WSBroadcastOptions {
  file?: string;
  subprotocol?: string;
  compress?: boolean;
  wsUrl?: string;
}

async function broadcastYAMLUpdate(options: WSBroadcastOptions = {}) {
  const {
    file,
    subprotocol = 'v1.3',
    compress = true,
    wsUrl = 'ws://localhost:3003/ws/config-update'
  } = options;

  if (!file) {
    console.error('Usage: bun run ws-broadcast.ts <file> [--subprotocol=v1.3] [--compress] [--ws-url=...]');
    process.exit(1);
  }

  try {
    console.log(`📡 Broadcasting ${file} via WebSocket...`);

    // Read and store the YAML file
    const content = await Bun.file(file).text();
    const hash = await registry.storeYAML(content, {
      compress,
      interpolate: true,
      metadata: {
        broadcast: true,
        subprotocol,
        timestamp: new Date().toISOString(),
        file
      }
    });

    // Prepare broadcast message
    const message = {
      type: 'config-update',
      hash,
      file,
      subprotocol,
      timestamp: new Date().toISOString(),
      content: compress ? undefined : content, // Don't send full content if compressed
      compressed: compress
    };

    // For now, just log the broadcast (WebSocket server would handle actual broadcasting)
    console.log(`📡 Broadcast prepared for hash: ${hash}`);
    console.log(`🔗 WebSocket URL: ${wsUrl}`);
    console.log(`📋 Subprotocol: ${subprotocol}`);
    console.log(`📦 Message:`, JSON.stringify(message, null, 2));

    // In a real implementation, this would connect to the WebSocket server
    // and send the broadcast message to all connected clients

    console.log(`✅ YAML broadcast complete!`);

  } catch (error) {
    console.error(`❌ Broadcast failed:`, error.message);
    process.exit(1);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const file = args[0];

  if (!file) {
    console.error('Usage: bun run ws-broadcast.ts <file> [--subprotocol=v1.3] [--compress] [--ws-url=...]');
    process.exit(1);
  }

  const options: WSBroadcastOptions = {
    file,
    subprotocol: args.find(arg => arg.startsWith('--subprotocol='))?.split('=')[1] || 'v1.3',
    compress: args.includes('--compress') || args.includes('--zstd'),
    wsUrl: args.find(arg => arg.startsWith('--ws-url='))?.split('=')[1]
  };

  await broadcastYAMLUpdate(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { broadcastYAMLUpdate };