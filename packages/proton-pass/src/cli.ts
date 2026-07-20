#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { parseArgs } from 'node:util';
import { asItemId, asVaultId } from '../../../lib/types/branded.ts';
import {
  applyTemplate,
  createItem,
  createVault,
  getItem,
  listItems,
  listVaults,
  loadTemplateFromFile,
  shareVault,
  updateItem,
} from './index.ts';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    format: { type: 'string', default: 'text' },
    vault: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    id: { type: 'string' },
    'from-template': { type: 'string' },
    set: { type: 'string', multiple: true },
    replacements: { type: 'string' },
    template: { type: 'string' },
    help: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

function printHelp(): void {
  console.log(`
Usage: proton-pass <command> [options]

Commands:
  vault list
  vault create --name <name>
  vault share --id <vault-id> --email <email>
  item list --vault <vault-id>
  item get <item-id>
  item create --vault <vault-id> --from-template <json-file>
  item update <item-id> --set key=value ...
  template apply --vault <vault-id> --template <json-file> --replacements '{"KEY":"value"}'
`);
}

function output(result: unknown): void {
  if (values.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else if (typeof result === 'string') {
    console.log(result);
  } else {
    console.log(String(result));
  }
}

function requireVault(): string {
  if (!values.vault) {
    throw new Error('--vault is required');
  }
  return values.vault;
}

function requireId(): string {
  if (!values.id) {
    throw new Error('--id is required');
  }
  return values.id;
}

const [cmd, ...rest] = positionals;

async function main(): Promise<void> {
  if (values.help || !cmd) {
    printHelp();
    process.exit(0);
  }

  let result: unknown;

  switch (cmd) {
    case 'vault': {
      if (rest[0] === 'list') {
        result = await listVaults();
      } else if (rest[0] === 'create' && values.name) {
        result = await createVault(values.name);
      } else if (rest[0] === 'share') {
        const vaultId = asVaultId(requireId());
        const email = values.email;
        if (!email) {
          throw new Error('--email is required');
        }
        await shareVault(vaultId, email);
        result = { ok: true };
      } else {
        throw new Error(`Unknown vault subcommand: ${rest[0] ?? '<missing>'}`);
      }
      break;
    }

    case 'item': {
      if (rest[0] === 'list') {
        result = await listItems(asVaultId(requireVault()));
      } else if (rest[0] === 'get' && rest[1]) {
        result = await getItem(asItemId(rest[1]));
      } else if (rest[0] === 'create' && values.vault && values['from-template']) {
        const template = JSON.parse(await Bun.file(values['from-template']).text());
        result = await createItem(asVaultId(values.vault), template);
      } else if (rest[0] === 'update' && rest[1] && values.set) {
        const fields: Record<string, unknown> = {};
        for (const pair of values.set) {
          const idx = pair.indexOf('=');
          if (idx === -1) {
            throw new Error(`Invalid --set value: ${pair}`);
          }
          const key = pair.slice(0, idx);
          const rawValue = pair.slice(idx + 1);
          try {
            fields[key] = JSON.parse(rawValue);
          } catch {
            fields[key] = rawValue;
          }
        }
        result = await updateItem(asItemId(rest[1]), fields);
      } else {
        throw new Error(`Unknown item subcommand: ${rest[0] ?? '<missing>'}`);
      }
      break;
    }

    case 'template': {
      if (rest[0] === 'apply') {
        const vaultId = asVaultId(requireVault());
        const templatePath = values.template;
        const replacementsRaw = values.replacements;
        if (!templatePath) {
          throw new Error('--template is required');
        }
        if (!replacementsRaw) {
          throw new Error('--replacements is required');
        }
        const template = await loadTemplateFromFile(templatePath);
        const replacements = JSON.parse(replacementsRaw);
        result = await applyTemplate(vaultId, template, replacements);
      } else {
        throw new Error(`Unknown template subcommand: ${rest[0] ?? '<missing>'}`);
      }
      break;
    }

    default:
      throw new Error(`Unknown command: ${cmd}`);
  }

  output(result);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
