#!/usr/bin/env bun
/**
 * Documentation Link Validator
 * Validates all internal links in markdown documentation
 * Generates comprehensive report of broken/valid links
 */

import * as fs from "fs";
import * as path from "path";

interface LinkInfo {
  file: string;
  linkText: string;
  destination: string;
  lineNumber: number;
  isExternal: boolean;
  isAnchor: boolean;
  resolvedPath?: string;
  isValid?: boolean;
  error?: string;
}

interface ValidationResult {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  externalLinks: number;
  anchorOnlyLinks: number;
  links: LinkInfo[];
}

const DOCS_DIR = "/Users/nolarose/geelark/docs";
const PROJECT_ROOT = "/Users/nolarose/geelark";

// Regular expression to match markdown links [text](url)
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

// External URL patterns
const EXTERNAL_URL_PATTERNS = [
  /^https?:\/\//,
  /^mailto:/,
  /^ftp:\/\//,
  /^www\./,
];

function isExternalLink(destination: string): boolean {
  return EXTERNAL_URL_PATTERNS.some((pattern) => pattern.test(destination));
}

function isAnchorLink(destination: string): boolean {
  return destination.startsWith("#");
}

function resolveFilePath(
  currentFile: string,
  linkDestination: string
): string | null {
  // Remove anchor from destination
  const [filePath] = linkDestination.split("#");

  if (!filePath) {
    // Pure anchor link
    return null;
  }

  // Get directory of current file
  const currentDir = path.dirname(currentFile);

  // Resolve relative path
  const resolvedPath = path.resolve(currentDir, filePath);

  // Normalize path
  const normalizedPath = path.normalize(resolvedPath);

  return normalizedPath;
}

function fileExists(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function extractLinks(filePath: string, content: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  let match;
  let lineNumber = 1;

  // Count lines to get line numbers (simplified)
  const lines = content.split("\n");
  let charCount = 0;

  while ((match = LINK_REGEX.exec(content)) !== null) {
    const linkText = match[1];
    const destination = match[2];
    const matchIndex = match.index;

    // Calculate line number
    lineNumber = content.substring(0, matchIndex).split("\n").length;

    const isExternal = isExternalLink(destination);
    const isAnchor = isAnchorLink(destination);
    const resolvedPathValue = !isExternal && !isAnchor ? resolveFilePath(filePath, destination) : undefined;
    const resolvedPath = resolvedPathValue || undefined;

    links.push({
      file: filePath.replace(PROJECT_ROOT, ""),
      linkText,
      destination,
      lineNumber,
      isExternal,
      isAnchor,
      resolvedPath,
      isValid: isExternal || isAnchor ? undefined : fileExists(resolvedPath || ""),
      error: !isExternal && !isAnchor && !fileExists(resolvedPath || "") ? `File not found: ${resolvedPath}` : undefined,
    });
  }

  return links;
}

function walkDirectory(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip hidden directories and specific directories
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

function validateAllLinks(): ValidationResult {
  const mdFiles = walkDirectory(DOCS_DIR);
  const allLinks: LinkInfo[] = [];

  for (const file of mdFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const links = extractLinks(file, content);
      allLinks.push(...links);
    } catch (error) {
      console.error(`Error reading file ${file}:`, error);
    }
  }

  const result: ValidationResult = {
    totalLinks: allLinks.length,
    validLinks: allLinks.filter((l) => l.isValid === true).length,
    brokenLinks: allLinks.filter((l) => l.isValid === false).length,
    externalLinks: allLinks.filter((l) => l.isExternal).length,
    anchorOnlyLinks: allLinks.filter((l) => l.isAnchor).length,
    links: allLinks,
  };

  return result;
}

function generateReport(result: ValidationResult): string {
  let report = `# Documentation Link Validation Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Links**: ${result.totalLinks}\n`;
  report += `- **Valid Links**: ${result.validLinks} ✅\n`;
  report += `- **Broken Links**: ${result.brokenLinks} ❌\n`;
  report += `- **External Links**: ${result.externalLinks} 🔗\n`;
  report += `- **Anchor-Only Links**: ${result.anchorOnlyLinks} #\n`;
  report += `- **Internal Links (to verify)**: ${result.validLinks + result.brokenLinks}\n\n`;

  report += `## Broken Links (${result.brokenLinks})\n\n`;

  const brokenLinks = result.links.filter((l) => l.isValid === false);

  if (brokenLinks.length === 0) {
    report += `✅ No broken links found!\n\n`;
  } else {
    report += `| File | Link Text | Destination | Line | Error |\n`;
    report += `|------|-----------|-------------|------|-------|\n`;

    for (const link of brokenLinks) {
      report += `| ${link.file} | \`${link.linkText}\` | \`${link.destination}\` | ${link.lineNumber} | ${link.error} |\n`;
    }

    report += `\n`;
  }

  report += `## Valid Internal Links (${result.validLinks})\n\n`;

  const validLinks = result.links.filter((l) => l.isValid === true);

  if (validLinks.length > 0) {
    report += `| File | Link Text | Destination | Line |\n`;
    report += `|------|-----------|-------------|------|\n`;

    for (const link of validLinks.slice(0, 20)) {
      report += `| ${link.file} | \`${link.linkText}\` | \`${link.destination}\` | ${link.lineNumber} |\n`;
    }

    if (validLinks.length > 20) {
      report += `\n... and ${validLinks.length - 20} more valid links.\n\n`;
    }
  }

  report += `## External Links (${result.externalLinks})\n\n`;

  const externalLinks = result.links.filter((l) => l.isExternal);

  if (externalLinks.length > 0) {
    report += `| File | Link Text | Destination |\n`;
    report += `|------|-----------|-------------|\n`;

    for (const link of externalLinks.slice(0, 15)) {
      report += `| ${link.file} | \`${link.linkText}\` | \`${link.destination}\` |\n`;
    }

    if (externalLinks.length > 15) {
      report += `\n... and ${externalLinks.length - 15} more external links.\n\n`;
    }
  }

  report += `## Anchor-Only Links (${result.anchorOnlyLinks})\n\n`;

  const anchorLinks = result.links.filter((l) => l.isAnchor);

  if (anchorLinks.length > 0) {
    report += `Anchor-only links found: ${anchorLinks.length}\n`;
    report += `These are internal page anchors that link to sections within the same file.\n\n`;
  }

  report += `## Recommendations\n\n`;
  report += `1. Review and fix broken links listed above\n`;
  report += `2. Update relative paths that no longer exist\n`;
  report += `3. Check file reorganization impact on internal links\n`;
  report += `4. Consider using absolute paths for consistency\n`;
  report += `5. Add link validation to CI/CD pipeline\n\n`;

  return report;
}

// Main execution
console.log("🔍 Validating documentation links...\n");

const result = validateAllLinks();
const report = generateReport(result);

// Output report to file
const reportPath = "/Users/nolarose/geelark/docs/reference/LINK_VALIDATION_REPORT.md";
fs.writeFileSync(reportPath, report);

// Output summary to console
console.log(report);

console.log(`\n📄 Full report saved to: ${reportPath}`);
console.log(`\n✨ Validation complete!`);
