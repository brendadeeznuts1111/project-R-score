/**
 * @fileoverview Array Inspection Utilities
 * @description Array formatting and comparison utilities
 * @module utils/array-inspection
 */

/**
 * Array Inspector
 * 
 * Provides utilities for formatting and comparing arrays.
 */
export class ArrayInspector {
	/**
	 * Format array with custom formatting
	 */
	static formatArray<T>(arr: T[], options: {
		maxItems?: number;
		separator?: string;
		formatter?: (item: T) => string;
	} = {}): string {
		const {
			maxItems = 10,
			separator = ', ',
			formatter = (item) => String(item)
		} = options;

		if (arr.length === 0) return '[]';

		const items = arr.slice(0, maxItems).map(formatter);
		const remaining = arr.length > maxItems ? ` ... and ${arr.length - maxItems} more` : '';

		return `[${items.join(separator)}${remaining}]`;
	}

	/**
	 * Compare two arrays
	 */
	static compareArrays<T>(arr1: T[], arr2: T[]): {
		equal: boolean;
		onlyInFirst: T[];
		onlyInSecond: T[];
		common: T[];
	} {
		const set1 = new Set(arr1);
		const set2 = new Set(arr2);

		const onlyInFirst = arr1.filter(item => !set2.has(item));
		const onlyInSecond = arr2.filter(item => !set1.has(item));
		const common = arr1.filter(item => set2.has(item));

		return {
			equal: onlyInFirst.length === 0 && onlyInSecond.length === 0,
			onlyInFirst,
			onlyInSecond,
			common
		};
	}

	/**
	 * Format typed array
	 */
	static formatTypedArray(arr: ArrayLike<number>, options: {
		maxItems?: number;
		precision?: number;
	} = {}): string {
		const {
			maxItems = 10,
			precision = 2
		} = options;

		const items: number[] = [];
		for (let i = 0; i < Math.min(arr.length, maxItems); i++) {
			items.push(arr[i]);
		}

		const formatted = items.map(n => n.toFixed(precision));
		const remaining = arr.length > maxItems ? ` ... and ${arr.length - maxItems} more` : '';

		return `[${formatted.join(', ')}${remaining}]`;
	}
}
