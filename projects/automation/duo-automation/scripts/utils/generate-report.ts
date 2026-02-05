#!/usr/bin/env bun
// scripts/generate-report.ts

async function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      bun: Bun.version,
      platform: process.platform,
      r2Bucket: Bun.env.R2_BUCKET,
      node: process.version
    },
    compression: {
      testData: JSON.stringify({ test: 'x'.repeat(1000) }),
      originalSize: 0,
      compressedSize: 0,
      savings: 0
    },
    recommendations: [] as string[]
  };
  
  // Test compression
  report.compression.testData = JSON.stringify({ 
    sample: 'x'.repeat(1000),
    timestamp: new Date().toISOString()
  });
  report.compression.originalSize = report.compression.testData.length;
  const compressed = Bun.zstdCompressSync(report.compression.testData);
  report.compression.compressedSize = compressed.length;
  report.compression.savings = 1 - (compressed.length / report.compression.originalSize);
  
  // Add recommendations
  if (report.compression.savings > 0.7) {
    report.recommendations.push('✅ Excellent zstd compression (>70%) - suitable for bulk');
  }
  
  if (Bun.env.R2_BUCKET) {
    report.recommendations.push('✅ R2 bucket configured - ready for production');
  } else {
    report.recommendations.push('⚠️ R2 bucket NOT configured - using local storage fallback');
  }
  
  // Save report
  await Bun.mkdir('reports', { recursive: true });
  await Bun.write('reports/performance-report.json', JSON.stringify(report, null, 2));
  
  console.log('📋 PERFORMANCE REPORT');
  console.log('='.repeat(40));
  console.table({
    'Compression Savings': `${(report.compression.savings * 100).toFixed(1)}%`,
    'Original Size': `${report.compression.originalSize} bytes`,
    'Compressed Size': `${report.compression.compressedSize} bytes`,
    'Environment': 'Bun + R2 + zstd',
    'Recommendations': report.recommendations.length
  });
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
  }
}

if (import.meta.main) {
  await generateReport();
}
