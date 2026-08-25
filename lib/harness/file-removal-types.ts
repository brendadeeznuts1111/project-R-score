export const FILE_REMOVAL_SCHEMA_VERSION = 1 as const;
export const FILE_REMOVAL_VERIFICATION_COMMANDS = [
  'bun run channels:bun-1.4:check',
  'bun run channels:projects:check',
  'bun run docs:blog-assets:check',
  'bun run test:rss:native',
  'bun run verify:portal:static',
  'bun run public:discover:check',
  'bun run check:monorepo-health',
] as const;

export type RemovalVerdict = 'protected' | 'retain' | 'review' | 'safe-review' | 'very-safe-review';

export type RemovalAction =
  'retain' | 'split' | 'deduplicate' | 'wire-or-remove' | 'verify-generator';

export type Addressability =
  'public-referenced' | 'public-unreferenced' | 'internal-referenced' | 'unreferenced';

export type FileInventoryRow = {
  path: string;
  bytes: number;
  lines: number | null;
  sha256: string;
  tracked: boolean;
  dirty: boolean;
  gitMode: string | null;
  source: boolean;
  text: boolean;
  generated: boolean;
  publicUrl: string | null;
  inboundReferences: string[];
  importedBy: string[];
  duplicatePaths: string[];
  canonicalDuplicate: string | null;
};

export type FileRemovalCandidate = FileInventoryRow & {
  largeByLines: boolean;
  largeByBytes: boolean;
  addressability: Addressability;
  verdict: RemovalVerdict;
  action: RemovalAction;
  removalConfidence: number;
  reclaimableBytes: number;
  reasons: string[];
  blockers: string[];
};

export type DuplicateGroup = {
  sha256: string;
  bytesEach: number;
  canonicalPath: string;
  paths: string[];
  reclaimableBytes: number;
};

export type FileRemovalReport = {
  schemaVersion: typeof FILE_REMOVAL_SCHEMA_VERSION;
  generatedAt: string;
  bunVersion: string;
  root: string;
  policy: {
    advisoryOnly: true;
    autoDeleteAllowed: false;
    largeLineThreshold: number;
    largeByteThreshold: number;
    duplicateByteThreshold: number;
    verificationCommands: readonly string[];
  };
  summary: {
    filesScanned: number;
    candidates: number;
    largeByLines: number;
    largeByBytes: number;
    duplicateGroups: number;
    exactDuplicateBytes: number;
    safeReviewDuplicateBytes: number;
    byVerdict: Record<RemovalVerdict, number>;
    byAction: Record<RemovalAction, number>;
  };
  duplicateGroups: DuplicateGroup[];
  candidates: FileRemovalCandidate[];
};

export type FileRemovalOptions = {
  largeLineThreshold: number;
  largeByteThreshold: number;
  duplicateByteThreshold: number;
};

export function fileRemovalPolicy(options: FileRemovalOptions): FileRemovalReport['policy'] {
  return {
    advisoryOnly: true,
    autoDeleteAllowed: false,
    ...options,
    verificationCommands: FILE_REMOVAL_VERIFICATION_COMMANDS,
  };
}
