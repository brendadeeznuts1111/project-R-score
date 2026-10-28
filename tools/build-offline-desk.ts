const REPO_ROOT = `${import.meta.dir}/..`;
const DESK_ENTRY = `${REPO_ROOT}/public/portal/desk/index.html`;

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const OFFLINE_ARTIFACTS = {
  '/registry/partners-dashboard.json': 'partners-dashboard.json',
  '/registry/soft-accounting-export.json': 'soft-accounting-export.json',
  '/registry/seat-capital-desk.json': 'seat-capital-desk.json',
  '/registry/partners-ops.json': 'partners-ops.json',
  '/registry/bookmakers.json': 'bookmakers.json',
  '/registry/telegram-handshake.json': 'telegram-handshake.json',
  '/registry/limit-raises.json': 'limit-raises.json',
  '/registry/partner-ledger.json': 'partner-ledger.json',
  '/registry/bookmakers-desk-coverage.json': 'bookmakers-desk-coverage.json',
  '/registry/toc-ops.json': 'toc-ops.json',
} as const;

function replaceRequired(source: string, needle: string, replacement: string): string {
  if (!source.includes(needle)) {
    throw new Error(`Offline desk source contract missing: ${JSON.stringify(needle)}`);
  }
  return source.replace(needle, replacement);
}

function scriptSafeJson(value: JsonValue): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export async function readOfflineDeskArtifacts(): Promise<Record<string, JsonValue>> {
  const entries = await Promise.all(
    Object.entries(OFFLINE_ARTIFACTS).map(async ([route, fileName]) => {
      const file = Bun.file(`${REPO_ROOT}/public/registry/${fileName}`);
      if (!(await file.exists())) throw new Error(`Offline desk artifact missing: ${fileName}`);
      return [route, await file.json()] as const;
    })
  );
  return Object.fromEntries(entries);
}

/**
 * Produce a disposable HTML entry for Bun's standalone browser compiler.
 * The checked-in desk remains unchanged; only build-time dependency URLs and
 * runtime registry reads are replaced in this staged copy.
 */
export function prepareOfflineDeskHtml(
  source: string,
  artifacts: Readonly<Record<string, JsonValue>>
): string {
  let html = replaceRequired(
    source,
    '<html lang="en" data-theme="dark">',
    '<html lang="en" data-theme="dark" data-offline-artifact="true">'
  );

  html = replaceRequired(html, `    <link rel="manifest" href="/site.webmanifest" />\n`, '');
  html = replaceRequired(
    html,
    `    <link rel="preconnect" href="https://fonts.googleapis.com" />\n` +
      `    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n` +
      `    <link\n` +
      `      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"\n` +
      `      rel="stylesheet"\n` +
      `    />\n`,
    ''
  );

  const dependencyUrls: ReadonlyArray<readonly [string, string]> = [
    ['/icons/factory/mark.svg', '../../icons/factory/mark.svg'],
    ['/icons/factory/mark.png', '../../icons/factory/mark.png'],
    ['/portal/style.css', '../style.css'],
    ["'/portal/desk/desk-board.js'", "'./desk-board.js'"],
    ["'/portal/partners/partners-board.js'", "'../partners/partners-board.js'"],
  ];
  for (const [onlineUrl, stagedUrl] of dependencyUrls) {
    html = replaceRequired(html, onlineUrl, stagedUrl);
  }

  for (const script of [
    '    <script type="module" src="/portal/data.js"></script>\n',
    '    <script type="module" src="/portal/topbar.js"></script>\n',
    '    <script type="module" src="/portal/components/footer.js"></script>\n',
  ]) {
    html = replaceRequired(html, script, '');
  }

  const fetchImport = `      import { fetchJsonResult } from '/portal/fetch-json.js';`;
  const embeddedFetch =
    `      const OFFLINE_REGISTRY = Object.freeze(${scriptSafeJson(artifacts)});\n` +
    `      async function fetchJsonResult(url) {\n` +
    `        if (!Object.hasOwn(OFFLINE_REGISTRY, url)) {\n` +
    `          return { ok: false, kind: 'offline', error: \`Offline artifact missing: \${url}\` };\n` +
    `        }\n` +
    `        return { ok: true, data: OFFLINE_REGISTRY[url], status: 200, contentType: 'application/json' };\n` +
    `      }`;
  html = replaceRequired(html, fetchImport, embeddedFetch);

  return html;
}

export interface BuildOfflineDeskOptions {
  outfile?: string;
}

export async function buildOfflineDesk(
  options: BuildOfflineDeskOptions = {}
): Promise<{ outfile: string; bytes: number }> {
  const outfile = options.outfile?.startsWith('/')
    ? options.outfile
    : `${REPO_ROOT}/${options.outfile ?? 'dist/portal-desk-offline.html'}`;
  const suffix = `${process.pid}-${Date.now()}`;
  const stagedEntry = `${REPO_ROOT}/public/portal/desk/.offline-desk-${suffix}.html`;
  const buildDir = `${REPO_ROOT}/.bun-cache/offline-desk-${suffix}`;
  const builtFile = `${buildDir}/.offline-desk-${suffix}.html`;

  const source = await Bun.file(DESK_ENTRY).text();
  const artifacts = await readOfflineDeskArtifacts();
  const stagedHtml = prepareOfflineDeskHtml(source, artifacts);

  await Bun.$`mkdir -p ${buildDir}`.quiet();
  await Bun.write(stagedEntry, stagedHtml);
  try {
    const build = Bun.spawn(
      [
        process.execPath,
        'build',
        stagedEntry,
        '--compile',
        '--target=browser',
        '--outdir',
        buildDir,
      ],
      { cwd: REPO_ROOT, stdout: 'pipe', stderr: 'pipe' }
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(build.stdout).text(),
      new Response(build.stderr).text(),
      build.exited,
    ]);
    if (exitCode !== 0) {
      throw new Error(`Offline desk build failed (${exitCode})\n${stderr || stdout}`);
    }

    const artifact = Bun.file(builtFile);
    if (!(await artifact.exists())) {
      throw new Error(`Offline desk compiler did not produce ${builtFile}`);
    }
    await Bun.$`mkdir -p ${outfile.slice(0, outfile.lastIndexOf('/'))}`.quiet();
    await Bun.write(outfile, artifact);
    return { outfile, bytes: artifact.size };
  } finally {
    await Bun.file(stagedEntry).delete();
    await Bun.$`rm -rf ${buildDir}`.quiet();
  }
}

function parseOutfile(argv: string[]): string | undefined {
  const index = argv.indexOf('--outfile');
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error('--outfile requires a path');
  return value;
}

if (import.meta.main) {
  const result = await buildOfflineDesk({ outfile: parseOutfile(process.argv.slice(2)) });
  console.log(`Offline desk: ${result.outfile} (${result.bytes.toLocaleString()} bytes)`);
}
