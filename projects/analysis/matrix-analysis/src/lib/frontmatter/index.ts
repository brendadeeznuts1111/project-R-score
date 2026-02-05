/**
 * Frontmatter extraction, normalization, validation, batch processing, and HTML injection
 */

export {
	type BatchEntry,
	type BatchOptions,
	type BatchResult,
	batchExtractFrontmatter,
	generateIndex,
	writeIndex,
} from "./batch";
export {
	extractFrontmatter,
	type FrontmatterFormat,
	type FrontmatterResult,
} from "./extractor";
export {
	generateHeadTags,
	type InjectionMode,
	type InjectOptions,
	injectIntoHtml,
} from "./inject";
export { type NormalizationOptions, normalizeFrontmatter } from "./normalizer";
export {
	type FieldRule,
	type FieldType,
	type FrontmatterSchema,
	type ValidationError,
	type ValidationResult,
	validateFrontmatter,
} from "./validator";
