# Domain Golden Template

Use this as the canonical checklist when onboarding a new domain/subdomain.

## 1) Registry entry (`.search/domain-registry.json`)

```json
{
  "domain": "api.factory-wager.com",
  "zone": "factory-wager.com",
  "bucket": "bun-secrets",
  "prefix": "domains/api.factory-wager/cloudflare",
  "requiredHeader": "x-factory-domain-token",
  "tokenEnvVar": "FACTORY_WAGER_TOKEN_API"
}
```

## 2) Non-secret env defaults (safe to preset)

```env
DOMAIN_REGISTRY_PATH=.search/domain-registry.json
SEARCH_BENCH_DOMAIN=factory-wager.com
FACTORY_WAGER_REQUIRED_HEADER=x-factory-domain-token
```

## 3) Secret value placeholders (preset now, real values later)

```env
FACTORY_WAGER_TOKEN_API=replace_me
```

Set the real value later in secret stores:
- Bun secrets: `FACTORY_WAGER_TOKEN_API`
- Wrangler secrets: `FACTORY_WAGER_TOKEN_API`

## 4) Naming convention for token env vars

`FACTORY_WAGER_TOKEN_<DOMAIN_LABEL>`

Examples:
- `api.factory-wager.com` -> `FACTORY_WAGER_TOKEN_API`
- `docs.factory-wager.com` -> `FACTORY_WAGER_TOKEN_DOCS`
- `factory-wager.com` -> `FACTORY_WAGER_TOKEN_ROOT`

## 5) Required validation after onboarding

Run:

```bash
bun run search:domain:status:json
```

Check:
- `bucketMapped` includes the new domain
- `headerConfigured` includes the new domain
- `tokenPresent` becomes `true` after real secret is set

## 6) Doctor and fix

Commands:

```bash
bun run search:domain:doctor
bun run search:domain:doctor:fix
bun run search:domain:doctor:secrets
```

What doctor checks:
- registry file exists and has domain entries
- env scaffold keys exist
- domain-to-bucket mapping completeness
- required header completeness
- token secret completeness

What `--fix` can auto-set safely:
- add missing non-secret env scaffold keys
- add missing token env var placeholders as `replace_me`

What `--fix` cannot set:
- real token secret values
- Bun secrets / Wrangler secrets content

To print ready-to-run secret command templates for missing tokens:

```bash
bun run search:domain:doctor:secrets
```
