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
  console.info('🎲 Odds Movement Integration Demo Runner');
  console.info('==========================================\n');

  console.info('This demo will:');
  console.info('1. 🏗️ Initialize a demo database');
  console.info('2. 📊 Generate and ingest sample odds data');
  console.info('3. 🎯 Analyze bet timing patterns');
  console.info('4. 📈 Generate comprehensive odds movement reports');
  console.info('5. 🎪 Perform market impact analysis');
  console.info('6. 💼 Create enhanced financial reports');
  console.info('7. 📊 Show system statistics\n');

  console.info(
    '⚠️  Note: This demo creates a temporary database file (financial-reporting-demo.db)'
  );
  console.info('   The file will be cleaned up after the demo completes.\n');

  // Check if user wants to proceed
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    console.info('🚀 Starting demo automatically...\n');
  } else {
    console.info('Press Enter to start the demo, or Ctrl+C to cancel...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
  }

  try {
    await runOddsMovementDemo();
    console.info('\n🎉 Demo completed successfully!');
    console.info('\n📖 Next steps:');
    console.info('   • Review the generated reports and analysis');
    console.info('   • Check the implementation files for production use');
    console.info('   • Integrate with your live odds feeds');
    console.info('   • Set up automated monitoring and alerting');
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.info('\n🔍 Troubleshooting:');
    console.info('   • Check that all dependencies are installed');
    console.info('   • Ensure Bun runtime is available');
    console.info('   • Verify file permissions for database creation');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.info('\n\n🛑 Demo interrupted by user');
  console.info('Cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info('\n\n🛑 Demo terminated');
  console.info('Cleaning up...');
  process.exit(0);
});

// Run the demo
if (import.meta.main) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}
