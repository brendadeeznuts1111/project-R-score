export interface ControlOverrideOwnershipIssue {
  readonly code:
    | 'schema-contract'
    | 'source-precedence'
    | 'registry-precedence'
    | 'duplicate-control'
    | 'control-drift'
    | 'alias-drift'
    | 'default-not-deny'
    | 'reserved-drift'
    | 'composite-denial-drift'
    | 'duplicate-application-mode'
    | 'missing-owner';
  readonly detail: string;
}
