// lib/har-analyzer/index.ts — Public API barrel file for HAR analyzer

export {
  type CapturedEntry,
  type HARProtocolDetection,
  type HAREntry,
  inferHttpVersion,
  analyzeProtocolFromHAR,
  createHARServer,
} from './bun-serve-types';

export type {
  FragmentType,
  TTFBGrade,
  SizeGrade,
  CacheType,
  DomainType,
  AssetGroup,
  FragmentBehavior,
  FragmentContent,
  FragmentAnalysis,
  ParsedURL,
  TimingBreakdown,
  DerivedMetrics,
  RelationalContext,
  HARContext,
} from './types';

export { analyzeFragment } from './fragment-analyzer';
export { parseURL, MIME_MAP } from './url-parser';

export {
  DocumentationProvider,
  DocumentationCategory,
  UrlType,
  PERFORMANCE_THRESHOLDS,
  DocumentationMapper,
  classifyDomain,
  classifyAssetGroup,
  gradeTTFB,
  gradeSize,
} from './domain-mapper';
