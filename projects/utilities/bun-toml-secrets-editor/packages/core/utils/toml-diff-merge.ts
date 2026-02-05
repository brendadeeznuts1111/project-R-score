// utils/toml-diff-merge.ts
// Configuration diff and merge utilities for TOML files
import { readFileSync, writeFileSync } from "node:fs";
import { isEmpty, setNestedValue } from "./common";
import { parseTomlString, stringifyToml } from "./toml-utils";

export interface DiffResult {
	added: string[];
	removed: string[];
	modified: DiffChange[];
	unchanged: string[];
}

export interface DiffChange {
	path: string;
	oldValue: any;
	newValue: any;
	type: "value" | "structure";
}

export interface MergeOptions {
	strategy: "ours" | "theirs" | "manual" | "auto";
	backup?: boolean;
	conflictResolution?: "keep-ours" | "keep-theirs" | "merge";
}

export interface MergeResult {
	success: boolean;
	merged: any;
	conflicts: MergeConflict[];
	warnings: string[];
}

export interface MergeConflict {
	path: string;
	ours: any;
	theirs: any;
	base?: any;
	resolution?: "ours" | "theirs" | "merged";
}

export class TomlDiffMerge {
	/**
	 * Compare two TOML configurations and return differences
	 */
	diff(config1: any, config2: any, basePath: string = ""): DiffResult {
		const result: DiffResult = {
			added: [],
			removed: [],
			modified: [],
			unchanged: [],
		};

		const keys1 = new Set(Object.keys(config1));
		const keys2 = new Set(Object.keys(config2));

		// Find added keys
		for (const key of keys2) {
			if (!keys1.has(key)) {
				const fullPath = basePath ? `${basePath}.${key}` : key;
				result.added.push(fullPath);
			}
		}

		// Find removed keys
		for (const key of keys1) {
			if (!keys2.has(key)) {
				const fullPath = basePath ? `${basePath}.${key}` : key;
				result.removed.push(fullPath);
			}
		}

		// Find common keys and compare values
		for (const key of keys1) {
			if (keys2.has(key)) {
				const fullPath = basePath ? `${basePath}.${key}` : key;
				const val1 = config1[key];
				const val2 = config2[key];

				if (typeof val1 !== typeof val2) {
					result.modified.push({
						path: fullPath,
						oldValue: val1,
						newValue: val2,
						type: "structure",
					});
				} else if (
					typeof val1 === "object" &&
					val1 !== null &&
					!Array.isArray(val1)
				) {
					// Recursively diff nested objects
					const nestedDiff = this.diff(val1, val2, fullPath);
					result.added.push(...nestedDiff.added);
					result.removed.push(...nestedDiff.removed);
					result.modified.push(...nestedDiff.modified);
					result.unchanged.push(...nestedDiff.unchanged);
				} else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
					result.modified.push({
						path: fullPath,
						oldValue: val1,
						newValue: val2,
						type: "value",
					});
				} else {
					result.unchanged.push(fullPath);
				}
			}
		}

		return result;
	}

	/**
	 * Generate a human-readable diff report
	 */
	generateDiffReport(diff: DiffResult): string {
		const lines: string[] = [];

		lines.push("📊 TOML Configuration Diff Report");
		lines.push("=====================================");
		lines.push(`✅ Unchanged: ${diff.unchanged.length} items`);
		lines.push(`➕ Added: ${diff.added.length} items`);
		lines.push(`➖ Removed: ${diff.removed.length} items`);
		lines.push(`🔄 Modified: ${diff.modified.length} items`);
		lines.push("");

		if (diff.added.length > 0) {
			lines.push("➕ ADDED:");
			diff.added.forEach((path) => lines.push(`   + ${path}`));
			lines.push("");
		}

		if (diff.removed.length > 0) {
			lines.push("➖ REMOVED:");
			diff.removed.forEach((path) => lines.push(`   - ${path}`));
			lines.push("");
		}

		if (diff.modified.length > 0) {
			lines.push("🔄 MODIFIED:");
			diff.modified.forEach((change) => {
				lines.push(`   ~ ${change.path}`);
				lines.push(`     Old: ${JSON.stringify(change.oldValue)}`);
				lines.push(`     New: ${JSON.stringify(change.newValue)}`);
				lines.push("");
			});
		}

		return lines.join("\n");
	}

	/**
	 * Merge two TOML configurations with three-way merge
	 */
	threeWayMerge(
		base: any,
		ours: any,
		theirs: any,
		options: MergeOptions = { strategy: "auto" },
	): MergeResult {
		const conflicts: MergeConflict[] = [];
		const warnings: string[] = [];
		const merged = JSON.parse(JSON.stringify(base)); // Deep copy

		// Get all keys from all versions
		const allKeys = new Set([
			...Object.keys(base),
			...Object.keys(ours),
			...Object.keys(theirs),
		]);

		for (const key of allKeys) {
			const baseVal = base[key];
			const ourVal = ours[key];
			const theirVal = theirs[key];

			// Key exists in all versions
			if (
				baseVal !== undefined &&
				ourVal !== undefined &&
				theirVal !== undefined
			) {
				const mergeResult = this.mergeValues(
					baseVal,
					ourVal,
					theirVal,
					key,
					options,
				);

				if (mergeResult.conflict) {
					conflicts.push(mergeResult.conflict);
				}

				if (mergeResult.value !== undefined) {
					merged[key] = mergeResult.value;
				}

				warnings.push(...mergeResult.warnings);
			}
			// Key added in ours only
			else if (
				baseVal === undefined &&
				ourVal !== undefined &&
				theirVal === undefined
			) {
				merged[key] = ourVal;
			}
			// Key added in theirs only
			else if (
				baseVal === undefined &&
				ourVal === undefined &&
				theirVal !== undefined
			) {
				merged[key] = theirVal;
			}
			// Key added in both ours and theirs (conflict)
			else if (
				baseVal === undefined &&
				ourVal !== undefined &&
				theirVal !== undefined
			) {
				if (JSON.stringify(ourVal) === JSON.stringify(theirVal)) {
					merged[key] = ourVal;
				} else {
					conflicts.push({
						path: key,
						ours: ourVal,
						theirs: theirVal,
						base: undefined,
					});
				}
			}
			// Key removed in ours
			else if (
				baseVal !== undefined &&
				ourVal === undefined &&
				theirVal !== undefined
			) {
				if (JSON.stringify(baseVal) === JSON.stringify(theirVal)) {
					delete merged[key];
				} else {
					conflicts.push({
						path: key,
						ours: undefined,
						theirs: theirVal,
						base: baseVal,
					});
				}
			}
			// Key removed in theirs
			else if (
				baseVal !== undefined &&
				ourVal !== undefined &&
				theirVal === undefined
			) {
				if (JSON.stringify(baseVal) === JSON.stringify(ourVal)) {
					delete merged[key];
				} else {
					conflicts.push({
						path: key,
						ours: ourVal,
						theirs: undefined,
						base: baseVal,
					});
				}
			}
			// Key removed in both
			else if (
				baseVal !== undefined &&
				ourVal === undefined &&
				theirVal === undefined
			) {
				delete merged[key];
			}
		}

		return {
			success: conflicts.length === 0,
			merged,
			conflicts,
			warnings,
		};
	}

	/**
	 * Merge individual values with conflict detection
	 */
	private mergeValues(
		base: any,
		ours: any,
		theirs: any,
		path: string,
		options: MergeOptions,
	): { value?: any; conflict?: MergeConflict; warnings: string[] } {
		const warnings: string[] = [];

		// All values are the same
		if (JSON.stringify(ours) === JSON.stringify(theirs)) {
			return { value: ours, warnings };
		}

		// One side matches base, other has changes
		if (JSON.stringify(ours) === JSON.stringify(base)) {
			return { value: theirs, warnings };
		}
		if (JSON.stringify(theirs) === JSON.stringify(base)) {
			return { value: ours, warnings };
		}

		// Both have different changes - potential conflict
		if (
			typeof ours === "object" &&
			typeof theirs === "object" &&
			ours !== null &&
			theirs !== null &&
			!Array.isArray(ours) &&
			!Array.isArray(theirs)
		) {
			// Recursively merge objects
			const nestedMerge = this.threeWayMerge(base, ours, theirs, options);
			if (nestedMerge.conflicts.length > 0) {
				return {
					conflict: {
						path,
						ours,
						theirs,
						base,
					},
					warnings: warnings.concat(nestedMerge.warnings),
				};
			}
			return {
				value: nestedMerge.merged,
				warnings: warnings.concat(nestedMerge.warnings),
			};
		}

		// Simple conflict - create conflict object
		return {
			conflict: {
				path,
				ours,
				theirs,
				base,
			},
			warnings,
		};
	}

	/**
	 * Auto-resolve conflicts using heuristics
	 */
	autoResolveConflicts(conflicts: MergeConflict[]): MergeConflict[] {
		return conflicts.map((conflict) => {
			// If one side is null/undefined, prefer the non-null value
			if (conflict.ours === undefined && conflict.theirs !== undefined) {
				return { ...conflict, resolution: "theirs" };
			}
			if (conflict.theirs === undefined && conflict.ours !== undefined) {
				return { ...conflict, resolution: "ours" };
			}

			// If one side is empty and other has content, prefer content
			if (this.isEmpty(conflict.ours) && !this.isEmpty(conflict.theirs)) {
				return { ...conflict, resolution: "theirs" };
			}
			if (this.isEmpty(conflict.theirs) && !this.isEmpty(conflict.ours)) {
				return { ...conflict, resolution: "ours" };
			}

			// For numeric values, prefer the higher value (might be newer)
			if (
				typeof conflict.ours === "number" &&
				typeof conflict.theirs === "number"
			) {
				return {
					...conflict,
					resolution: conflict.ours > conflict.theirs ? "ours" : "theirs",
				};
			}

			// For arrays, try to merge them
			if (Array.isArray(conflict.ours) && Array.isArray(conflict.theirs)) {
				const _merged = [...new Set([...conflict.ours, ...conflict.theirs])];
				return { ...conflict, resolution: "merged" as const };
			}

			// Default: leave unresolved
			return conflict;
		});
	}

	/**
	 * Check if a value is effectively empty
	 */
	private isEmpty(value: any): boolean {
		return isEmpty(value);
	}

	/**
	 * Apply resolved conflicts to merge result
	 */
	applyConflictResolution(
		mergeResult: MergeResult,
		resolutions: { [path: string]: "ours" | "theirs" | "merged" },
	): MergeResult {
		const resolvedConflicts: MergeConflict[] = [];
		const warnings: string[] = [...mergeResult.warnings];

		for (const conflict of mergeResult.conflicts) {
			const resolution = resolutions[conflict.path];

			if (resolution) {
				conflict.resolution = resolution;

				// Apply the resolution to the merged result
				if (resolution === "ours") {
					this.setNestedValue(mergeResult.merged, conflict.path, conflict.ours);
				} else if (resolution === "theirs") {
					this.setNestedValue(
						mergeResult.merged,
						conflict.path,
						conflict.theirs,
					);
				}
				// 'merged' resolution means we keep the current merged value
			} else {
				resolvedConflicts.push(conflict);
				warnings.push(`Unresolved conflict at ${conflict.path}`);
			}
		}

		return {
			...mergeResult,
			conflicts: resolvedConflicts,
			success: resolvedConflicts.length === 0,
			warnings,
		};
	}

	/**
	 * Set nested value using dot notation path
	 */
	private setNestedValue(obj: any, path: string, value: any): void {
		setNestedValue(obj, path, value);
	}

	/**
	 * Compare two TOML files and generate diff
	 */
	diffFiles(file1Path: string, file2Path: string): DiffResult {
		const content1 = readFileSync(file1Path, "utf-8");
		const content2 = readFileSync(file2Path, "utf-8");

		const config1 = parseTomlString(content1);
		const config2 = parseTomlString(content2);

		return this.diff(config1, config2);
	}

	/**
	 * Merge two TOML files with optional base file
	 */
	mergeFiles(
		outputPath: string,
		file1Path: string,
		file2Path: string,
		basePath?: string,
		options: MergeOptions = { strategy: "auto" },
	): MergeResult {
		const content1 = readFileSync(file1Path, "utf-8");
		const content2 = readFileSync(file2Path, "utf-8");

		const config1 = parseTomlString(content1);
		const config2 = parseTomlString(content2);

		let base = {};
		if (basePath) {
			const baseContent = readFileSync(basePath, "utf-8");
			base = parseTomlString(baseContent);
		}

		const mergeResult = this.threeWayMerge(base, config1, config2, options);

		// Auto-resolve conflicts if strategy is auto
		if (options.strategy === "auto" && mergeResult.conflicts.length > 0) {
			const resolvedConflicts = this.autoResolveConflicts(
				mergeResult.conflicts,
			);
			const resolutions: { [path: string]: "ours" | "theirs" | "merged" } = {};

			resolvedConflicts.forEach((conflict) => {
				if (conflict.resolution) {
					resolutions[conflict.path] = conflict.resolution;
				}
			});

			const finalResult = this.applyConflictResolution(
				mergeResult,
				resolutions,
			);

			// Write merged result if successful
			if (finalResult.success) {
				const mergedContent = stringifyToml(finalResult.merged);
				writeFileSync(outputPath, mergedContent);
			}

			return finalResult;
		}

		// Write merged result if no conflicts
		if (mergeResult.success) {
			const mergedContent = stringifyToml(mergeResult.merged);
			writeFileSync(outputPath, mergedContent);
		}

		return mergeResult;
	}
}
