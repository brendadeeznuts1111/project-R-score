#!/usr/bin/env bun

/**
 * Odds Movement Integration Demo Runner
 *
 * This script runs the complete odds movement integration demonstration.
 * It showcases all the features of the odds movement analysis system.
 */

import {
  OddsMovementDemo,
  runOddsMovementDemo,
} from '../src/domains/financial-reporting/examples/odds-movement-integration-demo';

/**
 * Main execution
 */
async function main() {
  console.log('🎲 Odds Movement Integration Demo Runner');
  console.log('==========================================\n');

  console.log('This demo will:');
  console.log('1. 🏗️ Initialize a demo database');
  console.log('2. 📊 Generate and ingest sample odds data');
  console.log('3. 🎯 Analyze bet timing patterns');
  console.log('4. 📈 Generate comprehensive odds movement reports');
  console.log('5. 🎪 Perform market impact analysis');
  console.log('6. 💼 Create enhanced financial reports');
  console.log('7. 📊 Show system statistics\n');

  console.log(
    '⚠️  Note: This demo creates a temporary database file (financial-reporting-demo.db)'
  );
  console.log('   The file will be cleaned up after the demo completes.\n');

  // Check if user wants to proceed
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    console.log('🚀 Starting demo automatically...\n');
  } else {
    console.log('Press Enter to start the demo, or Ctrl+C to cancel...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
  }

  try {
    await runOddsMovementDemo();
    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📖 Next steps:');
    console.log('   • Review the generated reports and analysis');
    console.log('   • Check the implementation files for production use');
    console.log('   • Integrate with your live odds feeds');
    console.log('   • Set up automated monitoring and alerting');
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   • Check that all dependencies are installed');
    console.log('   • Ensure Bun runtime is available');
    console.log('   • Verify file permissions for database creation');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Demo interrupted by user');
  console.log('Cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Demo terminated');
  console.log('Cleaning up...');
  process.exit(0);
});

// Run the demo
if (import.meta.main) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
