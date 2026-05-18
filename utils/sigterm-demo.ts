#!/usr/bin/env bun
// sigterm-demo.ts - v2.8: SIGTERM Graceful Shutdown Demonstration

console.info('🚀 SIGTERM Graceful Shutdown Demo');
console.info('PID:', process.pid);
console.info('Starting work...');
console.info('');

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.info('🛑 SIGTERM received - initiating graceful shutdown...');
  console.info('🧹 Step 1: Saving current state...');
  
  setTimeout(() => {
    console.info('🧹 Step 2: Closing database connections...');
    
    setTimeout(() => {
      console.info('🧹 Step 3: Cleaning up temporary files...');
      
      setTimeout(() => {
        console.info('✅ All cleanup complete - exiting gracefully');
        console.info('📊 Exit code: 143 (128 + 15 for SIGTERM)');
        process.exit(143);
      }, 500);
    }, 500);
  }, 500);
});

// Handle SIGINT as well
process.on('SIGINT', () => {
  console.info('⚡ SIGINT received - interrupting...');
  console.info('🛑 Quick shutdown...');
  setTimeout(() => {
    process.exit(130);
  }, 200);
});

// Simulate work
let workCounter = 0;
const workInterval = setInterval(() => {
  workCounter++;
  console.info(`💓 Processing task ${workCounter}...`);
  
  if (workCounter >= 10) {
    console.info('⏰ Work complete - normal exit');
    clearInterval(workInterval);
    process.exit(0);
  }
}, 1000);

console.info('✅ Ready for SIGTERM testing');
console.info('💡 Command: kill -SIGTERM', process.pid);
console.info('');
