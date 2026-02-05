#!/usr/bin/env bun
/**
 * @fileoverview Automated Component Sitemap Generator
 * @description Generates and updates COMPONENT-SITEMAP.md automatically
 * @module scripts/generate-sitemap
 * 
 * [[TECH][MODULE][ENHANCEMENT][META:{blueprint=BP-SITEMAP-ENHANCED@0.2.0;instance-id=SITEMAP-GENERATOR-001;version=0.2.0}][PROPERTIES:{generator={value:"sitemap-auto-generator";@root:"SITEMAP-ENHANCED-001";@chain:["BP-COMPONENT-SITEMAP","BP-SITEMAP-ENHANCED"];@version:"0.2.0"}}][CLASS:SitemapGenerator][#REF:v-0.2.0.BP.SITEMAP.GENERATOR.1.0.A.1.1.SCRIPT.1.1]]
 */

import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface ComponentInfo {
	name: string;
	file: string;
	methods?: string[];
	properties?: string[];
}

interface CSSClassInfo {
	name: string;
	file: string;
	properties: string[];
}

/**
 * Recursively find TypeScript files using Bun.Glob
 */
async function findTsFiles(dir: string = 'src'): Promise<string[]> {
	const files: string[] = [];
	try {
		const glob = new Bun.Glob('**/*.ts');
		for await (const file of glob.scan(dir)) {
			// Skip test files
			if (!file.includes('.test.') && !file.includes('.spec.')) {
				files.push(join(dir, file));
			}
		}
	} catch {
		// Ignore errors
	}
	return files;
}

/**
 * Extract component classes from TypeScript files
 */
async function extractComponents(): Promise<ComponentInfo[]> {
	const files = await findTsFiles('src');
	const components: ComponentInfo[] = [];

	for (const file of files) {
		try {
			const content = await readFile(file, 'utf-8');
			
			// Find exported classes
			const classRegex = /export\s+class\s+([A-Z][a-zA-Z0-9_]*)/g;
			let match;
			while ((match = classRegex.exec(content)) !== null) {
				const className = match[1];
				const classStart = match.index;
				
				// Extract methods (simplified)
				const methods: string[] = [];
				const methodRegex = /(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\(/g;
				let methodMatch;
				while ((methodMatch = methodRegex.exec(content)) !== null && methodMatch.index < classStart + 5000) {
					methods.push(methodMatch[1]);
				}
				
				// Extract properties
				const properties: string[] = [];
				const propRegex = /(?:public\s+|private\s+|protected\s+)?(\w+)\s*[:=]/g;
				let propMatch;
				while ((propMatch = propRegex.exec(content)) !== null && propMatch.index < classStart + 5000) {
					properties.push(propMatch[1]);
				}
				
				components.push({
					name: className,
					file,
					methods: methods.slice(0, 10),
					properties: properties.slice(0, 10),
				});
			}
		} catch (error) {
			// Skip files that can't be read
		}
	}

	return components;
}

/**
 * Recursively find HTML files using Bun.Glob
 */
async function findHtmlFiles(dir: string = 'dashboard'): Promise<string[]> {
	const files: string[] = [];
	try {
		const glob = new Bun.Glob('**/*.html');
		for await (const file of glob.scan(dir)) {
			files.push(join(dir, file));
		}
	} catch {
		// Ignore errors
	}
	return files;
}

/**
 * Extract CSS classes from HTML files
 */
async function extractCSSClasses(): Promise<CSSClassInfo[]> {
	const files = await findHtmlFiles('dashboard');
	const cssClasses: Map<string, CSSClassInfo> = new Map();

	for (const file of files) {
		try {
			const content = await readFile(file, 'utf-8');
			
			// Find CSS class definitions
			const classRegex = /\.([a-zA-Z][\w-]*)\s*\{([^}]+)\}/g;
			let match;
			while ((match = classRegex.exec(content)) !== null) {
				const className = match[1];
				const properties = match[2]
					.split(';')
					.map(p => p.trim())
					.filter(p => p.length > 0)
					.slice(0, 5);
				
				if (!cssClasses.has(className)) {
					cssClasses.set(className, {
						name: className,
						file,
						properties,
					});
				}
			}
		} catch (error) {
			// Skip files that can't be read
		}
	}

	return Array.from(cssClasses.values());
}

/**
 * Generate sitemap markdown section
 */
function generateSitemapMarkdown(components: ComponentInfo[], cssClasses: CSSClassInfo[]): string {
	const timestamp = new Date().toISOString();
	
	let markdown = `## Auto-Generated Component List\n\n`;
	markdown += `**Generated**: ${timestamp}\n\n`;
	
	markdown += `### Components (${components.length})\n\n`;
	for (const component of components.slice(0, 50)) {
		markdown += `- **${component.name}**\n`;
		markdown += `  - File: \`${component.file}\`\n`;
		if (component.methods && component.methods.length > 0) {
			markdown += `  - Methods: ${component.methods.slice(0, 5).join(', ')}\n`;
		}
		markdown += `\n`;
	}
	
	markdown += `### CSS Classes (${cssClasses.length})\n\n`;
	for (const cssClass of cssClasses.slice(0, 50)) {
		markdown += `- **\`.${cssClass.name}\`**\n`;
		markdown += `  - File: \`${cssClass.file}\`\n`;
		if (cssClass.properties.length > 0) {
			markdown += `  - Properties: ${cssClass.properties.join('; ')}\n`;
		}
		markdown += `\n`;
	}
	
	return markdown;
}

/**
 * Main generation function
 */
async function generateSitemap(): Promise<void> {
	console.log('🔍 Generating component sitemap...\n');

	const components = await extractComponents();
	const cssClasses = await extractCSSClasses();

	console.log(`✅ Found ${components.length} components`);
	console.log(`✅ Found ${cssClasses.length} CSS classes`);

	const markdown = generateSitemapMarkdown(components, cssClasses);

	// Append to sitemap file or create new section
	const sitemapPath = 'docs/api/COMPONENT-SITEMAP.md';
	if (existsSync(sitemapPath)) {
		const existing = await readFile(sitemapPath, 'utf-8');
		
		// Check if auto-generated section exists
		if (existing.includes('## Auto-Generated Component List')) {
			// Replace existing auto-generated section
			const beforeSection = existing.split('## Auto-Generated Component List')[0];
			const afterSection = existing.split('## Auto-Generated Component List')[1]?.split('## ')[1] || '';
			const newContent = beforeSection + markdown + (afterSection ? `## ${afterSection}` : '');
			await writeFile(sitemapPath, newContent);
		} else {
			// Append to end
			await writeFile(sitemapPath, existing + '\n\n' + markdown);
		}
	} else {
		// Create new file
		await writeFile(sitemapPath, markdown);
	}

	console.log(`\n✅ Sitemap updated: ${sitemapPath}`);
	console.log(`📊 Statistics:`);
	console.log(`   - Components: ${components.length}`);
	console.log(`   - CSS Classes: ${cssClasses.length}`);
}

// Run if executed directly
if (import.meta.main) {
	generateSitemap().catch((error) => {
		console.error('❌ Sitemap generation failed:', error);
		process.exit(1);
	});
}

export { extractComponents, extractCSSClasses, generateSitemap };

