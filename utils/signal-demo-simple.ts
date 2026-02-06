#!/usr/bin/env bun
// signal-demo-simple.ts - v2.8: Simple Signal Handling Demo

console.log('🚀 Signal Handling Demonstration');
console.log('PID:', process.pid);
console.log('Signals that can be handled: SIGTERM, SIGINT');
console.log('Signals that cannot be handled: SIGKILL');
console.log('');

// Handle SIGTERM (graceful shutdown)
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - graceful shutdown initiated...');
  console.log('🧹 Cleaning up resources...');
  
  setTimeout(() => {
    console.log('✅ Cleanup complete - exiting gracefully');
    process.exit(143); // 128 + 15 (SIGTERM)
  }, 1000);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('⚡ SIGINT received (Ctrl+C simulation)...');
  console.log('🛑 Interrupting current operations...');
  
  setTimeout(() => {
    console.log('✅ Interrupt handled - exiting');
    process.exit(130); // 128 + 2 (SIGINT)
  }, 500);
});

// Handle SIGUSR1 (custom signal)
process.on('SIGUSR1', () => {
  console.log('📡 SIGUSR1 received - custom signal handled');
  console.log('💓 Process is still running and responsive');
});

// Simulate work
console.log('🔄 Starting long-running process...');
let counter = 0;

const interval = setInterval(() => {
  counter++;
  console.log(`💓 Working... ${counter}s (PID: ${process.pid})`);
  
  // Demonstrate different behaviors
  if (counter === 5) {
    console.log('💡 Try: kill -SIGTERM', process.pid, '(graceful shutdown)');
  } else if (counter === 10) {
    console.log('💡 Try: kill -SIGINT', process.pid, '(interrupt)');
  } else if (counter === 15) {
    console.log('💡 Try: kill -SIGUSR1', process.pid, '(custom signal)');
  } else if (counter === 20) {
    console.log('💡 Try: kill -SIGKILL', process.pid, '(immediate termination - cannot be caught)');
  } else if (counter >= 30) {
    console.log('⏰ Demo complete - exiting normally');
    clearInterval(interval);
    process.exit(0);
  }
}, 1000);

// Cleanup on normal exit
process.on('exit', (code) => {
  clearInterval(interval);
  console.log(`🏁 Process exiting with code: ${code}`);
});

console.log('✅ Signal handlers registered');
console.log('📡 Process is ready to receive signals');
console.log('💡 Send signals to test different behaviors');
console.log('');
