#!/usr/bin/env bun
/**
 * Color System Validation Script
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const enforcedColors = {
  critical: ['#ef4444', '#dc2626'],
  warning: ['#f97316', '#ea580c'],
  caution: ['#f59e0b', '#d97706'],
  success: ['#22c55e', '#16a34a'],
  performance: ['#3b82f6', '#1d4ed8'],
  merchant: ['#92400e', '#a16207'],
  enterprise: ['#111827', '#374151'],
  neutral: ['#6b7280', '#9ca3af'],
};

const bannedPurples = ['#8b5cf6', '#a855f7', '#7c3aed', '#9333ea', '#a78bfa'];

function validateColors(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const allColors = Object.values(enforcedColors).flat();
    
    let violations = [];
    
    // Check for non-enforced hex colors
    const hexRegex = /#[0-9a-fA-F]{6}/g;
    const foundColors = content.match(hexRegex) || [];
    
    foundColors.forEach(color => {
      const lower = color.toLowerCase();
      if (bannedPurples.includes(lower) || !allColors.includes(lower)) {
        violations.push(color);
      }
    });
    
    return violations;
  } catch (e) {
    return [];
  }
}

function scanDirectory(dir) {
  let totalViolations = 0;
  
  try {
    const items = readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = join(dir, item);
      if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'cache') return;
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        totalViolations += scanDirectory(fullPath);
      } else if (stat.isFile()) {
        if (fullPath.endsWith('.css') || fullPath.endsWith('.scss') || fullPath.endsWith('.ts') || fullPath.endsWith('.js') || fullPath.endsWith('.tsx') || fullPath.endsWith('.html')) {
          const violations = validateColors(fullPath);
          if (violations.length > 0) {
            console.log(`❌ Color violations in ${fullPath}:`, violations);
            totalViolations += violations.length;
          }
        }
      }
    });
  } catch (e) {}
  
  return totalViolations;
}

const violations = scanDirectory('.');
if (violations > 0) {
  console.log(`❌ Found ${violations} color system violations.`);
  process.exit(1);
} else {
  console.log('✅ All colors comply with the enforced system.');
}
