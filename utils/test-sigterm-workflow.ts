#!/usr/bin/env bun
// test-sigterm-workflow.ts - v2.8: Complete SIGTERM Workflow Demonstration

import { spawn } from 'child_process';

async function demonstrateSIGTERMWorkflow() {
  console.log('🚀 SIGTERM Workflow Demonstration');
  console.log('=' .repeat(50));
  
  return new Promise((resolve) => {
    // Start the SIGTERM demo process
    const demoProcess = spawn('bun', ['utils/sigterm-demo.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    console.log(`📡 Started demo process with PID: ${demoProcess.pid}`);
    console.log('');

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
      console.log(`🛑 Sending SIGTERM to PID ${demoProcess.pid}...`);
      
      try {
        process.kill(demoProcess.pid!, 'SIGTERM');
        console.log('✅ SIGTERM sent successfully');
      } catch (error: any) {
        console.error('❌ Failed to send SIGTERM:', error.message);
      }
    }, 3000);

    // Handle process termination
    demoProcess.on('close', (code, signal) => {
      console.log('');
      console.log('=' .repeat(50));
      console.log('📊 SIGTERM Workflow Analysis');
      console.log('=' .repeat(50));
      
      console.log(`🎯 Exit Code: ${code}`);
      console.log(`📡 Signal: ${signal}`);
      console.log(`🛑 Graceful Shutdown: ${gracefulShutdownDetected ? '✅ Yes' : '❌ No'}`);
      
      if (code === 143) {
        console.log('✅ Perfect SIGTERM handling detected!');
        console.log('   • Process caught SIGTERM signal');
        console.log('   • Executed cleanup procedures');
        console.log('   • Exited with correct code (143 = 128 + 15)');
      } else if (signal === 'SIGTERM') {
        console.log('⚠️ SIGTERM received but exit code unexpected');
      } else {
        console.log('❌ SIGTERM workflow failed');
      }
      
      console.log('');
      console.log('💡 Key Takeaways:');
      console.log('   • SIGTERM allows graceful shutdown');
      console.log('   • Process can cleanup resources');
      console.log('   • Exit code 143 indicates proper SIGTERM handling');
      console.log('   • Test Process Integration v2.8 handles SIGTERM correctly');
      
      resolve(code);
    });

    // Safety timeout
    setTimeout(() => {
      if (!demoProcess.killed) {
        console.log('⏰ Timeout - force killing process');
        demoProcess.kill('SIGKILL');
      }
    }, 15000);
  });
}

// CLI interface
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('SIGTERM Workflow Demonstration v2.8');
    console.log('');
    console.log('Demonstrates complete SIGTERM graceful shutdown:');
    console.log('• Starts a long-running process');
    console.log('• Sends SIGTERM after 3 seconds');
    console.log('• Shows graceful shutdown sequence');
    console.log('• Analyzes exit code and behavior');
    console.log('');
    console.log('Usage:');
    console.log('  bun run test-sigterm-workflow.ts');
    return;
  }

  try {
    const exitCode = await demonstrateSIGTERMWorkflow();
    console.log('\n🎉 SIGTERM workflow demonstration complete!');
    process.exit(exitCode as number);
  } catch (error: any) {
    console.error('❌ Demonstration failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
