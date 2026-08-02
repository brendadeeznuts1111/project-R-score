# Stash recovery archive

Only-copy files recovered from stashes before the 2026-08 stash burn-down. Each
directory is named for the stash date; paths inside preserve the original repo
layout. These files existed nowhere else in git (path absent from `origin/main`).

| Source | Date | Files | Notes |
|---|---|---|---|
| `stash@{25}` | 2026-07-22 | 4 | bun-native discover/strict-lint tooling + release overlay JSON |
| `stash@{26}` | 2026-02-06 | 27 | Feb-era utils/examples (pre-harness repo layout) |
| `stash@{27}` | 2026-02-05 | 50 | Feb-era barbershop product + docs/wiki tooling |

Recovered with `git show stash@{N}:<path>`. Content is as-stashed, unmodified;
nothing here is wired into the build, gates, or registry. Delete a directory
when its content is confirmed dead, or promote files back into the tree via a
normal lane PR if any of it is wanted.
