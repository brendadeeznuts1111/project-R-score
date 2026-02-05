/**
 * @fileoverview Matching Module
 * @description Fuzzy matching algorithms for cross-bookmaker name resolution
 * @module orca/matching
 */

export {
	expandAbbreviations,
	type FuzzyMatchResult,
	fuzzyMatch,
	fuzzyMatchTop,
	isSameEntity,
	jaroSimilarity,
	jaroWinklerSimilarity,
	levenshteinDistance,
	levenshteinSimilarity,
	tokenize,
	tokenSimilarity,
} from "./fuzzy";
