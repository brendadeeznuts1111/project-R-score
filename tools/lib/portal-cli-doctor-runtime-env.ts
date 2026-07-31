// @see https://bun.com/docs/runtime/environment-variables#configuring-bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * portal-cli doctor — Bun runtime environment group.
 *
 * Raw environment values never enter check messages. In particular,
 * BUN_OPTIONS is reported only as configured/unset.
 */
import {
  BUN_RUNTIME_ENV_NAMES,
  assessBunRuntimeEnv,
  type BunRuntimeEnvAssessment,
  type BunRuntimeEnvIssue,
} from '../../lib/bun-runtime-env.ts';
import type { PortalDoctorCheck } from './portal-cli-doctor.ts';

export const BUN_RUNTIME_ENV_DOC =
  'https://bun.com/docs/runtime/environment-variables#configuring-bun';

function issueNames(issues: BunRuntimeEnvIssue[]): string {
  return issues.map(item => item.name).join(', ');
}

function effectiveSummary(assessment: BunRuntimeEnvAssessment): string {
  const state = assessment.effective;
  return [
    `configured=${assessment.configured.length}/${BUN_RUNTIME_ENV_NAMES.length}`,
    `tls=${state.tlsVerification}`,
    `http=${String(state.maxHttpRequests)}`,
    `fetch=${state.verboseFetch}`,
    `cache=${state.transpilerCache}`,
    `tmp=${state.tempDirectory}`,
    `color=${state.color}`,
    `reload=${state.clearTerminalOnReload}`,
    `crash-reports=${state.crashReports}`,
    `bun-options=${state.bunOptions}`,
  ].join(' · ');
}

export function runRuntimeEnvChecks(
  env: Readonly<Record<string, string | undefined>> = Bun.env
): PortalDoctorCheck[] {
  const assessment = assessBunRuntimeEnv(env);
  const fatal = assessment.issues.filter(item => item.severity === 'fatal');
  const warnings = assessment.issues.filter(item => item.severity === 'warn');

  return [
    {
      id: 'runtime-env-tls-verification',
      level: 'fatal',
      group: 'runtime',
      ok: fatal.length === 0,
      message:
        fatal.length === 0
          ? 'TLS certificate verification is enabled.'
          : `Unsafe runtime control: ${issueNames(fatal)}.`,
      source: BUN_RUNTIME_ENV_DOC,
      impact: 'Disabled certificate verification permits untrusted TLS peers.',
      autoFixable: false,
      timeToFix: fatal.length === 0 ? undefined : '<1 min',
      envScope: 'all',
    },
    {
      id: 'runtime-env-control-values',
      level: 'warn',
      group: 'runtime',
      ok: warnings.length === 0,
      message:
        warnings.length === 0
          ? 'Configured Bun runtime controls use documented values.'
          : `Invalid or ineffective runtime controls: ${issueNames(warnings)}.`,
      source: BUN_RUNTIME_ENV_DOC,
      impact: 'Invalid values can silently leave the runtime at its default behavior.',
      autoFixable: false,
      timeToFix: warnings.length === 0 ? undefined : '<1 min',
      envScope: 'all',
    },
    {
      id: 'runtime-env-effective-state',
      level: 'info',
      group: 'runtime',
      ok: true,
      message: effectiveSummary(assessment),
      source: BUN_RUNTIME_ENV_DOC,
      impact: 'Safe, value-free runtime configuration provenance for operators.',
      autoFixable: false,
      envScope: 'all',
    },
  ];
}
