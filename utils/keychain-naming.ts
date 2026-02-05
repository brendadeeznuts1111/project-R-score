#!/usr/bin/env bun
/* keychain-naming.ts — Bun.secrets keychain naming CLI (Tier 1380) */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

type IndexEntry = {
  service: string;
  name: string;
  updatedAt: string;
  number: string;
  team: string;
  profile: string;
  namespace: string;
};

const DATA_DIR = join(import.meta.dir, ".data");
const INDEX_PATH = join(DATA_DIR, "keychain-index.json");

function requireSecrets() {
  const secrets = (Bun as unknown as {
    secrets?: {
      get: (opts: { service: string; name: string }) => Promise<string | null>;
      set: (opts: { service: string; name: string }, val: string) => Promise<void>;
      delete: (opts: { service: string; name: string }) => Promise<boolean>;
    };
  }).secrets;
  if (!secrets) throw new Error("Bun.secrets not available");
  return secrets;
}

async function ensureIndex(): Promise<IndexEntry[]> {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(INDEX_PATH)) {
    await writeFile(INDEX_PATH, JSON.stringify({ items: [] }, null, 2));
  }
  const raw = await readFile(INDEX_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

async function writeIndex(items: IndexEntry[]): Promise<void> {
  await writeFile(INDEX_PATH, JSON.stringify({ items }, null, 2));
}

function buildService(number: string, team: string, profile: string, namespace: string): string {
  return `bun-tier.${number}.${team}.${profile}.${namespace}`;
}

function parseArgs(argv: string[]) {
  const [cmd, profile, team, number, namespace, name, value] = argv;
  return { cmd, profile, team, number, namespace, name, value };
}

function usage() {
  console.log(`
keychain-naming.ts — Bun.secrets naming convention CLI

Usage:
  bun run keychain-naming.ts set <profile> <team> <number> <namespace> <name> <value>
  bun run keychain-naming.ts get <profile> <team> <number> <namespace> <name>
  bun run keychain-naming.ts delete <profile> <team> <number> <namespace> <name>
  bun run keychain-naming.ts list <profile> <team> <number>

Examples:
  bun run keychain-naming.ts set production nola 1380 com.tier1380.scanner api_key "sk_live_..."
  bun run keychain-naming.ts get production nola 1380 com.tier1380.scanner api_key
  bun run keychain-naming.ts list production nola 1380
`);
}

function groupForList(items: IndexEntry[]) {
  const out: Record<string, Record<string, Record<string, string[]>>> = {};
  for (const item of items) {
    const tier = item.number;
    const team = item.team;
    const profile = item.profile;
    const svc = item.namespace.split(".").pop() || item.namespace;
    if (!out[tier]) out[tier] = {};
    if (!out[tier][team]) out[tier][team] = {};
    if (!out[tier][team][profile]) out[tier][team][profile] = [];
    const label = `${svc}: ${item.name}`;
    out[tier][team][profile].push(label);
  }
  return out;
}

async function main() {
  const args = Bun.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const { cmd, profile, team, number, namespace, name, value } = parseArgs(args);
  if (!cmd) return usage();

  const secrets = requireSecrets();

  if (cmd === "set") {
    if (!profile || !team || !number || !namespace || !name || typeof value !== "string") return usage();
    const service = buildService(number, team, profile, namespace);
    await secrets.set({ service, name }, value);
    const items = await ensureIndex();
    const now = new Date().toISOString();
    const idx = items.findIndex((i) => i.service === service && i.name === name);
    const entry: IndexEntry = { service, name, updatedAt: now, number, team, profile, namespace };
    if (idx >= 0) items[idx] = entry;
    else items.push(entry);
    await writeIndex(items);
    console.log(`✓ Stored ${name} in ${service}`);
    return;
  }

  if (cmd === "get") {
    if (!profile || !team || !number || !namespace || !name) return usage();
    const service = buildService(number, team, profile, namespace);
    const val = await secrets.get({ service, name });
    if (val == null) {
      console.error("not found");
      process.exit(2);
    }
    console.log(val);
    return;
  }

  if (cmd === "delete") {
    if (!profile || !team || !number || !namespace || !name) return usage();
    const service = buildService(number, team, profile, namespace);
    const ok = await secrets.delete({ service, name });
    const items = await ensureIndex();
    const filtered = items.filter((i) => !(i.service === service && i.name === name));
    await writeIndex(filtered);
    console.log(ok ? "✓ deleted" : "not found");
    return;
  }

  if (cmd === "list") {
    if (!profile || !team || !number) return usage();
    const items = await ensureIndex();
    const filtered = items.filter(
      (i) => i.profile === profile && i.team === team && i.number === number,
    );
    console.log("🔑 Tier-1380 Keychain Entries:\n");
    if (filtered.length === 0) {
      console.log("(none)");
      return;
    }
    const grouped = groupForList(filtered);
    const tierGroup = grouped[number] || {};
    console.log(`Tier ${number}:`);
    for (const [t, profiles] of Object.entries(tierGroup)) {
      console.log(`  Team: ${t}`);
      for (const [p, entries] of Object.entries(profiles)) {
        console.log(`    Profile: ${p}`);
        const groupedByService: Record<string, string[]> = {};
        for (const item of entries) {
          const [svc, token] = item.split(": ").map((s) => s.trim());
          if (!groupedByService[svc]) groupedByService[svc] = [];
          groupedByService[svc].push(token);
        }
        for (const [svc, tokens] of Object.entries(groupedByService)) {
          console.log(`      ${svc}: ${tokens.join(", ")}`);
        }
      }
    }
    return;
  }

  usage();
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
