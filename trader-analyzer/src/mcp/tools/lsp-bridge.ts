#!/usr/bin/env bun
/**
 * @fileoverview MCP-LSP Bridge Tool
 * @description AI-powered code suggestions with context awareness
 * @module mcp/tools/lsp-bridge
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export interface LSPBridgeTool {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: {
			packageName: { type: 'string'; description: string };
			filePath?: { type: 'string'; description: string };
			query: { type: 'string'; description: string };
		};
		required: ['packageName', 'query'];
	};
}

/**
 * Analyze codebase structure for a package
 */
async function analyzePackage(packageName: string): Promise<{
	files: Array<{ path: string; size: number; lines: number }>;
	dependencies: string[];
	exports: string[];
}> {
	const packagePath = join(process.cwd(), 'packages', packageName.replace('@', ''));
	const packageJsonPath = join(packagePath, 'package.json');

	try {
		const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
		
		// Recursively find TypeScript files
		async function findTsFiles(dir: string, baseDir: string = dir): Promise<string[]> {
			const files: string[] = [];
			try {
				const entries = await readdir(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = join(dir, entry.name);
					if (entry.isDirectory()) {
						files.push(...await findTsFiles(fullPath, baseDir));
					} else if (entry.name.endsWith('.ts')) {
						files.push(fullPath.replace(baseDir + '/', ''));
					}
				}
			} catch {
				// Ignore errors
			}
			return files;
		}
		
		const srcPath = join(packagePath, 'src');
		const srcFiles = await findTsFiles(srcPath, srcPath);

		const files = await Promise.all(
			srcFiles.slice(0, 20).map(async (file) => {
				try {
					const content = await readFile(join(packagePath, 'src', file), 'utf-8');
					return {
						path: file,
						size: content.length,
						lines: content.split('\n').length,
					};
				} catch {
					return {
						path: file,
						size: 0,
						lines: 0,
					};
				}
			}),
		);

		return {
			files,
			dependencies: Object.keys(packageJson.dependencies || {}),
			exports: Object.keys(packageJson.exports || {}),
		};
	} catch (error) {
		return {
			files: [],
			dependencies: [],
			exports: [],
		};
	}
}

/**
 * Get code context for a specific file
 */
async function getCodeContext(packageName: string, filePath: string): Promise<string> {
	const packagePath = join(process.cwd(), 'packages', packageName.replace('@', ''));
	const fullPath = join(packagePath, filePath);

	try {
		const content = await readFile(fullPath, 'utf-8');
		return content;
	} catch (error) {
		return '';
	}
}

/**
 * Create LSP Bridge tool
 */
export function createLSPBridgeTool(): LSPBridgeTool {
	return {
		name: 'lsp-bridge-analyze',
		description:
			'Analyze codebase structure and provide AI-powered code suggestions. Queries code context from workspace packages.',
		inputSchema: {
			type: 'object',
			properties: {
				packageName: {
					type: 'string',
					description: 'Package name to analyze (e.g., "@graph/layer4")',
				},
				filePath: {
					type: 'string',
					description: 'Optional: Specific file path within package to analyze',
				},
				query: {
					type: 'string',
					description:
						'Natural language query for code analysis (e.g., "suggest improvements for anomaly detection")',
				},
			},
			required: ['packageName', 'query'],
		},
	};
}

/**
 * Execute LSP Bridge tool
 */
export async function executeLSPBridgeTool(args: {
	packageName: string;
	filePath?: string;
	query: string;
}): Promise<{
	suggestions: Array<{
		file: string;
		line?: number;
		suggestion: string;
		explanation: string;
	}>;
	context: {
		packageStructure: any;
		codeContext?: string;
	};
}> {
	const { packageName, filePath, query } = args;

	// Analyze package structure
	const packageStructure = await analyzePackage(packageName);

	// Get code context if file path provided
	let codeContext: string | undefined;
	if (filePath) {
		codeContext = await getCodeContext(packageName, filePath);
	}

	// Generate AI suggestions based on query
	// In a real implementation, this would use an AI model
	// For now, return structured suggestions based on code analysis
	const suggestions = [
		{
			file: filePath || 'package structure',
			suggestion: `Consider optimizing imports in ${packageName}`,
			explanation: `Package has ${packageStructure.files.length} files. Review import structure for better tree-shaking.`,
		},
	];

	return {
		suggestions,
		context: {
			packageStructure,
			codeContext,
		},
	};
}
