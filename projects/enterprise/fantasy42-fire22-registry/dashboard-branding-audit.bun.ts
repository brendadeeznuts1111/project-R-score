#!/usr/bin/env bun

/**
 * 🎨 Comprehensive Dashboard Branding Audit
 *
 * Audits all HTML dashboards and design artifacts for Fire22 branding compliance
 * Generates detailed compliance reports and R2 registry upload recommendations
 */

import * as fs from 'fs';
import * as path from 'path';

// Fire22 Brand Guidelines
const FIRE22_BRAND = {
  colors: {
    primary: '#2563eb', // Blue-600
    secondary: '#64748b', // Slate-500
    accent: '#f59e0b', // Amber-500
    success: '#10b981', // Emerald-500
    error: '#ef4444', // Red-500
    info: '#06b6d4', // Cyan-500
    warning: '#f59e0b', // Amber-500
    background: '#f8fafc', // Slate-50
    surface: '#ffffff', // White
    text: {
      primary: '#1e293b', // Slate-800
      secondary: '#64748b', // Slate-500
      muted: '#94a3b8', // Slate-400
    },
  },
  typography: {
    fonts: ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Inter', 'system-ui', '-apple-system'],
    sizes: {
      h1: ['32px', '48px', 'clamp(32px, 5vw, 48px)'],
      h2: ['24px', '32px'],
      h3: ['20px', '24px'],
      body: ['16px', '18px'],
      small: ['14px', '12px'],
    },
  },
  spacing: {
    units: ['4px', '8px', '16px', '20px', '24px', '32px', '40px', '48px', '64px'],
    scale: [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32],
  },
};

// Audit Rules
interface AuditRule {
  name: string;
  description: string;
  check: (content: string, filePath: string) => AuditResult;
  severity: 'critical' | 'major' | 'minor' | 'info';
}

interface AuditResult {
  passed: boolean;
  message: string;
  details?: any;
  suggestions?: string[];
}

// Branding Audit Rules
const BRANDING_RULES: AuditRule[] = [
  {
    name: 'Brand Colors Usage',
    description: 'Use approved Fire22 brand colors consistently',
    severity: 'major',
    check: (content: string) => {
      // Flatten all brand colors including nested text colors
      const brandColors = [
        FIRE22_BRAND.colors.primary,
        FIRE22_BRAND.colors.secondary,
        FIRE22_BRAND.colors.accent,
        FIRE22_BRAND.colors.success,
        FIRE22_BRAND.colors.error,
        FIRE22_BRAND.colors.info,
        FIRE22_BRAND.colors.warning,
        FIRE22_BRAND.colors.background,
        FIRE22_BRAND.colors.surface,
        FIRE22_BRAND.colors.text.primary,
        FIRE22_BRAND.colors.text.secondary,
        FIRE22_BRAND.colors.text.muted,
      ];

      const usedColors = extractColorsFromCSS(content);
      const compliantColors = usedColors.filter(color =>
        brandColors.some(
          brandColor =>
            typeof brandColor === 'string' && color.toLowerCase() === brandColor.toLowerCase()
        )
      );

      const nonCompliantColors = usedColors.filter(
        color =>
          !brandColors.some(
            brandColor =>
              typeof brandColor === 'string' && color.toLowerCase() === brandColor.toLowerCase()
          )
      );

      return {
        passed: nonCompliantColors.length === 0,
        message: `Found ${compliantColors.length} compliant colors, ${nonCompliantColors.length} non-compliant`,
        details: {
          compliant: compliantColors,
          nonCompliant: nonCompliantColors,
          total: usedColors.length,
        },
        suggestions:
          nonCompliantColors.length > 0
            ? [
                'Replace non-compliant colors with brand colors',
                'Use CSS custom properties for consistent theming',
                'Reference the brand color palette in your styles',
              ]
            : [],
      };
    },
  },
  {
    name: 'Typography Consistency',
    description: 'Use approved Fire22 fonts and sizing',
    severity: 'major',
    check: (content: string) => {
      const approvedFonts = FIRE22_BRAND.typography.fonts;
      const usedFonts = extractFontsFromCSS(content);
      const compliantFonts = usedFonts.filter(font =>
        approvedFonts.some(approved => font.toLowerCase().includes(approved.toLowerCase()))
      );

      return {
        passed: compliantFonts.length === usedFonts.length,
        message: `Found ${compliantFonts.length}/${usedFonts.length} compliant fonts`,
        details: {
          compliant: compliantFonts,
          nonCompliant: usedFonts.filter(f => !compliantFonts.includes(f)),
        },
        suggestions:
          compliantFonts.length < usedFonts.length
            ? [
                'Use SF Mono, Inter, or system fonts for consistency',
                'Define font stacks in CSS custom properties',
                'Ensure monospace fonts for code elements',
              ]
            : [],
      };
    },
  },
  {
    name: 'Accessibility Compliance',
    description: 'Ensure proper contrast and accessibility standards',
    severity: 'critical',
    check: (content: string) => {
      const issues: string[] = [];

      // Check for missing alt attributes
      const imgTags = content.match(/<img[^>]*>/gi) || [];
      const missingAlt = imgTags.filter(tag => !tag.includes('alt='));
      if (missingAlt.length > 0) {
        issues.push(`${missingAlt.length} images missing alt attributes`);
      }

      // Check for proper heading structure
      const headings = content.match(/<h[1-6][^>]*>/gi) || [];
      const headingLevels = headings.map(h => parseInt(h.match(/h([1-6])/i)?.[1] || '0'));
      const hasProperStructure = headingLevels.every((level, index) => {
        if (index === 0) return level === 1;
        return level <= headingLevels[index - 1] + 1;
      });
      if (!hasProperStructure) {
        issues.push('Heading structure may not be properly nested');
      }

      return {
        passed: issues.length === 0,
        message:
          issues.length === 0
            ? 'Accessibility standards met'
            : `${issues.length} accessibility issues found`,
        details: { issues },
        suggestions:
          issues.length > 0
            ? [
                'Add alt attributes to all images',
                'Ensure proper heading hierarchy (h1 → h2 → h3)',
                'Test with screen readers and accessibility tools',
              ]
            : [],
      };
    },
  },
  {
    name: 'Responsive Design',
    description: 'Ensure mobile-friendly responsive design',
    severity: 'major',
    check: (content: string) => {
      const hasViewport = content.includes('viewport');
      const hasMediaQueries = content.includes('@media');
      const hasFlexbox = content.includes('display: flex') || content.includes('display:flex');
      const hasGrid = content.includes('display: grid') || content.includes('display:grid');

      const responsiveFeatures = [hasViewport, hasMediaQueries, hasFlexbox || hasGrid];
      const score = responsiveFeatures.filter(Boolean).length;

      return {
        passed: score >= 2,
        message: `Responsive score: ${score}/3 (viewport: ${hasViewport}, media: ${hasMediaQueries}, layout: ${hasFlexbox || hasGrid})`,
        details: {
          viewport: hasViewport,
          mediaQueries: hasMediaQueries,
          modernLayout: hasFlexbox || hasGrid,
        },
        suggestions: [
          hasViewport ? null : 'Add viewport meta tag',
          hasMediaQueries ? null : 'Add responsive media queries',
          hasFlexbox || hasGrid ? null : 'Use flexbox or grid for layouts',
        ].filter(Boolean) as string[],
      };
    },
  },
  {
    name: 'Performance Optimization',
    description: 'Check for performance best practices',
    severity: 'minor',
    check: (content: string) => {
      const issues: string[] = [];

      // Check for excessive inline styles
      const inlineStyles = (content.match(/style="[^"]*"/g) || []).length;
      if (inlineStyles > 20) {
        issues.push(`High number of inline styles (${inlineStyles})`);
      }

      // Check for large images without lazy loading
      const imgTags = content.match(/<img[^>]*>/gi) || [];
      const nonLazyImages = imgTags.filter(tag => !tag.includes('loading='));
      if (nonLazyImages.length > 5) {
        issues.push(`${nonLazyImages.length} images without lazy loading`);
      }

      // Check for uncompressed assets
      const assetUrls =
        content.match(/https?:\/\/[^"'\s]+\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)/gi) || [];
      const uncompressedAssets = assetUrls.filter(
        url => !url.includes('.min.') && !url.includes('cdn.jsdelivr.net')
      );
      if (uncompressedAssets.length > 10) {
        issues.push(`${uncompressedAssets.length} potentially uncompressed assets`);
      }

      return {
        passed: issues.length === 0,
        message:
          issues.length === 0
            ? 'Performance optimizations applied'
            : `${issues.length} performance issues found`,
        details: { issues },
        suggestions:
          issues.length > 0
            ? [
                'Minify CSS and JavaScript assets',
                'Add lazy loading to images',
                'Use external CDNs for libraries',
                'Reduce inline styles, prefer external stylesheets',
              ]
            : [],
      };
    },
  },
];

// Helper Functions
function extractColorsFromCSS(content: string): string[] {
  const colors: string[] = [];

  // Extract hex colors
  const hexRegex = /#[a-fA-F0-9]{6}/g;
  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    colors.push(match[0]);
  }

  // Extract RGB/RGBA colors
  const rgbRegex = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/g;
  while ((match = rgbRegex.exec(content)) !== null) {
    colors.push(`rgb(${match[1]}, ${match[2]}, ${match[3]})`);
  }

  // Extract HSL colors
  const hslRegex = /hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/g;
  while ((match = hslRegex.exec(content)) !== null) {
    colors.push(`hsl(${match[1]}, ${match[2]}%, ${match[3]}%)`);
  }

  return [...new Set(colors)];
}

function extractFontsFromCSS(content: string): string[] {
  const fonts: string[] = [];

  // Extract font-family declarations
  const fontRegex = /font-family:\s*([^;]+)/gi;
  let match;
  while ((match = fontRegex.exec(content)) !== null) {
    const fontValue = match[1].trim();
    // Split font stacks and extract individual fonts
    const fontList = fontValue.split(',').map(f => f.trim().replace(/['"]/g, ''));
    fonts.push(...fontList);
  }

  return [...new Set(fonts)];
}

// Main Audit Function
async function auditDashboard(filePath: string): Promise<{
  file: string;
  results: Array<{ rule: AuditRule; result: AuditResult }>;
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    critical: number;
    major: number;
    minor: number;
    info: number;
    score: number;
  };
}> {
  const content = await Bun.file(filePath).text();
  const results: Array<{ rule: AuditRule; result: AuditResult }> = [];

  for (const rule of BRANDING_RULES) {
    try {
      const result = rule.check(content, filePath);
      results.push({ rule, result });
    } catch (error) {
      console.warn(`Error auditing ${rule.name} for ${filePath}:`, error);
      results.push({
        rule,
        result: {
          passed: false,
          message: `Audit failed: ${error.message}`,
          suggestions: ['Review audit implementation'],
        },
      });
    }
  }

  // Calculate summary
  const passed = results.filter(r => r.result.passed).length;
  const failed = results.length - passed;
  const critical = results.filter(r => !r.result.passed && r.rule.severity === 'critical').length;
  const major = results.filter(r => !r.result.passed && r.rule.severity === 'major').length;
  const minor = results.filter(r => !r.result.passed && r.rule.severity === 'minor').length;
  const info = results.filter(r => !r.result.passed && r.rule.severity === 'info').length;
  const score = Math.round((passed / results.length) * 100);

  return {
    file: path.relative(process.cwd(), filePath),
    results,
    summary: {
      totalRules: results.length,
      passed,
      failed,
      critical,
      major,
      minor,
      info,
      score,
    },
  };
}

// Generate R2 Registry Upload Script
function generateRegistryUploadScript(
  auditResults: Array<ReturnType<typeof auditDashboard> extends Promise<infer T> ? T : never>
): string {
  const uploadScript = `#!/usr/bin/env bun

/**
 * 🚀 Fire22 Registry R2 Upload Script
 *
 * Uploads audited dashboards and design artifacts to R2 registry
 * Generated from branding audit results
 */

import { BunR2Client } from './src/utils/bun-r2-client.ts';

const r2Client = new BunR2Client({
  endpoint: process.env.R2_ENDPOINT || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  region: process.env.R2_REGION || 'auto',
  bucket: process.env.R2_BUCKET || 'fire22-registry',
});

const DASHBOARDS_TO_UPLOAD = [
${auditResults
  .map(
    result => `  {
    file: '${result.file}',
    key: 'dashboards/${path.basename(result.file)}',
    compliance: ${result.summary.score},
    criticalIssues: ${result.summary.critical},
    metadata: {
      'compliance-score': '${result.summary.score}',
      'audit-date': '${new Date().toISOString()}',
      'critical-issues': '${result.summary.critical}',
      'branding-compliant': '${result.summary.critical === 0}',
    }
  }`
  )
  .join(',\n')}
];

async function uploadDashboards() {
  console.log('🚀 Starting Fire22 Registry Upload...');
  console.log('📊 Dashboard Compliance Summary:');
  console.log('=====================================');

${auditResults.map(result => `  console.log('📄 ${result.file}: ${result.summary.score}% (${result.summary.critical} critical, ${result.summary.major} major, ${result.summary.minor} minor)');`).join('\n')}

  console.log('\\n📤 Uploading dashboards to R2...');

  for (const dashboard of DASHBOARDS_TO_UPLOAD) {
    try {
      const content = await Bun.file(dashboard.file).arrayBuffer();
      const uploadResult = await r2Client.putObject(dashboard.key, content, {
        contentType: 'text/html',
        metadata: dashboard.metadata,
        cacheControl: 'public, max-age=3600'
      });

      if (uploadResult.ok) {
        console.log('✅ Uploaded:', dashboard.key);
      } else {
        console.log('❌ Failed to upload:', dashboard.key);
      }
    } catch (error) {
      console.error('❌ Upload error for', dashboard.key, ':', error.message);
    }
  }

  console.log('\\n🎉 Registry upload complete!');
  console.log('🔗 Access your dashboards at: https://registry.fire22.dev/dashboards/');
}

uploadDashboards().catch(console.error);
`;

  return uploadScript;
}

// Main Execution
async function main() {
  console.log('🎨 Fire22 Dashboard Branding Audit');
  console.log('===================================\n');

  // Find all HTML dashboards
  const dashboardFiles = await Array.fromAsync(
    new Bun.Glob('**/*.html').scan({
      cwd: process.cwd(),
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
    })
  );

  console.log(`📁 Found ${dashboardFiles.length} HTML files to audit\n`);

  // Audit each dashboard
  const auditResults: Array<Awaited<ReturnType<typeof auditDashboard>>> = [];

  for (const file of dashboardFiles.slice(0, 10)) {
    // Limit for demo
    console.log(`🔍 Auditing: ${file}`);
    try {
      const result = await auditDashboard(file);
      auditResults.push(result);

      console.log(
        `   📊 Score: ${result.summary.score}% (${result.summary.passed}/${result.summary.totalRules} rules passed)`
      );
      if (result.summary.critical > 0) {
        console.log(`   🚨 Critical Issues: ${result.summary.critical}`);
      }
      if (result.summary.major > 0) {
        console.log(`   ⚠️  Major Issues: ${result.summary.major}`);
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to audit ${file}:`, error.message);
    }
  }

  // Generate comprehensive report
  console.log('📋 Audit Summary Report');
  console.log('=======================\n');

  const totalFiles = auditResults.length;
  const avgScore = Math.round(
    auditResults.reduce((sum, r) => sum + r.summary.score, 0) / totalFiles
  );
  const totalCritical = auditResults.reduce((sum, r) => sum + r.summary.critical, 0);
  const totalMajor = auditResults.reduce((sum, r) => sum + r.summary.major, 0);
  const compliantFiles = auditResults.filter(r => r.summary.critical === 0).length;

  console.log(`📊 Overall Statistics:`);
  console.log(`   Total Files Audited: ${totalFiles}`);
  console.log(`   Average Compliance Score: ${avgScore}%`);
  console.log(`   Fully Compliant Files: ${compliantFiles}/${totalFiles}`);
  console.log(`   Total Critical Issues: ${totalCritical}`);
  console.log(`   Total Major Issues: ${totalMajor}\n`);

  // Top issues
  console.log(`🚨 Top Issues Found:`);
  const allIssues: Array<{ file: string; rule: string; severity: string; message: string }> = [];

  auditResults.forEach(result => {
    result.results.forEach(({ rule, result: ruleResult }) => {
      if (!ruleResult.passed) {
        allIssues.push({
          file: result.file,
          rule: rule.name,
          severity: rule.severity,
          message: ruleResult.message,
        });
      }
    });
  });

  // Sort by severity
  const severityOrder = { critical: 0, major: 1, minor: 2, info: 3 };
  allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  allIssues.slice(0, 10).forEach((issue, index) => {
    const icon = issue.severity === 'critical' ? '🚨' : issue.severity === 'major' ? '⚠️' : 'ℹ️';
    console.log(`   ${index + 1}. ${icon} ${issue.file}: ${issue.rule} (${issue.severity})`);
    console.log(`      ${issue.message}`);
  });

  console.log('\n🎯 Recommendations:');
  console.log('   1. Address all critical accessibility issues immediately');
  console.log('   2. Standardize color usage across all dashboards');
  console.log('   3. Implement consistent typography using brand fonts');
  console.log('   4. Add responsive design improvements');
  console.log('   5. Optimize performance with asset minification');

  // Generate R2 upload script
  const uploadScript = generateRegistryUploadScript(auditResults);
  await Bun.write('./registry-upload.bun.ts', uploadScript);

  console.log('\n📤 Generated R2 Registry Upload Script: ./registry-upload.bun.ts');
  console.log('   Run with: bun run registry-upload.bun.ts');

  console.log('\n✅ Branding audit complete!');

  return {
    auditResults,
    summary: {
      totalFiles,
      avgScore,
      totalCritical,
      totalMajor,
      compliantFiles,
    },
  };
}

main().catch(console.error);
