#!/usr/bin/env bun
// scripts/bun-v13-demos.ts - Demonstrating enhanced socket info and stream piping

import { 
  getSocketInfo, 
  performNetworkDiagnostics, 
  pipeToProcess, 
  processJsonStream,
  StreamProcessor,
  ProcessController,
  spawnProcessWithArgs
} from '../packages/odds-core/src/utils.js';

console.info('🚀 Bun v1.3 Enhanced Features Demo');
console.info('=====================================');

// Demo 1: Enhanced Socket Information
async function demoSocketInfo() {
  console.info('\n📡 Enhanced Socket Information Demo');
  
  const endpoints = [
    { hostname: 'httpbin.org', port: 80 },
    { hostname: 'api.github.com', port: 443 },
    { hostname: 'example.com', port: 80 }
  ];

  const results = await performNetworkDiagnostics(endpoints);
  
  results.forEach(result => {
    if (result.success && result.data?.info) {
      console.info(`✅ ${result.data.endpoint}:`);
      console.info(`   Local: ${result.data.info.localAddress}:${result.data.info.localPort} (${result.data.info.localFamily})`);
      console.info(`   Remote: ${result.data.info.remoteAddress}:${result.data.info.remotePort} (${result.data.info.remoteFamily})`);
      console.info(`   Protocol: ${result.data.info.protocol}`);
      console.info(`   Connected: ${new Date(result.data.info.connectionTimestamp).toISOString()}`);
    } else {
      console.info(`❌ ${result.endpoint?.hostname}:${result.endpoint?.port}: ${result.error}`);
    }
  });
}

// Demo 2: Stream Processing with JSON Transformation
async function demoStreamProcessing() {
  console.info('\n🔄 Stream Processing Demo');
  
  // Create sample market data
  const marketData = [
    { symbol: 'AAPL', price: 175.50, volume: 1000, timestamp: Date.now() },
    { symbol: 'GOOGL', price: 142.25, volume: 500, timestamp: Date.now() },
    { symbol: 'MSFT', price: 380.75, volume: 750, timestamp: Date.now() }
  ];
  
  // Convert to ReadableStream
  const jsonString = JSON.stringify(marketData);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(jsonString));
      controller.close();
    }
  });
  
  try {
    // Process with jq if available, otherwise fallback to identity
    const transformCmd = process.platform === 'darwin' || process.platform === 'linux' 
      ? ['jq', '.[] | select(.price > 150)'] 
      : ['cat'];
    
    const processed = await processJsonStream(
      stream,
      transformCmd,
      (data) => data, // Parser identity
      (item) => ({ ...item, processed: true }) // Add processed flag
    );
    
    console.info('✅ Processed market data:');
    processed.forEach(item => {
      console.info(`   ${item.symbol}: $${item.price} (processed: ${item.processed})`);
    });
  } catch (error) {
    console.info('⚠️ Stream processing demo skipped (jq not available)');
  }
}

// Demo 3: Real-time Stream Processing
async function demoRealTimeStream() {
  console.info('\n⚡ Real-time Stream Processing Demo');
  
  const processor = new StreamProcessor();
  const processedChunks: string[] = [];
  
  // Create a stream with multiple chunks
  const stream = new ReadableStream({
    async start(controller) {
      const chunks = [
        'chunk1: market data update',
        'chunk2: price change alert',
        'chunk3: volume spike detected'
      ];
      
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk + '\n'));
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
      }
      
      controller.close();
    }
  });
  
  try {
    await processor.processStream(
      'demo-stream',
      stream,
      async (chunk) => {
        const text = new TextDecoder().decode(chunk);
        processedChunks.push(text.trim());
        console.info(`   Processed: ${text.trim()}`);
      }
    );
    
    console.info(`✅ Processed ${processedChunks.length} chunks`);
  } catch (error) {
    console.error('❌ Real-time stream processing failed:', error);
  }
}

// Demo 4: Process Control with ref/unref
async function demoProcessControl() {
  console.info('\n🎮 Process Control Demo');
  
  const controller = new ProcessController();
  
  console.info('Initial ref state:', controller.getRefState());
  
  // Demo withRef - keeps process alive
  await controller.withRef(async () => {
    console.info('Inside withRef - process is kept alive');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.info('Ref state during operation:', controller.getRefState());
  });
  
  console.info('After withRef - process can exit:', controller.getRefState());
  
  // Demo withUnref - allows process to exit
  await controller.withUnref(async () => {
    console.info('Inside withUnref - process can exit if needed');
    await new Promise(resolve => setTimeout(resolve, 100));
    console.info('Ref state during operation:', controller.getRefState());
  });
  
  console.info('Final ref state:', controller.getRefState());
}

// Demo 5: Enhanced Process Spawning
async function demoProcessSpawning() {
  console.info('\n🔧 Enhanced Process Spawning Demo');
  
  try {
    // Spawn a process with custom environment
    const result = await spawnProcessWithArgs(
      ['echo', 'Hello from Bun v1.3!'],
      {
        env: { CUSTOM_VAR: 'odds-protocol' },
        timeout: 5000,
        ref: false // Allow process to exit
      }
    );
    
    if (result.success) {
      console.info('✅ Process output:', result.stdout.trim());
      console.info(`   PID: ${result.pid}, Exit code: ${result.exitCode}`);
    } else {
      console.info('❌ Process failed:', result.stderr);
    }
  } catch (error) {
    console.error('❌ Process spawning demo failed:', error);
  }
}

// Demo 6: Advanced Stream Piping
async function demoAdvancedPiping() {
  console.info('\n🚀 Advanced Stream Piping Demo');
  
  try {
    // Create a data stream
    const dataStream = new ReadableStream({
      start(controller) {
        const data = JSON.stringify([
          { type: 'trade', symbol: 'BTC', price: 45000 },
          { type: 'quote', symbol: 'ETH', price: 3000 },
          { type: 'trade', symbol: 'BTC', price: 45100 }
        ]);
        controller.enqueue(new TextEncoder().encode(data));
        controller.close();
      }
    });
    
    // Pipe through a transformation (if jq is available)
    const transformCmd = process.platform === 'darwin' || process.platform === 'linux' 
      ? ['jq', '.[] | select(.type == "trade")'] 
      : ['cat'];
    
    const result = await pipeToProcess(dataStream, transformCmd, {
      stdout: 'pipe',
      stderr: 'pipe'
    });
    
    const output = await new Response(result.stdout).text();
    console.info('✅ Piped and filtered data:');
    console.info(output.trim() || '   (No jq available - raw data passed through)');
    
  } catch (error) {
    console.error('❌ Advanced piping demo failed:', error);
  }
}

// Run all demos
async function runAllDemos() {
  try {
    await demoSocketInfo();
    await demoStreamProcessing();
    await demoRealTimeStream();
    await demoProcessControl();
    await demoProcessSpawning();
    await demoAdvancedPiping();
    
    console.info('\n🎉 All Bun v1.3 demos completed successfully!');
    console.info('\nKey features demonstrated:');
    console.info('  • Enhanced socket information with local/remote details');
    console.info('  • Stream piping to spawned processes');
    console.info('  • JSON stream processing and transformation');
    console.info('  • Real-time stream processing with backpressure handling');
    console.info('  • Process control with ref/unref management');
    console.info('  • Enhanced process spawning with custom environments');
    
  } catch (error) {
    console.error('❌ Demo suite failed:', error);
    process.exit(1);
  }
}

// Run demos
runAllDemos();
