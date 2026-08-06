/** Repository-governed GitHub issue audit and label-sync planning. */

import {
  GITHUB_ISSUE_DIMENSIONS,
  GITHUB_ISSUE_LABELS,
  GITHUB_ISSUE_REQUIRED_DIMENSIONS,
  labelsForGithubIssueSpine,
  type GithubIssueLabelDefinition,
} from '../config/github-issue-taxonomy.ts';
import type {
  GithubProviderIssue,
  GithubProviderLabel,
  ParsedGithubProviderIssue,
} from './github-issue-tooling-wire.ts';

export type GithubIssueAuditSeverity = 'error' | 'warning';

export type GithubIssueAuditFinding = {
  readonly issueNumber: number;
  readonly severity: GithubIssueAuditSeverity;
  readonly code: string;
  readonly message: string;
};

export type GithubIssueAuditReport = {
  readonly kind: 'github-issue-audit';
  readonly ok: boolean;
  readonly issues: number;
  readonly findings: readonly GithubIssueAuditFinding[];
};

const TITLE_LANE_PLANES = {
  DOMAIN: ['domain'],
  GOVERNANCE: ['governance'],
  HARNESS: ['local', 'governance'],
  TOOLING: ['local'],
  REGISTRY: ['public'],
  PORTAL: ['portal'],
} as const;

function finding(
  issueNumber: number,
  severity: GithubIssueAuditSeverity,
  code: string,
  message: string
): GithubIssueAuditFinding {
  return { issueNumber, severity, code, message };
}

function auditTitle(parsed: ParsedGithubProviderIssue): GithubIssueAuditFinding[] {
  const match = /^\[(P[0-2])\]\[([A-Z-]+)\]/.exec(parsed.provider.title);
  if (!match) {
    return [
      finding(
        parsed.provider.number,
        'error',
        'title-prefix',
        'title must start with [P0|P1|P2][DOMAIN|GOVERNANCE|HARNESS|TOOLING|REGISTRY|PORTAL]'
      ),
    ];
  }
  const out: GithubIssueAuditFinding[] = [];
  if (match[1]!.toLowerCase() !== parsed.spine.priority) {
    out.push(
      finding(
        parsed.provider.number,
        'error',
        'title-priority-drift',
        `title ${match[1]!.toLowerCase()} disagrees with spine ${parsed.spine.priority}`
      )
    );
  }
  const allowed = TITLE_LANE_PLANES[match[2]! as keyof typeof TITLE_LANE_PLANES];
  if (!allowed || !(allowed as readonly string[]).includes(parsed.spine.plane)) {
    out.push(
      finding(
        parsed.provider.number,
        'error',
        'title-plane-drift',
        `title lane ${match[2]} is incompatible with spine plane ${parsed.spine.plane}`
      )
    );
  }
  return out;
}

function auditLabels(parsed: ParsedGithubProviderIssue): GithubIssueAuditFinding[] {
  const out: GithubIssueAuditFinding[] = [];
  const observed = new Set(parsed.provider.labelNames);
  const known = new Map(GITHUB_ISSUE_LABELS.map(label => [label.githubName, label]));
  for (const expected of labelsForGithubIssueSpine(parsed.spine)) {
    if (!observed.has(expected.githubName)) {
      out.push(
        finding(
          parsed.provider.number,
          'error',
          'missing-label',
          `missing required ${expected.dimension} label ${expected.githubName}`
        )
      );
    }
  }
  for (const name of observed) {
    const definition = known.get(name);
    if (!definition) {
      out.push(
        finding(parsed.provider.number, 'warning', 'unknown-label', `unknown label ${name}`)
      );
      continue;
    }
    if (
      GITHUB_ISSUE_REQUIRED_DIMENSIONS.includes(
        definition.dimension as (typeof GITHUB_ISSUE_REQUIRED_DIMENSIONS)[number]
      ) &&
      !labelsForGithubIssueSpine(parsed.spine).some(expected => expected.key === definition.key)
    ) {
      out.push(
        finding(
          parsed.provider.number,
          'error',
          'conflicting-label',
          `${definition.githubName} conflicts with spine ${definition.dimension}`
        )
      );
    }
  }
  return out;
}

export function auditParsedGithubIssues(
  parsedIssues: readonly ParsedGithubProviderIssue[],
  boundaryFindings: readonly GithubIssueAuditFinding[] = []
): GithubIssueAuditReport {
  const findings = [
    ...boundaryFindings,
    ...parsedIssues.flatMap(parsed => [...auditTitle(parsed), ...auditLabels(parsed)]),
  ].sort(
    (a, b) =>
      a.issueNumber - b.issueNumber ||
      a.code.localeCompare(b.code) ||
      a.message.localeCompare(b.message)
  );
  return {
    kind: 'github-issue-audit',
    ok: !findings.some(row => row.severity === 'error'),
    issues: parsedIssues.length + new Set(boundaryFindings.map(row => row.issueNumber)).size,
    findings,
  };
}

export function boundaryFindingForGithubIssue(
  issue: GithubProviderIssue,
  error: Error
): GithubIssueAuditFinding {
  return finding(issue.number, 'error', 'invalid-spine', error.message);
}

export type GithubLabelMutation = {
  readonly action: 'create' | 'update';
  readonly name: string; // brand-ok — GitHub provider mutation target
  readonly before?: { readonly description: string; readonly color: string };
  readonly after: { readonly description: string; readonly color: string };
};

function providerProjection(definition: GithubIssueLabelDefinition) {
  return {
    description: definition.githubDescription,
    color: definition.githubColor.toLowerCase(),
  };
}

export function buildGithubLabelSyncPlan(
  remote: readonly GithubProviderLabel[]
): readonly GithubLabelMutation[] {
  const byName = new Map(remote.map(label => [label.name, label]));
  return [...GITHUB_ISSUE_LABELS]
    .sort((a, b) => a.githubName.localeCompare(b.githubName))
    .flatMap(definition => {
      const after = providerProjection(definition);
      const current = byName.get(definition.githubName);
      if (!current) return [{ action: 'create' as const, name: definition.githubName, after }];
      const before = { description: current.description, color: current.color.toLowerCase() };
      if (before.description === after.description && before.color === after.color) return [];
      return [{ action: 'update' as const, name: definition.githubName, before, after }];
    });
}

export function formatGithubIssueAudit(report: GithubIssueAuditReport): string {
  const lines = [
    `github-issue-audit · ${report.ok ? 'ok' : 'failed'} · ${report.issues} issues · ${report.findings.length} findings`,
  ];
  for (const row of report.findings) {
    lines.push(`#${row.issueNumber} ${row.severity.toUpperCase()} ${row.code} · ${row.message}`);
  }
  return lines.join('\n');
}

export function formatGithubLabelSyncPlan(plan: readonly GithubLabelMutation[]): string {
  const lines = [`github-label-sync · ${plan.length} mutation(s)`];
  for (const row of plan) {
    lines.push(
      `${row.action.toUpperCase()} ${row.name} · ${row.after.color} · ${row.after.description}`
    );
  }
  return lines.join('\n');
}
