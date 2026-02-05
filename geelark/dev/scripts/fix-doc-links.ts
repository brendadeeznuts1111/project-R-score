#!/usr/bin/env bun
/**
 * Documentation Link Fixer
 * Automatically fixes broken links in markdown documentation
 */

import * as fs from "fs";
import * as path from "path";

const DOCS_DIR = "/Users/nolarose/geelark/docs";

interface LinkFix {
  pattern: RegExp;
  replacement: string;
  description: string;
  filePattern?: string; // If specified, only apply to matching files
}

const linkFixes: LinkFix[] = [
  // === PRIORITY 1: File:// URL Fixes (23 links) ===
  {
    pattern: /file:\/\/\/Users\/nolarose\/geelark\/docs\/runtime\/bun\//g,
    replacement: "./",
    description: "Fix file:// URLs in bun subdirectory (relative to same dir)",
    filePattern: "runtime/bun/",
  },
  {
    pattern: /file:\/\/\/Users\/nolarose\/geelark\/docs\/runtime\//g,
    replacement: "../",
    description: "Fix file:// URLs pointing to runtime directory",
    filePattern: "BUN_UTILITIES_SUMMARY|BUN_FILE_INTEGRATION|BUN_UTILS_DASHBOARD",
  },
  {
    pattern: /file:\/\/\/Users\/nolarose\/geelark\/docs\//g,
    replacement: "../",
    description: "Remove file:// protocol URLs - general fallback",
    filePattern: "BUN_UTILITIES_SUMMARY|BUN_FILE_INTEGRATION|BUN_UTILS_DASHBOARD",
  },

  // === PRIORITY 2: Old Directory References (tutorials, features, cli, bun) ===
  // tutorials → getting-started
  {
    pattern: /\.\/tutorials\/SETUP\.md/g,
    replacement: "./getting-started/SETUP.md",
    description: "Fix tutorials/SETUP.md → getting-started/SETUP.md",
  },
  {
    pattern: /\.\/tutorials\/USER_GUIDE\.md/g,
    replacement: "./getting-started/USER_GUIDE.md",
    description: "Fix tutorials/USER_GUIDE.md → getting-started/USER_GUIDE.md",
  },
  {
    pattern: /\.\/tutorials\/DEPLOYMENT\.md/g,
    replacement: "./getting-started/DEPLOYMENT.md",
    description: "Fix tutorials/DEPLOYMENT.md → getting-started/DEPLOYMENT.md",
  },
  {
    pattern: /\.\.\/tutorials\//g,
    replacement: "../getting-started/",
    description: "Fix relative tutorials paths → getting-started",
  },

  // features → guides/features
  {
    pattern: /\.\/features\/FEATURE_MATRIX\.md/g,
    replacement: "./features/FEATURE_MATRIX.md",
    description: "Fix features/FEATURE_MATRIX.md → guides/features/FEATURE_MATRIX.md",
  },
  {
    pattern: /\.\/features\/FEATURE_FLAGS_VERIFICATION\.md/g,
    replacement: "./features/FEATURE_FLAGS_VERIFICATION.md",
    description: "Fix features/FEATURE_FLAGS_VERIFICATION.md path",
  },
  {
    pattern: /\.\/features\//g,
    replacement: "./features/",
    description: "Fix relative features paths",
  },
  {
    pattern: /\.\.\/features\//g,
    replacement: "../guides/features/",
    description: "Fix relative features paths with parent reference",
  },

  // cli → guides/api
  {
    pattern: /\.\/cli\/CLI_IMPLEMENTATION_SUMMARY\.md/g,
    replacement: "./api/CLI_IMPLEMENTATION_SUMMARY.md",
    description: "Fix cli → guides/api",
  },
  {
    pattern: /\.\.\/cli\//g,
    replacement: "../guides/api/",
    description: "Fix relative cli paths → guides/api",
  },

  // bun → runtime/bun (for references from outside bun directory)
  {
    pattern: /\.\.\/bun\//g,
    replacement: "../runtime/bun/",
    description: "Fix bun directory references → runtime/bun",
  },
  {
    pattern: /\.\/bun\//g,
    replacement: "./bun/",
    description: "Fix local bun directory references",
  },

  // === PRIORITY 3: Moved Files Path Updates (52 links) ===
  {
    pattern: /\.\.\/guides\/TESTING_ALIGNMENT\.md/g,
    replacement: "../guides/testing/TESTING_ALIGNMENT.md",
    description: "Fix TESTING_ALIGNMENT.md location",
  },
  {
    pattern: /\.\.\/guides\/EXPECTTYPEOF_GUIDE\.md/g,
    replacement: "../guides/type-checking/EXPECTTYPEOF_GUIDE.md",
    description: "Fix EXPECTTYPEOF_GUIDE.md location",
  },
  {
    pattern: /\.\/TESTING_ALIGNMENT\.md/g,
    replacement: "./testing/TESTING_ALIGNMENT.md",
    description: "Fix TESTING_ALIGNMENT.md relative path in guides",
    filePattern: "docs/guides/",
  },
  {
    pattern: /\.\/EXPECTTYPEOF_GUIDE\.md/g,
    replacement: "./type-checking/EXPECTTYPEOF_GUIDE.md",
    description: "Fix EXPECTTYPEOF_GUIDE.md relative path in guides",
    filePattern: "docs/guides/",
  },

  // === PRIORITY 4: DOCUMENTATION_INDEX.md Specific Fixes (80+ links) ===
  {
    pattern: /\(\.\/TESTING_GUIDE\.md\)/g,
    replacement: "(../testing/TESTING_GUIDE.md)",
    description: "Fix TESTING_GUIDE link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/DASHBOARD_FRONTEND_GUIDE\.md\)/g,
    replacement: "(./DASHBOARD_FRONTEND_GUIDE.md)",
    description: "Fix DASHBOARD_FRONTEND_GUIDE link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/TYPESCRIPT_ENHANCEMENT_GUIDE\.md\)/g,
    replacement: "(./TYPESCRIPT_ENHANCEMENT_GUIDE.md)",
    description: "Fix TYPESCRIPT_ENHANCEMENT_GUIDE link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/tutorials\/DEPLOYMENT\.md\)/g,
    replacement: "(../getting-started/DEPLOYMENT.md)",
    description: "Fix tutorials/DEPLOYMENT in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/tutorials\/USER_GUIDE\.md\)/g,
    replacement: "(../getting-started/USER_GUIDE.md)",
    description: "Fix tutorials/USER_GUIDE in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/API_REFERENCE\.md\)/g,
    replacement: "(./API_REFERENCE.md)",
    description: "Fix API_REFERENCE link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/GEELARK_COMPLETE_GUIDE\.md\)/g,
    replacement: "(./GEELARK_COMPLETE_GUIDE.md)",
    description: "Fix GEELARK_COMPLETE_GUIDE link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/QUICK_REFERENCE\.md\)/g,
    replacement: "(./QUICK_REFERENCE.md)",
    description: "Fix QUICK_REFERENCE link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/BUN_FILE_IO\.md\)/g,
    replacement: "(../runtime/bun/BUN_FILE_IO.md)",
    description: "Fix BUN_FILE_IO link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },
  {
    pattern: /\(\.\/BUN_FILE_INTEGRATION\.md\)/g,
    replacement: "(../runtime/bun/BUN_FILE_INTEGRATION.md)",
    description: "Fix BUN_FILE_INTEGRATION link in index",
    filePattern: "DOCUMENTATION_INDEX",
  },

  // === PRIORITY 5: General Bun File References ===
  {
    pattern: /\.\/BUN_INSPECT_TABLE\.md/g,
    replacement: "./BUN_INSPECT_TABLE.md",
    description: "Keep bun subdirectory file references intact",
    filePattern: "runtime/bun/",
  },
  {
    pattern: /\.\.\/BUN_UTILITIES_SUMMARY\.md/g,
    replacement: "../runtime/bun/BUN_UTILITIES_SUMMARY.md",
    description: "Fix BUN_UTILITIES_SUMMARY path",
  },
  {
    pattern: /\.\.\/BUN_UTILS_DASHBOARD\.md/g,
    replacement: "../runtime/bun/BUN_UTILS_DASHBOARD.md",
    description: "Fix BUN_UTILS_DASHBOARD path",
  },
];

function walkMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === ".git"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function shouldApplyFix(filePath: string, fix: LinkFix): boolean {
  if (!fix.filePattern) return true;
  return filePath.includes(fix.filePattern);
}

function applyFixes(): {
  totalFiles: number;
  filesModified: number;
  totalReplacements: number;
} {
  const mdFiles = walkMarkdownFiles(DOCS_DIR);
  let filesModified = 0;
  let totalReplacements = 0;

  console.log(`\n🔧 Fixing broken links in ${mdFiles.length} markdown files...\n`);

  for (const filePath of mdFiles) {
    let content = fs.readFileSync(filePath, "utf-8");
    const originalContent = content;
    let fileReplacements = 0;

    for (const fix of linkFixes) {
      if (shouldApplyFix(filePath, fix)) {
        const matches = content.match(fix.pattern);
        if (matches) {
          fileReplacements += matches.length;
          content = content.replace(fix.pattern, fix.replacement);
        }
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf-8");
      filesModified++;
      totalReplacements += fileReplacements;
      const relativePath = filePath.replace(DOCS_DIR, "");
      console.log(`✅ Fixed ${fileReplacements} links in ${relativePath}`);
    }
  }

  return {
    totalFiles: mdFiles.length,
    filesModified,
    totalReplacements,
  };
}

// Main execution
console.log("📄 Documentation Link Fixer");
console.log("===========================\n");

const result = applyFixes();

console.log(`\n✨ Link fixing complete!`);
console.log(`   Total files scanned: ${result.totalFiles}`);
console.log(`   Files modified: ${result.filesModified}`);
console.log(`   Total replacements: ${result.totalReplacements}`);
console.log(
  `\n📊 Next step: Run validation script to verify remaining broken links`
);
console.log(`   Command: bun scripts/validate-doc-links.ts\n`);
