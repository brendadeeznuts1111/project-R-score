import { EnhancedPhoneIntelligenceSystem } from './src/patterns/deep-app-integration.js';

async function verifyEnhancedSystem() {
  console.log('🚀 Starting Empire Pro Enhanced System Validation');
  console.log('─'.repeat(50));

  const system = new EnhancedPhoneIntelligenceSystem();
  const testPhone = '+15550199999';

  // Test Case 1: Dry Run (Simulated Success)
  console.log('🧪 TEST CASE 1: Dry Run (Simulation)');
  try {
    const result = await system.processEnhanced(testPhone, { dryRun: true });
    displayResult(result);
  } catch (error) {
    console.error('❌ Dry Run Failed:', error);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Test Case 2: Production SDK Path (Fail-Fast)
  console.log('📡 TEST CASE 2: Production SDK Path');
  try {
    // We expect this to either work or fail-fast with a clear error
    const result = await system.processEnhanced(testPhone, { dryRun: false });
    displayResult(result);
  } catch (error: any) {
    console.log(`✅ Fail-Fast Caught: ${error.message}`);
  }
}

function displayResult(result: any) {
  console.log('✅ System Processing Complete');
  console.log(`📱 Phone: ${result.e164}`);
  console.log(`📈 Trust Score: ${result.trustScore}/100`);
  console.log(`🧬 Fingerprint: ${result.autonomicState?.fingerprint}`);
  console.log(`🛡️  Mitigation Actions: ${result.autonomicState?.actions.join(', ') || 'None'}`);
  console.log(`🔄 Healing Cycles: ${result.autonomicState?.healingCycles}`);
  
  console.log('📊 Identity Graph Analysis:');
  console.log(`   - Synthetic Score: ${(result.identityGraph.syntheticScore * 100).toFixed(2)}%`);
  console.log(`   - Cross-Validation Consistency: ${result.multiApp.crossValidation.consistency * 100}%`);
  
  if (result.autonomicState?.mitigated) {
    console.log('⚠️  AUTONOMIC MITIGATION TRIGGERED');
  } else {
    console.log('✨ System Stabilized');
  }
}

verifyEnhancedSystem();
