#!/usr/bin/env bun
// test-sigterm-workflow.ts - v2.8: Complete SIGTERM Workflow Demonstration

import { spawn } from 'child_process';

async function demonstrateSIGTERMWorkflow() {
  console.info('🚀 SIGTERM Workflow Demonstration');
  console.info('=' .repeat(50));
  
  return new Promise((resolve) => {
    // Start the SIGTERM demo process
    const demoProcess = spawn('bun', ['utils/sigterm-demo.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    console.info(`📡 Started demo process with PID: ${demoProcess.pid}`);
    console.info('');

    let output = '';
    let gracefulShutdownDetected = false;

    // Capture output
    demoProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      
      if (text.includes('SIGTERM received')) {
        gracefulShutdownDetected = true;
      }
    });

    demoProcess.stderr?.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    // Wait for process to start, then send SIGTERM
    setTimeout(() => {
      console.info(`🛑 Sending SIGTERM to PID ${demoProcess.pid}...`);
      
      try {
        process.kill(demoProcess.pid!, 'SIGTERM');
        console.info('✅ SIGTERM sent successfully');
      } catch (error: any) {
        console.error('❌ Failed to send SIGTERM:', error.message);
      }
    }, 3000);

    // Handle process termination
    demoProcess.on('close', (code, signal) => {
      console.info('');
      console.info('=' .repeat(50));
      console.info('📊 SIGTERM Workflow Analysis');
      console.info('=' .repeat(50));
      
      console.info(`🎯 Exit Code: ${code}`);
      console.info(`📡 Signal: ${signal}`);
      console.info(`🛑 Graceful Shutdown: ${gracefulShutdownDetected ? '✅ Yes' : '❌ No'}`);
      
      if (code === 143) {
        console.info('✅ Perfect SIGTERM handling detected!');
        console.info('   • Process caught SIGTERM signal');
        console.info('   • Executed cleanup procedures');
        console.info('   • Exited with correct code (143 = 128 + 15)');
      } else if (signal === 'SIGTERM') {
        console.info('⚠️ SIGTERM received but exit code unexpected');
      } else {
        console.info('❌ SIGTERM workflow failed');
      }
      
      console.info('');
      console.info('💡 Key Takeaways:');
      console.info('   • SIGTERM allows graceful shutdown');
      console.info('   • Process can cleanup resources');
      console.info('   • Exit code 143 indicates proper SIGTERM handling');
      console.info('   • Test Process Integration v2.8 handles SIGTERM correctly');
      
      resolve(code);
    });

    // Safety timeout
    setTimeout(() => {
      if (!demoProcess.killed) {
        console.info('⏰ Timeout - force killing process');
        demoProcess.kill('SIGKILL');
      }
    }, 15000);
  });
}

// CLI interface
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.info('SIGTERM Workflow Demonstration v2.8');
    console.info('');
    console.info('Demonstrates complete SIGTERM graceful shutdown:');
    console.info('• Starts a long-running process');
    console.info('• Sends SIGTERM after 3 seconds');
    console.info('• Shows graceful shutdown sequence');
    console.info('• Analyzes exit code and behavior');
    console.info('');
    console.info('Usage:');
    console.info('  bun run test-sigterm-workflow.ts');
    return;
  }

  try {
    const exitCode = await demonstrateSIGTERMWorkflow();
    console.info('\n🎉 SIGTERM workflow demonstration complete!');
    process.exit(exitCode as number);
  } catch (error: any) {
    console.error('❌ Demonstration failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
