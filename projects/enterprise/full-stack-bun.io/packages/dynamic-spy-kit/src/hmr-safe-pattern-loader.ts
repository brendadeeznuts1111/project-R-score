/**
 * @dynamic-spy/kit v9.0 - HMR Safe Pattern Loader
 * 
 * Production-ready HMR error handling with Bun 1.1 event.message fallback
 * Zero silent failures - Clear error overlay with auto-retry
 */

import { AIPatternLoader } from './ai-pattern-loader';
import type { URLPatternInit } from './core/urlpattern-spy';

export interface HMRError {
	file: string;
	error: string;
	line?: number;
	column?: number;
	timestamp: string;
	fixed: boolean;
	retryCount: number;
}

export interface HMRStats {
	hmrUpdates: number;
	hmrErrors: number;
	errorRecovery: string;
	recentErrors: HMRError[];
	autoRetrySuccess: string;
	lastUpdate: string;
}

export class HMRSafePatternLoader {
	private static errorHistory: HMRError[] = [];
	private static updateCount: number = 0;
	private static errorCount: number = 0;
	private static retrySuccessCount: number = 0;
	private static readonly MAX_ERROR_HISTORY = 50;

	/**
	 * Load patterns with Bun 1.1 error handling (event.message fallback)
	 * Zero silent failures - Clear error overlay
	 */
	static async loadPatterns(file: string): Promise<URLPatternInit[]> {
		try {
			const patternFile = Bun.file(file);
			if (!(await patternFile.exists())) {
				throw new Error(`File not found: ${file}`);
			}

			// Try to parse JSON (handles syntax errors)
			let rawContent: string;
			let patterns: any[];
			
			try {
				rawContent = await patternFile.text();
				patterns = JSON.parse(rawContent);
			} catch (jsonError: any) {
				// ✅ Bun 1.1: Use event.message instead of event.error (which can be null)
				const errorMessage = jsonError.message || jsonError.toString() || 'Unknown JSON error';
				
				// Extract line/column if available
				const lineMatch = errorMessage.match(/line (\d+)/i);
				const columnMatch = errorMessage.match(/column (\d+)/i);
				
				const hmrError: HMRError = {
					file,
					error: errorMessage,
					line: lineMatch ? parseInt(lineMatch[1]) : undefined,
					column: columnMatch ? parseInt(columnMatch[1]) : undefined,
					timestamp: new Date().toISOString(),
					fixed: false,
					retryCount: 0
				};

				this.recordError(hmrError);
				this.logHMRError(hmrError, rawContent);
				
				// Auto-suggest fix
				this.suggestFix(errorMessage, file);
				
				throw jsonError; // Re-throw for caller handling
			}

			if (!Array.isArray(patterns)) {
				throw new Error(`${file} must be an array of patterns`);
			}

			// Validate patterns with all URLPattern properties
			const validPatterns: any[] = [];
			const invalidPatterns: string[] = [];

			// URLPattern property types
			const URLPatternProperties = {
				protocol: 'string',
				username: 'string',
				password: 'string',
				hostname: 'string',
				port: 'string',
				pathname: 'string',
				search: 'string',
				hash: 'string'
			} as const;

			for (let i = 0; i < patterns.length; i++) {
				const pattern = patterns[i];
				
				if (!pattern || typeof pattern !== 'object') {
					invalidPatterns.push(`Pattern ${i}: Invalid object`);
					continue;
				}

				// Validate required properties (pathname is required)
				if (!pattern.pathname || typeof pattern.pathname !== 'string') {
					const errorMsg = `Pattern ${pattern.id || `index ${i}`}: missing or invalid pathname (required)`;
					invalidPatterns.push(errorMsg);
					
					const hmrError: HMRError = {
						file,
						error: errorMsg,
						line: i + 2,
						timestamp: new Date().toISOString(),
						fixed: false,
						retryCount: 0
					};
					this.recordError(hmrError);
					continue;
				}

				// Validate optional URLPattern properties
				const propertyErrors: string[] = [];
				
				// Check each URLPattern property
				for (const [prop, expectedType] of Object.entries(URLPatternProperties)) {
					if (pattern[prop] !== undefined && typeof pattern[prop] !== expectedType) {
						propertyErrors.push(`${prop} must be ${expectedType}, got ${typeof pattern[prop]}`);
					}
				}

				if (propertyErrors.length > 0) {
					const errorMsg = `Pattern ${pattern.id || `index ${i}`}: Invalid properties - ${propertyErrors.join(', ')}`;
					invalidPatterns.push(errorMsg);
					continue;
				}

				// Validate hostname (recommended but not required)
				if (pattern.hostname && typeof pattern.hostname !== 'string') {
					invalidPatterns.push(`Pattern ${pattern.id || `index ${i}`}: hostname must be string`);
					continue;
				}

				// Pattern is valid - add to validPatterns
				validPatterns.push(pattern);
			}

			if (invalidPatterns.length > 0) {
				console.warn(`⚠️  HMR: ${invalidPatterns.length} invalid pattern(s) in ${file}:`);
				invalidPatterns.forEach(msg => console.warn(`   - ${msg}`));
			}

			if (validPatterns.length === 0) {
				throw new Error(`No valid patterns in ${file}`);
			}

			// Convert to URLPatternInit
			let convertedPatterns: URLPatternInit[];
			try {
				convertedPatterns = AIPatternLoader.convertToURLPatternInit(validPatterns);
			} catch (convertError: any) {
				const errorMessage = convertError.message || convertError.toString() || 'Pattern conversion failed';
				const hmrError: HMRError = {
					file,
					error: errorMessage,
					timestamp: new Date().toISOString(),
					fixed: false,
					retryCount: 0
				};
				this.recordError(hmrError);
				this.logHMRError(hmrError);
				throw convertError;
			}

			// Success - record update
			this.updateCount++;
			
			// Mark any previous errors for this file as fixed
			this.errorHistory.forEach(err => {
				if (err.file === file && !err.fixed) {
					err.fixed = true;
					this.retrySuccessCount++;
				}
			});

			return convertedPatterns;
		} catch (event: any) {
			// ✅ Bun 1.1: Use event.message fallback (event.error can be null)
			const errorMessage = event.message || event.error?.message || event.toString() || 'Unknown error';
			
			const hmrError: HMRError = {
				file,
				error: errorMessage,
				timestamp: new Date().toISOString(),
				fixed: false,
				retryCount: 0
			};

			this.recordError(hmrError);
			this.logHMRError(hmrError);
			
			// Re-throw for caller to handle gracefully
			throw event;
		}
	}

	/**
	 * Log HMR error with Bun 1.1 overlay format
	 */
	private static logHMRError(error: HMRError, rawContent?: string): void {
		console.error(`🚨 HMR ERROR: ${error.file}`);
		console.error(`   ${error.error}`);
		
		if (error.line) {
			console.error(`📄 ${error.file}:${error.line}`);
			
			// Show context around error line
			if (rawContent) {
				const lines = rawContent.split('\n');
				const errorLine = lines[error.line - 1];
				if (errorLine) {
					console.error(`   ${errorLine.trim()}`);
					if (error.column) {
						const pointer = ' '.repeat(error.column - 1) + '^';
						console.error(`   ${pointer}`);
					}
				}
			}
		}
		
		console.error(`💡 FIX: Check JSON syntax and required fields (pathname, hostname)`);
		console.error(`🔄 Auto-retry watching... (fix file → auto-reload)`);
	}

	/**
	 * Suggest fix based on error message
	 */
	private static suggestFix(errorMessage: string, file: string): void {
		if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
			console.log(`💡 Fix: Check JSON syntax in ${file}`);
			console.log(`   Common issues: Missing commas, trailing commas, invalid values`);
		}
		
		if (errorMessage.includes('pathname')) {
			console.log(`💡 Fix: Add valid pathname like "/odds/:market"`);
			console.log(`   Required URLPattern properties: pathname`);
			console.log(`   Optional properties: protocol, username, password, hostname, port, search, hash`);
		}
		
		if (errorMessage.includes('hostname')) {
			console.log(`💡 Fix: Add valid hostname like "bookie.com"`);
		}

		if (errorMessage.includes('properties')) {
			console.log(`💡 Fix: URLPattern properties must be strings:`);
			console.log(`   protocol, username, password, hostname, port, pathname, search, hash`);
		}
	}

	/**
	 * Record error in history
	 */
	private static recordError(error: HMRError): void {
		this.errorCount++;
		this.errorHistory.unshift(error);
		
		// Keep only recent errors
		if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
			this.errorHistory = this.errorHistory.slice(0, this.MAX_ERROR_HISTORY);
		}
	}

	/**
	 * Get HMR statistics
	 */
	static getStats(): HMRStats {
		const recentErrors = this.errorHistory.slice(0, 10);
		const recoveryRate = this.errorCount > 0 
			? `${((this.retrySuccessCount / this.errorCount) * 100).toFixed(1)}%`
			: '100%';
		
		const autoRetrySuccess = this.errorCount > 0
			? `${((this.retrySuccessCount / this.errorCount) * 100).toFixed(1)}%`
			: '100%';

		return {
			hmrUpdates: this.updateCount,
			hmrErrors: this.errorCount,
			errorRecovery: recoveryRate,
			recentErrors,
			autoRetrySuccess,
			lastUpdate: new Date().toISOString()
		};
	}

	/**
	 * Clear error history
	 */
	static clearHistory(): void {
		this.errorHistory = [];
		this.errorCount = 0;
		this.updateCount = 0;
		this.retrySuccessCount = 0;
	}
}

