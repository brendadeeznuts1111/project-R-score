# @fire22/version-manager

Bun-native semantic-version management with strict parsing, SQLite history, and
workspace synchronization.

## Bun API boundary

The official [`Bun.semver`](https://bun.com/docs/runtime/semver) API exposes two
functions:

- `Bun.semver.order(versionA, versionB)` compares version strings.
- `Bun.semver.satisfies(version, range)` checks range compatibility.

`Bun.semver` is not a callable parser. This package uses one strict SemVer
parser for validation and formatting, then delegates comparison and range
evaluation to Bun.

## Install

```bash
bun add @fire22/version-manager
```

This workspace package has no third-party runtime dependencies.

## Create a manager

```ts
import { BunVersionManager } from '@fire22/version-manager';

const manager = new BunVersionManager({
  current: '3.1.0',
  minimum: '3.0.0',
  maximum: '4.0.0',
});

try {
  manager.parseVersion('3.1.0-beta.1+build.123');
  manager.compare('3.1.0', '3.0.0');
  manager.satisfies('3.1.0', '^3.0.0');
} finally {
  manager.close();
}
```

The constructor rejects an invalid current, minimum, or maximum version. It also
rejects a current version outside the configured inclusive bounds.

`BunVersionManager` implements `Symbol.dispose`, so Bun applications can also
use `using manager = new BunVersionManager(...)`.

## Persistence and manifest writes

History is in memory by default. Package manifests are read-only by default. Opt
into each write boundary explicitly:

```ts
const manager = new BunVersionManager({
  current: '3.1.0',
  minimum: '3.0.0',
  databasePath: './version-history.db',
  packageJsonPath: './package.json',
});

try {
  await manager.bumpVersion('minor', {
    author: 'release-bot',
    changes: ['Add settlement export'],
  });
} finally {
  manager.close();
}
```

If `packageJsonPath` is set, a successful `setVersion()` or `bumpVersion()`
updates that exact file. Write failures reject the operation; they are not
silently downgraded to warnings.

## Version operations

```ts
const nextPatch = manager.increment('patch');
const nextMinor = manager.increment('minor');
const nextMajor = manager.increment('major');

await manager.setVersion('3.2.0', {
  author: 'release-bot',
  changes: ['Synchronize release train'],
});

const history = manager.getHistory(10);
const compatible = manager.validateCompatibility({
  '@fire22/core': '^3.0.0',
});
const metrics = manager.getMetrics();
```

History ordering is deterministic even when releases share a millisecond.
Metrics classify transitions from oldest to newest and report non-negative
release intervals.

## Workspace synchronization

```ts
import { WorkspaceVersionManager } from '@fire22/version-manager';

const workspace = new WorkspaceVersionManager('3.1.0');

try {
  workspace.addWorkspace('@fire22/core', '3.0.0');
  workspace.addWorkspace('@fire22/api', '3.1.0');

  await workspace.syncVersions('3.2.0');

  console.log(workspace.getWorkspaceVersions());
  // { root: '3.2.0', '@fire22/core': '3.2.0', '@fire22/api': '3.2.0' }
} finally {
  workspace.close();
}
```

`syncVersions(target)` sets the root and every registered package to the exact
target. It does not approximate synchronization with patch bumps.

## CLI

```bash
bun run packages/version-manager/src/cli.ts status
bun run packages/version-manager/src/cli.ts compare 3.1.0 3.2.0
bun run packages/version-manager/src/cli.ts validate 3.1.0-beta.1
bun run packages/version-manager/src/cli.ts satisfies 3.1.0 '^3.0.0'
```

The library does not expose eager singleton managers. Importing it performs no
filesystem writes and opens no persistent database.

## Test and build

From the dashboard-worker directory:

```bash
bun test packages/version-manager/src/index.test.ts
bun build packages/version-manager/src/index.ts --target=bun --outdir /tmp/version-manager
```
