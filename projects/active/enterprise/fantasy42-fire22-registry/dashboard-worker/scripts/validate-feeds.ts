#!/usr/bin/env bun

/**
 * 📡 RSS Feed Validation Script for CI/CD
 *
 * Validates RSS/Atom feeds for proper XML structure, required fields,
 * and Fire22 Dashboard compliance
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function rssXmlText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return rssXmlText(value[0]);
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text'] ?? '');
  }
  return '';
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

interface ValidationResult {
  feed: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    itemCount: number;
    categories: string[];
    lastBuildDate: string;
  };
}

class FeedValidator {
  private results: ValidationResult[] = [];
  private feedsDir = join(process.cwd(), 'src', 'feeds');

  async validateAll(): Promise<boolean> {
    console.info('📡 Fire22 RSS Feed Validator');
    console.info('!==!==!==!==!===\n');

    const feeds = [
      'error-codes-rss.xml',
      'error-codes-atom.xml',
      'team-announcements-rss.xml',
      'team-announcements-atom.xml',
      'critical-errors-alert.xml',
    ];

    let allValid = true;

    for (const feed of feeds) {
      const result = await this.validateFeed(feed);
      this.results.push(result);

      if (!result.valid) {
        allValid = false;
      }

      this.printResult(result);
    }

    this.printSummary();
    return allValid;
  }

  private async validateFeed(filename: string): Promise<ValidationResult> {
    const filepath = join(this.feedsDir, filename);
    const result: ValidationResult = {
      feed: filename,
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        itemCount: 0,
        categories: [],
        lastBuildDate: '',
      },
    };

    // Check file exists
    if (!existsSync(filepath)) {
      result.valid = false;
      result.errors.push(`File not found: ${filepath}`);
      return result;
    }

    try {
      const content = readFileSync(filepath, 'utf-8');

      // Basic XML validation
      if (!content.startsWith('<?xml')) {
        result.errors.push('Missing XML declaration');
        result.valid = false;
      }

      // Parse XML
      const parsed = Bun.XML.parse(content, {
        ignoreAttributes: false,
        attributeNamePrefix: '@',
      }) as Record<string, unknown>;

      if (filename.includes('rss')) {
        this.validateRSSFeed(parsed, result);
      } else if (filename.includes('atom')) {
        this.validateAtomFeed(parsed, result);
      }

      // Check for Cloudflare Workers URLs
      if (content.includes('github.io')) {
        result.warnings.push('Feed still contains GitHub Pages URLs');
      }

      if (!content.includes('dashboard-worker') || !content.includes('workers.dev')) {
        result.warnings.push('Feed should use Cloudflare Workers URLs');
      }
    } catch (error) {
      result.valid = false;
      result.errors.push(`XML parsing error: ${(error as Error).message}`);
    }

    return result;
  }

  private validateRSSFeed(parsed: any, result: ValidationResult): void {
    if (!parsed.rss) {
      result.errors.push('Not a valid RSS feed');
      result.valid = false;
      return;
    }

    const channel = (parsed.rss as { channel?: Record<string, unknown> } | undefined)?.channel;
    if (!channel) {
      result.errors.push('Missing RSS channel');
      result.valid = false;
      return;
    }

    // Required RSS fields
    const requiredFields = ['title', 'description', 'link'] as const;
    for (const field of requiredFields) {
      if (!rssXmlText(channel[field])) {
        result.errors.push(`Missing required field: ${field}`);
        result.valid = false;
      }
    }

    // Count items
    const items = asArray(channel.item);
    result.stats.itemCount = items.length;

    if (items.length === 0) {
      result.warnings.push('Feed has no items');
    }

    // Extract categories
    if (channel.category) {
      result.stats.categories = channel.category;
    }

    // Get last build date
    if (channel.lastBuildDate) {
      result.stats.lastBuildDate = rssXmlText(channel.lastBuildDate);
    }

    // Validate each item
    items.forEach((item: unknown, index: number) => {
      const row = item as Record<string, unknown>;
      if (!rssXmlText(row.title)) {
        result.errors.push(`Item ${index + 1}: Missing title`);
        result.valid = false;
      }
      if (!rssXmlText(row.description)) {
        result.errors.push(`Item ${index + 1}: Missing description`);
        result.valid = false;
      }
      if (!rssXmlText(row.link)) {
        result.warnings.push(`Item ${index + 1}: Missing link`);
      }
    });
  }

  private validateAtomFeed(parsed: any, result: ValidationResult): void {
    if (!parsed.feed) {
      result.errors.push('Not a valid Atom feed');
      result.valid = false;
      return;
    }

    const feed = parsed.feed as Record<string, unknown>;

    // Required Atom fields
    const requiredFields = ['title', 'id', 'updated'] as const;
    for (const field of requiredFields) {
      if (!rssXmlText(feed[field])) {
        result.errors.push(`Missing required field: ${field}`);
        result.valid = false;
      }
    }

    // Count entries
    const entries = asArray(feed.entry);
    result.stats.itemCount = entries.length;

    if (entries.length === 0) {
      result.warnings.push('Feed has no entries');
    }

    // Get updated date
    if (feed.updated) {
      result.stats.lastBuildDate = rssXmlText(feed.updated);
    }

    // Validate each entry
    entries.forEach((entry: unknown, index: number) => {
      const row = entry as Record<string, unknown>;
      if (!rssXmlText(row.title)) {
        result.errors.push(`Entry ${index + 1}: Missing title`);
        result.valid = false;
      }
      if (!rssXmlText(row.id)) {
        result.errors.push(`Entry ${index + 1}: Missing id`);
        result.valid = false;
      }
      if (!rssXmlText(row.updated)) {
        result.warnings.push(`Entry ${index + 1}: Missing updated date`);
      }
    });
  }

  private printResult(result: ValidationResult): void {
    const status = result.valid ? '✅' : '❌';
    console.info(`${status} ${result.feed}`);

    if (result.errors.length > 0) {
      console.info('  Errors:');
      result.errors.forEach(error => console.info(`    ❌ ${error}`));
    }

    if (result.warnings.length > 0) {
      console.info('  Warnings:');
      result.warnings.forEach(warning => console.info(`    ⚠️  ${warning}`));
    }

    console.info(`  📊 Stats: ${result.stats.itemCount} items`);
    if (result.stats.lastBuildDate) {
      console.info(`  📅 Last Build: ${result.stats.lastBuildDate}`);
    }
    console.info();
  }

  private printSummary(): void {
    console.info('!==!==!==!==!===');
    console.info('📊 Validation Summary\n');

    const validCount = this.results.filter(r => r.valid).length;
    const totalCount = this.results.length;
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalItems = this.results.reduce((sum, r) => sum + r.stats.itemCount, 0);

    console.info(`✅ Valid Feeds: ${validCount}/${totalCount}`);
    console.info(`❌ Total Errors: ${totalErrors}`);
    console.info(`⚠️  Total Warnings: ${totalWarnings}`);
    console.info(`📰 Total Items: ${totalItems}`);

    if (validCount === totalCount) {
      console.info('\n🎉 All feeds are valid!');
    } else {
      console.info('\n⚠️  Some feeds have validation errors. Please fix them before deployment.');
    }
  }
}

// Run validation
const validator = new FeedValidator();
validator
  .validateAll()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
