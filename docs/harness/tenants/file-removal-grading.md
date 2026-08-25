# File-removal grading

`bun run files:rate-removal` is an advisory inventory for keeping the repository
lean without turning file size into deletion authority.

The report combines:

- line and byte thresholds;
- SHA-256 exact-content groups;
- Bun-native import scanning;
- path, registry, feed, portal, and nested app-local `public/` references;
- project/repository/feed ownership from `project-rss-channels.json`;
- the nearest package boundary for every candidate;
- generated-artifact markers;
- Git tracking and dirty-state protection.

Every candidate has a content address, evidence, blockers, and one action:
`retain`, `split`, `deduplicate`, `wire-or-remove`, or `verify-generator`. Large
source files are split candidates, not removal candidates. Public files without
visible references are reviewed for route wiring before removal. Root-relative
browser URLs and sibling manifest assets resolve inside the nearest nested app,
so identical assets owned by separate app roots are not treated as disposable.

Exact content identity is global evidence, but deduplication is scoped to one
owner. A candidate can reach `safe-review` only when another byte-identical copy
exists inside the same project and nearest `package.json` boundary. Matches in
another project or package remain visible as cross-ownership content matches,
carry zero reclaimable bytes, and are retained for an owner handoff. An
`unregistered` RSS state proves only that the project does not inherit the root
Bun 1.4 feeds; it is not deletion authority.

## Safety grades

| Verdict            | Meaning                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| `protected`        | Dirty, configuration, fixture, symlink, submodule, or Bun 1.4 channel contract. |
| `retain`           | Imported, referenced, publicly addressed, or the canonical exact copy.          |
| `review`           | Evidence is incomplete; inspect ownership and behavior.                         |
| `safe-review`      | Exact duplicate with no discovered consumer and no protected ownership.         |
| `very-safe-review` | `safe-review` plus an archive, scratch, or example location.                    |

Even `very-safe-review` is not automatic deletion. The tool deliberately has no
delete or apply option. It cannot prove runtime string construction, external
links, compliance retention, or human documentation intent.

## Commands

```bash
bun run files:rate-removal
bun run files:rate-removal -- --verdict very-safe-review
bun run files:rate-removal -- --action split
bun run files:rate-removal -- --write
bun run files:rate-removal -- --json > reports/file-removal-candidates.stdout.json
```

`--write` saves `reports/file-removal-candidates.json`, which is ignored by Git.
The report declares `advisoryOnly: true` and `autoDeleteAllowed: false`. It
reports global theoretical exact-duplicate bytes, owner-scoped duplicate bytes,
cross-ownership content bytes, and bytes represented by `safe-review` rows. None
of those numbers authorizes deletion.

The saved policy also carries the required post-cleanup checks for the Bun 1.4
asset manifest, RSS channels, portal contracts, public discovery, and monorepo
health. This keeps “unreferenced” separate from “validated unnecessary.” The
release-state policy is defined in
[`BUN_1_4_CHANNEL_LIFECYCLE.md`](../../BUN_1_4_CHANNEL_LIFECYCLE.md).

The existing `check:monorepo-health` count remains the regression gate. This
grader supplies the evidence needed to reduce that count safely; it does not
re-pin the ratchet.
