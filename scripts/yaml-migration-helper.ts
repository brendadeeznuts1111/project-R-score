#!/usr/bin/env bun

// yaml-migration-helper.ts - Automated YAML Library Migration Tool
// Migrates from js-yaml/yaml libraries to Bun.YAML

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface MigrationResult {
  file: string;
  changes: number;
  issues: string[];
}

class YAMLMigrator {
  private results: MigrationResult[] = [];
  
  // Patterns to find and replace
  private patterns = [
    {
      // import { YAML } from "bun" -> import { YAML } from "bun"
      find: /require\(["']js-yaml["']\)/g,
      replace: 'import { YAML } from "bun"',
      description: "js-yaml require statements"
    },
    {
      // import { YAML } from "bun" -> import { YAML } from "bun"
      find: /require\(["']yaml["']\)/g,
      replace: 'import { YAML } from "bun"',
      description: "yaml library require statements"
    },
    {
      // import { yaml } from "bun" "bun"
      find: /import yaml from ['"]js-yaml['"]/g,
      replace: 'import { YAML } from "bun"',
      description: "js-yaml ES imports"
    },
    {
      // import { YAML } from "bun" -> import { YAML } from "bun"
      find: /import yaml from ['"]yaml['"]/g,
      replace: 'import { YAML } from "bun"',
      description: "yaml library ES imports"
    },
    {
      // import { YAML } from "bun" -> import { YAML } from "bun"
      find: /import\s*\{[^}]*\}\s*from\s*['"]yaml['"]/g,
      replace: 'import { YAML } from "bun"',
      description: "yaml library named imports"
    },
    {
      // import { yaml } from "bun" "bun"
      find: /import\s*\{[^}]*\}\s*from\s*['"]js-yaml['"]/g,
      replace: 'import { YAML } from "bun"',
      description: "js-yaml named imports"
    },
    {
      // Bun.YAML.parse( -> YAML.parse(
      find: /yaml\.load\(/g,
      replace: 'YAML.parse(',
      description: "Bun.YAML.parse() calls"
    },
    {
      // YAML.parse( -> YAML.parse(
      find: /yaml\.parse\(/g,
      replace: 'YAML.parse(',
      description: "YAML.parse() calls"
    },
    {
      // YAML.parse( -> YAML.parse(
      find: /\bload\(/g,
      replace: 'YAML.parse(',
      description: "YAML.parse() calls (js-yaml)"
    },
    {
      // Bun.YAML.stringify( -> YAML.stringify(
      find: /yaml\.dump\(/g,
      replace: 'YAML.stringify(',
      description: "Bun.YAML.stringify() calls"
    },
    {
      // YAML.stringify( -> YAML.stringify(
      find: /yaml\.stringify\(/g,
      replace: 'YAML.stringify(',
      description: "YAML.stringify() calls"
    },
    {
      // YAML.stringify( -> YAML.stringify(
      find: /\bdump\(/g,
      replace: 'YAML.stringify(',
      description: "YAML.stringify() calls (js-yaml)"
    }
  ];

  /**
   * Scan for files that might contain YAML library usage
   */
  private async findYAMLFiles(basePath: string = "."): Promise<string[]> {
    const patterns = [
      "**/*.ts",
      "**/*.js",
      "**/*.tsx",
      "**/*.jsx"
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      const glob = new Bun.Glob(pattern);
      for await (const file of glob.scan(".")) {
        files.push(file);
      }
    }

    // Filter out node_modules and other excluded directories
    return files.filter(file => 
      !file.includes("node_modules") &&
      !file.includes(".git") &&
      !file.includes("dist") &&
      !file.includes("build") &&
      !file.includes(".next")
    );
  }

  /**
   * Migrate a single file
   */
  private migrateFile(filePath: string): MigrationResult {
    const result: MigrationResult = {
      file: filePath,
      changes: 0,
      issues: []
    };

    try {
      let content = readFileSync(filePath, "utf8");
      const originalContent = content;

      // Apply all patterns
      for (const pattern of this.patterns) {
        const matches = content.match(pattern.find);
        if (matches) {
          content = content.replace(pattern.find, pattern.replace);
          result.changes += matches.length;
          console.log(`  ✅ ${pattern.description}: ${matches.length} replacements`);
        }
      }

      // Special handling for fs.readFileSync + Bun.yaml.parse patterns
      const fsYamlPattern = /fs\.readFileSync\([^,]+,\s*['"]utf8['"]\)\s*\)\s*[,;]?\s*\n\s*.*load\(/g;
      const fsMatches = content.match(fsYamlPattern);
      if (fsMatches) {
        console.log(`  ⚠️  Manual review needed: ${fsMatches.length} fs.readFileSync + Bun.yaml.parse patterns`);
        result.issues.push("Manual review required for fs.readFileSync + Bun.yaml.parse patterns");
      }

      // Write back if changed
      if (content !== originalContent) {
        writeFileSync(filePath, content);
        console.log(`  📝 Updated: ${filePath}`);
      }

    } catch (error) {
      result.issues.push(`Failed to process file: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`  ❌ Error processing ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Run migration on all files
   */
  async migrate(basePath: string = "."): Promise<void> {
    console.log("🔍 Scanning for YAML library usage...\n");

    const files = await this.findYAMLFiles(basePath);
    console.log(`📁 Found ${files.length} files to check\n`);

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf8");
        
        // Check if file contains YAML library usage
        const hasYAMLUsage = /require\(['"](yaml|js-yaml)['"]\)|import.*from\s*['"](yaml|js-yaml)['"]|yaml\.(load|parse|dump|stringify)\(|\b(load|dump)\(/.test(content);
        
        if (hasYAMLUsage) {
          console.log(`🔄 Processing: ${file}`);
          const result = this.migrateFile(file);
          this.results.push(result);
          
          if (result.issues.length > 0) {
            console.log(`  ⚠️  Issues: ${result.issues.join(", ")}`);
          }
          
          console.log("");
        }
      } catch (error) {
        console.log(`❌ Failed to read ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.printSummary();
  }

  /**
   * Print migration summary
   */
  private printSummary(): void {
    console.log("📊 Migration Summary");
    console.log("=" .repeat(50));

    const totalFiles = this.results.length;
    const totalChanges = this.results.reduce((sum, r) => sum + r.changes, 0);
    const filesWithIssues = this.results.filter(r => r.issues.length > 0).length;

    console.log(`📁 Files processed: ${totalFiles}`);
    console.log(`🔄 Total changes: ${totalChanges}`);
    console.log(`⚠️  Files with issues: ${filesWithIssues}\n`);

    if (filesWithIssues > 0) {
      console.log("⚠️  Files requiring manual review:");
      this.results
        .filter(r => r.issues.length > 0)
        .forEach(r => {
          console.log(`  - ${r.file}: ${r.issues.join(", ")}`);
        });
      console.log("");
    }

    console.log("🎯 Next Steps:");
    console.log("1. Review files with issues manually");
    console.log("2. Run tests to verify functionality");
    console.log("3. Update package.json to remove yaml/js-yaml dependencies");
    console.log("4. Commit changes\n");

    if (totalChanges > 0) {
      console.log("✅ Migration completed successfully!");
    } else {
      console.log("ℹ️  No YAML library usage found - already compliant!");
    }
  }

  /**
   * Generate a report of current YAML usage
   */
  async generateReport(basePath: string = "."): Promise<void> {
    console.log("📋 YAML Usage Report");
    console.log("=" .repeat(50));

    const files = await this.findYAMLFiles(basePath);
    const usage: { [key: string]: string[] } = {};

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf8");
        
        // Check for different types of YAML usage
        const checks = [
          { name: "js-yaml require", pattern: /require\(['"]js-yaml['"]\)/ },
          { name: "yaml require", pattern: /require\(['"]yaml['"]\)/ },
          { name: "js-yaml import", pattern: /import.*from\s*['"]js-yaml['"]/ },
          { name: "yaml import", pattern: /import.*from\s*['"]yaml['"]/ },
          { name: "Bun.YAML.parse()", pattern: /yaml\.load\(/ },
          { name: "YAML.parse()", pattern: /yaml\.parse\(/ },
          { name: "Bun.YAML.stringify()", pattern: /yaml\.dump\(/ },
          { name: "YAML.stringify()", pattern: /yaml\.stringify\(/ },
          { name: "Bun.YAML", pattern: /Bun\.YAML/ }
        ];

        for (const check of checks) {
          if (check.pattern.test(content)) {
            if (!usage[check.name]) usage[check.name] = [];
            usage[check.name].push(file);
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    for (const [type, files] of Object.entries(usage)) {
      console.log(`\n${type}: ${files.length} files`);
      files.slice(0, 5).forEach(file => console.log(`  - ${file}`));
      if (files.length > 5) {
        console.log(`  ... and ${files.length - 5} more`);
      }
    }

    const hasNonBunUsage = Object.keys(usage).filter(key => !key.includes("Bun.YAML")).length > 0;
    
    console.log("\n" + "=".repeat(50));
    if (hasNonBunUsage) {
      console.log("⚠️  Non-Bun YAML usage detected - migration needed!");
      console.log("Run: bun yaml-migration-helper.ts migrate");
    } else {
      console.log("✅ All YAML usage is Bun-compliant!");
    }
  }
}

// CLI interface
const migrator = new YAMLMigrator();
const command = process.argv[2];

async function main() {
  switch (command) {
    case "migrate":
      console.log("🚀 Starting YAML Migration to Bun.YAML\n");
      await migrator.migrate();
      break;
      
    case "report":
      await migrator.generateReport();
      break;
      
    case "--help":
    case "-h":
      console.log(`
YAML Migration Helper - Migrate to Bun.YAML

Usage:
  bun yaml-migration-helper.ts <command>

Commands:
  migrate   - Automatically migrate yaml/js-yaml usage to Bun.YAML
  report    - Generate report of current YAML usage
  help      - Show this help message

Examples:
  bun yaml-migration-helper.ts report
  bun yaml-migration-helper.ts migrate
`);
      break;
      
    default:
      console.log("❌ Unknown command. Use 'report' or 'migrate'");
      console.log("Run 'bun yaml-migration-helper.ts --help' for usage");
      process.exit(1);
  }
}

main().catch(console.error);
