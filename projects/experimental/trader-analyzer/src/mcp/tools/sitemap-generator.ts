#!/usr/bin/env bun
/**
 * @fileoverview Component Sitemap Generator Tool
 * @description MCP tool for generating and querying component sitemap
 * @module mcp/tools/sitemap-generator
 * 
 * [[TECH][MODULE][ENHANCEMENT][META:{blueprint=BP-SITEMAP-ENHANCED@0.2.0;instance-id=SITEMAP-ENHANCED-001;version=0.2.0}][PROPERTIES:{enhancement={value:"sitemap-automation";@root:"SITEMAP-ANALYSIS-001";@chain:["BP-COMPONENT-SITEMAP","BP-SITEMAP-ANALYSIS"];@version:"0.2.0"}}][CLASS:SitemapEnhancement][#REF:v-0.2.0.BP.SITEMAP.ENHANCED.1.0.A.1.1.DOC.1.1]]
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

export interface SitemapGeneratorTool {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: {
			action: { type: 'string'; description: string };
			componentName?: { type: 'string'; description: string };
			category?: { type: 'string'; description: string };
		};
		required: ['action'];
	};
}

/**
 * Recursively find TypeScript files using Bun.Glob
 */
async function findTsFiles(dir: string = 'src'): Promise<string[]> {
	const files: string[] = [];
	try {
		const glob = new Bun.Glob('**/*.ts');
		for await (const file of glob.scan(dir)) {
			const fullPath = join(dir, file);
			// Skip test files
			if (!file.includes('.test.') && !file.includes('.spec.')) {
				files.push(fullPath);
			}
		}
	} catch {
		// Ignore errors
	}
	return files;
}

/**
 * Find all component classes
 */
async function findComponentClasses(): Promise<Array<{ name: string; file: string; methods?: string[] }>> {
	const files = await findTsFiles('src');
	const components: Array<{ name: string; file: string; methods?: string[] }> = [];

	for (const file of files) {
		try {
			const content = await readFile(file, 'utf-8');
			const classMatches = content.match(/export\s+class\s+([A-Z][a-zA-Z0-9_]*)/g) || [];
			
			for (const match of classMatches) {
				const className = match.replace(/export\s+class\s+/, '');
				// Extract methods
				const methodMatches = content.match(new RegExp(`class\\s+${className}[\\s\\S]*?\\{([\\s\\S]*?)\\n\\}`, 'm')) || [];
				const methods = content.match(/(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\(/g) || [];
				const methodNames = methods.map(m => m.replace(/[()]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 10);
				
				components.push({ 
					name: className, 
					file,
					methods: methodNames.length > 0 ? methodNames : undefined
				});
			}
		} catch {
			// Skip files that can't be read
		}
	}

	return components;
}

/**
 * Find all CSS classes
 */
async function findCSSClasses(): Promise<Array<{ name: string; file: string }>> {
	const files = await findHtmlFiles('dashboard');
	const cssClasses: Array<{ name: string; file: string }> = [];

	for (const file of files) {
		try {
			const content = await readFile(file, 'utf-8');
			const classMatches = content.match(/\.[a-zA-Z][\w-]*\s*\{/g) || [];
			
			const unique = new Set(classMatches.map(m => m.replace(/[\.\{\s]/g, '').trim()));
			
			for (const className of unique) {
				cssClasses.push({ name: className, file });
			}
		} catch {
			// Skip files that can't be read
		}
	}

	return cssClasses;
}

/**
 * Get component dependencies by parsing imports/exports
 */
async function getComponentDependencies(componentName: string): Promise<{
	consumes: string[];
	provides: string[];
	files: string[];
	imports: Array<{ from: string; items: string[] }>;
	exports: string[];
}> {
	// Find files matching component name
	const allFiles = await findTsFiles('src');
	const componentFiles = allFiles.filter(f => f.includes(componentName) || f.toLowerCase().includes(componentName.toLowerCase()));
	
	const consumes: string[] = [];
	const provides: string[] = [];
	const imports: Array<{ from: string; items: string[] }> = [];
	const exports: string[] = [];

	for (const file of componentFiles.slice(0, 5)) {
		try {
			const content = await readFile(file, 'utf-8');
			
			// Extract imports
			const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
			for (const imp of importMatches) {
				const fromMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
				const itemsMatch = imp.match(/import\s+{([^}]+)}/);
				if (fromMatch && itemsMatch) {
					imports.push({
						from: fromMatch[1],
						items: itemsMatch[1].split(',').map(i => i.trim())
					});
					consumes.push(fromMatch[1]);
				}
			}
			
			// Extract exports
			const exportMatches = content.match(/export\s+(?:const|function|class|interface|type)\s+(\w+)/g) || [];
			for (const exp of exportMatches) {
				const name = exp.replace(/export\s+(?:const|function|class|interface|type)\s+/, '');
				exports.push(name);
				provides.push(name);
			}
		} catch {
			// Skip files that can't be read
		}
	}

	return {
		consumes: [...new Set(consumes)],
		provides: [...new Set(provides)],
		files: componentFiles,
		imports,
		exports,
	};
}

/**
 * Generate comprehensive sitemap data
 */
async function generateSitemapData(): Promise<{
	components: Array<{ name: string; file: string; methods?: string[] }>;
	cssClasses: Array<{ name: string; file: string }>;
	interfaces: Array<{ name: string; file: string }>;
	functions: Array<{ name: string; file: string }>;
	lastGenerated: string;
	statistics: {
		totalComponents: number;
		totalCSSClasses: number;
		totalInterfaces: number;
		totalFunctions: number;
	};
}> {
	const components = await findComponentClasses();
	const cssClasses = await findCSSClasses();
	
	// Find interfaces
	const interfaceFiles = await findTsFiles('src');
	const interfaces: Array<{ name: string; file: string }> = [];
	
	for (const file of interfaceFiles.slice(0, 50)) {
		try {
			const content = await readFile(file, 'utf-8');
			const interfaceMatches = content.match(/export\s+interface\s+([A-Z][a-zA-Z0-9_]*)/g) || [];
			for (const match of interfaceMatches) {
				const interfaceName = match.replace(/export\s+interface\s+/, '');
				interfaces.push({ name: interfaceName, file });
			}
		} catch {
			// Skip
		}
	}
	
		// Find exported functions
		const functionFiles = await findTsFiles('src');
		const functions: Array<{ name: string; file: string }> = [];
		
		for (const file of functionFiles.slice(0, 50)) {
		try {
			const content = await readFile(file, 'utf-8');
			const functionMatches = content.match(/export\s+function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
			for (const match of functionMatches) {
				const functionName = match.replace(/export\s+function\s+/, '');
				functions.push({ name: functionName, file });
			}
		} catch {
			// Skip
		}
	}

	return {
		components,
		cssClasses,
		interfaces,
		functions,
		lastGenerated: new Date().toISOString(),
		statistics: {
			totalComponents: components.length,
			totalCSSClasses: cssClasses.length,
			totalInterfaces: interfaces.length,
			totalFunctions: functions.length,
		},
	};
}

/**
 * Create Sitemap Generator Tool
 */
export function createSitemapGeneratorTool(): SitemapGeneratorTool {
	return {
		name: 'sitemap-generate',
		description:
			'Generate and query component sitemap. Can list all components, CSS classes, or get dependencies for a specific component.',
		inputSchema: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					description: 'Action to perform: "generate", "list-components", "list-css", "get-dependencies"',
				},
				componentName: {
					type: 'string',
					description: 'Component name (required for get-dependencies)',
				},
				category: {
					type: 'string',
					description: 'Filter by category (components, css, layers)',
				},
			},
			required: ['action'],
		},
	};
}

/**
 * Execute Sitemap Generator Tool
 */
export async function executeSitemapGeneratorTool(args: {
	action: 'generate' | 'list-components' | 'list-css' | 'get-dependencies';
	componentName?: string;
	category?: string;
}): Promise<{
	sitemap?: any;
	components?: Array<{ name: string; file: string }>;
	cssClasses?: Array<{ name: string; file: string }>;
	dependencies?: any;
	summary: string;
}> {
	const { action, componentName, category } = args;

	switch (action) {
		case 'generate':
			const sitemap = await generateSitemapData();
			return {
				sitemap,
				summary: `Generated sitemap with ${sitemap.components.length} components and ${sitemap.cssClasses.length} CSS classes`,
			};

		case 'list-components':
			const components = await findComponentClasses();
			return {
				components,
				summary: `Found ${components.length} component classes`,
			};

		case 'list-css':
			const cssClasses = await findCSSClasses();
			return {
				cssClasses,
				summary: `Found ${cssClasses.length} CSS classes`,
			};

		case 'get-dependencies':
			if (!componentName) {
				return {
					summary: 'Error: componentName required for get-dependencies action',
				};
			}
			const dependencies = await getComponentDependencies(componentName);
			return {
				dependencies,
				summary: `Dependencies for ${componentName}: ${dependencies.consumes.length} imports, ${dependencies.provides.length} exports`,
			};

		default:
			return {
				summary: `Unknown action: ${action}`,
			};
	}
}
