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
  console.log('🎨 Fire22 Branding Audit Demo');
  console.log('==============================\n');

  console.log('🔧 Brand Colors:');
  Object.entries(BRAND_COLORS).forEach(([name, hex]) => {
    console.log(`  ${name}: ${hex}`);
  });
  console.log();

  // Find CSS files to audit
  const cssFiles = await Array.fromAsync(
    new Bun.Glob('**/*.css').scan({
      ignore: ['node_modules/**', 'dist/**', '.git/**'],
    })
  );

  if (cssFiles.length === 0) {
    console.log('❌ No CSS files found to audit');
    return;
  }

  console.log(`📁 Found ${cssFiles.length} CSS files to audit:\n`);

  for (const file of cssFiles.slice(0, 3)) {
    // Limit to first 3 files for demo
    try {
      const result = await auditFile(file);

      console.log(`📄 ${result.file}:`);
      console.log(`   Colors found: ${result.summary.totalColors}`);
      console.log(`   ✅ Compliant: ${result.summary.compliantColors}`);
      console.log(`   🎯 Perfect matches: ${result.summary.perfectMatches}`);
      console.log(`   📏 Close matches: ${result.summary.closeMatches}`);
      console.log(`   ❌ Non-compliant: ${result.summary.nonCompliantColors}`);

      if (result.colors.length > 0) {
        console.log('   Color breakdown:');
        result.colors.slice(0, 5).forEach(({ color, validation }) => {
          const status =
            validation.compliance === 'perfect'
              ? '✅'
              : validation.compliance === 'close'
                ? '📏'
                : '❌';
          console.log(
            `     ${status} ${color} → ${validation.closestBrandColor} (${validation.distance})`
          );
        });
      }

      console.log();
    } catch (error) {
      console.log(`❌ Failed to audit ${file}: ${error.message}\n`);
    }
  }

  console.log('🎯 Branding Audit Demo Complete!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('  • Color extraction from CSS files');
  console.log('  • Brand color validation');
  console.log('  • Compliance scoring');
  console.log('  • Distance-based matching');
  console.log('  • Bun-native file operations');
  console.log('  • Async iteration with Array.fromAsync()');

  console.log('\n🚀 The full @fire22/branding-audit package provides:');
  console.log('  • WCAG AA/AAA accessibility validation');
  console.log('  • HTML, JSON, and Markdown reporting');
  console.log('  • CI/CD integration');
  console.log('  • Comprehensive error handling');
  console.log('  • Cross-platform compatibility');
}

main().catch(console.error);
