import { EnhancedPhoneIntelligenceSystem } from './src/patterns/deep-app-integration.js';

async function verifyEnhancedSystem() {
  console.info('🚀 Starting Empire Pro Enhanced System Validation');
  console.info('─'.repeat(50));

  const system = new EnhancedPhoneIntelligenceSystem();
  const testPhone = '+15550199999';

  // Test Case 1: Dry Run (Simulated Success)
  console.info('🧪 TEST CASE 1: Dry Run (Simulation)');
  try {
    const result = await system.processEnhanced(testPhone, { dryRun: true });
    displayResult(result);
  } catch (error) {
    console.error('❌ Dry Run Failed:', error);
  }

  console.info('\n' + '─'.repeat(50) + '\n');

  // Test Case 2: Production SDK Path (Fail-Fast)
  console.info('📡 TEST CASE 2: Production SDK Path');
  try {
    // We expect this to either work or fail-fast with a clear error
    const result = await system.processEnhanced(testPhone, { dryRun: false });
    displayResult(result);
  } catch (error: any) {
    console.info(`✅ Fail-Fast Caught: ${error.message}`);
  }
}

function displayResult(result: any) {
  console.info('✅ System Processing Complete');
  console.info(`📱 Phone: ${result.e164}`);
  console.info(`📈 Trust Score: ${result.trustScore}/100`);
  console.info(`🧬 Fingerprint: ${result.autonomicState?.fingerprint}`);
  console.info(`🛡️  Mitigation Actions: ${result.autonomicState?.actions.join(', ') || 'None'}`);
  console.info(`🔄 Healing Cycles: ${result.autonomicState?.healingCycles}`);
  
  console.info('📊 Identity Graph Analysis:');
  console.info(`   - Synthetic Score: ${(result.identityGraph.syntheticScore * 100).toFixed(2)}%`);
  console.info(`   - Cross-Validation Consistency: ${result.multiApp.crossValidation.consistency * 100}%`);
  
  if (result.autonomicState?.mitigated) {
    console.info('⚠️  AUTONOMIC MITIGATION TRIGGERED');
  } else {
    console.info('✨ System Stabilized');
  }
}

verifyEnhancedSystem();
