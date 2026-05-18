#!/usr/bin/env bun

/**
 * 🔗 Bun Deep Link Generator & Validator
 *
 * Generate and validate text fragment deep links for Bun documentation.
 * Perfect for creating shareable links that highlight specific content.
 *
 * Usage: bun run bun-deep-links.ts [search-text] [page]
 */

interface DeepLinkResult {
  searchText: string;
  encodedText: string;
  page: string;
  url: string;
  valid: boolean;
  statusCode?: number;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function generateDeepLink(searchText: string, page: string = 'reference'): string {
  const baseUrl = `https://bun.com/${page}`;
  const encodedText = encodeURIComponent(searchText);
  return `${baseUrl}#:~:text=${encodedText}`;
}

async function validateDeepLink(url: string): Promise<{ valid: boolean; statusCode: number }> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return { valid: response.status === 200, statusCode: response.status };
  } catch (error) {
    return { valid: false, statusCode: 0 };
  }
}

async function createDeepLink(searchText: string, page: string = 'reference'): Promise<DeepLinkResult> {
  const url = generateDeepLink(searchText, page);
  const validation = await validateDeepLink(url);

  return {
    searchText,
    encodedText: encodeURIComponent(searchText),
    page,
    url,
    valid: validation.valid,
    statusCode: validation.statusCode
  };
}

async function runDeepLinkGenerator(): Promise<void> {
  const searchText = process.argv[2];
  const page = process.argv[3] || 'reference';

  console.info(colorize('🔗 Bun Deep Link Generator', 'bright'));
  console.info(colorize('===========================', 'cyan'));

  if (!searchText) {
    console.info(colorize('\n📚 Popular Bun API Deep Links:', 'bright'));
    console.info();

    // Generate popular deep links
    const popularTerms = [
      'Bun.env',
      'Bun.file',
      'Bun.write',
      'Bun.serve',
      'TypedArray',
      'WebSocket',
      'fetch API',
      'Deno.env',
      'Node.js',
      'TypeScript',
      'ESM',
      'CommonJS',
      'SQLite',
      'Web APIs'
    ];

    const results = await Promise.all(
      popularTerms.map(term => createDeepLink(term, page))
    );

    // Display results
    for (const result of results) {
      const statusIcon = result.valid ? '✅' : '❌';
      const statusColor = result.valid ? 'green' : 'red';

      console.info(`${statusIcon} ${colorize(`"${result.searchText}"`, 'cyan')}: ${colorize('valid', statusColor)}`);
      console.info(`   ${colorize(result.url, 'blue')}`);

      if (!result.valid) {
        console.info(`   ${colorize(`Status: ${result.statusCode}`, 'red')}`);
      }

      console.info();
    }

    // Summary
    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;

    console.info(colorize('📊 Summary:', 'bright'));
    console.info(`✅ Valid deep links: ${colorize(validCount.toString(), 'green')}`);
    console.info(`❌ Invalid deep links: ${colorize(invalidCount.toString(), 'red')}`);
    console.info(`📈 Total generated: ${results.length}`);

    console.info();
    console.info(colorize('💡 Usage Tips:', 'bright'));
    console.info('• Click any link to jump to that text in Bun documentation');
    console.info('• Text fragments work in Chrome, Edge, and Safari');
    console.info('• Links are shareable and bookmarkable');
    console.info('• Use quotes for multi-word searches');

  } else {
    console.info(colorize(`\n🔍 Generating deep link for: "${searchText}"`, 'yellow'));
    console.info();

    const result = await createDeepLink(searchText, page);

    const statusIcon = result.valid ? '✅' : '❌';
    const statusColor = result.valid ? 'green' : 'red';

    console.info(`${statusIcon} ${colorize('Deep Link Generated:', 'bright')}`);
    console.info(`   Search Text: ${colorize(`"${result.searchText}"`, 'cyan')}`);
    console.info(`   Page: ${colorize(result.page, 'cyan')}`);
    console.info(`   Encoded: ${colorize(result.encodedText, 'gray')}`);
    console.info(`   URL: ${colorize(result.url, 'blue')}`);
    console.info(`   Status: ${colorize(result.valid ? 'Valid' : 'Invalid', statusColor)}`);

    if (!result.valid) {
      console.info(`   Error Code: ${colorize(result.statusCode?.toString() || 'Unknown', 'red')}`);
    }

    console.info();
    console.info(colorize('🚀 Ready to use!', 'green'));

    if (result.valid) {
      console.info(colorize('💡 Tip: Click the link above to test it in your browser', 'gray'));
    } else {
      console.info(colorize('⚠️  This text may not exist in the documentation', 'yellow'));
      console.info(colorize('   Try different wording or check the actual text on the page', 'gray'));
    }
  }

  console.info();
  console.info(colorize('🎯 Examples:', 'bright'));
  console.info(`   bun run bun-deep-links.ts "Bun.env"`);
  console.info(`   bun run bun-deep-links.ts "WebSocket" docs`);
  console.info(`   bun run bun-deep-links.ts  # Show popular links`);
}

// Run the deep link generator
runDeepLinkGenerator().catch((error) => {
  console.error(colorize(`Deep link generation failed: ${error}`, 'red'));
  process.exit(1);
});