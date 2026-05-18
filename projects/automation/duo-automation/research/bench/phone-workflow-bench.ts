
import { executeIntelligenceWorkflow } from '../src/core/workflows/phone-intelligence.js';

async function runBenchmark() {
  const phone = '+14155552671';
  
  console.info(`🚀 Executing Phone Intelligence Workflow for: ${phone}`);
  console.info('='.repeat(60));

  const result = await executeIntelligenceWorkflow(phone);

  console.info('\n📊 INTELLIGENCE REPORT:');
  console.info('-'.repeat(30));
  console.info(`E164         : ${result.e164}`);
  console.info(`Valid        : ${result.isValid}`);
  console.info(`Trust Score  : ${result.trustScore}/100`);
  console.info(`Risk Factors : ${result.riskFactors.join(', ') || 'NONE'}`);
  console.info(`Suitability  : ${result.suitability.join(', ')}`);
  console.info(`Provider     : ${result.provider}`);
  console.info(`Estimated Cost: $${result.cost}`);
  console.info(`Channel      : ${result.channel}`);
  console.info(`Compliant    : ${result.compliant} (${result.jurisdiction})`);
  
  console.info('\n🔍 METADATA:');
  console.info(`Carrier      : ${result.metadata.carrier}`);
  console.info(`Location     : ${result.metadata.city}, ${result.metadata.region}`);
  console.info(`Fraud Score  : ${result.metadata.fraudScore}`);
  
  if (result.metadata.enrichment) {
    console.info(`Enriched Identity : ${result.metadata.enrichment.fullName} (${result.metadata.enrichment.email})`);
    console.info(`Professional      : ${result.metadata.enrichment.company.title} at ${result.metadata.enrichment.company.name}`);
  }

  console.info('\n⚡ PERFORMANCE:');
  console.info(`Total Latency : ${result.performance.totalMs.toFixed(2)}ms`);
  Object.entries(result.performance.stages).forEach(([name, ms]) => {
    console.info(`  - ${name.padEnd(12)}: ${ms.toFixed(3)}ms`);
  });

  console.info('\n✅ Workflow Execution Complete');
}

runBenchmark().catch(console.error);
