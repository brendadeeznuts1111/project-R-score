#!/usr/bin/env bun
import { TomlSecretsEditor, SecurityValidator, TomlOptimizer } from '../services/toml-editor';
import { URLPatternExtractor } from '../integrations/pattern-extractor';
import { TomlAuditLogger, AuditReportGenerator } from '../integrations/audit-logger';
import { parse as parseToml } from 'bun:toml';

interface CLIOptions {
  output?: string;
  validate?: boolean;
  format?: 'json' | 'markdown' | 'text';
  failOnDangerous?: boolean;
  stripComments?: boolean;
  sortKeys?: boolean;
  minify?: boolean;
  set?: string[];
  user?: string;
}

class TomlCLI {
  private auditLogger = new TomlAuditLogger();
  private patternExtractor = new URLPatternExtractor();

  async run(args: string[]): Promise<void> {
    const command = args[0];
    
    try {
      switch (command) {
        case 'edit':
          await this.handleEdit(args.slice(1));
          break;
        case 'optimize':
          await this.handleOptimize(args.slice(1));
          break;
        case 'audit':
          await this.handleAudit(args.slice(1));
          break;
        case 'validate':
          await this.handleValidate(args.slice(1));
          break;
        case 'diff':
          await this.handleDiff(args.slice(1));
          break;
        case 'patterns':
          await this.handlePatterns(args.slice(1));
          break;
        case 'interactive':
          await this.handleInteractive(args.slice(1));
          break;
        case 'restore':
          await this.handleRestore(args.slice(1));
          break;
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  private async handleEdit(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const filePath = args.find(arg => !arg.startsWith('--')) || '';
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    if (!await Bun.file(filePath).exists()) {
      throw new Error(`File not found: ${filePath}`);
    }

    const editor = new TomlSecretsEditor(filePath);
    const mutations: Record<string, any> = {};

    // Parse --set options
    if (options.set) {
      for (const setValue of options.set) {
        const [key, value] = setValue.split('=', 2);
        if (!key || value === undefined) {
          throw new Error(`Invalid --set format: ${setValue}`);
        }
        this.setNestedValue(mutations, key, value);
      }
    }

    const result = await editor.edit(filePath, mutations);

    // Log to audit
    this.auditLogger.logEdit({
      filePath,
      user: options.user,
      action: 'edit',
      secretsTouched: result.secretsCount > 0 ? [`file_${filePath}`] : [],
      scoreBefore: 0, // Would need to calculate before edit
      scoreAfter: result.securityScore,
      changes: result.changes
    });

    console.log(`✅ Edited ${filePath}`);
    console.log(`📊 Security Score: ${result.securityScore}`);
    console.log(`🔐 Secrets: ${result.secretsCount}`);
    
    if (result.changes.length > 0) {
      console.log('\nChanges:');
      result.changes.forEach(change => console.log(`  ${change}`));
    }
  }

  private async handleOptimize(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const filePath = args.find(arg => !arg.startsWith('--')) || '';
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    const content = await Bun.file(filePath).text();
    const optimizer = new TomlOptimizer();
    
    const optimizeOptions = {
      skip: [],
      env: process.env
    };

    if (options.stripComments === false) optimizeOptions.skip.push('stripComments');
    if (options.sortKeys === false) optimizeOptions.skip.push('sortKeys');
    if (options.minify === false) optimizeOptions.skip.push('minify');

    const result = await optimizer.optimize(content, optimizeOptions);

    // Write output
    const outputPath = options.output || filePath.replace('.toml', '.optimized.toml');
    await Bun.write(outputPath, result.optimized);

    console.log(`✅ Optimized ${filePath} -> ${outputPath}`);
    console.log(`📏 Size reduction: ${result.sizeReduction} bytes`);
    console.log(`🗜️  Compression ratio: ${(result.compressionRatio * 100).toFixed(1)}%`);
    
    console.log('\nTransformations:');
    result.metrics.forEach(metric => {
      console.log(`  ${metric.rule}: ${metric.durationNs}ns, -${metric.bytesReduced} bytes`);
    });

    // Log to audit
    this.auditLogger.logEdit({
      filePath,
      user: options.user,
      action: 'optimize',
      secretsTouched: [],
      scoreBefore: 0,
      scoreAfter: 0,
      changes: [`Optimized to ${outputPath}`]
    });
  }

  private async handleAudit(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const patterns = args.filter(arg => !arg.startsWith('--') && arg.includes('*'));
    
    if (patterns.length === 0) {
      throw new Error('At least one file pattern is required');
    }

    const files = await this.expandPatterns(patterns);
    const generator = new AuditReportGenerator(this.auditLogger);
    
    for (const filePath of files) {
      if (!await Bun.file(filePath).exists()) {
        console.warn(`⚠️  File not found: ${filePath}`);
        continue;
      }

      const report = generator.generateMarkdownReport(filePath);
      
      if (options.format === 'json') {
        const jsonReport = generator.generateJSONReport(filePath);
        console.log(jsonReport);
      } else {
        console.log(report);
      }
    }
  }

  private async handleValidate(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const filePath = args.find(arg => !arg.startsWith('--')) || '';
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    const content = await Bun.file(filePath).text();
    const validator = new SecurityValidator();
    
    try {
      const parsed = parseToml(content);
      const secrets = this.extractSecretsFromObject(parsed);
      const result = validator.validateSecrets(secrets);

      if (result.valid) {
        console.log(`✅ ${filePath} is valid`);
        console.log(`📊 Security Score: ${result.score}`);
        console.log(`🔐 Found ${result.variables.length} variables`);
      } else {
        console.log(`❌ ${filePath} has security issues:`);
        result.errors.forEach(error => console.log(`  - ${error}`));
        
        if (options.failOnDangerous) {
          process.exit(1);
        }
      }

      // Show variable details
      if (result.variables.length > 0) {
        console.log('\nVariables:');
        result.variables.forEach(variable => {
          const icon = variable.isDangerous ? '⚠️' : '✅';
          console.log(`  ${icon} ${variable.name} (${variable.classification})`);
        });
      }
    } catch (error) {
      throw new Error(`Failed to parse TOML: ${error.message}`);
    }
  }

  private async handleDiff(args: string[]): Promise<void> {
    const [file1, file2] = args.filter(arg => !arg.startsWith('--'));
    
    if (!file1 || !file2) {
      throw new Error('Two file paths are required for diff');
    }

    const content1 = await Bun.file(file1).text();
    const content2 = await Bun.file(file2).text();
    
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    console.log(`📊 Diff: ${file1} vs ${file2}`);
    console.log('');
    
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 === line2) {
        console.log(`  ${i + 1}: ${line1}`);
      } else {
        if (line1 && !line2) {
          console.log(`- ${i + 1}: ${line1}`);
        } else if (!line1 && line2) {
          console.log(`+ ${i + 1}: ${line2}`);
        } else {
          console.log(`- ${i + 1}: ${line1}`);
          console.log(`+ ${i + 1}: ${line2}`);
        }
      }
    }
  }

  private async handlePatterns(args: string[]): Promise<void> {
    const options = this.parseOptions(args);
    const filePath = args.find(arg => !arg.startsWith('--')) || '';
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    const content = await Bun.file(filePath).text();
    const result = this.patternExtractor.extractAndAnalyze(content, filePath);
    
    const report = this.patternExtractor.generateSecurityReport(result);
    
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(report);
    }
  }

  private async handleInteractive(args: string[]): Promise<void> {
    const filePath = args.find(arg => !arg.startsWith('--')) || '';
    
    if (!filePath) {
      throw new Error('File path is required');
    }

    // Check if INTERACTIVE feature is available
    if (!Bun.feature('INTERACTIVE')) {
      throw new Error('Interactive mode requires --feature INTERACTIVE');
    }

    console.log('🚀 Interactive TOML Editor');
    console.log(`📁 File: ${filePath}`);
    console.log('Type :help for commands, :quit to exit');
    console.log('');

    // Import PTY editor
    const { PTYTomlEditor } = await import('../services/pty-editor');
    const ptyEditor = new PTYTomlEditor(filePath);
    await ptyEditor.startInteractiveSession();
  }

  private async handleRestore(args: string[]): Promise<void> {
    const backupPath = args.find(arg => !arg.startsWith('--')) || '';
    
    if (!backupPath) {
      throw new Error('Backup path is required');
    }

    if (backupPath.startsWith('s3://')) {
      // Handle S3 restore
      console.log('🔄 Restoring from S3...');
      // Implementation would depend on S3 client
      throw new Error('S3 restore not implemented yet');
    } else {
      // Local file restore
      if (!await Bun.file(backupPath).exists()) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const content = await Bun.file(backupPath).text();
      const outputPath = backupPath.replace('.gz', '').replace('.backup', '');
      
      await Bun.write(outputPath, content);
      console.log(`✅ Restored ${backupPath} -> ${outputPath}`);
    }
  }

  private parseOptions(args: string[]): CLIOptions {
    const options: CLIOptions = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--output':
        case '-o':
          options.output = args[++i];
          break;
        case '--validate':
          options.validate = true;
          break;
        case '--format':
          options.format = args[++i] as 'json' | 'markdown' | 'text';
          break;
        case '--fail-on-dangerous':
          options.failOnDangerous = true;
          break;
        case '--strip-comments':
          options.stripComments = true;
          break;
        case '--no-strip-comments':
          options.stripComments = false;
          break;
        case '--sort-keys':
          options.sortKeys = true;
          break;
        case '--no-sort-keys':
          options.sortKeys = false;
          break;
        case '--minify':
          options.minify = true;
          break;
        case '--no-minify':
          options.minify = false;
          break;
        case '--set':
          options.set = options.set || [];
          options.set.push(args[++i]);
          break;
        case '--user':
          options.user = args[++i];
          break;
      }
    }
    
    return options;
  }

  private setNestedValue(obj: any, path: string, value: string): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Try to parse as JSON, fallback to string
    try {
      current[keys[keys.length - 1]] = JSON.parse(value);
    } catch {
      current[keys[keys.length - 1]] = value;
    }
  }

  private extractSecretsFromObject(obj: any, path = ''): string[] {
    const secrets: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string' && value.includes('${')) {
        secrets.push(value);
      } else if (typeof value === 'object' && value !== null) {
        secrets.push(...this.extractSecretsFromObject(value, currentPath));
      }
    }
    
    return secrets;
  }

  private async expandPatterns(patterns: string[]): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // Simple glob expansion
        const parts = pattern.split('/');
        const dir = parts.slice(0, -1).join('/') || '.';
        const filePattern = parts[parts.length - 1];
        
        try {
          const entries = Array.from(await Array.fromAsync(Bun.file(dir).list()));
          const matching = entries.filter(entry => 
            this.matchesPattern(entry, filePattern)
          ).map(entry => `${dir}/${entry}`);
          
          files.push(...matching);
        } catch (error) {
          console.warn(`⚠️  Could not expand pattern: ${pattern}`);
        }
      } else {
        files.push(pattern);
      }
    }
    
    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(filename);
  }

  private showHelp(): void {
    console.log(`
🔐 TOML Secrets Editor & Optimizer

USAGE:
  bun toml <command> [options] [file]

COMMANDS:
  edit       Edit TOML with security validation
  optimize   Optimize and minify TOML files
  audit      Generate security audit reports
  validate   Validate TOML syntax and security
  diff       Compare two TOML files
  patterns   Extract and analyze URL patterns
  interactive Start interactive PTY editor
  restore    Restore from backup

OPTIONS:
  --output, -o <path>      Output file path
  --format <format>        Output format (json|markdown|text)
  --fail-on-dangerous      Exit on dangerous patterns
  --strip-comments         Strip comments during optimization
  --sort-keys              Sort keys alphabetically
  --minify                 Minify output
  --set <key=value>        Set key=value mutations
  --user <username>        Audit trail username

EXAMPLES:
  bun toml edit config.toml --set "api.url=https://api.\${ENV}.com"
  bun toml optimize config.toml --output config.min.toml --minify
  bun toml audit config/*.toml --format json
  bun toml validate secrets.toml --fail-on-dangerous
  bun toml interactive secrets.toml
`);
  }
}

// Run CLI if called directly
if (import.meta.main) {
  const cli = new TomlCLI();
  await cli.run(process.argv.slice(2));
}
