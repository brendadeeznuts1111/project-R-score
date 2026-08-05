import type { AccountingDodIngestDeps } from '../dod/telegram-accounting-ingest.ts';

/** Shared ops bot types (avoid circular imports). */
export interface BotConfig {
  token: string;
  dbPath: string;
  /** Test / lane overrides for Accounting photo → DOD ingest. */
  accountingIngest?: Partial<
    Pick<
      AccountingDodIngestDeps,
      | 'forumsMetaDir'
      | 'houseMetaDir'
      | 'accountingChatId'
      | 'evidenceRoot'
      | 'registryPath'
      | 'downloadFile'
      | 'processSubmission'
      | 'skipMediaRecord'
    >
  >;
}

export interface TreeNode {
  id: string; // brand-ok
  type: 'partner' | 'agent' | 'sub_agent';
  parent_id: string | null; // brand-ok
  expert_id: string | null; // brand-ok
  name: string;
  telegram_id: string; // brand-ok
  call_sign?: string | null;
}
