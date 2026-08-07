# Bun upstream contributing map

**Tenant** `bun-upstream-contributing` (operator reference; not a spine tenant)

**Purpose** Map the five operator-facing sections of oven-sh/bun
[Contributing](https://bun.com/docs/project/contributing) so FactoryWager agents
know what runs **only in an oven-sh/bun checkout** vs what we already use from
this monorepo (`bunx bun-pr`, env notes).

**Authority** Upstream SSOT:
[bun.com/docs/project/contributing](https://bun.com/docs/project/contributing) ·
FactoryWager pointers: [`AUTHORITY.md`](../AUTHORITY.md) ·
[`cli-constants-flags.md`](../cli-constants-flags.md) §6 · `env.template` ·
`.env.example` · `lib/env-check.ts`

**Hard boundary**

- All `bun run build:*` / `build:local` / WebKit clone steps below are
  **oven-sh/bun only**. Never run them under `~/Projects` or this worktree.
- Never clone WebKit into FactoryWager. WebKit lives under `vendor/WebKit`
  inside an oven-sh/bun clone elsewhere (8GB+).
- `BUILDKITE_API_TOKEN` is Bun-upstream CI only — not FactoryWager. Do **not**
  invent a Pass vault path; mint a read-scoped token at
  [buildkite.com/user/api-access-tokens](https://buildkite.com/user/api-access-tokens)
  when you need `ci:status` against oven-sh/bun.

FactoryWager consumer of PR binaries (this repo):

```bash
bunx bun-pr <pr>                 # or: bun run bun:pr:fetch -- <pr>
bun run bun:pr:verify -- <pr>    # tools/bun-pr-verify.ts — repo proofs vs that binary
```

Verified locally: `bun-37080` on PATH (`1.4.0`) after `bunx bun-pr 37080`.

---

## 1. Release build (upstream only)

Upstream:
[Release build](https://bun.com/docs/project/contributing#release-build)

In an **oven-sh/bun** checkout:

```bash
bun run build:release
# binaries:
#   ./build/release/bun
#   ./build/release/bun-profile
```

Debug default elsewhere on that page is `bun run build` →
`./build/debug/bun-debug`. Do not treat either path as a FactoryWager script.

---

## 2. Download PR builds (`bunx bun-pr`)

Upstream:
[Download release build from pull requests](https://bun.com/docs/project/contributing#download-release-build-from-pull-requests)

Use this instead of a local release build when you only need to exercise a PR
binary:

```bash
gh auth login                    # primary auth (brew install gh)
bunx bun-pr <pr-number>
bunx bun-pr <branch-name>
bunx bun-pr "https://github.com/oven-sh/bun/pull/<n>"
bunx bun-pr --asan <pr-number>   # Linux x64 only
```

`bun-pr` downloads the PR's GitHub Actions release artifact and puts
`bun-<pr-number>` on `$PATH`:

```bash
bun-<pr-number> --version
```

`GITHUB_TOKEN` / `GH_TOKEN` / `gh auth token` also satisfy artifact download
when set. Env/docs SSOT in this monorepo: `env.template` · `.env.example` ·
[`AUTHORITY.md`](../AUTHORITY.md) · `lib/env-check.ts`.

---

## 3. BuildKite CI (`bk` + `BUILDKITE_API_TOKEN`)

Upstream:
[Viewing CI failures from the terminal](https://bun.com/docs/project/contributing#viewing-ci-failures-from-the-terminal)

Bun's CI runs on BuildKite. Install the CLI and set a read-scoped API token **in
the oven-sh/bun environment** (not FactoryWager vault):

```bash
# Homebrew (may require: brew trust buildkite/buildkite)
brew install buildkite/buildkite/bk
# verify: which bk · bk --version
```

```bash
export BUILDKITE_API_TOKEN=…   # read-scoped; no Pass vault path in FactoryWager
```

oven-sh/bun ships `.bk.yaml` so `bk` defaults to the `bun` pipeline. Package
scripts (upstream repo only):

```bash
bun run ci:status         # progress summary for current branch's latest build
bun run ci:errors         # rendered test-failure output ([new] vs [also on main])
bun run ci:logs           # full logs for failed jobs → ./tmp/ci-<build>/
bun run ci:watch          # watch until the build finishes
bun run ci:find           # print build number (compose with raw `bk`)
```

Targets (optional): `#1234` (PR), PR URL, branch name, or build number. Without
a target they use the current git branch of the **oven-sh/bun** checkout.

FactoryWager documents the env **name** only (`BUILDKITE_API_TOKEN` in
`env.template` / `.env.example`); it does not own the token or the `ci:*`
scripts.

---

## 4. AddressSanitizer (upstream only)

Upstream:
[AddressSanitizer](https://bun.com/docs/project/contributing#addresssanitizer)

- ASan is **on by default** in debug builds on Linux and macOS (~2× slower).
- Disable for faster iteration (upstream checkout):

```bash
bun run build:debug:noasan
# or: pass --asan=off to scripts/build.ts
```

- Release build with ASan (upstream):

```bash
bun run build:asan
```

- PR binary with ASan (no local build): `bunx bun-pr --asan <pr>` — **Linux x64
  only**.

CI runs at least one ASan target in the upstream suite.

---

## 5. WebKit local + JSC debug (upstream only; never under ~/Projects)

Upstream:
[Building WebKit locally + Debug mode of JSC](https://bun.com/docs/project/contributing#building-webkit-locally--debug-mode-of-jsc)

WebKit is **not** cloned by default. Only inside an oven-sh/bun tree (disk
budget 8GB+ including build artifacts):

```bash
# Clone WebKit into ./vendor/WebKit  (oven-sh/bun checkout — NOT ~/Projects)
git clone https://github.com/oven-sh/WebKit vendor/WebKit

# Pin to WEBKIT_VERSION in scripts/build/deps/webkit.ts
bun sync-webkit-source

# Configure + build JSC + Bun → ./build/debug-local
bun run build:local
```

After the first build, `ninja -C build/debug-local` rebuilds Bun and JSC. Paths
that typically need retargeting in that checkout: `src/js/builtins.d.ts`,
`.clangd` `CompilationDatabase`, `.vscode/launch.json`.

**Agents:** do not clone WebKit, do not run `build:local` / `sync-webkit-source`
in FactoryWager.

---

## Quick orientation

| Need                              | Where                             | Command / note                                  |
| --------------------------------- | --------------------------------- | ----------------------------------------------- |
| Ship-like Bun binary from a PR    | Any machine with `gh`             | `bunx bun-pr <pr>`                              |
| Prove FactoryWager vs that binary | This monorepo                     | `bun run bun:pr:verify -- <pr>`                 |
| Upstream CI failures in terminal  | oven-sh/bun + `bk` + token        | `bun run ci:status\|errors\|logs\|watch\|find`  |
| Local release Bun                 | oven-sh/bun only                  | `bun run build:release` → `./build/release/bun` |
| ASan release / PR                 | oven-sh/bun or Linux x64 `bun-pr` | `build:asan` / `bun-pr --asan`                  |
| Local JSC debug                   | oven-sh/bun only (8GB+)           | `vendor/WebKit` + `build:local`                 |

Verified against
[bun.com/docs/project/contributing](https://bun.com/docs/project/contributing)
(2026-08-07).
