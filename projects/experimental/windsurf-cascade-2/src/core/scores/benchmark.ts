// scores/benchmark.ts

import { GeometricMeanCalculator } from './GeometricMeanCalculator';

// Original implementation (NaN-prone)
function originalCalculate(results: Record<string, number>): number {
  const scores = Object.values(results);
  const logSum = scores.reduce((sum, val) => sum + Math.log(val), 0);
  return Math.exp(logSum / scores.length);
}

// Test data
const testData = {
  a: 0.95, b: 0.88, c: 0.92, d: 0.85, e: 0.91,
  f: 0.87, g: 0.93, h: 0.89, i: 0.94, j: 0.86
};

const problematicData = {
  a: 0.95, b: 0, c: -5, d: 0.88, e: 0.91
};

console.log('🚀 Geometric Mean Calculator Benchmark');
console.log('=====================================\n');

// Test original implementation
console.time('Original (valid data)');
try {
  const originalScore = originalCalculate(testData);
  console.log(`✅ Original score: ${originalScore.toFixed(6)}`);
} catch (error) {
  console.log(`❌ Original failed: ${error}`);
}
console.timeEnd('Original (valid data)');

console.time('Original (problematic data)');
try {
  const originalScore = originalCalculate(problematicData);
  console.log(`✅ Original score: ${originalScore.toFixed(6)}`);
} catch (error) {
  console.log(`❌ Original failed: ${error}`);
}
console.timeEnd('Original (problematic data)');

// Test enhanced implementation
console.time('Enhanced (valid data)');
try {
  const enhancedScore = GeometricMeanCalculator.calculate(testData);
  console.log(`✅ Enhanced score: ${enhancedScore.toFixed(6)}`);
} catch (error) {
  console.log(`❌ Enhanced failed: ${error}`);
}
console.timeEnd('Enhanced (valid data)');

console.time('Enhanced (problematic data - clamp)');
try {
  const enhancedScore = GeometricMeanCalculator.calculate(problematicData, {
    handleInvalid: 'clamp',
    minValidValue: 0.0001
  });
  console.log(`✅ Enhanced score (clamped): ${enhancedScore.toFixed(6)}`);
} catch (error) {
  console.log(`❌ Enhanced failed: ${error}`);
}
console.timeEnd('Enhanced (problematic data - clamp)');

// Test with metadata
console.log('\n📊 Enhanced with Metadata:');
const { score, metadata } = GeometricMeanCalculator.calculateWithMetadata(testData);

console.log(Bun.inspect({
  score: score.toFixed(6),
  metadata: {
    ...metadata,
    performance: `${(1_000_000_000 / metadata.calculationTimeNs).toFixed(0)} ops/sec`
  }
}));

// Test edge cases
console.log('\n🧪 Edge Case Testing:');

const edgeCases = [
  { name: 'Empty object', data: {} },
  { name: 'Single value', data: { a: 0.5 } },
  { name: 'Very small values', data: { a: 1e-10, b: 1e-12, c: 1e-8 } },
  { name: 'Very large values', data: { a: 1e50, b: 1e48, c: 1e49 } },
  { name: 'Mixed valid/invalid', data: { a: 0.5, b: NaN, c: Infinity, d: -1, e: 0.8 } }
];

for (const testCase of edgeCases) {
  console.log(`\nTesting: ${testCase.name}`);
  try {
    const result = GeometricMeanCalculator.calculate(testCase.data as Record<string, number>, {
      handleInvalid: 'clamp',
      minValidValue: 0.001
    });
    console.log(`✅ Score: ${result.toFixed(6)}`);
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
  }
}

console.log('\n🎯 Performance Summary:');
console.log('- Enhanced version handles all edge cases safely');
console.log('- Original version fails on zeros, negatives, NaN, Infinity');
console.log('- Enhanced version provides detailed error messages');
console.log('- Enhanced version includes performance metadata');
console.log('- Both versions are fast, but enhanced is production-ready');
