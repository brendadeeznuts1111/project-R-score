
import { executeIntelligenceWorkflow } from '../src/core/workflows/phone-intelligence.js';

async function runBenchmark() {
  const phone = '+14155552671';
  
  console.log(`🚀 Executing Phone Intelligence Workflow for: ${phone}`);
  console.log('='.repeat(60));

  const result = await executeIntelligenceWorkflow(phone);

  console.log('\n📊 INTELLIGENCE REPORT:');
  console.log('-'.repeat(30));
  console.log(`E164         : ${result.e164}`);
  console.log(`Valid        : ${result.isValid}`);
  console.log(`Trust Score  : ${result.trustScore}/100`);
  console.log(`Risk Factors : ${result.riskFactors.join(', ') || 'NONE'}`);
  console.log(`Suitability  : ${result.suitability.join(', ')}`);
  console.log(`Provider     : ${result.provider}`);
  console.log(`Estimated Cost: $${result.cost}`);
  console.log(`Channel      : ${result.channel}`);
  console.log(`Compliant    : ${result.compliant} (${result.jurisdiction})`);
  
  console.log('\n🔍 METADATA:');
  console.log(`Carrier      : ${result.metadata.carrier}`);
  console.log(`Location     : ${result.metadata.city}, ${result.metadata.region}`);
  console.log(`Fraud Score  : ${result.metadata.fraudScore}`);
  
  if (result.metadata.enrichment) {
    console.log(`Enriched Identity : ${result.metadata.enrichment.fullName} (${result.metadata.enrichment.email})`);
    console.log(`Professional      : ${result.metadata.enrichment.company.title} at ${result.metadata.enrichment.company.name}`);
  }

  console.log('\n⚡ PERFORMANCE:');
  console.log(`Total Latency : ${result.performance.totalMs.toFixed(2)}ms`);
  Object.entries(result.performance.stages).forEach(([name, ms]) => {
    console.log(`  - ${name.padEnd(12)}: ${ms.toFixed(3)}ms`);
  });

  console.log('\n✅ Workflow Execution Complete');
}

runBenchmark().catch(console.error);
