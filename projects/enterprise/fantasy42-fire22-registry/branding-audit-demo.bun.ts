#!/usr/bin/env bun

/**
 * 🎨 Fire22 Branding Audit Demo
 *
 * Demonstrates the core branding audit functionality
 * using the main project's dependencies and setup.
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple color validation functions (simulating the branding audit toolkit)
const BRAND_COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
  info: '#06b6d4',
};

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

function colorDistance(color1: [number, number, number], color2: [number, number, number]): number {
  const [r1, g1, b1] = color1;
  const [r2, g2, b2] = color2;
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function findClosestBrandColor(hexColor: string): { name: string; hex: string; distance: number } {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return { name: 'unknown', hex: hexColor, distance: Infinity };

  let closest = { name: '', hex: '', distance: Infinity };

  for (const [name, brandHex] of Object.entries(BRAND_COLORS)) {
    const brandRgb = hexToRgb(brandHex);
    if (brandRgb) {
      const distance = colorDistance(rgb, brandRgb);
      if (distance < closest.distance) {
        closest = { name, hex: brandHex, distance };
      }
    }
  }

  return closest;
}

function validateColor(hexColor: string): {
  isValid: boolean;
  closestBrandColor: string;
  distance: number;
  compliance: 'perfect' | 'close' | 'non-compliant';
} {
  const closest = findClosestBrandColor(hexColor);

  let compliance: 'perfect' | 'close' | 'non-compliant' = 'non-compliant';

  if (closest.distance === 0) {
    compliance = 'perfect';
  } else if (closest.distance <= 10) {
    compliance = 'close';
  }

  return {
    isValid: closest.distance <= 15, // Allow some tolerance
    closestBrandColor: closest.hex,
    distance: Math.round(closest.distance),
    compliance,
  };
}

function extractColorsFromCSS(content: string): string[] {
  const colors: string[] = [];

  // Extract hex colors
  const hexRegex = /#[a-fA-F0-9]{6}/g;
  let match;
  while ((match = hexRegex.exec(content)) !== null) {
    colors.push(match[0]);
  }

  return [...new Set(colors)]; // Remove duplicates
}

async function auditFile(filePath: string): Promise<{
  file: string;
  colors: Array<{
    color: string;
    validation: ReturnType<typeof validateColor>;
  }>;
  summary: {
    totalColors: number;
    compliantColors: number;
    perfectMatches: number;
    closeMatches: number;
    nonCompliantColors: number;
  };
}> {
  const content = await Bun.file(filePath).text();
  const colors = extractColorsFromCSS(content);

  const auditedColors = colors.map(color => ({
    color,
    validation: validateColor(color),
  }));

  const summary = {
    totalColors: colors.length,
    compliantColors: auditedColors.filter(c => c.validation.isValid).length,
    perfectMatches: auditedColors.filter(c => c.validation.compliance === 'perfect').length,
    closeMatches: auditedColors.filter(c => c.validation.compliance === 'close').length,
    nonCompliantColors: auditedColors.filter(c => !c.validation.isValid).length,
  };

  return {
    file: path.relative(process.cwd(), filePath),
    colors: auditedColors,
    summary,
  };
}

// Main demo execution
async function main() {
  console.info('🎨 Fire22 Branding Audit Demo');
  console.info('==============================\n');

  console.info('🔧 Brand Colors:');
  Object.entries(BRAND_COLORS).forEach(([name, hex]) => {
    console.info(`  ${name}: ${hex}`);
  });
  console.info();

  // Find CSS files to audit
  const cssFiles = await Array.fromAsync(
    new Bun.Glob('**/*.css').scan({
      ignore: ['node_modules/**', 'dist/**', '.git/**'],
    })
  );

  if (cssFiles.length === 0) {
    console.info('❌ No CSS files found to audit');
    return;
  }

  console.info(`📁 Found ${cssFiles.length} CSS files to audit:\n`);

  for (const file of cssFiles.slice(0, 3)) {
    // Limit to first 3 files for demo
    try {
      const result = await auditFile(file);

      console.info(`📄 ${result.file}:`);
      console.info(`   Colors found: ${result.summary.totalColors}`);
      console.info(`   ✅ Compliant: ${result.summary.compliantColors}`);
      console.info(`   🎯 Perfect matches: ${result.summary.perfectMatches}`);
      console.info(`   📏 Close matches: ${result.summary.closeMatches}`);
      console.info(`   ❌ Non-compliant: ${result.summary.nonCompliantColors}`);

      if (result.colors.length > 0) {
        console.info('   Color breakdown:');
        result.colors.slice(0, 5).forEach(({ color, validation }) => {
          const status =
            validation.compliance === 'perfect'
              ? '✅'
              : validation.compliance === 'close'
                ? '📏'
                : '❌';
          console.info(
            `     ${status} ${color} → ${validation.closestBrandColor} (${validation.distance})`
          );
        });
      }

      console.info();
    } catch (error) {
      console.info(`❌ Failed to audit ${file}: ${error.message}\n`);
    }
  }

  console.info('🎯 Branding Audit Demo Complete!');
  console.info('\n💡 Key Features Demonstrated:');
  console.info('  • Color extraction from CSS files');
  console.info('  • Brand color validation');
  console.info('  • Compliance scoring');
  console.info('  • Distance-based matching');
  console.info('  • Bun-native file operations');
  console.info('  • Async iteration with Array.fromAsync()');

  console.info('\n🚀 The full @fire22/branding-audit package provides:');
  console.info('  • WCAG AA/AAA accessibility validation');
  console.info('  • HTML, JSON, and Markdown reporting');
  console.info('  • CI/CD integration');
  console.info('  • Comprehensive error handling');
  console.info('  • Cross-platform compatibility');
}

main().catch(console.error);
