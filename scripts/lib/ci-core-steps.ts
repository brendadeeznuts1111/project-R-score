import type { CoreStep } from './ci-core-runner.ts';

/** Read-only gates that run after the install/cache precheck. */
export const CORE_STEPS: CoreStep[] = [
  {
    name: 'install-verify',
    cmd: ['bun', 'scripts/verify-install-cache.ts', '--strict', '--quiet', '--skip-cache-size'],
  },
  { name: 'cache-lifecycle', cmd: ['bun', 'run', 'install:cache:lifecycle'] },
  { name: 'registry-config', cmd: ['bun', 'run', 'registry:config:check'] },
  { name: 'hygiene', cmd: ['bun', 'run', 'hygiene'] },
  { name: 'agent-skills', cmd: ['bun', 'run', 'skills:validate'] },
  { name: 'native-docs', cmd: ['bun', 'run', 'docs:native:check'] },
  { name: 'bun-release-contracts', cmd: ['bun', 'run', 'bun:release-contracts:check'] },
  { name: 'bun-1.4-source-assets', cmd: ['bun', 'run', 'docs:blog-assets:check'] },
  { name: 'bun-1.4-channel-release', cmd: ['bun', 'run', 'channels:bun-1.4:check'] },
  { name: 'bun-release-knowledge', cmd: ['bun', 'run', 'bun:release-knowledge:validate:all'] },
  { name: 'markdown-contract', cmd: ['bun', 'run', 'check:docs'] },
  { name: 'wiki-coverage', cmd: ['bun', 'run', 'wiki:coverage:check'] },
  { name: 'wiki-links', cmd: ['bun', 'run', 'wiki:links:check'] },
  { name: 'import-graph', cmd: ['bun', 'scripts/check-import-graph.ts'] },
  { name: 'console-format-ratchet', cmd: ['bun', 'scripts/lint-console-format.ts'] },
  { name: 'brand-manifest', cmd: ['bun', 'tools/brand-manifest.ts', '--check'] },
  {
    name: 'brand-adoption',
    cmd: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict', '--quiet'],
  },
  { name: 'brand-catalog', cmd: ['bun', 'test', 'tests/branded-catalog.test.ts'] },
  { name: 'policy-audit', cmd: ['bun', 'tools/policy-audit.ts'] },
  { name: 'jurisdictions-docs', cmd: ['bun', 'tools/jurisdictions-docs.ts', '--check'] },
  {
    name: 'monorepo-health',
    cmd: ['bun', 'scripts/check-monorepo-health.ts', '--no-history', '--no-write'],
  },
  {
    name: 'concept-audit',
    cmd: ['bun', 'run', 'concept:audit', '--', '--strict', '--output', 'json'],
    writeOut: 'concept-audit.json',
  },
  { name: 'tennis-ssot-release', cmd: ['bun', 'run', 'tennis:ssot:release:check'] },
];
