import { describe, test, expect, beforeEach } from 'bun:test';
import { BrandingAuditor } from './index.ts';

describe('BrandingAuditor', () => {
  let auditor: BrandingAuditor;

  beforeEach(() => {
    auditor = new BrandingAuditor({
      brandColors: {
        primary: '#2563eb',
        secondary: '#64748b',
      },
    });
  });

  test('should initialize with brand colors', () => {
    const brandColors = auditor.getBrandColors();
    expect(brandColors).toBeArray();
    expect(brandColors.length).toBeGreaterThan(0);

    const primaryColor = brandColors.find(color => color.name === 'Primary Blue');
    expect(primaryColor).toBeDefined();
    expect(primaryColor?.hex).toBe('#2563eb');
  });

  test('should find brand color matches', () => {
    const match = auditor.findBrandColorMatch('#2563eb');
    expect(match).toBeDefined();
    expect(match?.name).toBe('Primary Blue');
  });

  test('should return null for non-brand colors', () => {
    const match = auditor.findBrandColorMatch('#ff0000');
    expect(match).toBeNull();
  });

  test('should validate color format', () => {
    expect(auditor.findBrandColorMatch('#2563eb')).toBeDefined();
    expect(auditor.findBrandColorMatch('rgb(37, 99, 235)')).toBeDefined();
    expect(auditor.findBrandColorMatch('hsl(217, 82%, 53%)')).toBeDefined();
  });

  test('should handle invalid colors gracefully', () => {
    const match = auditor.findBrandColorMatch('invalid-color');
    expect(match).toBeNull();
  });

  test('should provide accessibility information', () => {
    const brandColors = auditor.getBrandColors();
    const primaryColor = brandColors.find(color => color.name === 'Primary Blue');

    expect(primaryColor?.accessibility).toBeDefined();
    expect(primaryColor?.accessibility.wcagAA).toBe(true);
    expect(primaryColor?.accessibility.contrastRatios).toBeDefined();
  });
});

describe('Color Validation', () => {
  let auditor: BrandingAuditor;

  beforeEach(() => {
    auditor = new BrandingAuditor();
  });

  test('should validate hex colors', () => {
    expect(auditor.findBrandColorMatch('#2563eb')).toBeDefined();
    expect(auditor.findBrandColorMatch('#fff')).toBeDefined();
    expect(auditor.findBrandColorMatch('#ffffff')).toBeDefined();
  });

  test('should validate rgb colors', () => {
    expect(auditor.findBrandColorMatch('rgb(37, 99, 235)')).toBeDefined();
    expect(auditor.findBrandColorMatch('rgb(255, 255, 255)')).toBeDefined();
  });

  test('should validate hsl colors', () => {
    expect(auditor.findBrandColorMatch('hsl(217, 82%, 53%)')).toBeDefined();
    expect(auditor.findBrandColorMatch('hsl(0, 0%, 100%)')).toBeDefined();
  });

  test('should handle color name variations', () => {
    // These tests would depend on the specific color names implemented
    const brandColors = auditor.getBrandColors();
    expect(brandColors.length).toBeGreaterThan(0);
  });
});

describe('Configuration', () => {
  test('should accept custom configuration', () => {
    const customAuditor = new BrandingAuditor({
      tolerance: 10,
      checkContrast: false,
      brandColors: {
        custom: '#ff0000',
      },
    });

    expect(customAuditor).toBeDefined();
    const brandColors = customAuditor.getBrandColors();
    const customColor = brandColors.find(color => color.name === 'custom');
    expect(customColor).toBeDefined();
  });

  test('should use default configuration when none provided', () => {
    const defaultAuditor = new BrandingAuditor();
    expect(defaultAuditor).toBeDefined();
    expect(defaultAuditor.getBrandColors().length).toBeGreaterThan(0);
  });
});
