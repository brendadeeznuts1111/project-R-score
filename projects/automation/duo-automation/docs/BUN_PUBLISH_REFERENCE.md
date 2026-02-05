# Bun Publish Reference - Complete Matrix Specification

> **SOC2 Type II | ISO-27001 | Bun v1.3+ Native**

**Document ID:** `DUO-BUN-PUB-v1.0`
**Effective Date:** 2026-01-16
**Compliance:** SOC2-Type-II | Standard: ISO-27001

---

## 1. BUN PUBLISH OPTIONS CROSS-REFERENCE MATRIX

| Option | Bun Flag | npm Equivalent | Default | Type | Description | CI/CD Use | Ref |
|--------|----------|----------------|---------|------|-------------|-----------|-----|
| **Access** | `--access <public\|restricted>` | `--access` | `restricted` | enum | Package visibility (unscoped always public) | Scoped packages | [docs](https://bun.sh/docs/cli/publish) |
| **Tag** | `--tag <name>` | `--tag` | `latest` | string | Distribution tag | Alpha/beta releases | [docs](https://bun.sh/docs/cli/publish) |
| **Dry Run** | `--dry-run` | `--dry-run` | `false` | boolean | Simulate publish without uploading | Pre-flight validation | [docs](https://bun.sh/docs/cli/publish) |
| **OTP** | `--otp <token>` | `--otp` | N/A | string | 2FA one-time password | Automated 2FA | [docs](https://bun.sh/docs/cli/publish) |
| **Registry** | `--registry <url>` | `--registry` | npmjs.org | url | Target registry URL | Private registries | [docs](https://bun.sh/docs/cli/publish) |
| **Tolerate Republish** | `--tolerate-republish` | N/A | `false` | boolean | Exit 0 if version exists | CI re-runs | [docs](https://bun.sh/docs/cli/publish) |
| **Auth Type** | `--auth-type <web\|legacy>` | N/A | `web` | enum | 2FA authentication method | Legacy OTP flow | [docs](https://bun.sh/docs/cli/publish) |
| **Gzip Level** | `--gzip-level <0-9>` | N/A | `9` | number | Compression level | Optimize size | [docs](https://bun.sh/docs/cli/publish) |
| **Ignore Scripts** | `--ignore-scripts` | `--ignore-scripts` | `false` | boolean | Skip lifecycle scripts | Pre-built tarballs | [docs](https://bun.sh/docs/cli/publish) |
| **Verbose** | `--verbose` | `--verbose` | `false` | boolean | Detailed logging | Debug publishing | [docs](https://bun.sh/docs/cli/publish) |
| **Silent** | `--silent` | `--silent` | `false` | boolean | Suppress output | CI logs | [docs](https://bun.sh/docs/cli/publish) |
| **Frozen Lockfile** | `--frozen-lockfile` | N/A | `false` | boolean | Disallow lockfile changes | E-028 enforcement | [docs](https://bun.sh/docs/cli/publish) |
| **No Progress** | `--no-progress` | N/A | `false` | boolean | Hide progress bar | CI output | [docs](https://bun.sh/docs/cli/publish) |
| **No Summary** | `--no-summary` | N/A | `false` | boolean | Skip publish summary | Scripted usage | [docs](https://bun.sh/docs/cli/publish) |
| **CA** | `--ca <cert>` | N/A | N/A | string | Inline CA certificate | Private registries | [docs](https://bun.sh/docs/cli/publish) |
| **CA File** | `--cafile <path>` | N/A | N/A | path | CA certificate file | Private registries | [docs](https://bun.sh/docs/cli/publish) |

---

## 2. BUNX OPTIONS CROSS-REFERENCE MATRIX

| Option | Flag | Type | Required | Description | Example | Performance |
|--------|------|------|----------|-------------|---------|-------------|
| **Package** | `<package>` | string | YES | npm package to execute | `bunx prettier` | N/A |
| **Version** | `[@version]` | string | NO | Specific version | `bunx prettier@3.0.0` | N/A |
| **Force Bun** | `--bun` | boolean | NO | Run with Bun despite Node shebang | `bunx --bun vite dev` | ~100x vs npx |
| **Package Flag** | `-p, --package <pkg>` | string | NO | Specify package when binary differs | `bunx -p @angular/cli ng` | N/A |
| **No Install** | `--no-install` | boolean | NO | Skip if not installed | `bunx --no-install prettier` | Instant fail |
| **Verbose** | `--verbose` | boolean | NO | Enable verbose output | `bunx --verbose prisma` | N/A |
| **Silent** | `--silent` | boolean | NO | Suppress installation output | `bunx --silent tsc` | Cleaner logs |

**Key Performance Note:** `bunx` is approximately **100x faster** than `npx` for locally installed packages due to Bun's fast startup times.

---

## 3. PUBLISHING COMPLIANCE MATRIX

| Rule ID | Checkpoint | Description | Auto/Manual | Blocking | Enforcement Point | SLA |
|---------|------------|-------------|-------------|----------|-------------------|-----|
| **E-027** | Toolchain | No `npm publish/pack` in Bun-native ecosystem | Auto | YES | Pre-commit | Immediate |
| **E-028** | Toolchain | Frozen lockfile required (`--frozen-lockfile`) | Auto | YES | CI/CD | <5min |
| **E-029** | Publishing | Tag compliance validation before publish | Auto | YES | Pre-publish | <30s |
| **E-030** | Publishing | Audit trail with SHA-256 hash | Auto | NO | Post-publish | Async |

---

## 4. AUTHENTICATION MATRIX

| Method | Environment Variable | bunfig.toml Config | Use Case | Security Level |
|--------|---------------------|-------------------|----------|----------------|
| **npm Token** | `NPM_CONFIG_TOKEN` | `[publish] token = "$NPM_TOKEN"` | CI/CD automation | HIGH |
| **Bun Token** | `BUN_AUTH_TOKEN` | `[publish] token = "$BUN_AUTH_TOKEN"` | Private registries | HIGH |
| **OTP (CLI)** | N/A | N/A | Interactive 2FA | CRITICAL |
| **Auth Type Web** | N/A | N/A | Browser-based 2FA | CRITICAL |
| **Auth Type Legacy** | N/A | N/A | Terminal OTP prompt | HIGH |

---

## 5. REGISTRY CONFIGURATION MATRIX

| Registry Type | URL | Config Location | Scope | Token Source |
|--------------|-----|-----------------|-------|--------------|
| **npm Public** | `https://registry.npmjs.org` | Default | Global | `NPM_TOKEN` |
| **npm Enterprise** | `https://registry.npmjs.org` | `.npmrc` | Global | `NPM_CONFIG_TOKEN` |
| **DuoPlus Private** | `https://registry.duoplus.bun.sh` | `bunfig.toml` | `@duoplus/*` | `BUN_REGISTRY_TOKEN` |
| **FactoryWager** | `https://registry.duoplus.bun.sh` | `bunfig.toml` | `@factorywager/*` | `BUN_REGISTRY_TOKEN` |
| **GitHub Packages** | `https://npm.pkg.github.com` | `.npmrc` | `@org/*` | `GITHUB_TOKEN` |
| **Cloudflare R2** | Custom Worker URL | `bunfig.toml` | Custom | `R2_TOKEN` |

---

## 6. LIFECYCLE SCRIPTS MATRIX

| Script | Execution Timing | Runs on `bun publish` | Runs on Pre-built Tarball | Skip Flag |
|--------|-----------------|----------------------|---------------------------|-----------|
| **prepublishOnly** | Before pack | YES | NO | `--ignore-scripts` |
| **prepack** | Before pack | YES | NO | `--ignore-scripts` |
| **prepare** | After pack | YES | NO | `--ignore-scripts` |
| **postpack** | After pack | YES | NO | `--ignore-scripts` |
| **publish** | After upload | YES | YES | `--ignore-scripts` |
| **postpublish** | After upload | YES | YES | `--ignore-scripts` |

**Note:** Lifecycle scripts only execute when Bun packs the package. Publishing a pre-built tarball (`bun publish ./package.tgz`) skips `prepublishOnly`, `prepack`, `prepare`, and `postpack`.

---

## 7. GZIP COMPRESSION MATRIX

| Level | Compression | Speed | Use Case | File Size (Est.) |
|-------|-------------|-------|----------|------------------|
| **0** | None | Fastest | Debugging | 100% |
| **1** | Minimal | Very Fast | Quick iterations | ~70% |
| **3** | Light | Fast | Development | ~50% |
| **6** | Balanced | Medium | General use | ~35% |
| **9** | Maximum | Slowest | Production (default) | ~30% |

---

## 8. NPM SCRIPTS MATRIX

| Script | Command | Category | Description | Blocking |
|--------|---------|----------|-------------|----------|
| `publish` | `bun run build && bun publish` | Core | Direct publish | YES |
| `publish:dry-run` | `bun run ./scripts/publish.ts --dry-run` | Validation | Simulate publish | NO |
| `publish:workflow` | `bun run ./scripts/publish.ts` | Workflow | Full workflow with checks | YES |
| `publish:workspaces` | `bun run ./scripts/publish.ts --workspace=all` | Monorepo | All workspace packages | YES |
| `publish:ci` | `bun run ./scripts/publish.ts --tolerate-republish` | CI/CD | CI-friendly republish | NO |
| `publish:public` | `bun run ./scripts/publish.ts --access=public` | Access | Public packages | YES |
| `bench:publish` | `bun run scripts/bench/publish-bench.ts` | Benchmark | Publish performance | NO |
| `bench:pack` | `bun run scripts/bench/publish-bench.ts --pack` | Benchmark | Pack only | NO |
| `bench:compare` | `bun run scripts/bench/publish-bench.ts --compare` | Benchmark | Bun vs npm | NO |
| `bench:gzip` | `bun run scripts/bench/publish-bench.ts --gzip` | Benchmark | Compression levels | NO |

---

## 9. BENCHMARK TARGET MATRIX

| Metric | Target | Warning | Critical | Measurement |
|--------|--------|---------|----------|-------------|
| **Dry-run Time** | <500ms | 500-1000ms | >1000ms | `Bun.nanoseconds()` |
| **Pack Time** | <2s | 2-5s | >5s | `Bun.nanoseconds()` |
| **Publish Time** | <5s | 5-10s | >10s | `Bun.nanoseconds()` |
| **Tag Validation** | <200ms | 200-500ms | >500ms | `Bun.nanoseconds()` |
| **Memory Usage** | <100MB | 100-200MB | >200MB | `process.memoryUsage()` |
| **Tarball Size** | <1MB | 1-5MB | >5MB | `stat` |

---

## 10. ERROR HANDLING MATRIX

| Error Code | Description | Resolution | Auto-Recovery |
|------------|-------------|------------|---------------|
| **E402** | Payment Required | Upgrade npm account | NO |
| **E403** | Forbidden | Check permissions/token | NO |
| **E404** | Not Found | Verify package name | NO |
| **E409** | Conflict (version exists) | Use `--tolerate-republish` | YES |
| **E422** | Unprocessable | Fix package.json | NO |
| **E429** | Rate Limited | Wait and retry | YES (exponential backoff) |
| **ENOENT** | Lockfile missing | Run `bun install` | YES |
| **E-027** | npm publish detected | Use `bun publish` | NO |
| **E-028** | Lockfile modified | Use `--frozen-lockfile` | NO |

---

## 11. CI/CD INTEGRATION MATRIX

| CI Platform | Token Variable | Config File | Workflow Example |
|-------------|---------------|-------------|------------------|
| **GitHub Actions** | `${{ secrets.NPM_TOKEN }}` | `.github/workflows/*.yml` | `NPM_CONFIG_TOKEN=${{ secrets.NPM_TOKEN }} bun publish` |
| **GitLab CI** | `$NPM_TOKEN` | `.gitlab-ci.yml` | `NPM_CONFIG_TOKEN=$NPM_TOKEN bun publish` |
| **CircleCI** | `$NPM_TOKEN` | `.circleci/config.yml` | `NPM_CONFIG_TOKEN=$NPM_TOKEN bun publish` |
| **Jenkins** | `NPM_TOKEN` credential | `Jenkinsfile` | `withCredentials([string(...)]) { bun publish }` |
| **Azure DevOps** | `$(NPM_TOKEN)` | `azure-pipelines.yml` | `NPM_CONFIG_TOKEN=$(NPM_TOKEN) bun publish` |

---

## 12. WORKSPACE PUBLISHING MATRIX

| Feature | Single Package | Monorepo (Workspaces) | Command |
|---------|---------------|----------------------|---------|
| **Publish All** | N/A | YES | `bun run publish:workspaces` |
| **Publish One** | YES | YES | `bun publish` or `cd packages/foo && bun publish` |
| **Workspace Protocol** | N/A | Auto-stripped | Automatic |
| **Catalog Protocol** | N/A | Auto-resolved | Automatic |
| **Version Sync** | N/A | Manual | `bun run version:sync` |

---

## 13. QUICK REFERENCE

### Basic Publishing

```bash
# Build and publish
bun run build && bun publish

# Dry-run (validate without publishing)
bun publish --dry-run

# Publish with tag
bun publish --tag beta

# Publish public package
bun publish --access public
```

### CI/CD Publishing

```bash
# GitHub Actions
NPM_CONFIG_TOKEN=${{ secrets.NPM_TOKEN }} bun publish --tolerate-republish

# With OTP
bun publish --otp 123456 --auth-type legacy

# Silent for logs
bun publish --silent --no-progress
```

### Benchmarking

```bash
# Full benchmark suite
bun run bench:publish

# Compare bun vs npm
bun run bench:compare

# Test compression levels
bun run bench:gzip
```

---

**Version:** 1.0.0
**Last Updated:** 2026-01-16
**Maintainer:** DuoPlus Platform Team
**Review Cycle:** Quarterly
