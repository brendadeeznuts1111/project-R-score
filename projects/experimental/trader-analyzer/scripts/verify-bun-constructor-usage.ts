#!/usr/bin/env bun
/**
 * @fileoverview Verify Bun Class Constructor Usage
 * @description Ensures all Bun class constructors use 'new' keyword correctly
 * @module scripts/verify-bun-constructor-usage
 * 
 * This script verifies that Bun v1.3.4+ class constructor fix (14.4.10.5.0.0.0.0)
 * is properly integrated across the codebase by checking for incorrect usage.
 * 
 * @see docs/14.4.10.0.0.0.0-BUN-API-FIXES-V1.3.4.md
 */

// Use Bun.Glob for file pattern matching

// Bun class constructors that require 'new' keyword (Bun v1.3.4+ fix)
const BUN_CLASS_CONSTRUCTORS = [
	"Bun.RedisClient",
	"Bun.FileSystemRouter",
	"Bun.Transpiler",
	"Bun.Plugin",
	"Bun.CryptoHasher",
	"Bun.FFI.CString",
] as const;

// Patterns to search for (without 'new' keyword)
const CONSTRUCTOR_PATTERNS = [
	// Direct calls: Bun.ClassName(...)
	/\bBun\.(RedisClient|FileSystemRouter|Transpiler|Plugin|CryptoHasher)\s*\(/g,
	// FFI.CString calls: Bun.FFI.CString(...)
	/\bBun\.FFI\.CString\s*\(/g,
] as const;

// Files to exclude (test files intentionally test incorrect usage)
const EXCLUDE_PATTERNS = [
	"**/test/**",
	"**/tests/**",
	"**/*.test.ts",
	"**/*.spec.ts",
	"**/docs/**",
	"**/examples/**",
	"**/node_modules/**",
] as const;

interface Violation {
	file: string;
	line: number;
	column: number;
	pattern: string;
	context: string;
}

/**
 * Scan a file for Bun class constructor violations
 */
async function scanFile(filePath: string): Promise<Violation[]> {
	const violations: Violation[] = [];
	
	try {
		const content = await Bun.file(filePath).text();
		const lines = content.split("\n");
		
		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];
			
			// Skip comments and strings (basic check)
			if (line.trim().startsWith("//") || line.includes("// Example:") || line.includes("@example")) {
				continue;
			}
			
			// Check each pattern
			for (const pattern of CONSTRUCTOR_PATTERNS) {
				const matches = [...line.matchAll(pattern)];
				
				for (const match of matches) {
					if (match.index === undefined) continue;
					
					// Check if 'new' keyword is present before this match
					const beforeMatch = line.substring(0, match.index);
					const hasNewKeyword = /\bnew\s+$/.test(beforeMatch.trimEnd());
					
					if (!hasNewKeyword) {
						violations.push({
							file: filePath,
							line: lineNum + 1,
							column: match.index + 1,
							pattern: match[0],
							context: line.trim(),
						});
					}
				}
			}
		}
	} catch (error) {
		console.error(`Error scanning ${filePath}:`, error);
	}
	
	return violations;
}

/**
 * Scan for singleton patterns (getInstance methods with non-private constructors)
 */
async function scanSingletonPatterns(filePath: string): Promise<Violation[]> {
	const violations: Violation[] = [];
	
	try {
		const content = await Bun.file(filePath).text();
		const lines = content.split("\n");
		
		// Track class state
		let currentClass: { name: string; startLine: number; hasGetInstance: boolean; hasPrivateConstructor: boolean; getInstanceLine: number } | null = null;
		let braceDepth = 0;
		let inClass = false;
		
		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum];
			
			// Track brace depth to detect class boundaries
			const openBraces = (line.match(/\{/g) || []).length;
			const closeBraces = (line.match(/\}/g) || []).length;
			braceDepth += openBraces - closeBraces;
			
			// Detect class declaration
			const classMatch = line.match(/^(export\s+)?(abstract\s+)?class\s+(\w+)/);
			if (classMatch) {
				// Check previous class before starting new one
				if (currentClass && currentClass.hasGetInstance && !currentClass.hasPrivateConstructor) {
					// Check if constructor exists (might be implicit)
					const classContent = lines.slice(currentClass.startLine, lineNum).join("\n");
					const hasPublicConstructor = /(public\s+|protected\s+)?constructor\s*\(/.test(classContent);
					const hasAnyConstructor = /constructor\s*\(/.test(classContent);
					
					if (hasPublicConstructor || !hasAnyConstructor) {
						violations.push({
							file: filePath,
							line: currentClass.getInstanceLine,
							column: 1,
							pattern: `Singleton ${currentClass.name} has public/protected constructor`,
							context: `Class ${currentClass.name} uses getInstance() but constructor is not private`,
						});
					}
				}
				
				currentClass = {
					name: classMatch[3],
					startLine: lineNum,
					hasGetInstance: false,
					hasPrivateConstructor: false,
					getInstanceLine: 0,
				};
				inClass = true;
				braceDepth = openBraces;
			}
			
			// Check for getInstance method (within current class)
			if (currentClass && inClass && braceDepth > 0) {
				if (/static\s+getInstance\s*\(/.test(line)) {
					currentClass.hasGetInstance = true;
					currentClass.getInstanceLine = lineNum + 1;
				}
				
				// Check for private constructor
				if (/private\s+constructor\s*\(/.test(line)) {
					currentClass.hasPrivateConstructor = true;
				}
			}
			
			// Class ended (brace depth back to 0)
			if (inClass && braceDepth <= 0 && currentClass) {
				// Final check for this class
				if (currentClass.hasGetInstance && !currentClass.hasPrivateConstructor) {
					const classContent = lines.slice(currentClass.startLine, lineNum + 1).join("\n");
					const hasPublicConstructor = /(public\s+|protected\s+)?constructor\s*\(/.test(classContent);
					const hasAnyConstructor = /constructor\s*\(/.test(classContent);
					
					if (hasPublicConstructor || !hasAnyConstructor) {
						violations.push({
							file: filePath,
							line: currentClass.getInstanceLine,
							column: 1,
							pattern: `Singleton ${currentClass.name} has public/protected constructor`,
							context: `Class ${currentClass.name} uses getInstance() but constructor is not private`,
						});
					}
				}
				currentClass = null;
				inClass = false;
			}
		}
	} catch (error) {
		console.error(`Error scanning singleton patterns in ${filePath}:`, error);
	}
	
	return violations;
}

/**
 * Main verification function
 */
async function main() {
	console.log("🔍 Verifying Bun class constructor usage (Bun v1.3.4+ fix)...\n");
	
	const allViolations: Violation[] = [];
	const singletonViolations: Violation[] = [];
	
	// Scan TypeScript files in src/, scripts/, and packages/
	const scanPaths = ["src/**/*.ts", "scripts/**/*.ts", "packages/**/*.ts"];
	
	for (const pattern of scanPaths) {
		const glob = new Bun.Glob(pattern);
		const files: string[] = [];
		
		// Collect all matching files
		for (const file of glob.scanSync(".")) {
			// Check if file should be excluded
			const shouldExclude = EXCLUDE_PATTERNS.some((excludePattern) => {
				const excludeGlob = new Bun.Glob(excludePattern);
				return excludeGlob.match(file);
			});
			
			if (!shouldExclude) {
				files.push(file);
			}
		}
		
		for (const file of files) {
			const violations = await scanFile(file);
			allViolations.push(...violations);
			
			// Also check singleton patterns
			const singletonViols = await scanSingletonPatterns(file);
			singletonViolations.push(...singletonViols);
		}
	}
	
	// Report results
	const totalViolations = allViolations.length + singletonViolations.length;
	
	if (totalViolations === 0) {
		console.log("✅ All Bun class constructors correctly use 'new' keyword!\n");
		console.log(`Verified ${BUN_CLASS_CONSTRUCTORS.length} constructor types:`);
		BUN_CLASS_CONSTRUCTORS.forEach((ctor) => {
			console.log(`  ✓ ${ctor}`);
		});
		
		if (singletonViolations.length === 0) {
			console.log("\n✅ Singleton patterns validated (getInstance methods have private constructors)");
		}
		
		console.log("\n📚 Reference: docs/14.4.10.0.0.0.0-BUN-API-FIXES-V1.3.4.md");
		process.exit(0);
	} else {
		console.error(`❌ Found ${totalViolations} violation(s):\n`);
		
		if (allViolations.length > 0) {
			console.error(`\n🔴 Bun Constructor Violations (${allViolations.length}):`);
			for (const violation of allViolations) {
				console.error(`  ${violation.file}:${violation.line}:${violation.column}`);
				console.error(`    Pattern: ${violation.pattern}`);
				console.error(`    Context: ${violation.context}`);
				console.error("");
			}
		}
		
		if (singletonViolations.length > 0) {
			console.error(`\n🔴 Singleton Pattern Violations (${singletonViolations.length}):`);
			for (const violation of singletonViolations) {
				console.error(`  ${violation.file}:${violation.line}:${violation.column}`);
				console.error(`    Issue: ${violation.pattern}`);
				console.error(`    Context: ${violation.context}`);
				console.error("");
			}
		}
		
		console.error("💡 Fixes:");
		console.error("  - Add 'new' keyword before Bun class constructor calls");
		console.error("  - Make singleton constructors private");
		console.error("📚 Reference: docs/14.4.10.0.0.0.0-BUN-API-FIXES-V1.3.4.md");
		process.exit(1);
	}
}

// Run verification
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});



