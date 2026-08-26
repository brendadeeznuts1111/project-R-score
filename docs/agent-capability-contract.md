# Agent capability and preload contract

Agent, tool, MCP-server, and skill wire manifests are parsed once by
`parseAgentCapabilityManifestWire`. The trusted manifest owns an exact identity,
profile, expiry, control grants, network route IDs, registry plane/origin pairs,
channel aliases, and complete content-addressed `ContentRef` values.
Authorization delegates Bun flag semantics to `evaluateControlPolicy`; it does
not maintain a second flag allowlist.

Unknown keys, alternate casing, undeclared values, expired manifests, expired or
missing experimental approval, credential-bearing registry URLs, and raw mutable
locators in place of `ContentRef` fail closed.

## Four unrelated preload concepts

| Concept                | Owner        | Contract                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test preload           | test harness | `bunfig.toml` keeps only `./tests/preload.ts`; it normalizes test environment state and performs no network, secret, or subprocess work.                                                                                                                                                    |
| Runtime module preload | Bun runtime  | `-r`, `--preload`, `--require`, `--import`, and bunfig `preload` are one guarded control. Each promoted module must declare owner, exact module, profiles, no secret/network/mutable-shared-state side effects, expiry, and evidence. No application runtime preload is currently promoted. |
| Fetch preconnect       | networking   | `--fetch-preconnect` is network authority and requires an exact origin grant. It is denied in offline and release profiles.                                                                                                                                                                 |
| Browser preload        | web surface  | HTML `rel=preload` and `rel=modulepreload` are browser resource hints. They never grant Bun runtime module or network authority.                                                                                                                                                            |

Cold-start measurements are review evidence, not automatic promotion. A report
must record the Bun revision, platform, warmup count, sample count, command,
module, and raw samples. Timing variance alone cannot change
`RUNTIME_PRELOAD_DECLARATIONS`.

`bun run guard:agents:check` ratchets workspace MCP servers, Project R skills,
skill agent descriptors, agent/MCP entrypoint files, browser preload consumers,
the four preload concepts, and the focused authorization tests.
