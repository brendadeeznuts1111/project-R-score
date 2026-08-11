// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
import { MARKDOWN_PRESET_README, markdownHtml } from '../markdown/options.ts';

export const MODEL_CONTRACT_PACKAGE = 'factorywager-enterprise' as const;

export type ModelContractFilePackage = typeof MODEL_CONTRACT_PACKAGE;
export type ModelContractFileDomain =
  'operator-research' | 'repository-governance' | 'test-harness' | 'documentation';
export type ModelContractOwnerModule =
  | 'repository-policy'
  | 'model-controls'
  | 'operator-research'
  | 'agent-odds-http'
  | 'edge-engine'
  | 'alert-vocabulary'
  | 'alert-matching'
  | 'signal-matching'
  | 'markdown-policy'
  | 'property-contracts'
  | 'file-accountability'
  | 'snapshot-harness'
  | 'package-commands'
  | 'contract-tests'
  | 'wiki-navigation';
export type ModelContractFileGroup =
  | 'policy'
  | 'configuration'
  | 'documentation'
  | 'runtime'
  | 'contracts'
  | 'registry'
  | 'commands'
  | 'tests'
  | 'snapshots'
  | 'navigation';
export type ModelContractFileDeliveryChannel =
  'repository' | 'configuration' | 'documentation' | 'runtime' | 'test' | 'snapshot' | 'tooling';
export type ModelContractFileScope = 'self' | 'generated' | 'shared';

type ModelContractFileMetadata = {
  path: string;
  package: ModelContractFilePackage;
  domain: ModelContractFileDomain;
  ownerModule: ModelContractOwnerModule;
  group: ModelContractFileGroup;
  role: string;
  authority: string;
  deliveryChannel: ModelContractFileDeliveryChannel;
};

export type ModelContractFile = ModelContractFileMetadata &
  (
    | { generated: true; scope: Extract<ModelContractFileScope, 'generated'> }
    | { generated: false; scope: Exclude<ModelContractFileScope, 'generated'> }
  );

const file = <const T extends ModelContractFile>(contract: T): T => contract;

/**
 * File-level accountability SSOT for the model circuit contract.
 *
 * `self` means this boundary owns the file, `generated` means it owns the
 * projection but not hand-authored content, and `shared` means it owns only the
 * role named here rather than the whole repository file.
 */
export const MODEL_CONTRACT_FILE_REGISTRY = [
  file({
    path: '.gitignore',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'repository-governance',
    ownerModule: 'repository-policy',
    group: 'policy',
    role: 'Expose the model harness configuration to version control',
    authority: 'Repository ignore policy',
    deliveryChannel: 'repository',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'config/operator-research/model-harness.toml',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'model-controls',
    group: 'configuration',
    role: 'Lock model intake and weight-isolation flags',
    authority: 'Model harness configuration',
    deliveryChannel: 'configuration',
    generated: false,
    scope: 'self',
  }),
  file({
    path: 'docs/harness/tenants/model-circuit-contracts.md',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'documentation',
    ownerModule: 'model-controls',
    group: 'documentation',
    role: 'Explain the model circuit ownership and proof boundary',
    authority: 'Harness tenant documentation',
    deliveryChannel: 'documentation',
    generated: false,
    scope: 'self',
  }),
  file({
    path: 'docs/BUN_NATIVE_CAPABILITIES.md',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'documentation',
    ownerModule: 'markdown-policy',
    group: 'documentation',
    role: 'Publish the bounded Bun Markdown structural-owner evidence block',
    authority: 'Bun native capability inventory',
    deliveryChannel: 'documentation',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/markdown/README.md',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'documentation',
    ownerModule: 'markdown-policy',
    group: 'documentation',
    role: 'Document the Bun Markdown parser and renderer boundary',
    authority: 'Markdown package guide',
    deliveryChannel: 'documentation',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/markdown/options.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'markdown-policy',
    group: 'contracts',
    role: 'Own canonical explicit Bun Markdown parser options',
    authority: 'MARKDOWN_PRESET_README',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/operator-research/README.md',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'documentation',
    ownerModule: 'operator-research',
    group: 'documentation',
    role: 'Route operators to runtime and contract owners',
    authority: 'Operator research package guide',
    deliveryChannel: 'documentation',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/operator-research/agent-odds-http.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'agent-odds-http',
    group: 'runtime',
    role: 'Parse simulator alert rule input at the HTTP boundary',
    authority: 'Agent odds HTTP runtime',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/operator-research/alert-vocabulary.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'alert-vocabulary',
    group: 'contracts',
    role: 'Own distinct closed edge, movement, alert, channel, and period vocabularies',
    authority: 'Operator research alert vocabulary',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'self',
  }),
  file({
    path: 'lib/operator-research/edge-engine.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'edge-engine',
    group: 'runtime',
    role: 'Project verified circuit inputs into model output and diagnostics',
    authority: 'Operator research runtime',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/operator-research/files.md',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'documentation',
    ownerModule: 'file-accountability',
    group: 'registry',
    role: 'Publish the human-readable file accountability projection',
    authority: 'MODEL_CONTRACT_FILE_REGISTRY',
    deliveryChannel: 'documentation',
    generated: true,
    scope: 'generated',
  }),
  file({
    path: 'lib/operator-research/matching/alerts.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'alert-matching',
    group: 'runtime',
    role: 'Own closed alert pattern and delivery matching',
    authority: 'Alert matching runtime',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/operator-research/matching/signals.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'signal-matching',
    group: 'runtime',
    role: 'Own normalized movement signal matching',
    authority: 'Signal matching runtime',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'lib/operator-research/model-contracts.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'property-contracts',
    group: 'contracts',
    role: 'Own aggregate-aware property, flag, and weight-input contracts',
    authority: 'MODEL_PROPERTY_CONTRACTS',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'self',
  }),
  file({
    path: 'lib/operator-research/model-contract-files.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'file-accountability',
    group: 'contracts',
    role: 'Own typed file metadata and its Markdown projection',
    authority: 'MODEL_CONTRACT_FILE_REGISTRY',
    deliveryChannel: 'runtime',
    generated: false,
    scope: 'self',
  }),
  file({
    path: 'lib/portal/bun-test-snapshots.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'test-harness',
    ownerModule: 'snapshot-harness',
    group: 'registry',
    role: 'Register the model-circuit snapshot suite',
    authority: 'Bun snapshot suite registry',
    deliveryChannel: 'test',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'package.json',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'repository-governance',
    ownerModule: 'package-commands',
    group: 'commands',
    role: 'Expose model contract check and update commands',
    authority: 'Package script registry',
    deliveryChannel: 'repository',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'tests/edge-engine.test.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'test-harness',
    ownerModule: 'contract-tests',
    group: 'tests',
    role: 'Prove edge runtime behavior at its public boundary',
    authority: 'Bun test',
    deliveryChannel: 'test',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'tests/agent-odds-http.test.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'test-harness',
    ownerModule: 'contract-tests',
    group: 'tests',
    role: 'Prove alert vocabularies are parsed at the HTTP boundary',
    authority: 'Bun test',
    deliveryChannel: 'test',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'tests/markdown-options.test.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'test-harness',
    ownerModule: 'markdown-policy',
    group: 'tests',
    role: 'Prove active-runtime Bun Markdown option behavior',
    authority: 'Bun test',
    deliveryChannel: 'test',
    generated: false,
    scope: 'shared',
  }),
  file({
    path: 'tests/model-circuit-contracts.test.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'test-harness',
    ownerModule: 'contract-tests',
    group: 'tests',
    role: 'Prove contract completeness, isolation, and file accountability',
    authority: 'Bun test',
    deliveryChannel: 'test',
    generated: false,
    scope: 'self',
  }),
  file({
    path: 'tests/__snapshots__/model-circuit-contracts.test.ts.snap',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'test-harness',
    ownerModule: 'snapshot-harness',
    group: 'snapshots',
    role: 'Capture the reviewed model circuit contract projection',
    authority: 'Bun test snapshot output',
    deliveryChannel: 'snapshot',
    generated: true,
    scope: 'generated',
  }),
  file({
    path: 'tools/model-contracts.ts',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'operator-research',
    ownerModule: 'file-accountability',
    group: 'commands',
    role: 'Check or regenerate the file accountability projection',
    authority: 'Model contract CLI',
    deliveryChannel: 'tooling',
    generated: false,
    scope: 'self',
  }),
  file({
    path: 'wiki-index.md',
    package: MODEL_CONTRACT_PACKAGE,
    domain: 'documentation',
    ownerModule: 'wiki-navigation',
    group: 'navigation',
    role: 'Link the model circuit tenant from repository navigation',
    authority: 'Wiki navigation registry',
    deliveryChannel: 'documentation',
    generated: false,
    scope: 'shared',
  }),
] as const satisfies readonly ModelContractFile[];

/**
 * Naming boundaries whose matching files must be explicitly registered.
 * Shared consumers stay opt-in because this contract owns only their named role.
 */
export const MODEL_CONTRACT_DISCOVERY_GLOBS = [
  'config/operator-research/model-harness.toml',
  'docs/harness/tenants/model-circuit-contracts.md',
  'lib/operator-research/alert-vocabulary.ts',
  'lib/operator-research/model-contract*.ts',
  'tests/model-circuit-contracts*.test.ts',
  'tools/model-contracts.ts',
] as const;

/** Compatibility path projection for existing consumers and snapshots. */
export type ModelContractFilePath = (typeof MODEL_CONTRACT_FILE_REGISTRY)[number]['path'];
export const MODEL_CONTRACT_FILES: readonly ModelContractFilePath[] = Object.freeze(
  MODEL_CONTRACT_FILE_REGISTRY.map(entry => entry.path)
);

export const MODEL_CONTRACT_FILES_MARKDOWN_OPTIONS = {
  ...MARKDOWN_PRESET_README,
  tables: true,
  headings: { ids: true },
  tagFilter: true,
} as const satisfies Bun.markdown.Options;

function markdownLink(path: string): string {
  return `[\`${path}\`](../../${path})`;
}

function tableCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function renderGfmTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): string[] {
  const escapedRows = rows.map(row => row.map(tableCell));
  const widths = headers.map((header, index) =>
    Math.max(header.length, 3, ...escapedRows.map(row => row[index]?.length ?? 0))
  );
  const renderRow = (row: readonly string[]): string =>
    `| ${row.map((cell, index) => cell.padEnd(widths[index]!)).join(' | ')} |`;

  return [
    renderRow(headers),
    renderRow(widths.map(width => '-'.repeat(width))),
    ...escapedRows.map(renderRow),
  ];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function renderModelContractFilesMarkdown(): string {
  const entries = [...MODEL_CONTRACT_FILE_REGISTRY].sort(
    (left, right) =>
      compareText(left.package, right.package) ||
      compareText(left.ownerModule, right.ownerModule) ||
      compareText(left.group, right.group) ||
      compareText(left.path, right.path)
  );
  const lines = [
    '# Operator research model files',
    '',
    'Generated from `MODEL_CONTRACT_FILE_REGISTRY`. The registry is the typed source',
    'of truth; this document is its human-readable accountability view.',
    '',
    'Scopes are explicit: `self` is owned here, `generated` is a generated',
    'projection, and `shared` claims only the role named in the table.',
    '',
  ];

  for (const packageName of [...new Set(entries.map(entry => entry.package))].sort()) {
    lines.push(`## Package: ${packageName}`, '');
    const packageEntries = entries.filter(entry => entry.package === packageName);
    for (const ownerModule of [...new Set(packageEntries.map(entry => entry.ownerModule))].sort()) {
      const ownerEntries = packageEntries.filter(entry => entry.ownerModule === ownerModule);
      lines.push(`### Owner module: ${ownerModule}`, '');
      lines.push(
        ...renderGfmTable(
          ['Group', 'File', 'Domain', 'Role', 'Authority', 'Channel', 'Scope'],
          ownerEntries.map(entry => [
            entry.group,
            markdownLink(entry.path),
            entry.domain,
            entry.role,
            entry.authority,
            entry.deliveryChannel,
            entry.scope,
          ])
        ),
        ''
      );
    }
  }

  return lines.join('\n');
}

export type ModelContractFilesMarkdownInspection = {
  headings: readonly { level: number; text: string }[];
  tableCount: number;
  rowCount: number;
  links: readonly string[];
  html: string;
};

/** Parse structural ownership signals and render HTML under the canonical preset. */
export function inspectModelContractFilesMarkdown(
  markdown: string
): ModelContractFilesMarkdownInspection {
  const headings: { level: number; text: string }[] = [];
  const links: string[] = [];
  let tableCount = 0;
  let rowCount = 0;

  Bun.markdown.render(
    markdown,
    {
      heading: (children, { level }) => {
        headings.push({ level, text: children });
        return children;
      },
      table: children => {
        tableCount += 1;
        return children;
      },
      tr: children => {
        rowCount += 1;
        return children;
      },
      link: (children, { href }) => {
        links.push(href);
        return children;
      },
    },
    MODEL_CONTRACT_FILES_MARKDOWN_OPTIONS
  );

  return {
    headings,
    tableCount,
    rowCount,
    links,
    html: markdownHtml(markdown, MODEL_CONTRACT_FILES_MARKDOWN_OPTIONS),
  };
}

export function assertModelContractFilesMarkdown(markdown: string): void {
  const inspection = inspectModelContractFilesMarkdown(markdown);
  const expectedLinks = MODEL_CONTRACT_FILE_REGISTRY.map(entry => `../../${entry.path}`).sort();
  const packageCount = new Set(MODEL_CONTRACT_FILE_REGISTRY.map(entry => entry.package)).size;
  const ownerCount = new Set(
    MODEL_CONTRACT_FILE_REGISTRY.map(entry => `${entry.package}:${entry.ownerModule}`)
  ).size;

  if (
    inspection.headings[0]?.level !== 1 ||
    inspection.headings.filter(heading => heading.level === 1).length !== 1
  ) {
    throw new Error('model contracts: files.md must start with one level-one heading');
  }
  if (inspection.headings.filter(heading => heading.level === 2).length !== packageCount) {
    throw new Error('model contracts: files.md package headings do not match the registry');
  }
  if (inspection.tableCount !== ownerCount) {
    throw new Error('model contracts: files.md owner tables do not match the registry');
  }
  if (inspection.headings.filter(heading => heading.level === 3).length !== ownerCount) {
    throw new Error('model contracts: files.md owner headings do not match the registry');
  }
  if (
    !Bun.deepEquals([...inspection.links].sort(), expectedLinks) ||
    inspection.rowCount !== MODEL_CONTRACT_FILE_REGISTRY.length + ownerCount
  ) {
    throw new Error('model contracts: files.md rows or links do not match the registry');
  }
  if (!inspection.html.includes('<table>') || !inspection.html.includes('<h1')) {
    throw new Error('model contracts: files.md failed canonical HTML rendering');
  }
}
