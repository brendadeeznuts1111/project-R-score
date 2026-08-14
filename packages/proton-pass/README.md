# `@factorywager/proton-pass`

Portable **Proton Pass CLI** integration for Bun hosts (Kalshi-bot, FactoryWager monorepo, or any repo).

## Principles

| Rule | Detail |
| ---- | ------ |
| Custody | Secret **values** only in Proton Pass vaults |
| References | Git holds `pass://vault/item/field` only |
| Boundary | Resolve into child process env; domain code never shells `pass-cli` for secrets mid-request |
| Logging | Never log secret values — keys, URIs, status, ms only |

Official CLI: [protonpass.github.io/pass-cli](https://protonpass.github.io/pass-cli/).

## Install (workspace / sibling)

```json
{
  "dependencies": {
    "@factorywager/proton-pass": "file:../packages/proton-pass"
  }
}
```

## API

```ts
import {
  findPassCli,
  checkEnvFile,
  fetchSecretsParallel,
  ensureAgentSession,
  KALSHI_AGENT_SESSION,
  FACTORYWAGER_AGENT_SESSION,
  envPrefixPresence,
  createLogger,
} from '@factorywager/proton-pass';
```

## Modes

| Mode | Use |
| ---- | --- |
| **run** | Bare `pass://` in `.env.protonpass` + spawn child with resolved env (Kalshi default) |
| **inject** | `{{ pass:// }}` templates → write `.env` (FactoryWager default) — host scripts still wrap CLI for now |

## CLI

Prefer **space-separated** flags (command, then flags, then values):

```bash
bun packages/proton-pass/bin/proton-pass.ts check --env-file .env.protonpass --agent kalshi --json
bun packages/proton-pass/bin/proton-pass.ts health --env-file .env.protonpass
bun run --filter @factorywager/proton-pass test
```

Avoid glued forms like `--env-file=path` in docs (still accepted for compatibility).

## Tests

```bash
bun test packages/proton-pass
# or
bun run --filter @factorywager/proton-pass test
```

## Spec

Kalshi: `Kalshi-bot/docs/PROTONPASS-INTEGRATION-SPEC.md`  
Monorepo: `docs/harness/tenants/proton-integration.md`
