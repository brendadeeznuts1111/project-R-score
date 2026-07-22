/**
 * Re-export monorepo SSOT — `lib/image-metadata.ts`.
 */
export {
  BUN_IMAGE_DOCS,
  BUN_IMAGE_METADATA_DOCS,
  DEFAULT_IMAGE_DIGEST_ALGORITHM,
  DEFAULT_THUMB_MAX_HEIGHT,
  DEFAULT_THUMB_MAX_WIDTH,
  extractImageEvidenceMeta,
  imageEvidenceHeaders,
  imageMetaChecksPassed,
  resizeScreenshotPng,
  verifyImageEvidenceMeta,
  type ExtractImageMetaOptions,
  type ImageDigestAlgorithm,
  type ImageEvidenceMeta,
  type ImageMetaCheck,
  type ImageMetaExpectations,
  type ResizeScreenshotOptions,
} from "../../../../../lib/image-metadata.ts";
