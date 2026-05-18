#!/usr/bin/env bun
// signal-demo-simple.ts - v2.8: Simple Signal Handling Demo

console.info('🚀 Signal Handling Demonstration');
console.info('PID:', process.pid);
console.info('Signals that can be handled: SIGTERM, SIGINT');
console.info('Signals that cannot be handled: SIGKILL');
console.info('');

// Handle SIGTERM (graceful shutdown)
process.on('SIGTERM', () => {
  console.info('🛑 SIGTERM received - graceful shutdown initiated...');
  console.info('🧹 Cleaning up resources...');
  
  setTimeout(() => {
    console.info('✅ Cleanup complete - exiting gracefully');
    process.exit(143); // 128 + 15 (SIGTERM)
  }, 1000);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.info('⚡ SIGINT received (Ctrl+C simulation)...');
  console.info('🛑 Interrupting current operations...');
  
  setTimeout(() => {
    console.info('✅ Interrupt handled - exiting');
    process.exit(130); // 128 + 2 (SIGINT)
  }, 500);
});

// Handle SIGUSR1 (custom signal)
process.on('SIGUSR1', () => {
  console.info('📡 SIGUSR1 received - custom signal handled');
  console.info('💓 Process is still running and responsive');
});

// Simulate work
console.info('🔄 Starting long-running process...');
let counter = 0;

const interval = setInterval(() => {
  counter++;
  console.info(`💓 Working... ${counter}s (PID: ${process.pid})`);
  
  // Demonstrate different behaviors
  if (counter === 5) {
    console.info('💡 Try: kill -SIGTERM', process.pid, '(graceful shutdown)');
  } else if (counter === 10) {
    console.info('💡 Try: kill -SIGINT', process.pid, '(interrupt)');
  } else if (counter === 15) {
    console.info('💡 Try: kill -SIGUSR1', process.pid, '(custom signal)');
  } else if (counter === 20) {
    console.info('💡 Try: kill -SIGKILL', process.pid, '(immediate termination - cannot be caught)');
  } else if (counter >= 30) {
    console.info('⏰ Demo complete - exiting normally');
    clearInterval(interval);
    process.exit(0);
  }
}, 1000);

// Cleanup on normal exit
process.on('exit', (code) => {
  clearInterval(interval);
  console.info(`🏁 Process exiting with code: ${code}`);
});

console.info('✅ Signal handlers registered');
console.info('📡 Process is ready to receive signals');
console.info('💡 Send signals to test different behaviors');
console.info('');
