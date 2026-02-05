// scripts/test-etl.ts - Test ETL pipeline with 1k telemetry records
import { fetch } from 'bun';

async function testETL() {
  console.log('⚡ Testing ETL pipeline...');

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  // Simulate 1k telemetry records
  const records = Array.from({ length: 1000 }, (_, i) => ({
    type: 'TELEMETRY',
    data: {
      cpu: Math.random() * 100,
      mem: `${(Math.random() * 1000).toFixed(2)} MB`,
      timestamp: new Date().toISOString(),
      recordId: i
    },
    dataType: 'JSON' as const
  }));

  console.log(`📊 Processing ${records.length} telemetry records...`);

  for (const record of records) {
    try {
      const response = await fetch('http://localhost:3003/api/etl/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token' // In real scenario, get from login
        },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        successCount++;
      } else {
        errorCount++;
        console.error(`❌ Record ${record.data.recordId} failed: ${response.status}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Record ${record.data.recordId} error:`, error.message);
    }
  }

  const duration = Date.now() - startTime;
  const successRate = (successCount / records.length) * 100;

  console.log('\n📊 ETL Test Results:');
  console.log(`  ✅ Success: ${successCount}/${records.length} (${successRate.toFixed(2)}%)`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⏱️  Duration: ${duration}ms`);
  console.log(`  📈 Throughput: ${(records.length / (duration / 1000)).toFixed(2)} records/s`);

  if (successRate >= 99) {
    console.log('🎉 ETL pipeline test passed!');
  } else {
    console.log('⚠️  ETL pipeline test had errors');
    process.exit(1);
  }
}

if (import.meta.main) {
  testETL();
}
