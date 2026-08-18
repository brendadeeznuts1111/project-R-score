#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { cliOut } from '../../../lib/console/index.ts';
import {
  applyUnknownLongOptionGuard,
  BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG,
} from '../../../lib/docs/ref-id-tool-flags.ts';
import { blogUrlForVersion, normalizeVersion } from './generator.ts';
import { runKnowledgeReadCommand } from './knowledge-read-cli.ts';
import { runKnowledgeValidationCommand } from './knowledge-validation-cli.ts';
import { releaseKnowledgeProvenance } from './knowledge-validation-io.ts';
import {
  knowledgeValidationConfig,
  knowledgeValidationPasses,
} from './knowledge-validation-config.ts';
import { parseReleaseKnowledgeValidation } from './knowledge-validation.ts';
import {
  normalizeReleaseKnowledge,
  parseKnowledgeCatalog,
  renderReleaseKnowledge,
} from './knowledge.ts';

const REPO_ROOT = resolve(import.meta.dir, '..', '..', '..');
const DEFAULT_CATALOG = resolve(REPO_ROOT, 'tools', 'bun-docs-catalog.json');
const DEFAULT_FEEDS = resolve(REPO_ROOT, 'tools', 'bun-docs-feeds.json');
const DEFAULT_KNOWLEDGE_DIR = resolve(import.meta.dir, '..', 'knowledge');

function help(): void {
  console.log(`Usage: bun packages/bun-release-contracts/src/knowledge-cli.ts <command> [args]

Commands:
  build <release.md> --version <vX.Y.Z> [--output <file>] [--check]
  query <knowledge.json> <terms...> [--limit <n>] [--json]
  diff <previous.json> <current.json> [--json]
  matrix <knowledge.json> [--json]
  verify <knowledge.json> [--json]
  validate [knowledge.json | --version <v>] [--source <release.md>] [--strict] [--report <format>]
  validate-all [knowledge-directory] [--strict] [--report <format>]

Build joins official Markdown with the committed docs catalog and RSS provenance.
Validation formats: console, json, junit. Harvested release snippets are never executed.`);
}

export async function runKnowledgeCli(argv: string[] = Bun.argv.slice(2)): Promise<void> {
  const guardedArgv = applyUnknownLongOptionGuard(argv, BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG, {
    cliName: 'bun:release-knowledge',
    onFail: 'throw',
  });
  const { values, positionals } = parseArgs({
    args: guardedArgv,
    options: {
      version: { type: 'string' },
      output: { type: 'string' },
      catalog: { type: 'string', default: DEFAULT_CATALOG },
      feeds: { type: 'string', default: DEFAULT_FEEDS },
      limit: { type: 'string', default: '5' },
      check: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      source: { type: 'string' },
      report: { type: 'string' },
      strict: { type: 'boolean' },
      'max-warnings': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });
  if (values.help || positionals.length === 0) {
    help();
    return;
  }
  const [command, ...args] = positionals;
  if (command === 'build') {
    const inputPath = args[0];
    if (!inputPath || !values.version) throw new Error('build requires <release.md> and --version');
    const version = normalizeVersion(values.version);
    const outputPath = resolve(
      values.output ?? resolve(DEFAULT_KNOWLEDGE_DIR, `bun-v${version}.json`)
    );
    const [{ sourceUrl, publishedAt }, catalog, markdown] = await Promise.all([
      releaseKnowledgeProvenance(version, resolve(values.feeds)),
      Bun.file(resolve(values.catalog)).json().then(parseKnowledgeCatalog),
      Bun.file(resolve(inputPath)).text(),
    ]);
    const knowledge = normalizeReleaseKnowledge({
      version,
      sourceUrl,
      sourceMarkdownUrl: `${blogUrlForVersion(version)}.md`,
      publishedAt,
      markdown,
      catalog,
    });
    const validation = parseReleaseKnowledgeValidation(knowledge);
    const validationConfig = knowledgeValidationConfig();
    if (!knowledgeValidationPasses(validation.findings, validationConfig)) {
      throw new Error(
        `Normalized release knowledge failed validation:\n${validation.findings
          .map(item => `${item.severity} ${item.path}: ${item.message}`)
          .join('\n')}`
      );
    }
    const content = renderReleaseKnowledge(knowledge);
    const output = Bun.file(outputPath);
    const existing = (await output.exists()) ? await output.text() : null;
    if (values.check) {
      if (existing !== content)
        throw new Error(`Release knowledge is missing or stale: ${outputPath}`);
    } else if (existing !== content) {
      await Bun.write(outputPath, content, { createPath: true });
    }
    cliOut(
      {
        mode: values.check ? 'check' : 'build',
        version,
        outputPath,
        status: values.check ? 'verified' : existing === content ? 'unchanged' : 'generated',
        counts: knowledge.counts,
      },
      { json: values.json }
    );
    return;
  }
  if (
    await runKnowledgeValidationCommand(
      command,
      args,
      {
        version: values.version,
        source: values.source,
        catalog: values.catalog,
        feeds: values.feeds,
        report: values.report,
        strict: values.strict,
        maxWarnings: values['max-warnings'],
      },
      DEFAULT_KNOWLEDGE_DIR
    )
  ) {
    return;
  }
  if (
    await runKnowledgeReadCommand(command, args, {
      limit: values.limit,
      json: values.json,
      feeds: values.feeds,
    })
  ) {
    return;
  }
  throw new Error(`Unknown knowledge command: ${command}`);
}

if (import.meta.main) {
  try {
    await runKnowledgeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
