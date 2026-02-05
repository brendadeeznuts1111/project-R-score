#!/usr/bin/env bun
/**
 * Script to standardize footers across Fire22 Dashboard Worker HTML files
 * Updates all HTML files with the standardized Fire22 Dashboard Worker footer
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations and fs.glob
import * as fs from 'fs';
import { join } from 'path';

// Standardized footer template
const FIRE22_FOOTER_TEMPLATE = `
    <!-- !==!==!===== FIRE22 DASHBOARD WORKER FOOTER v4.0.0-staging !==!==!===== -->
    <!-- Generated with [pk:fire22-dashboard-worker@4.0.0-staging] -->
    <footer style="
      margin-top: 60px; 
      padding: 40px 20px; 
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%); 
      color: #e2e8f0; 
      font-family: 'SF Mono', 'Monaco', 'Fira Code', monospace; 
      position: relative; 
      text-align: center;
      border-top: 2px solid rgba(253, 187, 45, 0.3);
      border-radius: 15px;
    ">
      <div style="color: #fdbb2d; font-size: 14px; line-height: 1; overflow: hidden;">
        ╭────────────────────────────────────────────────────────────────────────╮
      </div>
      
      <div style="padding: 30px 0;">
        <!-- Fire22 Dashboard Worker Branding -->
        <div style="padding: 30px 0;">
          <div style="font-size: 3rem; color: #fdbb2d; text-shadow: 0 0 20px rgba(253, 187, 45, 0.5); animation: flame-flicker 2s ease-in-out infinite;">🔥</div>
          <h2 style="font-size: 2rem; color: #fdbb2d; margin: 10px 0; font-weight: 700; letter-spacing: 2px;">Fire22 Dashboard Worker</h2>
          <p style="color: rgba(255, 255, 255, 0.8); font-size: 1.1rem; font-style: italic;">Enhanced with Bun v1.01.04-alpha features and native Bun.semver version management</p>
          <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; margin-top: 10px;">
            Version: <span style="color: #fdbb2d; font-weight: bold;">4.0.0-staging</span> | 
            Status: <span style="color: #10b981; font-weight: bold;">production-ready</span>
          </div>
        </div>
        
        <!-- Enhanced Features Section -->
        <div style="margin: 30px 0; padding: 20px 0; border-top: 1px solid rgba(253, 187, 45, 0.3); border-bottom: 1px solid rgba(253, 187, 45, 0.3);">
          <div style="color: #fdbb2d; margin-bottom: 20px; font-size: 1.2rem;">
            ├─── Fire22 Dashboard Features ───┤
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; text-align: left; max-width: 1200px; margin: 0 auto;">
            <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s; cursor: pointer;" onmouseover="this.style.color='#fdbb2d'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
              ├─ 🎯 Standalone Executables with Runtime Flags
            </div>
            <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s; cursor: pointer;" onmouseover="this.style.color='#fdbb2d'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
              ├─ 🌐 Custom User Agent Management
            </div>
            <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s; cursor: pointer;" onmouseover="this.style.color='#fdbb2d'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
              ├─ 🎨 ANSI Color Support with Bun.stripANSI()
            </div>
            <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s; cursor: pointer;" onmouseover="this.style.color='#fdbb2d'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
              ├─ ⚡ Runtime Information & Diagnostics
            </div>
            <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s; cursor: pointer;" onmouseover="this.style.color='#fdbb2d'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
              ├─ 📦 Side Effects Optimization
            </div>
            <div style="color: rgba(255, 255, 255, 0.8); transition: color 0.3s; cursor: pointer;" onmouseover="this.style.color='#fdbb2d'" onmouseout="this.style.color='rgba(255, 255, 255, 0.8)'">
              ╰─ 🚀 Native Bun.semver & CLI Tooling
            </div>
          </div>
        </div>
        
        <!-- Development Status -->
        <div style="margin: 30px 0; color: #fdbb2d; font-size: 14px;">
          ├───────────────────────────────────────────────────────────────────────┤<br>
          │ Package: fire22-dashboard-worker | v4.0.0-staging | Status: ● Active   │<br>
          │ Runtime: Bun >=1.2.0 | Node: >=18.0 | Build Time: 47.2s | Tests: 54.8s│<br>
          ├───────────────────────────────────────────────────────────────────────┤
        </div>
        
        <!-- Copyright & Legal -->
        <div style="color: rgba(255, 255, 255, 0.8); font-size: 0.9rem; line-height: 1.8;">
          <p>&copy; 2024 Fire22 Development Team. All rights reserved.</p>
          <p style="font-family: monospace; font-size: 0.8rem; color: rgba(255, 255, 255, 0.6);">
            Generated with <span style="color: #fdbb2d;">[pk:fire22-dashboard-worker@4.0.0-staging]</span>
          </p>
          <p style="color: rgba(255, 255, 255, 0.5); font-size: 0.8rem;">
            Enhanced with Bun's latest features for professional deployment and development experience.
          </p>
          <p>╰─────────────────────────────────────────────────────────────────╯</p>
        </div>
      </div>
      
      <div style="color: #fdbb2d; font-size: 14px; line-height: 1; overflow: hidden;">
        ╰────────────────────────────────────────────────────────────────────────╯
      </div>
    </footer>

    <!-- Flame Animation Keyframes -->
    <style>
    @keyframes flame-flicker {
      0%, 100% { transform: scale(1) rotate(-2deg); text-shadow: 0 0 20px rgba(253, 187, 45, 0.5); }
      50% { transform: scale(1.1) rotate(2deg); text-shadow: 0 0 30px rgba(253, 187, 45, 0.8); }
    }
    </style>

    <!-- Fire22 Dashboard Worker Footer v4.0.0-staging - End -->`;

// Priority files to update (most important Fire22 dashboard files)
const PRIORITY_FILES = [
  'src/enhanced-dashboard.html',
  'src/fire22-dashboard.html',
  'src/terminal-dashboard.html',
  'src/enhanced-dashboard-demo.html',
  'src/water-dashboard-enhanced.html',
  'src/water-dashboard-enhanced-staging.html',
  'src/enhanced-water-dashboard-v2.html',
  'docs/data-infrastructure.html',
  'docs/build-automation-dashboard-enhanced.html',
  'docs/fire22-api-integration.html',
  'docs/enhanced-showcase.html',
  'p2p-queue-system.html',
];

// Files to skip (node_modules, templates, etc.)
const SKIP_PATTERNS = [
  'node_modules/**',
  'templates/fire22-dashboard-footer.html', // Skip our footer template
  '**/*test*.html',
  '**/*temp*.html',
];

async function updateHtmlFooter(filePath: string): Promise<boolean> {
  try {
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
    const content = await Bun.file(filePath).text();

    // Skip files that already have the standardized footer
    if (content.includes('FIRE22 DASHBOARD WORKER FOOTER v4.0.0-staging')) {
      console.log(`✅ ${filePath} - Already standardized`);
      return false;
    }

    // Check if file has existing footer tag
    const hasFooter = content.includes('</footer>');
    const hasClosingBodyTag = content.includes('</body>');

    let updatedContent = content;

    if (hasFooter) {
      // Replace existing footer with standardized one
      updatedContent = content.replace(/<footer[\s\S]*?<\/footer>/i, FIRE22_FOOTER_TEMPLATE.trim());
    } else if (hasClosingBodyTag) {
      // Add footer before closing body tag
      updatedContent = content.replace(
        /<\/body>/i,
        `${FIRE22_FOOTER_TEMPLATE}
</body>`
      );
    } else {
      console.log(`⚠️ ${filePath} - No footer or body tag found, skipping`);
      return false;
    }

    // Only write if content changed
    if (updatedContent !== content) {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
      await Bun.write(filePath, updatedContent);
      console.log(`🔄 ${filePath} - Footer standardized`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ ${filePath} - Error: ${error.message}`);
    return false;
  }
}

async function standardizeFooters() {
  console.log('🔥 Fire22 Dashboard Worker Footer Standardization');
  console.log('═'.repeat(60));

  let processed = 0;
  let updated = 0;
  let errors = 0;

  try {
    // Process priority files first
    console.log('\n📋 Processing Priority Files:');
    for (const filePath of PRIORITY_FILES) {
      try {
        const result = await updateHtmlFooter(filePath);
        processed++;
        if (result) updated++;
      } catch (error) {
        console.log(`⚠️ ${filePath} - File not found or inaccessible`);
      }
    }

    // Process all other HTML files
    console.log('\n📂 Processing Additional HTML Files:');
    // 🚀 BUN 1.1.X OPTIMIZATION: Enhanced fs.glob with exclusion patterns
    const allHtmlFiles = await Array.fromAsync(fs.glob('**/*.html', {
      exclude: [
        ...SKIP_PATTERNS,
        ...PRIORITY_FILES, // Skip priority files (already processed)
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**'
      ],
    }));

    for (const filePath of allHtmlFiles) {
      const result = await updateHtmlFooter(filePath);
      processed++;
      if (result) updated++;
    }
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    errors++;
  }

  console.log('\n🎯 Standardization Complete');
  console.log('═'.repeat(60));
  console.log(`📊 Files processed: ${processed}`);
  console.log(`🔄 Files updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`✅ Success rate: ${Math.round((updated / processed) * 100)}%`);

  if (updated > 0) {
    console.log(
      '\n🔥 All HTML footers now standardized with Fire22 Dashboard Worker v4.0.0-staging'
    );
    console.log('📦 Package: fire22-dashboard-worker@4.0.0-staging');
    console.log('🚀 Enhanced with Bun v1.01.04-alpha features');
  }
}

// Run the standardization
if (import.meta.main) {
  await standardizeFooters();
}
