export { default as MemoryProfiler } from '../../../bench/memory-profiler';
export type { MemorySnapshot, MemoryLeak, MemoryReport } from '../../../bench/memory-profiler';

// Re-export main functionality
import MemoryProfiler from '../../../bench/memory-profiler';
export default MemoryProfiler;
