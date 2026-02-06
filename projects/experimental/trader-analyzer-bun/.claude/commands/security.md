# NEXUS Security Configuration

Bun 1.3+ runtime security flags and best practices.

## [instructions]

Configure and verify security settings.

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [runtime.flags]

| Flag | Description | Use |
|------|-------------|-----|
| `--disable-eval` | Block `eval()` and `new Function()` | Production |
| `--disable-wasm` | Block WebAssembly execution | Max security |
| `--use-system-ca` | Use system CA certificates | Enterprise |

## [start.commands]

```bash
# Development (no restrictions)
bun run dev

# Production (eval blocked)
bun run start

# Maximum security
bun run start:secure
```

## [package.json.scripts]

```json
{
  "dev": "bun --hot run src/index.ts",
  "start": "bun --disable-eval --use-system-ca run src/index.ts",
  "start:secure": "bun --disable-eval --disable-wasm --use-system-ca run src/index.ts"
}
```

## [csrf.protection]

NEXUS includes CSRF middleware:

```typescript
// Automatic CSRF token validation
// Token in: X-CSRF-Token header or _csrf body field
```

## [security.checklist]

- [ ] Use `bun run start` for production
- [ ] Enable CSRF protection
- [ ] Use `Bun.secrets` for sensitive data
- [ ] Validate all user input
- [ ] Use HTTPS in production

## [code.location]

- CSRF Middleware: `src/middleware/csrf.ts`
- Security Config: `src/config/security.ts`
