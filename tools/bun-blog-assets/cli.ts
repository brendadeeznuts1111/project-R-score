import { resolvePath as resolve } from '../../lib/path-bun';
import { parseArgs } from 'util';
import {
  DEFAULT_MANIFEST_PATH,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_VENDOR_DIR,
  REPO_ROOT,
} from './constants.ts';
import { fail } from './errors.ts';
import type { CliOptions } from './types.ts';

export function parseCliOptions(): CliOptions {
  // @see https://bun.com/reference/bun/argv — Bun.argv
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      check: { type: 'boolean' },
      plan: { type: 'boolean' },
      vendor: { type: 'boolean' },
      'confirm-rights': { type: 'boolean' },
      mode: { type: 'string' },
      html: { type: 'string' },
      markdown: { type: 'string' },
      manifest: { type: 'string' },
      'vendor-dir': { type: 'string' },
      'rights-evidence': { type: 'string' },
      'timeout-ms': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: true,
  });
  if (values.help) {
    console.log(`Usage: bun tools/bun-blog-assets.ts [options]

Modes:
  (default)                         Fetch and write external-only manifest
  --check                           Fetch and validate committed manifest; no writes
  --plan                            Fetch and show proposed manifest drift; no writes
  --vendor --confirm-rights --rights-evidence PATH
                                    Stage media only with scoped approval evidence

Options:
  --html PATH                       Use a saved HTML source instead of fetching
  --markdown PATH                   Use a saved Markdown source instead of fetching
  --manifest PATH                   Manifest path (default: ${DEFAULT_MANIFEST_PATH})
  --vendor-dir PATH                 Vendor directory (default: ${DEFAULT_VENDOR_DIR})
  --rights-evidence PATH            JSON evidence approving Bun 1.4 blog-media republication
  --timeout-ms N                    Network timeout (default: ${DEFAULT_TIMEOUT_MS})
  --help                            Show this help
`);
    process.exit(0);
  }
  if (positionals.length) fail(`unexpected positional arguments: ${positionals.join(' ')}`);
  const vendor = values.vendor === true;
  const mode = values.mode ?? (vendor ? 'vendor' : 'external');
  if (mode !== 'external' && mode !== 'vendor') fail(`--mode must be external or vendor`);
  if (vendor !== (mode === 'vendor')) fail(`--vendor and --mode=vendor must agree`);
  if (values.check && values.plan) fail('--check cannot be combined with --plan');
  if (values.check && vendor) fail('--check cannot be combined with --vendor');
  if (values.plan && vendor) fail('--plan cannot be combined with --vendor');
  if (values['confirm-rights'] && !vendor) fail('--confirm-rights requires --vendor');
  if (values['rights-evidence'] && !vendor) fail('--rights-evidence requires --vendor');
  if (vendor && typeof values['rights-evidence'] !== 'string') {
    fail('--vendor requires --rights-evidence PATH');
  }
  const timeoutMs = Number(values['timeout-ms'] ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    fail('--timeout-ms must be a positive integer');
  }
  return {
    check: values.check === true,
    plan: values.plan === true,
    vendor,
    confirmRights: values['confirm-rights'] === true,
    mode,
    htmlPath: typeof values.html === 'string' ? values.html : undefined,
    markdownPath: typeof values.markdown === 'string' ? values.markdown : undefined,
    manifestPath: resolve(REPO_ROOT, String(values.manifest ?? DEFAULT_MANIFEST_PATH)),
    vendorDir: resolve(REPO_ROOT, String(values['vendor-dir'] ?? DEFAULT_VENDOR_DIR)),
    rightsEvidencePath:
      typeof values['rights-evidence'] === 'string'
        ? resolve(REPO_ROOT, values['rights-evidence'])
        : undefined,
    timeoutMs,
  };
}
