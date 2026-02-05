export { default as BenchmarkSuite } from '../../../bench/benchmark-suite';
export type { BenchmarkResult, BenchmarkOptions } from '../../../bench/benchmark-suite';

// Re-export main functionality
import BenchmarkSuite from '../../../bench/benchmark-suite';
export default BenchmarkSuite;
