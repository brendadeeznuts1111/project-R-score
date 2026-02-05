#!/usr/bin/env bun
/**
 * 🔧 Quick Fix for Localhost URLs
 * 
 * Automatically replaces hardcoded example.com URLs with environment variables
 */

import { readFileSync, writeFileSync } from "fs";

const fixes = [
  {
    file: 'lib/url-discovery-validator.ts',
    replacements: [
      {
        from: 'http://example.com',
        to: 'process.env.API_BASE_URL || "http://example.com"'
      },
      {
        from: 'http://example.com/api/v1/metrics',
        to: '${process.env.API_BASE_URL || "http://example.com"}/api/v1/metrics'
      },
      {
        from: 'http://example.com/health',
        to: '${process.env.API_BASE_URL || "http://example.com"}/health'
      },
      {
        from: 'http://example.com/api/v1/graph',
        to: '${process.env.API_BASE_URL || "http://example.com"}/api/v1/graph'
      }
    ]
  },
  {
    file: 'lib/security/mcp-server.ts',
    replacements: [
      {
        from: 'http://example.com',
        to: 'process.env.API_BASE_URL || "http://example.com"'
      }
    ]
  }
];

function applyFixes() {
  console.log('🔧 Applying example.com URL fixes...\n');
  
  let totalFixes = 0;
  
  for (const fix of fixes) {
    try {
      let content = readFileSync(fix.file, 'utf8');
      let fileFixes = 0;
      
      for (const replacement of fix.replacements) {
        const before = content;
        content = content.replace(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.to);
        
        if (content !== before) {
          const count = (before.match(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          console.log(`✅ Fixed ${count} occurrences in ${fix.file}`);
          console.log(`   ${replacement.from} → ${replacement.to}`);
          fileFixes += count;
        }
      }
      
      if (fileFixes > 0) {
        writeFileSync(fix.file, content);
        totalFixes += fileFixes;
      }
      
    } catch (error) {
      console.warn(`⚠️  Could not process ${fix.file}: ${error.message}`);
    }
  }
  
  console.log(`\n🎯 Applied ${totalFixes} fixes total`);
  
  if (totalFixes > 0) {
    console.log('\n💡 Next steps:');
    console.log('1. Run "bun run url:check" to verify fixes');
    console.log('2. Test the updated files to ensure they work correctly');
    console.log('3. Commit the changes');
  } else {
    console.log('\nℹ️  No fixes needed - URLs already properly configured');
  }
}

if (import.meta.main) {
  applyFixes();
}
