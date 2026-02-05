#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - Feed Pattern Validation Script
 * 
 * Validates feed patterns in parallel using Bun.spawn()
 * 
 * Features:
 * - Parallel validation with Bun.spawn()
 * - Pattern matching verification
 * - Contract validation
 * - Performance benchmarking
 * 
 * Usage:
 *   bun run scripts/validate-feed-patterns.ts
 *   bun run scripts/validate-feed-patterns.ts --parallel 4
 *   bun run scripts/validate-feed-patterns.ts --file patterns/feed-batch.json
 */

import { hash, spawn } from "bun";
import { AIPatternLoader } from '../src/ai-pattern-loader';
import { loadEnhancedFeedPatterns, validateFeedContract } from '../src/utils/feed-registry-loader';

interface ValidationResult {
	patternId: string;
	valid: boolean;
	urlPatternValid: boolean;
	contractValid: boolean;
	errors: string[];
	matchedUrls: string[];
	processingTimeMs: number;
}

// Parse CLI arguments
const args = Bun.argv.slice(2);
const parallelCount = parseInt(args.find((_, i) => args[i - 1] === '--parallel') || '4');
const patternFile = args.find((_, i) => args[i - 1] === '--file') || './patterns/ai-driven-feed.json';
const verbose = args.includes('--verbose') || args.includes('-v');

/**
 * Validate a single pattern
 */
async function validatePattern(pattern: any): Promise<ValidationResult> {
	const startTime = performance.now();
	const errors: string[] = [];
	const matchedUrls: string[] = [];
	
	let urlPatternValid = false;
	let contractValid = true;
	
	// Validate URLPattern syntax
	try {
		const urlPattern = new URLPattern({
			pathname: pattern.pathname,
			hostname: pattern.hostname
		});
		urlPatternValid = true;
		
		// Test against example URLs if available
		if (pattern.examples) {
			for (const example of pattern.examples) {
				if (urlPattern.test(example.url)) {
					matchedUrls.push(example.url);
				} else {
					errors.push(`Example URL does not match: ${example.url}`);
				}
			}
		}
	} catch (e) {
		errors.push(`Invalid URLPattern: ${e}`);
	}
	
	// Validate contracts
	if (pattern.contracts) {
		// Check path params
		if (pattern.contracts.pathParams) {
			for (const [param, schema] of Object.entries(pattern.contracts.pathParams as Record<string, any>)) {
				if (!pattern.pathname.includes(`:${param}`) && param !== '*') {
					errors.push(`Path param '${param}' not in pathname`);
					contractValid = false;
				}
			}
		}
		
		// Check query params have valid types
		if (pattern.contracts.queryParams) {
			for (const [param, schema] of Object.entries(pattern.contracts.queryParams as Record<string, any>)) {
				if (!['string', 'integer', 'number', 'boolean'].includes(schema.type)) {
					errors.push(`Invalid query param type for '${param}': ${schema.type}`);
					contractValid = false;
				}
			}
		}
	}
	
	// Validate metadata
	if (pattern._meta) {
		if (pattern._meta.timeoutMs && pattern._meta.timeoutMs < 0) {
			errors.push(`Invalid timeoutMs: ${pattern._meta.timeoutMs}`);
		}
		if (pattern._meta.cacheTtl && pattern._meta.cacheTtl < 0) {
			errors.push(`Invalid cacheTtl: ${pattern._meta.cacheTtl}`);
		}
	}
	
	// Validate monitoring SLOs
	if (pattern.monitoring?.slo) {
		const slo = pattern.monitoring.slo;
		if (slo.p99 < slo.p95 || slo.p95 < slo.p50) {
			errors.push(`Invalid SLO ordering: p99=${slo.p99}, p95=${slo.p95}, p50=${slo.p50}`);
		}
	}
	
	const processingTimeMs = performance.now() - startTime;
	
	return {
		patternId: pattern.id,
		valid: urlPatternValid && contractValid && errors.length === 0,
		urlPatternValid,
		contractValid,
		errors,
		matchedUrls,
		processingTimeMs
	};
}

/**
 * Validate patterns in parallel using worker processes
 */
async function validatePatternsParallel(patterns: any[], concurrency: number): Promise<ValidationResult[]> {
	const results: ValidationResult[] = [];
	const chunks: any[][] = [];
	
	// Split patterns into chunks
	const chunkSize = Math.ceil(patterns.length / concurrency);
	for (let i = 0; i < patterns.length; i += chunkSize) {
		chunks.push(patterns.slice(i, i + chunkSize));
	}
	
	console.log(`\n🔄 Validating ${patterns.length} patterns in ${chunks.length} parallel chunks...\n`);
	
	// Process chunks in parallel
	const chunkPromises = chunks.map(async (chunk, index) => {
		const chunkResults: ValidationResult[] = [];
		
		for (const pattern of chunk) {
			const result = await validatePattern(pattern);
			chunkResults.push(result);
			
			if (verbose) {
				const status = result.valid ? '✅' : '❌';
				console.log(`${status} ${result.patternId} (${result.processingTimeMs.toFixed(2)}ms)`);
			}
		}
		
		return chunkResults;
	});
	
	const allResults = await Promise.all(chunkPromises);
	return allResults.flat();
}

/**
 * Run validation using Bun.spawn for subprocess
 */
async function runSubprocessValidation(patternFile: string): Promise<void> {
	console.log(`\n🚀 Running subprocess validation with Bun.spawn()...\n`);
	
	const proc = spawn({
		cmd: ['bun', 'run', import.meta.path, '--file', patternFile, '--verbose'],
		stdout: 'pipe',
		stderr: 'pipe'
	});
	
	const stdout = await Bun.readableStreamToText(proc.stdout);
	const stderr = await Bun.readableStreamToText(proc.stderr);
	
	console.log(stdout);
	if (stderr) {
		console.error(stderr);
	}
	
	await proc.exited;
}

/**
 * Main validation function
 */
async function main() {
	console.log('🧪 Feed Pattern Validation Script\n');
	console.log(`📁 Pattern file: ${patternFile}`);
	console.log(`🔢 Parallel chunks: ${parallelCount}`);
	console.log(`📝 Verbose: ${verbose}`);
	
	const startTime = performance.now();
	
	// Load patterns
	let patterns: any[];
	try {
		if (patternFile.includes('ai-driven-feed')) {
			patterns = await loadEnhancedFeedPatterns(patternFile);
		} else {
			patterns = await AIPatternLoader.loadPatterns(patternFile);
		}
	} catch (e) {
		console.error(`❌ Failed to load patterns: ${e}`);
		process.exit(1);
	}
	
	console.log(`\n📊 Loaded ${patterns.length} patterns\n`);
	
	// Validate patterns
	const results = await validatePatternsParallel(patterns, parallelCount);
	
	// Generate summary
	const validCount = results.filter(r => r.valid).length;
	const invalidCount = results.filter(r => !r.valid).length;
	const totalTime = performance.now() - startTime;
	
	console.log('\n' + '='.repeat(60));
	console.log('📋 VALIDATION SUMMARY');
	console.log('='.repeat(60));
	console.log(`✅ Valid patterns:   ${validCount}`);
	console.log(`❌ Invalid patterns: ${invalidCount}`);
	console.log(`📊 Total patterns:   ${patterns.length}`);
	console.log(`⏱️  Total time:       ${totalTime.toFixed(2)}ms`);
	console.log(`⚡ Avg per pattern:  ${(totalTime / patterns.length).toFixed(2)}ms`);
	
	// Show errors
	const failedResults = results.filter(r => !r.valid);
	if (failedResults.length > 0) {
		console.log('\n' + '='.repeat(60));
		console.log('❌ VALIDATION ERRORS');
		console.log('='.repeat(60));
		
		for (const result of failedResults) {
			console.log(`\n📛 ${result.patternId}:`);
			for (const error of result.errors) {
				console.log(`   • ${error}`);
			}
		}
	}
	
	// Show matched URLs
	if (verbose) {
		const matchedResults = results.filter(r => r.matchedUrls.length > 0);
		if (matchedResults.length > 0) {
			console.log('\n' + '='.repeat(60));
			console.log('✅ MATCHED EXAMPLE URLs');
			console.log('='.repeat(60));
			
			for (const result of matchedResults) {
				console.log(`\n🔗 ${result.patternId}:`);
				for (const url of result.matchedUrls) {
					console.log(`   ✓ ${url}`);
				}
			}
		}
	}
	
	console.log('\n' + '='.repeat(60));
	console.log(invalidCount === 0 ? '✅ All patterns valid!' : `❌ ${invalidCount} patterns need fixes`);
	console.log('='.repeat(60) + '\n');
	
	// Exit with error code if there are failures
	if (invalidCount > 0) {
		process.exit(1);
	}
}

// Run main function
main().catch(console.error);

