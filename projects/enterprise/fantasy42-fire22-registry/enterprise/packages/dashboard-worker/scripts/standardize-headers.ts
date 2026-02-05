#!/usr/bin/env bun
/**
 * Header Standardization Script for Fire22 Dashboard Worker
 * Standardizes all HTML and Markdown headers across the project
 */

import { promises as fs } from 'fs';
import path from 'path';

const VERSION = '4.0.0-staging';

// Header patterns for different file types
const HEADER_PATTERNS = {
  html: {
    pattern: /<title>(.*?)<\/title>/gi,
    format: (content: string, icon: string, name: string) =>
      `<title>${icon} Fire22 ${name} - ${content} v${VERSION}</title>`,
  },
  md: {
    pattern: /^# (.+?)$/m,
    format: (content: string, icon: string, name: string) =>
      `# ${icon} Fire22 ${name} - ${content} v${VERSION}`,
  },
};

// File categorization with icons and names
const FILE_CATEGORIES = {
  // HTML Files
  'water-dashboard-enhanced.html': {
    icon: '🌊',
    name: 'Water Dashboard',
    type: 'Enhanced Edition',
  },
  'dashboard.html': { icon: '🚀', name: 'Manager Dashboard', type: 'Core Edition' },
  'unified-dashboard.html': { icon: '🚀', name: 'Unified Dashboard', type: 'Complete System' },
  'staging-review.html': { icon: '🎬', name: 'Staging Review Dashboard', type: 'Build Review' },
  'terminal-dashboard.html': { icon: '🔥', name: 'Terminal Dashboard', type: 'CLI Interface' },
  'performance-dashboard.html': { icon: '📊', name: 'Performance Dashboard', type: 'Analytics' },
  'fire22-dashboard.html': { icon: '🔥', name: 'Integrated Dashboard', type: 'Main Hub' },

  // Documentation Files
  'auth.md': { icon: '🔐', name: 'Dashboard', type: 'Authentication API' },
  'optimization.md': { icon: '🚀', name: 'Dashboard', type: 'Database Optimization Guide' },
  'database-schemas.md': { icon: '🗄️', name: 'Dashboard', type: 'Database Schemas' },
  'connection.md': { icon: '🔗', name: 'Dashboard', type: 'Database Connection Guide' },
  'rate-limits.md': { icon: '⚡', name: 'Dashboard', type: 'API Rate Limiting' },

  // Generic patterns for uncategorized files
  dashboard: { icon: '🚀', name: 'Dashboard', type: 'System' },
  api: { icon: '🔗', name: 'API', type: 'Integration' },
  security: { icon: '🛡️', name: 'Security', type: 'Protection' },
  monitoring: { icon: '📊', name: 'Monitoring', type: 'Analytics' },
  terminal: { icon: '💻', name: 'Terminal', type: 'Interface' },
};

function categorizeFile(filePath: string): { icon: string; name: string; type: string } {
  const fileName = path.basename(filePath);

  // Check specific file mappings first
  if (FILE_CATEGORIES[fileName as keyof typeof FILE_CATEGORIES]) {
    return FILE_CATEGORIES[fileName as keyof typeof FILE_CATEGORIES];
  }

  // Check for patterns in filename
  for (const [pattern, config] of Object.entries(FILE_CATEGORIES)) {
    if (fileName.toLowerCase().includes(pattern)) {
      return config;
    }
  }

  // Default categorization
  return { icon: '🔥', name: 'Fire22', type: 'System' };
}

async function standardizeHtmlHeaders(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const category = categorizeFile(filePath);

    const updatedContent = content.replace(HEADER_PATTERNS.html.pattern, (match, title) => {
      // Clean up existing title - more comprehensive cleaning
      const cleanTitle = title
        .replace(/^(🌊|🚀|🎬|🔥|📊|🗄️|🔐|⚡|🛡️|💻|🔗)\s*/, '') // Remove existing icons
        .replace(/Fire22\s*/, '') // Remove Fire22 prefix
        .replace(/Dashboard\s*-\s*/, '') // Remove "Dashboard - " patterns
        .replace(
          /\s*-\s*(Enhanced Edition|Core Edition|Complete System|Build Review|CLI Interface|Analytics|Main Hub|Manager Dashboard)\s*/g,
          ''
        ) // Remove existing types
        .replace(/\s*v?\d+\.\d+\.\d+(-\w+)?\s*🔥?\s*/g, '') // Remove all versions
        .replace(/\s*🔥\s*$/, '') // Remove trailing fire emoji
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return HEADER_PATTERNS.html.format(cleanTitle || category.type, category.icon, category.name);
    });

    if (updatedContent !== content) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      console.log(`✅ Updated HTML header: ${path.basename(filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function standardizeMarkdownHeaders(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const category = categorizeFile(filePath);

    const updatedContent = content.replace(HEADER_PATTERNS.md.pattern, (match, title) => {
      // Clean up existing title - comprehensive cleaning for markdown
      const cleanTitle = title
        .replace(/^(🌊|🚀|🎬|🔥|📊|🗄️|🔐|⚡|🛡️|💻|🔗)\s*/, '') // Remove existing icons
        .replace(/Fire22\s*/, '') // Remove Fire22 prefix
        .replace(/Dashboard\s*-\s*/, '') // Remove "Dashboard - " patterns
        .replace(
          /\s*-\s*(Enhanced Edition|Core Edition|Complete System|Build Review|CLI Interface|Analytics|Main Hub|Database Optimization Guide|Authentication API|Database Schemas)\s*/g,
          ''
        ) // Remove existing types
        .replace(/\s*v?\d+\.\d+\.\d+(-\w+)?\s*/g, '') // Remove all versions
        .replace(/\s*-\s*staging\s*/g, '') // Remove loose "staging" text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return HEADER_PATTERNS.md.format(cleanTitle || category.type, category.icon, category.name);
    });

    if (updatedContent !== content) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      console.log(`✅ Updated Markdown header: ${path.basename(filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log(`🔧 Fire22 Header Standardization Script v${VERSION}`);
  console.log('!==!==!==!==!==!==!==');

  let totalUpdates = 0;

  // Define target files manually for Bun compatibility
  const targetFiles = [
    // HTML files
    'src/water-dashboard-enhanced.html',
    'src/dashboard.html',
    'src/unified-dashboard.html',
    'src/staging-review.html',
    'src/terminal-dashboard.html',
    'src/performance-dashboard.html',
    'src/fire22-dashboard.html',
    'src/enhanced-dashboard.html',
    'src/water-dashboard.html',
    'FIRE22-DASHBOARD-WORKER-REFERENCE.html',

    // Documentation files
    'docs/api/auth.md',
    'docs/database/optimization.md',
    'docs/database/connection.md',
    'docs/database-schemas.md',
    'SECURITY-INTEGRATION-GUIDE.md',
  ];

  console.log('\n📄 Processing target files...');

  for (const file of targetFiles) {
    try {
      await fs.access(file);
      const isHtml = file.endsWith('.html');
      const updated = isHtml
        ? await standardizeHtmlHeaders(file)
        : await standardizeMarkdownHeaders(file);
      if (updated) totalUpdates++;
    } catch (error) {
      console.log(`⚠️  File not found: ${file}`);
    }
  }

  console.log('\n🎉 Header Standardization Complete!');
  console.log(`📊 Total files updated: ${totalUpdates}`);
  console.log(`🚀 Version: ${VERSION}`);
  console.log('!==!==!==!==!==!==!==');
}

// Run the script
if (import.meta.main) {
  main().catch(console.error);
}
