/**
 * Tiny Bun.nanoseconds microbench for the factory-library scaffold.
 *
 * Metrics (stdout JSON):
 *   iterations · totalNs · meanNs · opsPerSec · bunVersion
 *
 * Run: bun run bench
 * Profile: bun run profile:cpu  (writes .cpuprofile under ./profiles/)
 *
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds
 * @see https://bun.com/docs/project/benchmarking
 * @see https://bun.com/docs/project/benchmarking#cpu-profiling
 */
import { hello, resetCallCount } from '../src/index.ts';

const ITERATIONS = Number(Bun.env.BENCH_ITERATIONS ?? 50_000);

resetCallCount();
hello('warmup');

const t0 = Bun.nanoseconds();
for (let i = 0; i < ITERATIONS; i++) {
  hello(`n${i}`);
}
const totalNs = Bun.nanoseconds() - t0;
const meanNs = totalNs / ITERATIONS;
const opsPerSec = Math.round(1e9 / meanNs);

const report = {
  suite: '{{name}}',
  metric: 'helloThroughput',
  iterations: ITERATIONS,
  totalNs,
  meanNs,
  opsPerSec,
  bunVersion: Bun.version,
};

// console-ok — scaffold machine metric line (JSON for agents / CI)
console.log(JSON.stringify(report));
