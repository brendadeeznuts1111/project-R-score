#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { parseArgs, type ParseArgsOptionDescriptor } from 'node:util';
import { asItemId, asVaultId } from './brands.ts';
import {
  applyTemplate,
  copyVault,
  createItem,
  createVault,
  getItem,
  getVault,
  listItems,
  listVaults,
  loadTemplateFromFile,
  shareVault,
  updateItem,
} from './index.ts';

const GLOBAL_OPTIONS: Record<string, ParseArgsOptionDescriptor> = {
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
};

type Handler = (positionals: string[], values: Record<string, unknown>) => Promise<unknown>;

interface Command {
  description: string;
  usage: string;
  handler: Handler;
}

const COMMANDS: Record<string, Record<string, Command>> = {
  vault: {
    list: {
      description: 'List all accessible vaults',
      usage: 'vault list [--format json]',
      handler: async () => listVaults(),
    },
    get: {
      description: 'Get a vault by ID',
      usage: 'vault get <vault-id> [--format json]',
      handler: async (_positionals, values) => {
        const id = values.id as string | undefined;
        if (!id) throw new Error('--id is required');
        return getVault(asVaultId(id));
      },
    },
    create: {
      description: 'Create a new vault',
      usage: 'vault create --name <name> [--format json]',
      handler: async (_positionals, values) => {
        const name = values.name as string | undefined;
        if (!name) throw new Error('--name is required');
        return createVault(name);
      },
    },
    share: {
      description: 'Share a vault with an email address',
      usage: 'vault share --id <vault-id> --email <email>',
      handler: async (_positionals, values) => {
        const id = values.id as string | undefined;
        const email = values.email as string | undefined;
        if (!id) throw new Error('--id is required');
        if (!email) throw new Error('--email is required');
        await shareVault(asVaultId(id), email);
        return { ok: true };
      },
    },
    copy: {
      description: 'Copy a vault and all its items to a new vault',
      usage: 'vault copy --id <source-vault-id> --name <target-name> [--format json]',
      handler: async (_positionals, values) => {
        const id = values.id as string | undefined;
        const name = values.name as string | undefined;
        if (!id) throw new Error('--id is required');
        if (!name) throw new Error('--name is required');
        return copyVault(asVaultId(id), name);
      },
    },
  },
  item: {
    list: {
      description: 'List items in a vault',
      usage: 'item list --vault <vault-id> [--format json]',
      handler: async (_positionals, values) => {
        const vault = values.vault as string | undefined;
        if (!vault) throw new Error('--vault is required');
        return listItems(asVaultId(vault));
      },
    },
    get: {
      description: 'Get an item by ID',
      usage: 'item get <item-id> [--format json]',
      handler: async (positionals) => {
        const id = positionals[0];
        if (!id) throw new Error('<item-id> is required');
        return getItem(asItemId(id));
      },
    },
    create: {
      description: 'Create an item in a vault from a JSON template file',
      usage: 'item create --vault <vault-id> --from-template <file> [--format json]',
      handler: async (_positionals, values) => {
        const vault = values.vault as string | undefined;
        const templatePath = values['from-template'] as string | undefined;
        if (!vault) throw new Error('--vault is required');
        if (!templatePath) throw new Error('--from-template is required');
        const template = JSON.parse(await Bun.file(templatePath).text());
        return createItem(asVaultId(vault), template);
      },
    },
    update: {
      description: 'Update fields on an item',
      usage: 'item update <item-id> --set key=value ... [--format json]',
      handler: async (positionals, values) => {
        const id = positionals[0];
        const sets = values.set as string[] | undefined;
        if (!id) throw new Error('<item-id> is required');
        if (!sets?.length) throw new Error('--set is required');
        const fields = parseSetPairs(sets);
        return updateItem(asItemId(id), fields);
      },
    },
  },
  template: {
    apply: {
      description: 'Apply a template with placeholder replacements to a vault',
      usage: 'template apply --vault <vault-id> --template <file> --replacements \'{"KEY":"value"}\'',
      handler: async (_positionals, values) => {
        const vault = values.vault as string | undefined;
        const templatePath = values.template as string | undefined;
        const replacementsRaw = values.replacements as string | undefined;
        if (!vault) throw new Error('--vault is required');
        if (!templatePath) throw new Error('--template is required');
        if (!replacementsRaw) throw new Error('--replacements is required');
        const template = await loadTemplateFromFile(templatePath);
        const replacements = JSON.parse(replacementsRaw);
        return applyTemplate(asVaultId(vault), template, replacements);
      },
    },
  },
};

function parseSetPairs(pairs: string[]): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const pair of pairs) {
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
  return fields;
}

function formatOutput(result: unknown, format: string): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }
  if (result === undefined || result === null) {
    return '';
  }
  if (typeof result === 'string') {
    return result;
  }
  return String(result);
}

function printHelp(error?: string): void {
  if (error) {
    console.error(`Error: ${error}\n`);
  }

  const lines = [
    'Usage: proton-pass <command> <subcommand> [options]',
    '',
    'Commands:',
  ];

  for (const [group, subs] of Object.entries(COMMANDS)) {
    for (const [sub, meta] of Object.entries(subs)) {
      lines.push(`  ${group} ${sub}`);
      lines.push(`    ${meta.description}`);
      lines.push(`    Usage: proton-pass ${meta.usage}`);
    }
  }

  lines.push('');
  lines.push('Global options:');
  lines.push('  --format json|text    Output format (default: text)');
  lines.push('  --help                Show this help');

  console.info(lines.join('\n'));
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: GLOBAL_OPTIONS,
    allowPositionals: true,
  });

  if (values.help || positionals.length < 2) {
    printHelp();
    process.exit(0);
  }

  const [group, sub, ...rest] = positionals;
  const groupCommands = COMMANDS[group];
  const command = groupCommands?.[sub];

  if (!command) {
    printHelp(`Unknown command: ${group} ${sub}`);
    process.exit(1);
  }

  const result = await command.handler(rest, values);
  const formatted = formatOutput(result, values.format as string);
  if (formatted) {
    console.info(formatted);
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
