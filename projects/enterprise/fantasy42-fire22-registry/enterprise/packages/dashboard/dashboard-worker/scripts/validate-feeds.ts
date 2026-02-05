#!/usr/bin/env bun

/**
 * 📡 RSS Feed Validation Script for CI/CD
 *
 * Validates RSS/Atom feeds for proper XML structure, required fields,
 * and Fire22 Dashboard compliance
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseStringPromise } from 'xml2js';

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
    console.log('📡 Fire22 RSS Feed Validator');
    console.log('!==!==!==!==!===\n');

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
      const parsed = await parseStringPromise(content);

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

    const channel = parsed.rss.channel?.[0];
    if (!channel) {
      result.errors.push('Missing RSS channel');
      result.valid = false;
      return;
    }

    // Required RSS fields
    const requiredFields = ['title', 'description', 'link'];
    for (const field of requiredFields) {
      if (!channel[field]) {
        result.errors.push(`Missing required field: ${field}`);
        result.valid = false;
      }
    }

    // Count items
    const items = channel.item || [];
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
      result.stats.lastBuildDate = channel.lastBuildDate[0];
    }

    // Validate each item
    items.forEach((item: any, index: number) => {
      if (!item.title) {
        result.errors.push(`Item ${index + 1}: Missing title`);
        result.valid = false;
      }
      if (!item.description) {
        result.errors.push(`Item ${index + 1}: Missing description`);
        result.valid = false;
      }
      if (!item.link) {
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

    const feed = parsed.feed;

    // Required Atom fields
    const requiredFields = ['title', 'id', 'updated'];
    for (const field of requiredFields) {
      if (!feed[field]) {
        result.errors.push(`Missing required field: ${field}`);
        result.valid = false;
      }
    }

    // Count entries
    const entries = feed.entry || [];
    result.stats.itemCount = entries.length;

    if (entries.length === 0) {
      result.warnings.push('Feed has no entries');
    }

    // Get updated date
    if (feed.updated) {
      result.stats.lastBuildDate = feed.updated[0];
    }

    // Validate each entry
    entries.forEach((entry: any, index: number) => {
      if (!entry.title) {
        result.errors.push(`Entry ${index + 1}: Missing title`);
        result.valid = false;
      }
      if (!entry.id) {
        result.errors.push(`Entry ${index + 1}: Missing id`);
        result.valid = false;
      }
      if (!entry.updated) {
        result.warnings.push(`Entry ${index + 1}: Missing updated date`);
      }
    });
  }

  private printResult(result: ValidationResult): void {
    const status = result.valid ? '✅' : '❌';
    console.log(`${status} ${result.feed}`);

    if (result.errors.length > 0) {
      console.log('  Errors:');
      result.errors.forEach(error => console.log(`    ❌ ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('  Warnings:');
      result.warnings.forEach(warning => console.log(`    ⚠️  ${warning}`));
    }

    console.log(`  📊 Stats: ${result.stats.itemCount} items`);
    if (result.stats.lastBuildDate) {
      console.log(`  📅 Last Build: ${result.stats.lastBuildDate}`);
    }
    console.log();
  }

  private printSummary(): void {
    console.log('!==!==!==!==!===');
    console.log('📊 Validation Summary\n');

    const validCount = this.results.filter(r => r.valid).length;
    const totalCount = this.results.length;
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalItems = this.results.reduce((sum, r) => sum + r.stats.itemCount, 0);

    console.log(`✅ Valid Feeds: ${validCount}/${totalCount}`);
    console.log(`❌ Total Errors: ${totalErrors}`);
    console.log(`⚠️  Total Warnings: ${totalWarnings}`);
    console.log(`📰 Total Items: ${totalItems}`);

    if (validCount === totalCount) {
      console.log('\n🎉 All feeds are valid!');
    } else {
      console.log('\n⚠️  Some feeds have validation errors. Please fix them before deployment.');
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
