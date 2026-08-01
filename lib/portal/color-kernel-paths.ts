/**
 * Paths that own theme-dark color-kernel Claim/Evidence (claim color-kernel-theme-aliases).
 * Shared by pre-commit path-gate + soft PR Color Kernel Evidence check.
 */

/** Success paste prefix from `bun run validate:colors` (theme version suffix varies). */
export const COLOR_KERNEL_SUCCESS_CLAIM =
  'Claim: Color kernel theme-dark aliases are complete and conflict-free';

/** Fail paste prefix — authors must not leave a failing run in the PR body. */
export const COLOR_KERNEL_FAIL_CLAIM =
  'Claim: Color kernel theme-dark aliases are inconsistent';

const COLOR_KERNEL_EXACT = new Set([
  'public/portal/theme.jsonc',
  'public/portal/theme-tokens.css',
  'lib/portal/claim-reporter.ts',
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

/** True when body includes a passing `validate:colors` Claim line. */
export function colorKernelEvidenceIndicatesPass(body: string): boolean {
  return new RegExp(
    COLOR_KERNEL_SUCCESS_CLAIM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i'
  ).test(body);
}

/** True when body includes a failing `validate:colors` Claim line. */
export function colorKernelEvidenceIndicatesFail(body: string): boolean {
  return new RegExp(
    COLOR_KERNEL_FAIL_CLAIM.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i'
  ).test(body);
}

/**
 * True when the PR body includes a real successful `validate:colors` paste.
 * Soft gate only — never fail-closed by itself.
 */
export function colorKernelEvidenceFilled(body: string): boolean {
  if (colorKernelEvidenceIndicatesFail(body)) return false;
  if (colorKernelEvidenceIndicatesPass(body)) return true;
  // Plane lines without Claim still count as a paste attempt (legacy soft fill).
  if (/Portal chrome:\s*theme v\d/i.test(body) && /Glossary chips:/i.test(body)) return true;
  return false;
}

export type ColorKernelEvidenceSoft = {
  /** Kernel owners in the change set. */
  touches: boolean;
  /** Soft: need a success paste (or at least plane evidence). */
  missingPaste: boolean;
  /** Soft: body contains an inconsistent/fail Claim line. */
  failingPaste: boolean;
};

/** Soft Color Kernel Evidence assessment for check-pr-claim. */
export function assessColorKernelEvidenceSoft(
  body: string,
  changedFiles: readonly string[]
): ColorKernelEvidenceSoft {
  const touches = touchesColorKernel(changedFiles);
  const failingPaste = colorKernelEvidenceIndicatesFail(body);
  const missingPaste = touches && !colorKernelEvidenceFilled(body);
  return { touches, missingPaste, failingPaste };
}

/** Soft: warn when paste missing (on touch) or when a fail Claim is pasted. */
export function shouldWarnColorKernelEvidence(
  body: string,
  changedFiles: readonly string[]
): boolean {
  const soft = assessColorKernelEvidenceSoft(body, changedFiles);
  return soft.missingPaste || soft.failingPaste;
}
