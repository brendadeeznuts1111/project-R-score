#!/usr/bin/env bun
// sigterm-demo.ts - v2.8: SIGTERM Graceful Shutdown Demonstration

console.log('🚀 SIGTERM Graceful Shutdown Demo');
console.log('PID:', process.pid);
console.log('Starting work...');
console.log('');

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - initiating graceful shutdown...');
  console.log('🧹 Step 1: Saving current state...');
  
  setTimeout(() => {
    console.log('🧹 Step 2: Closing database connections...');
    
    setTimeout(() => {
      console.log('🧹 Step 3: Cleaning up temporary files...');
      
      setTimeout(() => {
        console.log('✅ All cleanup complete - exiting gracefully');
        console.log('📊 Exit code: 143 (128 + 15 for SIGTERM)');
        process.exit(143);
      }, 500);
    }, 500);
  }, 500);
});

// Handle SIGINT as well
process.on('SIGINT', () => {
  console.log('⚡ SIGINT received - interrupting...');
  console.log('🛑 Quick shutdown...');
  setTimeout(() => {
    process.exit(130);
  }, 200);
});

// Simulate work
let workCounter = 0;
const workInterval = setInterval(() => {
  workCounter++;
  console.log(`💓 Processing task ${workCounter}...`);
  
  if (workCounter >= 10) {
    console.log('⏰ Work complete - normal exit');
    clearInterval(workInterval);
    process.exit(0);
  }
}, 1000);

console.log('✅ Ready for SIGTERM testing');
console.log('💡 Command: kill -SIGTERM', process.pid);
console.log('');
