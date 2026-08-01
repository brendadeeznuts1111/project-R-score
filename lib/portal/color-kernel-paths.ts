/**
 * Paths that own theme-dark color-kernel Claim/Evidence (claim color-kernel-theme-aliases).
 * Shared by pre-commit path-gate + soft PR Color Kernel Evidence check.
 */

const COLOR_KERNEL_EXACT = new Set([
  'public/portal/theme.jsonc',
  'public/portal/theme-tokens.css',
  'lib/portal/color-kernel-align.ts',
  'lib/portal/color-kernel-paths.ts',
  'lib/portal/portal-kernel-palette.ts',
  'lib/telegram/partner-ops-color-kernel.ts',
  'lib/telegram/telegram-color-kernel.ts',
  'tools/check-portal-color-kernels.ts',
  'tools/sync-portal-theme.ts',
  'tests/portal-color-kernel-align.test.ts',
]);

/** True when a staged/changed path should re-run portal:theme:check / validate:colors. */
export function isColorKernelPath(file: string): boolean {
  const n = file.replace(/^\.\//, '');
  return COLOR_KERNEL_EXACT.has(n);
}

export function touchesColorKernel(files: readonly string[]): boolean {
  return files.some(isColorKernelPath);
}

/**
 * True when the PR body includes a real `validate:colors` paste (not the template stub).
 * Soft gate only — never fail-closed by itself.
 */
export function colorKernelEvidenceFilled(body: string): boolean {
  if (/Claim:\s*Color kernel theme-dark aliases/i.test(body)) return true;
  if (/Portal chrome:\s*theme v\d/i.test(body) && /Glossary chips:/i.test(body)) return true;
  return false;
}

/** Soft: kernel paths changed but Color Kernel Evidence still empty/template. */
export function shouldWarnColorKernelEvidence(
  body: string,
  changedFiles: readonly string[]
): boolean {
  if (!touchesColorKernel(changedFiles)) return false;
  return !colorKernelEvidenceFilled(body);
}
