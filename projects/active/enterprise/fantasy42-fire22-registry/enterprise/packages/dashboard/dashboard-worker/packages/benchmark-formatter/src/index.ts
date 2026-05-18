export { default as BenchmarkFormatter } from '../../../bench/benchmark-formatter';
export type { TableColumn, BenchmarkTableData } from '../../../bench/benchmark-formatter';

// Re-export main functionality
import BenchmarkFormatter from '../../../bench/benchmark-formatter';
export default BenchmarkFormatter;
