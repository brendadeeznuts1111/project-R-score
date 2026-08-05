export {
  appendDodRegistry,
  averageHash,
  buildDodEvidencePackage,
  decodePngRgba,
  dodEvidenceToJson,
  DOD_KINDS,
  findSimilarInRegistry,
  hammingDistance,
  isDodEvidencePackage,
  parseDodEvidencePackage,
  signDodPayload,
  storePreviewWebp,
  verifyDodEvidence,
  type BuildDodEvidenceOpts,
  type DodCheck,
  type DodEvidencePackage,
  type DodKind,
  type DodRegistryEntry,
  type DodVerifyResult,
} from './evidence.ts';

export {
  DODVerifier,
  decryptAesGcm,
  encryptAesGcm,
  extractAmount,
  localEvidenceStore,
  lookupExpectedStake,
  r2EvidenceStoreFromEnv,
  validateImage,
  type DODEvidenceStore,
  type DODSubmission,
  type DODVerification,
} from './verifier.ts';

export {
  enrichDodEntries,
  enrichDodEntry,
  extractAccountingAmount,
  parseBunImageMetaStrip,
  parseDodQueueEntries,
  telegramMessageDeepLink,
  type DodImageMetaStrip,
  type TelegramMessageLinkInput,
} from './enrich-entry.ts';

export { appendDodMetaNdjson, DEFAULT_DOD_META_NDJSON, type DodMetaLogLine } from './meta-log.ts';

export {
  expectedAmountFromRow,
  formatDodMoney,
  reconcileDodAmounts,
  type DodReconcileResult,
  type DodReconcileStatus,
} from './reconcile.ts';

export {
  extractPartnerCodeHint,
  extractTelegramImageFileId,
  findDodByTelegramMessage,
  ingestAccountingDodPhoto,
  parseDodCaption,
  resolveAccountingForumTarget,
  resolveIngestAgentId,
  type AccountingDodIngestDeps,
  type AccountingDodIngestResult,
  type AccountingForumTarget,
} from './telegram-accounting-ingest.ts';
