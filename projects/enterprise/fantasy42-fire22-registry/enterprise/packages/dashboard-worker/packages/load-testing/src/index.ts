export { default as LoadTester } from '../../../bench/load-testing';
export type { LoadTestResult, LoadTestScenario } from '../../../bench/load-testing';

// Re-export main functionality
import LoadTester from '../../../bench/load-testing';
export default LoadTester;
