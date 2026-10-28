# AI-native agent path

Project R should make the correct coding path easy to discover and execute
without turning prose, skills, or a central agent router into the controller.
The controller remains the repository's executable tools and contracts.

## Contract

The path has five layers with deliberately narrow ownership:

1. `AGENTS.md` states invariants: authority, safety, boundaries, and proof.
2. `bun run ai -- discover` indexes applicable guidance, commands, active
   skills, fallback routes, and known friction for a task and target path.
3. A selected skill supplies a focused trigger and decision boundary when the
   task needs specialized judgment.
4. `package.json`, the selected source file, and its `--help` own execution.
5. Tests and repository gates own proof.

Discovery can recommend a path. It cannot grant authorization, mutate files,
replace source inspection, or turn a ranking into evidence.

## Normal flow

```bash
bun run ai -- discover "fix broken markdown links" --path docs/AGENTS.md
```

The result includes the `AGENTS.md` chain that applies to the target and a
small, ranked set of commands, skills, routes, and previously known friction.
The agent then:

1. reads only the applicable invariants and selected focused source;
2. inspects the real command and its help or tests;
3. makes the smallest owned change;
4. runs focused proof, then the repository merge gate when required;
5. records friction only when the path itself caused avoidable repeated work.

Use `bun run help` or `package.json` when the query is exploratory and no
candidate is sufficiently precise. `docs/AGENTS.md` remains a human-readable,
searchable fallback rather than mandatory context.

## Friction lifecycle

Record a stable fingerprint, not a transcript:

```bash
bun run ai -- friction record \
  --tool docs:links:check \
  --code missing-route \
  --path docs/AGENTS.md

bun run ai -- friction report
bun run ai -- friction prune
```

Events are local and gitignored under `.cache/ai-friction/events/`. Details are
bounded and apparent credentials are rejected. Event keys, timestamps, paths,
and fingerprints are validated before use. The fingerprint is based on the tool,
stable code, and target path so separate sessions can identify recurrence
without retaining prompts or logs.

Promotion counts only the configured observation window. Older observations
remain visible as expired until the explicit `friction prune` command removes
events beyond the longer retention boundary. Historical failures therefore do
not reopen a repaired path forever, and report remains read-only.

At the configured threshold, a fingerprint becomes a promotion candidate.
Promotion is reviewed because frequency alone does not identify the right fix.
The preferred correction order is:

1. improve the executable default or error;
2. make the owning command discoverable;
3. strengthen a test or machine-readable contract;
4. add focused guidance only when irreducible judgment remains.

Durable issues live in `config/ai-friction.json` with a status, match, tags,
owner, and prevention. `active` means the path still needs correction,
`resolved` means a named prevention exists, and `accepted` means the cost is
understood and intentionally retained. The report marks a resolved issue
`REOPEN` when matching observations cross the threshold, making a failed
prevention visible.

## Maintenance

```bash
bun run ai -- doctor
bun test tests/ai-path.test.ts
bun run agents:guidance:check
bun run docs:links:check
```

Keep discovery deterministic and local. Do not add network calls, autonomous
edits, hidden retries, or a giant hand-maintained task manifest. The index is
derived from repository sources so improvements to commands, skill triggers, and
routes become discoverable without copying their behavior into another control
plane.

Directory targets must include their own `AGENTS.md`. Scope may break a tie
between genuine query matches but must never create a candidate on its own.
Invalid options fail with a stable machine-readable error when `--json` is set.
