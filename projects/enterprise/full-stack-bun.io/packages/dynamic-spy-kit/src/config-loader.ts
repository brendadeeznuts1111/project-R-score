/**
 * @dynamic-spy/kit v3.4 - Config Loader
 * 
 * FIXED: Hidden file matching with Bun Glob API
 * Production-ready config loading for sports arbitrage system
 */

import { Glob } from "bun";

export interface ConfigFile {
	path: string;
	content?: any;
	type: 'json' | 'ts' | 'env' | 'secrets';
}

export class ConfigLoader {
	private cwd: string;

	constructor(cwd: string = process.cwd()) {
		this.cwd = cwd;
	}

	/**
	 * Scan for config files including hidden files
	 * 
	 * ✅ FIXED: Hidden file matching (.env, .secrets included)
	 * 
	 * @param pattern - Glob pattern for config files
	 * @param options - Scan options
	 * @returns Array of config file paths
	 */
	async scanConfigFiles(
		pattern: string = 'config/sports/**/*.{json,ts}',
		options: { hidden?: boolean; cwd?: string } = {}
	): Promise<string[]> {
		const cwd = options.cwd || this.cwd;
		const scanOptions = {
			cwd, // ✅ Boundary respected
			hidden: options.hidden !== false // ✅ .env, .secrets included (default: true)
		};

		const glob = new Glob(pattern);
		const files: string[] = [];

		for await (const file of glob.scan(scanOptions)) {
			// Handle relative paths - join with cwd if needed
			const fullPath = file.startsWith('/') || file.startsWith(cwd)
				? file
				: `${cwd}/${file}`;
			files.push(fullPath);
		}

		return files;
	}

	/**
	 * Load all config files with content
	 * 
	 * @param pattern - Glob pattern
	 * @param options - Load options
	 * @returns Array of config files with content
	 */
	async loadConfigFiles(
		pattern: string = 'config/sports/**/*.{json,ts}',
		options: { hidden?: boolean; cwd?: string } = {}
	): Promise<ConfigFile[]> {
		const files = await this.scanConfigFiles(pattern, options);
		const configs: ConfigFile[] = [];

		for (const file of files) {
			try {
				const config = await this.loadConfigFile(file);
				configs.push(config);
			} catch (error) {
				console.warn(`Failed to load config file: ${file}`, error);
			}
		}

		return configs;
	}

	/**
	 * Load a single config file
	 * 
	 * @param filePath - Path to config file (can be relative or absolute)
	 * @returns Config file with content
	 */
	async loadConfigFile(filePath: string): Promise<ConfigFile> {
		// Use filePath as-is (should already be absolute from scanConfigFiles)
		const file = Bun.file(filePath);
		const exists = await file.exists();

		if (!exists) {
			// Try with cwd prefix if absolute path doesn't exist
			const altPath = `${this.cwd}/${filePath}`;
			const altFile = Bun.file(altPath);
			const altExists = await altFile.exists();
			
			if (altExists) {
				return this.loadConfigFileContent(altPath, altFile);
			}
			
			throw new Error(`Config file not found: ${filePath}`);
		}

		return this.loadConfigFileContent(filePath, file);
	}

	private async loadConfigFileContent(filePath: string, file: File): Promise<ConfigFile> {

		// Determine file type
		let type: ConfigFile['type'] = 'json';
		if (filePath.endsWith('.ts')) {
			type = 'ts';
		} else if (filePath.includes('.env')) {
			type = 'env';
		} else if (filePath.includes('.secrets')) {
			type = 'secrets';
		}

		// Load content based on type
		let content: any;
		try {
			if (type === 'json') {
				content = await file.json();
			} else if (type === 'ts') {
				// For TypeScript files, we'll just return the path
				// Actual loading would require dynamic import
				content = { path: filePath, type: 'ts' };
			} else {
				// For .env and .secrets, return as text
				content = await file.text();
			}
		} catch (error) {
			// If loading fails, return empty content
			content = null;
		}

		return {
			path: filePath,
			content,
			type
		};
	}

	/**
	 * Scan for hidden config files specifically
	 * 
	 * @param cwd - Working directory
	 * @returns Array of hidden config file paths
	 */
	async scanHiddenConfigs(cwd?: string): Promise<string[]> {
		return this.scanConfigFiles('config/**/.*', {
			hidden: true,
			cwd: cwd || this.cwd
		});
	}

	/**
	 * Load environment configs (.env files)
	 * 
	 * @param cwd - Working directory
	 * @returns Array of env config files
	 */
	async loadEnvConfigs(cwd?: string): Promise<ConfigFile[]> {
		const files = await this.scanConfigFiles('config/**/.env*', {
			hidden: true,
			cwd: cwd || this.cwd
		});

		const configs: ConfigFile[] = [];
		for (const file of files) {
			try {
				const config = await this.loadConfigFile(file);
				configs.push(config);
			} catch (error) {
				console.warn(`Failed to load env config: ${file}`, error);
			}
		}

		return configs;
	}

	/**
	 * Load secrets configs (.secrets files)
	 * 
	 * @param cwd - Working directory
	 * @returns Array of secrets config files
	 */
	async loadSecretsConfigs(cwd?: string): Promise<ConfigFile[]> {
		const files = await this.scanConfigFiles('config/**/.secrets*', {
			hidden: true,
			cwd: cwd || this.cwd
		});

		const configs: ConfigFile[] = [];
		for (const file of files) {
			try {
				const config = await this.loadConfigFile(file);
				configs.push(config);
			} catch (error) {
				console.warn(`Failed to load secrets config: ${file}`, error);
			}
		}

		return configs;
	}

	/**
	 * Get all config files as JSON log format
	 * 
	 * @param pattern - Glob pattern
	 * @returns JSON string of config files
	 */
	async getConfigFilesJSON(pattern?: string): Promise<string> {
		const files = await this.scanConfigFiles(pattern);
		return JSON.stringify(files);
	}
}

