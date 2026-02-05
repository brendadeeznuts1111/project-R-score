// bench/bench-simd-filter.ts
import { parseCliFilters, filterData } from '../../utils/cli-filter';
import { filterDataSIMD } from '../../utils/cli-filter-simd';

async function runBench() {
  const datasetSize = 50000;
  const mockData = Array.from({ length: datasetSize }, (_, i) => ({
    id: i,
    success: i % 2 === 0,
    region: i % 3 === 0 ? 'US' : 'EU'
  }));

  const filters = parseCliFilters(['--filter', 'success=true region=US']);

  console.log(`🚀 Benchmarking Filter Speedup (${datasetSize.toLocaleString()} items)...`);

  // 1. Standard Filter
  const startStd = performance.now();
  for (let i = 0; i < 100; i++) {
    filterData(mockData, filters);
  }
  const endStd = performance.now();
  const avgStd = ((endStd - startStd) * 1000) / 100;

  // 2. SIMD (Parallel) Filter
  const startSimd = performance.now();
  for (let i = 0; i < 100; i++) {
    await filterDataSIMD(mockData, filters);
  }
  const endSimd = performance.now();
  const avgSimd = ((endSimd - startSimd) * 1000) / 100;

  const speedup = ((1 - avgSimd / avgStd) * 100).toFixed(0);

  console.log(`\n--- Results ---`);
  console.log(`Standard Filter: ${avgStd.toFixed(1)}μs`);
  console.log(`SIMD (Parallel): ${avgSimd.toFixed(1)}μs`);
  console.log(`Speedup: ${speedup}% 🚀`);

  if (Number(speedup) > 40) {
    console.log(`✅ Performance Target Met! (Expected: ~51%)`);
  }
}

runBench();
