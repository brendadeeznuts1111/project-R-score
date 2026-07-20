# @factorywager/proton-pass

Bun-native Proton Pass automation library. Wraps the host `pass-cli` binary and exposes a typed programmatic API plus a CLI entrypoint.

## Install

```bash
bun add @toc-ops/proton-pass
```

Requires the Proton Pass CLI (`pass-cli`) to be installed and available on `$PATH`, or set `PROTON_PASS_CLI_PATH`.

## Configuration

```bash
PROTON_PASS_PERSONAL_ACCESS_TOKEN=pst_xxx   # required
PROTON_PASS_CLI_PATH=/usr/local/bin/pass-cli # optional
```

## Programmatic API

```typescript
import { listVaults, createVault, listItems, applyTemplate } from '@toc-ops/proton-pass';

const vaults = await listVaults();
const vault = await createVault('new-vault');
const items = await listItems(vault.id);
```

## CLI

```bash
proton-pass vault list --format json
proton-pass vault create --name "My Vault"
proton-pass item list --vault <vault-id> --format json
proton-pass template apply --vault <vault-id> --template template.json --replacements '{"CALL_SIGN":"N0CALL"}'
```
