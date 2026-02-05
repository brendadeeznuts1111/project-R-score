#!/usr/bin/env bun

/**
 * HTML Import Demo Script
 * Demonstrates Bun's HTML import capabilities with our standardization framework
 *
 * Usage: bun run html-import-demo.ts
 */

import { bunUtils, dataUtils, styleUtils } from '../src/utils';
import { STATUS, SYSTEM_CONFIG } from '../src/globals';

interface HTMLAnalysis {
  filename: string;
  content: string;
  metadata: Record<string, string>;
  size: number;
  hasFrameworkCSS: boolean;
  hasInlineStyles: boolean;
  standardizationScore: number;
}

class HTMLImportDemo {
  private htmlFiles = [
    './docs/@packages.html',
    './docs/fire22-api-integration.html',
    './docs/packages.html',
    './docs/environment-variables.html',
    './docs/api-integrations-index.html',
    './p2p-queue-system.html',
  ];

  constructor() {
    console.log('🚀 HTML Import Demo Starting...\n');
  }

  /**
   * Run the complete HTML import demonstration
   */
  async runDemo(): Promise<void> {
    try {
      // 1. Import all HTML files
      console.log('📥 Step 1: Importing HTML files...');
      const htmlContents = await bunUtils.importMultipleHTML(this.htmlFiles);
      console.log(`✅ Successfully imported ${Object.keys(htmlContents).length} HTML files\n`);

      // 2. Analyze each file
      console.log('🔍 Step 2: Analyzing HTML files...');
      const analyses = await this.analyzeHTMLFiles(htmlContents);

      // 3. Display analysis results
      console.log('📊 Step 3: Analysis Results');
      this.displayAnalysisResults(analyses);

      // 4. Demonstrate live watching
      console.log('\n👀 Step 4: Setting up file watching...');
      await this.demonstrateFileWatching();

      // 5. Show standardization recommendations
      console.log('\n💡 Step 5: Standardization Recommendations');
      this.showStandardizationRecommendations(analyses);
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }

  /**
   * Analyze HTML files for standardization compliance
   */
  private async analyzeHTMLFiles(htmlContents: Record<string, string>): Promise<HTMLAnalysis[]> {
    const analyses: HTMLAnalysis[] = [];

    for (const [filename, content] of Object.entries(htmlContents)) {
      const metadata = bunUtils.extractHTMLMetadata(content);
      const size = new Blob([content]).size;

      // Check for standardization indicators
      const hasFrameworkCSS = content.includes('framework.css');
      const hasInlineStyles = content.includes('<style>') || content.includes('style=');

      // Calculate standardization score (0-100)
      let score = 0;
      if (hasFrameworkCSS) score += 40;
      if (!hasInlineStyles) score += 30;
      if (content.includes('var(--')) score += 20;
      if (content.includes('class="')) score += 10;

      analyses.push({
        filename,
        content,
        metadata,
        size,
        hasFrameworkCSS,
        hasInlineStyles,
        standardizationScore: score,
      });
    }

    return analyses;
  }

  /**
   * Display analysis results in a formatted table
   */
  private displayAnalysisResults(analyses: HTMLAnalysis[]): void {
    console.log('\n📋 HTML Files Analysis:');
    console.log('─'.repeat(100));
    console.log(
      'Filename'.padEnd(30) +
        'Size'.padEnd(10) +
        'Framework CSS'.padEnd(15) +
        'Inline Styles'.padEnd(15) +
        'Score'.padEnd(10)
    );
    console.log('─'.repeat(100));

    for (const analysis of analyses) {
      const sizeKB = (analysis.size / 1024).toFixed(1) + 'KB';
      const frameworkStatus = analysis.hasFrameworkCSS ? '✅ Yes' : '❌ No';
      const inlineStatus = analysis.hasInlineStyles ? '⚠️ Yes' : '✅ No';
      const score = analysis.standardizationScore.toString().padEnd(10);

      console.log(
        analysis.filename.padEnd(30) +
          sizeKB.padEnd(10) +
          frameworkStatus.padEnd(15) +
          inlineStatus.padEnd(15) +
          score
      );
    }

    console.log('─'.repeat(100));

    // Calculate overall statistics
    const totalFiles = analyses.length;
    const filesWithFramework = analyses.filter(a => a.hasFrameworkCSS).length;
    const filesWithoutInline = analyses.filter(a => !a.hasInlineStyles).length;
    const avgScore = analyses.reduce((sum, a) => sum + a.standardizationScore, 0) / totalFiles;

    console.log(`\n📊 Overall Statistics:`);
    console.log(`   Total Files: ${totalFiles}`);
    console.log(
      `   Using Framework CSS: ${filesWithFramework}/${totalFiles} (${((filesWithFramework / totalFiles) * 100).toFixed(1)}%)`
    );
    console.log(
      `   No Inline Styles: ${filesWithoutInline}/${totalFiles} (${((filesWithoutInline / totalFiles) * 100).toFixed(1)}%)`
    );
    console.log(`   Average Standardization Score: ${avgScore.toFixed(1)}/100`);
  }

  /**
   * Demonstrate file watching capabilities
   */
  private async demonstrateFileWatching(): Promise<void> {
    const demoFile = './docs/@packages.html';

    console.log(`   Watching ${demoFile} for changes...`);
    console.log('   (Make changes to the file to see live updates)');

    const unwatch = bunUtils.watchHTML(demoFile, newContent => {
      const size = new Blob([newContent]).size;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`   🔄 File updated at ${timestamp} - New size: ${(size / 1024).toFixed(1)}KB`);
    });

    // Keep watching for a few seconds to demonstrate
    await new Promise(resolve => setTimeout(resolve, 5000));
    unwatch();
    console.log('   ✅ File watching demonstration complete');
  }

  /**
   * Show recommendations for improving standardization
   */
  private showStandardizationRecommendations(analyses: HTMLAnalysis[]): void {
    const needsImprovement = analyses.filter(a => a.standardizationScore < 70);

    if (needsImprovement.length === 0) {
      console.log('🎉 All files are well standardized!');
      return;
    }

    console.log(`⚠️  ${needsImprovement.length} files need standardization improvements:`);

    for (const analysis of needsImprovement) {
      console.log(`\n📁 ${analysis.filename} (Score: ${analysis.standardizationScore}/100)`);

      if (!analysis.hasFrameworkCSS) {
        console.log('   ➕ Add framework.css import');
      }

      if (analysis.hasInlineStyles) {
        console.log('   🔄 Convert inline styles to CSS classes');
      }

      if (!analysis.content.includes('var(--')) {
        console.log('   🎨 Use CSS custom properties for consistent theming');
      }
    }

    console.log('\n💡 Quick Fix Commands:');
    console.log('   bun run standardize:html    # Apply standardization to all HTML files');
    console.log('   bun run validate:css        # Validate CSS framework usage');
    console.log('   bun run audit:styles        # Audit inline styles and suggest improvements');
  }

  /**
   * Generate a standardization report
   */
  async generateReport(): Promise<string> {
    const htmlContents = await bunUtils.importMultipleHTML(this.htmlFiles);
    const analyses = await this.analyzeHTMLFiles(htmlContents);

    let report = '# HTML Standardization Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Files: ${analyses.length}\n\n`;

    report += '## File Analysis\n\n';
    report += '| File | Size | Framework CSS | Inline Styles | Score |\n';
    report += '|------|------|---------------|---------------|-------|\n';

    for (const analysis of analyses) {
      const sizeKB = (analysis.size / 1024).toFixed(1) + 'KB';
      const frameworkStatus = analysis.hasFrameworkCSS ? '✅' : '❌';
      const inlineStatus = analysis.hasInlineStyles ? '⚠️' : '✅';

      report += `| ${analysis.filename} | ${sizeKB} | ${frameworkStatus} | ${inlineStatus} | ${analysis.standardizationScore}/100 |\n`;
    }

    return report;
  }
}

// Main execution
async function main() {
  const demo = new HTMLImportDemo();

  // Check if --report flag is provided
  if (process.argv.includes('--report')) {
    const report = await demo.generateReport();
    console.log(report);
    return;
  }

  await demo.runDemo();
}

// Run if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { HTMLImportDemo };
