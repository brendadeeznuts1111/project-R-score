// scripts/dashboard-ws-broadcast.ts - Dashboard WebSocket Broadcast CLI
// Broadcast config via WebSocket with deflate compression

import { file, YAML } from 'bun';

const args = process.argv.slice(2);

interface BroadcastOptions {
  filePath: string;
  deflate: boolean;
  subprotocol: string;
  url?: string;
}

async function broadcastConfig(options: BroadcastOptions): Promise<void> {
  console.log(`📡 Broadcasting config: ${options.filePath}`);
  console.log(`   Deflate: ${options.deflate ? '✅' : '❌'}`);
  console.log(`   Subprotocol: ${options.subprotocol}`);

  try {
    // Read and parse config
    const content = await file(options.filePath).text();
    const parsed = YAML.parse(content);
    
    // Generate hash
    const contentBuffer = new TextEncoder().encode(content);
    const hash = Bun.hash(contentBuffer);
    const hashHex = typeof hash === 'bigint' ? hash.toString(16) : hash.toString(16);
    const shortHash = hashHex.substring(0, 8);

    console.log(`✅ Config loaded (hash: ${shortHash})`);

    // Prepare message
    const message = {
      type: 'config-update',
      hash: shortHash,
      timestamp: new Date().toISOString(),
      config: parsed,
      metadata: {
        source: 'dashboard-ws-broadcast',
        size: contentBuffer.length
      }
    };

    const wsUrl = options.url || 'ws://localhost:8080/ws/config-broadcast';
    console.log(`\n🔌 Connecting to: ${wsUrl}`);

    // Connect to WebSocket
    const ws = new WebSocket(wsUrl, {
      compress: options.deflate,
      headers: {
        'Sec-WebSocket-Protocol': options.subprotocol
      }
    });

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        
        // Send config update
        const messageStr = JSON.stringify(message);
        ws.send(messageStr);
        
        console.log(`📤 Config broadcast sent:`);
        console.log(`   Hash: ${shortHash}`);
        console.log(`   Size: ${messageStr.length} bytes`);
        if (options.deflate) {
          console.log(`   Compressed: Yes (permessage-deflate)`);
        }

        // Wait for acknowledgment
        setTimeout(() => {
          ws.close();
          resolve();
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data as string);
          console.log(`📥 Response:`, response);
        } catch (error) {
          console.log(`📥 Raw response:`, event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('   Make sure the WebSocket server is running on', wsUrl);
        ws.close();
        resolve(); // Don't reject - server might not be running
      };

      ws.onclose = () => {
        console.log('✅ WebSocket closed');
        resolve();
      };
    });

    console.log(`\n✅ Broadcast completed`);

  } catch (error) {
    if (error.message.includes('Failed to connect')) {
      console.error('❌ Error: WebSocket server not available');
      console.error('   Start the server with: bun run api:serve');
      process.exit(0); // Exit with 0 for server not running (not a script error)
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Parse arguments
function parseArgs(): BroadcastOptions {
  const filePath = args.find(arg => !arg.startsWith('--')) || args[0];
  
  if (!filePath) {
    console.error('❌ Error: File path required');
    console.error('Usage: bun run dashboard:ws-broadcast <file> [--deflate] [--subprotocol=<version>] [--url=<ws-url>]');
    process.exit(1);
  }

  const deflateArg = args.find(arg => arg.startsWith('--deflate'));
  const subprotocolArg = args.find(arg => arg.startsWith('--subprotocol='));
  const urlArg = args.find(arg => arg.startsWith('--url='));

  return {
    filePath,
    deflate: !!deflateArg,
    subprotocol: subprotocolArg ? subprotocolArg.split('=')[1] : 'dashboard-v1.3',
    url: urlArg ? urlArg.split('=')[1] : undefined
  };
}

if (import.meta.main) {
  const options = parseArgs();
  broadcastConfig(options);
}

