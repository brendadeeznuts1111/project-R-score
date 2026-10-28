#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-gzipsync — Bun.gzipSync
// @see https://bun.com/docs/bundler/sourcemaps — source maps
/**
 * Runtime-comparable probes for Bun upgrade review.
 *
 * Run the same file with each explicit binary; never replace the reviewed
 * stable executable just to collect comparison evidence:
 *   bun tools/benchmarks/bun-upgrade-probes.ts
 *   /tmp/project-r-bun-canary.../bun tools/benchmarks/bun-upgrade-probes.ts
 */

const iterations = 250;
const payload = new TextEncoder().encode(
  JSON.stringify(
    Array.from({ length: 2_000 }, (_, index) => ({
      index,
      key: `project-r-${index}`,
      value: 'snapshot-evidence-value'.repeat(8),
    }))
  )
);

for (let index = 0; index < 20; index++) Bun.gzipSync(payload);
const gzipStartNs = Bun.nanoseconds();
let compressedBytes = 0;
for (let index = 0; index < iterations; index++) {
  compressedBytes = Bun.gzipSync(payload).byteLength;
}
const gzipElapsedNs = Bun.nanoseconds() - gzipStartNs;

const source = Array.from(
  { length: 8_000 },
  (_, index) => `export const value${index} = ${index} as const;`
).join('\n');
Bun.gc(true);
const rssBeforeBytes = process.memoryUsage.rss();
const buildStartNs = Bun.nanoseconds();
const build = await Bun.build({
  entrypoints: ['virtual-upgrade-probe.ts'],
  sourcemap: 'external',
  minify: true,
  write: false,
  plugins: [
    {
      name: 'virtual-upgrade-probe',
      setup(builder) {
        builder.onResolve({ filter: /^virtual-upgrade-probe\.ts$/ }, () => ({
          path: 'virtual-upgrade-probe.ts',
          namespace: 'upgrade-probe',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'upgrade-probe' }, () => ({
          contents: source,
          loader: 'ts',
        }));
      },
    },
  ],
});
const buildElapsedNs = Bun.nanoseconds() - buildStartNs;
const rssAfterBytes = process.memoryUsage.rss();

console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      runtime: { version: Bun.version, revision: Bun.revision },
      gzip: {
        inputBytes: payload.byteLength,
        outputBytes: compressedBytes,
        iterations,
        elapsedNs: gzipElapsedNs,
        nsPerIteration: gzipElapsedNs / iterations,
        msTotal: gzipElapsedNs / 1_000_000,
      },
      sourceMapBuild: {
        success: build.success,
        outputBytes: build.outputs.reduce((sum, output) => sum + output.size, 0),
        elapsedNs: buildElapsedNs,
        msTotal: buildElapsedNs / 1_000_000,
        rssBeforeBytes,
        rssAfterBytes,
        rssDeltaBytes: rssAfterBytes - rssBeforeBytes,
      },
    },
    null,
    2
  )
);

if (!build.success) process.exit(1);
