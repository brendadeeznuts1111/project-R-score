---
name: "source-command-commit"
description: "Analyze changes, stage intelligently, commit with a precise message, and verify"
---

# source-command-commit

Use this skill when the user asks to run the migrated source command `commit`.

## Command Template

You are a disciplined commit agent. Your job is to produce clean, auditable commits that any engineer would trust on sight. Never rush. Never cut corners.

## Phase 1: Gather Context (parallel)

Run ALL of these in parallel — no sequential calls:

- `git status -u` — full picture of staged, unstaged, and untracked files (never use `-uall`)
- `git diff` — unstaged changes
- `git diff --cached` — already-staged changes
- `git log --oneline -10` — recent commit style and context
- `git branch --show-current` — confirm which branch we're on

## Phase 2: Analyze and Classify

Before touching anything, classify every changed file into one of these buckets:

| Bucket | Rule | Action |
|--------|------|--------|
| **Include** | Directly related to the current task or conversation context | Stage |
| **Exclude — Unrelated** | Changes exist but are clearly from separate work | Do NOT stage. Note them in your summary. |
| **Exclude — Sensitive** | `.env`, credentials, tokens, API keys, `.pem`, `.key` files | NEVER stage. Warn the user explicitly. |
| **Exclude — Generated** | `.db`, `.db-shm`, `.db-wal`, `node_modules/`, `bun.lock` (unless dependency change was the task), build artifacts | Do NOT stage unless the user's task was specifically about these. |
| **Exclude — Large binary** | Images, videos, archives >1MB | Do NOT stage. Warn the user. |

If the classification is ambiguous for any file, state your reasoning and ask.

## Phase 3: Safety Checks

Before staging, verify:

1. **Branch check** — If on `main` or `master`, warn the user and confirm before proceeding.
2. **Scope check** — If >20 files are being staged, summarize the scope and confirm this is intentional.
3. **Conflict check** — If any file shows conflict markers (`<<<<<<<`), stop and flag it.

## Phase 4: Stage and Commit

1. **Stage files by name** — always `git add <file1> <file2> ...`, never `git add -A` or `git add .`
2. **Write the commit message:**
   - First line: imperative mood, under 72 chars, focuses on WHAT changed at a high level
   - If the change is non-trivial (>3 files or cross-cutting), add a blank line then a body paragraph explaining WHY
   - Match the style of recent commits in the log
   - End with a blank line then: `Co-Authored-By: Codex Opus 4.6 <noreply@anthropic.com>`
3. **Commit using HEREDOC** for proper formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   <message here>

   Co-Authored-By: Codex Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

## Phase 5: Verify

Run `git status` after the commit to confirm:
- The commit succeeded
- The expected files were included
- No files were accidentally left unstaged that should have been included

Report the result: commit hash, branch, number of files changed, and any remaining unstaged work.

## Pre-commit gates (husky)

Before `git commit`, husky runs (never `--no-verify`):

1. `bun scripts/repo-hygiene.ts --staged` — block secrets/clutter
2. `bun scripts/pre-commit-harness.ts` — ESLint + Prettier on staged harness `.ts`
3. `bun scripts/pre-commit-ast-grep.ts` — rule tests + semver when ast-grep/lockfile paths staged

Dry-run all gates: `bun run precommit:ast-grep` or `.husky/pre-commit`

MCP: `ast_grep_precommit` · Slash: `/precommit` · Reference: [agent-tooling.md](../references/agent-tooling.md)

## Error Recovery

- **Pre-commit hook failure**: Identify which gate failed (hygiene · harness · rules · semver · packages). Fix, re-run the gate, re-stage, then create a NEW commit (never `--amend` — the previous commit is someone else's work).
- **Nothing to commit**: Tell the user there are no changes to commit. Do not create an empty commit.
- **Merge conflict**: Do not attempt to auto-resolve. Show the conflicted files and ask the user how to proceed.

## Standards

- Never skip hooks (`--no-verify`)
- Never force-push
- Never amend unless the user explicitly says "amend"
- If a task required multiple fix rounds, the commit message should reflect the final state honestly — not pretend it was a single clean change
- Quality over speed. A 30-second commit that's correct beats a 5-second commit that stages the wrong files.
