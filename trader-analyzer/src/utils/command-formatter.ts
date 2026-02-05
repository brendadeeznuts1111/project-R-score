/**
 * @fileoverview Command Formatter
 * @description Format command output using BunUtilities
 * @module utils/command-formatter
 */

import { BunUtilities } from './bun-utilities';

/**
 * Command Formatter
 * 
 * Formats command output with progress bars, tables, and colors.
 */
export class CommandFormatter {
	/**
	 * Format command help with table
	 */
	static formatHelp(commands: Array<{
		name: string;
		description: string;
		usage: string;
		options?: string[];
	}>): string {
		const tableData = commands.map(cmd => ({
			Command: cmd.name,
			Description: BunUtilities.truncate(cmd.description, 50, { preserveWords: true }),
			Usage: cmd.usage,
			Options: cmd.options?.join(', ') || '-'
		}));

		return BunUtilities.formatTable(tableData);
	}

	/**
	 * Format command execution progress
	 */
	static formatProgress(
		current: number,
		total: number,
		label: string,
		options: {
			color?: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan';
			showNumbers?: boolean;
		} = {}
	): string {
		const bar = BunUtilities.createProgressBar(current, total, 40, {
			color: options.color || 'cyan',
			showNumbers: options.showNumbers !== false,
			showPercentage: true
		});

		return `${label}\n${bar}`;
	}

	/**
	 * Format command results as table
	 */
	static formatResults<T extends Record<string, unknown>>(
		results: T[],
		columns?: string[]
	): string {
		return BunUtilities.formatTable(results, columns);
	}

	/**
	 * Format error message with color
	 */
	static formatError(message: string, details?: string): string {
		const errorColor = '\x1b[31m';
		const reset = '\x1b[0m';
		
		let output = `${errorColor}Error: ${message}${reset}`;
		if (details) {
			output += `\n${errorColor}Details: ${details}${reset}`;
		}
		
		return output;
	}

	/**
	 * Format success message with color
	 */
	static formatSuccess(message: string): string {
		const successColor = '\x1b[32m';
		const reset = '\x1b[0m';
		return `${successColor}✓ ${message}${reset}`;
	}
}
