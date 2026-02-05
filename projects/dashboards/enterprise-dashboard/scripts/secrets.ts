#!/usr/bin/env bun
/**
 * CLI tool for managing secrets securely
 * Uses Bun.secrets for OS-native credential storage
 *
 * Usage:
 *   bun run secrets list
 *   bun run secrets set github-token
 *   bun run secrets get s3-access-key-id
 *   bun run secrets delete proxy-password
 *   bun run secrets import .env.local
 *   bun run secrets export --reveal
 */

import {
  listSecrets,
  getSecret,
  setSecret,
  deleteSecret,
  promptAndSetSecret,
  parseSecretCommand,
  getSecretHelp,
  importFromEnv,
  exportToEnv,
  getEnvVarName,
  type CredentialKey,
} from "../src/server/secrets";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  yellow: "\x1b[33m",
  ok: "\x1b[36m",
  err: "\x1b[35m",
  warn: "\x1b[33m",
};

async function main() {
  const args = process.argv.slice(2);
  const command = parseSecretCommand(args);

  if (!command) {
    console.error(`${c.err}Invalid command or key${c.reset}`);
    console.log(getSecretHelp());
    process.exit(1);
  }

  switch (command.action) {
    case "help":
      console.log(getSecretHelp());
      break;

    case "list":
      await handleList();
      break;

    case "get":
      await handleGet(command.key);
      break;

    case "set":
      await handleSet(command.key, command.value);
      break;

    case "delete":
      await handleDelete(command.key);
      break;

    case "import":
      await handleImport(command.file);
      break;

    case "export":
      await handleExport(command.reveal);
      break;
  }
}

async function handleList() {
  console.log(`\n${c.bold}Stored Secrets${c.reset}\n`);

  const secrets = await listSecrets();

  const formatted = secrets.map(s => ({
    Key: s.key,
    Env: `${c.dim}${getEnvVarName(s.key)}${c.reset}`,
    Source: s.source === "keychain"
      ? `${c.ok}◆ keychain${c.reset}`
      : s.source === "env"
        ? `${c.warn}▲ env${c.reset}`
        : `${c.dim}○ none${c.reset}`,
    Value: s.masked || `${c.dim}(not set)${c.reset}`,
  }));

  console.log(Bun.inspect.table(formatted, { colors: true }));

  const keychainCount = secrets.filter(s => s.source === "keychain").length;
  const envCount = secrets.filter(s => s.source === "env").length;
  const total = keychainCount + envCount;

  console.log(`\n${c.dim}Summary: ${c.ok}${keychainCount}${c.dim} keychain, ${c.warn}${envCount}${c.dim} env, ${total}/${secrets.length} configured${c.reset}\n`);
}

async function handleGet(key: CredentialKey) {
  const value = await getSecret(key);

  if (!value) {
    console.log(`${c.warn}No value found for '${key}'${c.reset}`);
    console.log(`${c.dim}Tip: Set it with: bun run secrets set ${key}${c.reset}`);
    process.exit(1);
  }

  // Mask the value for security
  const masked = value.length <= 8
    ? "••••••••"
    : `${value.slice(0, 4)}${"•".repeat(value.length - 8)}${value.slice(-4)}`;

  console.log(`${c.bold}${key}${c.reset}: ${masked}`);
  console.log(`${c.dim}Env: ${getEnvVarName(key)}${c.reset}`);
}

async function handleSet(key: CredentialKey, value?: string) {
  if (value) {
    // Value provided directly (less secure, visible in shell history)
    console.log(`${c.warn}Warning: Providing secrets via command line is visible in shell history${c.reset}`);
    await setSecret(key, value);
    console.log(`${c.ok}◆ Secret '${key}' stored in system keychain${c.reset}`);
  } else {
    // Prompt for value (more secure)
    await promptAndSetSecret(key, `Enter value for ${c.bold}${key}${c.reset}: `);
  }
}

async function handleDelete(key: CredentialKey) {
  const deleted = await deleteSecret(key);

  if (deleted) {
    console.log(`${c.ok}◆ Secret '${key}' deleted from keychain${c.reset}`);
  } else {
    console.log(`${c.warn}No secret found for '${key}' in keychain${c.reset}`);
  }
}

async function handleImport(file: string) {
  // Check if file exists
  const bunFile = Bun.file(file);
  if (!await bunFile.exists()) {
    console.error(`${c.err}✖ File not found: ${file}${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.bold}Importing Secrets${c.reset}\n`);
  console.log(`${c.dim}├─${c.reset} Reading ${file}`);

  const { imported, skipped } = await importFromEnv(file);

  if (imported.length > 0) {
    console.log(`${c.dim}├─${c.reset} ${c.ok}◆ Imported ${imported.length} secret(s):${c.reset}`);
    for (const key of imported) {
      console.log(`${c.dim}│  ${c.reset}  ${key}`);
    }
  }

  if (skipped.length > 0) {
    console.log(`${c.dim}├─${c.reset} ${c.warn}▲ Skipped ${skipped.length} unknown key(s):${c.reset}`);
    for (const key of skipped) {
      console.log(`${c.dim}│  ${c.reset}  ${key}`);
    }
  }

  console.log(`${c.dim}└─${c.reset} Done\n`);
}

async function handleExport(reveal: boolean) {
  if (reveal) {
    console.error(`${c.warn}Warning: Exporting actual secret values${c.reset}`, { stderr: true });
  }

  const envContent = await exportToEnv(reveal);
  console.log(envContent);
}

main().catch(err => {
  console.error(`${c.err}Error:${c.reset}`, err.message);
  process.exit(1);
});
