#!/usr/bin/env bun

/**
 * @fileoverview Migration Helper for npm → Bun Package Replacements
 * @description Comprehensive guide for replacing npm packages with Bun native APIs
 * @module migration-helper
 */

export interface PackageReplacement {
  npmPackage: string;
  bunReplacement: string;
  description: string;
  performanceGain?: string;
  bundleSizeReduction?: string;
  example?: {
    npm: string;
    bun: string;
  };
}

export class MigrationHelper {
  private static replacements: PackageReplacement[] = [
    {
      npmPackage: 'js-yaml',
      bunReplacement: 'Bun.file().yaml()',
      description: 'YAML parsing and serialization',
      performanceGain: 'Native C++ implementation',
      bundleSizeReduction: '0KB (vs ~50KB)',
      example: {
        npm: "import { load } from 'js-yaml';\nconst data = load(yamlString);",
        bun: "const data = await Bun.file('config.yaml').yaml();"
      }
    },
    {
      npmPackage: 'dotenv',
      bunReplacement: 'Bun.env (auto-loaded)',
      description: 'Environment variable loading',
      performanceGain: 'No file I/O required',
      bundleSizeReduction: '0KB (vs ~5KB)',
      example: {
        npm: "require('dotenv').config();\nconst port = process.env.PORT;",
        bun: "const port = Bun.env.PORT; // Auto-loaded"
      }
    },
    {
      npmPackage: 'fs-extra',
      bunReplacement: 'Bun.file(), Bun.write()',
      description: 'Enhanced file system operations',
      performanceGain: 'Native async I/O',
      bundleSizeReduction: '0KB (vs ~25KB)',
      example: {
        npm: "const fs = require('fs-extra');\nawait fs.readFile('file.txt');",
        bun: "const content = await Bun.file('file.txt').text();"
      }
    },
    {
      npmPackage: 'rimraf',
      bunReplacement: 'Bun.file().delete()',
      description: 'Recursive file/directory deletion',
      performanceGain: 'Native filesystem operations',
      bundleSizeReduction: '0KB (vs ~8KB)',
      example: {
        npm: "const rimraf = require('rimraf');\nrimraf('./dist');",
        bun: "await Bun.file('./dist').delete(true);"
      }
    },
    {
      npmPackage: 'crypto-js',
      bunReplacement: 'Bun.hash, crypto.subtle',
      description: 'Cryptographic hashing and encryption',
      performanceGain: 'Native crypto implementations',
      bundleSizeReduction: '0KB (vs ~100KB+)',
      example: {
        npm: "const CryptoJS = require('crypto-js');\nconst hash = CryptoJS.SHA256('data');",
        bun: "const hash = await Bun.hash('data', 'sha256');"
      }
    },
    {
      npmPackage: 'bcryptjs',
      bunReplacement: 'crypto.subtle (PBKDF2)',
      description: 'Password hashing',
      performanceGain: 'Web Crypto API',
      bundleSizeReduction: '0KB (vs ~15KB)',
      example: {
        npm: "const bcrypt = require('bcryptjs');\nconst hash = await bcrypt.hash('password', 10);",
        bun: "// Use crypto.subtle with PBKDF2\nconst hash = await crypto.subtle.deriveBits(...);"
      }
    },
    {
      npmPackage: 'string-width',
      bunReplacement: 'Bun.stringWidth()',
      description: 'String display width calculation',
      performanceGain: '~6,756x faster',
      bundleSizeReduction: '0KB (vs ~5KB)',
      example: {
        npm: "const stringWidth = require('string-width');\nconst width = stringWidth('Hello 🎉');",
        bun: "const width = Bun.stringWidth('Hello 🎉');"
      }
    },
    {
      npmPackage: 'strip-ansi',
      bunReplacement: 'Bun.stripANSI()',
      description: 'ANSI escape code removal',
      performanceGain: '~6-57x faster',
      bundleSizeReduction: '0KB (vs ~3KB)',
      example: {
        npm: "const stripAnsi = require('strip-ansi');\nconst clean = stripAnsi('\\x1b[31mRed\\x1b[0m');",
        bun: "const clean = Bun.stripANSI('\\x1b[31mRed\\x1b[0m');"
      }
    },
    {
      npmPackage: 'chalk',
      bunReplacement: 'Bun.color (coming in 1.2)',
      description: 'Terminal string styling',
      performanceGain: 'Native ANSI color support',
      bundleSizeReduction: '0KB (vs ~15KB)',
      example: {
        npm: "const chalk = require('chalk');\nconsole.log(chalk.red('Error'));",
        bun: "// Coming in Bun 1.2\nconsole.log(Bun.color.red('Error'));"
      }
    },
    {
      npmPackage: 'which',
      bunReplacement: 'Bun.which()',
      description: 'Executable path resolution',
      performanceGain: 'Native PATH searching',
      bundleSizeReduction: '0KB (vs ~4KB)',
      example: {
        npm: "const which = require('which');\nconst path = which.sync('node');",
        bun: "const path = Bun.which('node');"
      }
    },
    {
      npmPackage: 'cli-table',
      bunReplacement: 'Bun.inspect.table()',
      description: 'Console table formatting',
      performanceGain: 'Unicode-aware table rendering',
      bundleSizeReduction: '0KB (vs ~12KB)',
      example: {
        npm: "const Table = require('cli-table');\nconst table = new Table();\nconsole.log(table.toString());",
        bun: "console.log(Bun.inspect.table(data));"
      }
    },
    {
      npmPackage: 'progress',
      bunReplacement: 'Custom ProgressBar class',
      description: 'Terminal progress bars',
      performanceGain: 'Native terminal width detection',
      bundleSizeReduction: '0KB (vs ~8KB)',
      example: {
        npm: "const ProgressBar = require('progress');\nconst bar = new ProgressBar(':bar', { total: 100 });",
        bun: "const bar = new ProgressBar(100);\nbar.update(50, 'Processing...');"
      }
    },
    {
      npmPackage: 'ora',
      bunReplacement: 'Custom spinner implementation',
      description: 'Terminal spinners',
      performanceGain: 'Native terminal control',
      bundleSizeReduction: '0KB (vs ~6KB)',
      example: {
        npm: "const ora = require('ora');\nconst spinner = ora('Loading...').start();",
        bun: "// Implement custom spinner with Bun APIs\nconst spinner = new Spinner('Loading...');"
      }
    },
    {
      npmPackage: 'dompurify',
      bunReplacement: 'Bun.escapeHTML() + custom logic',
      description: 'HTML sanitization',
      performanceGain: 'Native HTML escaping',
      bundleSizeReduction: '0KB (vs ~20KB)',
      example: {
        npm: "const DOMPurify = require('dompurify');\nconst clean = DOMPurify.sanitize('<script>evil</script>');",
        bun: "const clean = Bun.escapeHTML('<script>evil</script>');"
      }
    },
    {
      npmPackage: 'lodash.isEqual',
      bunReplacement: 'Bun.deepEquals()',
      description: 'Deep object equality checking',
      performanceGain: 'Native C++ implementation',
      bundleSizeReduction: '0KB (vs ~25KB for lodash)',
      example: {
        npm: "const isEqual = require('lodash.isEqual');\nconst equal = isEqual(obj1, obj2);",
        bun: "const equal = Bun.deepEquals(obj1, obj2);"
      }
    },
    {
      npmPackage: 'promise-status',
      bunReplacement: 'Bun.peek()',
      description: 'Promise status inspection',
      performanceGain: 'Non-destructive promise inspection',
      bundleSizeReduction: '0KB (vs ~2KB)',
      example: {
        npm: "const { getStatus } = require('promise-status');\nconst status = getStatus(promise);",
        bun: "const status = Bun.peek.status(promise);\nconst value = Bun.peek(promise);"
      }
    },
    {
      npmPackage: 'performance-now',
      bunReplacement: 'Bun.nanoseconds()',
      description: 'High-precision timing',
      performanceGain: 'Native nanosecond precision',
      bundleSizeReduction: '0KB (vs ~3KB)',
      example: {
        npm: "const now = require('performance-now');\nconst start = now();",
        bun: "const start = Bun.nanoseconds();"
      }
    },
    {
      npmPackage: 'zlib',
      bunReplacement: 'Bun.gzipSync(), Bun.deflateSync()',
      description: 'Compression/decompression',
      performanceGain: 'Native compression algorithms',
      bundleSizeReduction: '0KB (vs ~15KB)',
      example: {
        npm: "const zlib = require('zlib');\nconst compressed = zlib.gzipSync(data);",
        bun: "const compressed = Bun.gzipSync(data);"
      }
    },
    {
      npmPackage: 'pako',
      bunReplacement: 'Bun.zstdCompressSync()',
      description: 'Zstandard compression',
      performanceGain: 'Native Zstandard implementation',
      bundleSizeReduction: '0KB (vs ~25KB)',
      example: {
        npm: "const pako = require('pako');\nconst compressed = pako.deflate(data);",
        bun: "const compressed = Bun.zstdCompressSync(data);"
      }
    },
    {
      npmPackage: 'path',
      bunReplacement: 'Bun.pathToFileURL(), Bun.fileURLToPath()',
      description: 'Path manipulation',
      performanceGain: 'URL-aware path handling',
      bundleSizeReduction: '0KB (vs ~8KB)',
      example: {
        npm: "const path = require('path');\nconst fullPath = path.resolve('./file.txt');",
        bun: "const url = Bun.pathToFileURL('./file.txt');\nconst path = Bun.fileURLToPath(url);"
      }
    }
  ];

  static getReplacements(): PackageReplacement[] {
    return this.replacements;
  }

  static findReplacement(npmPackage: string): PackageReplacement | undefined {
    return this.replacements.find(r =>
      r.npmPackage.toLowerCase() === npmPackage.toLowerCase()
    );
  }

  static getMigrationStats(): {
    totalPackages: number;
    totalBundleReduction: string;
    performanceImprovements: string[];
  } {
    const totalBundleReduction = this.replacements
      .reduce((sum, r) => {
        const match = r.bundleSizeReduction?.match(/(\d+)KB/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

    const performanceImprovements = this.replacements
      .filter(r => r.performanceGain)
      .map(r => `${r.npmPackage}: ${r.performanceGain}`);

    return {
      totalPackages: this.replacements.length,
      totalBundleReduction: `~${totalBundleReduction}KB`,
      performanceImprovements
    };
  }

  static async generateMigrationReport(packageJsonPath?: string): Promise<string> {
    let report = '# NPM → Bun Migration Report\n\n';

    if (packageJsonPath) {
      try {
        const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

        const migratableDeps = Object.keys(dependencies)
          .map(name => this.findReplacement(name))
          .filter(Boolean) as PackageReplacement[];

        if (migratableDeps.length > 0) {
          report += '## Your Project Dependencies\n\n';
          report += '| Package | Bun Replacement | Bundle Reduction |\n';
          report += '|---------|----------------|------------------|\n';

          for (const dep of migratableDeps) {
            report += `| ${dep.npmPackage} | ${dep.bunReplacement} | ${dep.bundleSizeReduction || 'N/A'} |\n`;
          }
          report += '\n';
        }
      } catch (error) {
        report += '⚠️  Could not read package.json\n\n';
      }
    }

    const stats = this.getMigrationStats();
    report += `## Migration Statistics\n\n`;
    report += `- **Packages with Bun alternatives**: ${stats.totalPackages}\n`;
    report += `- **Potential bundle size reduction**: ${stats.totalBundleReduction}\n\n`;

    report += '## Performance Improvements\n\n';
    for (const improvement of stats.performanceImprovements.slice(0, 10)) {
      report += `- ${improvement}\n`;
    }

    if (stats.performanceImprovements.length > 10) {
      report += `- ... and ${stats.performanceImprovements.length - 10} more\n`;
    }

    return report;
  }

  static printMigrationGuide(): void {
    console.log('🚀 NPM → Bun Migration Guide\n');

    const stats = this.getMigrationStats();
    console.log(`📦 ${stats.totalPackages} packages can be replaced with Bun native APIs`);
    console.log(`💾 Potential bundle size reduction: ${stats.totalBundleReduction}\n`);

    console.log('🔄 Replace these npm packages with Bun built-ins:');
    console.log('─'.repeat(60));

    for (const replacement of this.replacements.slice(0, 15)) {
      console.log(`  ${replacement.npmPackage.padEnd(20)} → ${replacement.bunReplacement}`);
      if (replacement.bundleSizeReduction) {
        console.log(`    💾 ${replacement.bundleSizeReduction} saved`);
      }
    }

    if (this.replacements.length > 15) {
      console.log(`  ... and ${this.replacements.length - 15} more packages`);
    }

    console.log('\n✨ Benefits:');
    console.log('  • Zero npm dependencies for core functionality');
    console.log('  • Native performance (C++ implementations)');
    console.log('  • Smaller bundle sizes');
    console.log('  • Faster startup times');
    console.log('  • Better security (no dependency vulnerabilities)');
  }

  static async analyzeProject(projectRoot: string = process.cwd()): Promise<{
    packageJson: any;
    migratableDeps: PackageReplacement[];
    migrationStats: any;
  }> {
    const packageJsonPath = `${projectRoot}/package.json`;

    try {
      const packageJson = JSON.parse(await Bun.file(packageJsonPath).text());
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const migratableDeps = Object.keys(dependencies)
        .map(name => this.findReplacement(name))
        .filter(Boolean) as PackageReplacement[];

      const migrationStats = this.getMigrationStats();

      return {
        packageJson,
        migratableDeps,
        migrationStats
      };
    } catch (error) {
      throw new Error(`Could not analyze project: ${error}`);
    }
  }
}

// Demo function
async function demo() {
  console.log('🔄 NPM → Bun Migration Helper Demo\n');

  // Print migration guide
  MigrationHelper.printMigrationGuide();
  console.log();

  // Show specific replacement
  const replacement = MigrationHelper.findReplacement('string-width');
  if (replacement) {
    console.log('📋 Specific Replacement Example:');
    console.log(`Package: ${replacement.npmPackage}`);
    console.log(`Bun Alternative: ${replacement.bunReplacement}`);
    console.log(`Performance: ${replacement.performanceGain}`);
    console.log(`Bundle Reduction: ${replacement.bundleSizeReduction}`);
    console.log();

    if (replacement.example) {
      console.log('📝 Code Comparison:');
      console.log('NPM:');
      console.log(replacement.example.npm);
      console.log();
      console.log('Bun:');
      console.log(replacement.example.bun);
      console.log();
    }
  }

  // Generate migration report
  try {
    const report = await MigrationHelper.generateMigrationReport('./package.json');
    console.log('📊 Migration Report Preview:');
    console.log(report.split('\n').slice(0, 20).join('\n'));
    console.log('... (truncated)');
  } catch (error) {
    console.log('Could not generate report (no package.json found)');
  }

  console.log('\n✨ Migration helper demo complete!');
}

// Run demo if executed directly
if (import.meta.main) {
  demo().catch(console.error);
}