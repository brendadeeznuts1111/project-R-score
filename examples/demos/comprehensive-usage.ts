#!/usr/bin/env bun

import { 
  docsURLBuilder,
  EnhancedDocumentationURLValidator,
  getBunReferenceURL,
  getBunReferenceWithTextFragment,
  getGitHubBunTypesCommitURL,
  exampleCommit,
  getAllCriticalURLs
} from '../lib/docs/documentation-index';
import { DocumentationProvider, DocumentationCategory } from '../lib/docs/constants/domains.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

// Helper for formatted output
function logSection(title: string) {
  console.info(`\n${'='.repeat(60)}`);
  console.info(`🧪 ${title}`);
  console.info('='.repeat(60));
}

async function runComprehensiveExamples() {
  logSection('1. CLI Documentation Examples');
  
  // CLI documentation URLs
  const cliURLs = {
    cliMain: docsURLBuilder.buildURL({
      provider: DocumentationProvider.BUN_OFFICIAL,
      category: DocumentationCategory.CLI_REFERENCE,
      path: '/docs/cli'
    }),
    cliRun: docsURLBuilder.buildCLIDocumentationURL('run', 'examples'),
    cliTest: docsURLBuilder.buildCLIDocumentationURL('test', 'configuration'),
    cliBuild: docsURLBuilder.buildCLIDocumentationURL('build', 'options')
  };
  
  console.info('📚 CLI Documentation URLs:');
  Object.entries(cliURLs).forEach(([key, url]) => {
    console.info(`   ${key}: ${url}`);
  });
  
  // CLI command validation
  console.info('\n🔍 CLI Command Validation:');
  const cliCommands = [
    'bun run dev',
    'bun test --watch',
    'bun build ./src/index.ts --outdir ./dist --target=browser',
    'bun add zod@latest',
    'bunx create-react-app my-app'
  ];
  
  cliCommands.forEach((cmd, i) => {
    const isValid = EnhancedDocumentationURLValidator.isValidCLICommand(cmd);
    console.info(`   ${i + 1}. ${isValid ? '✅' : '❌'} ${cmd}`);
  });
  
  logSection('2. Bun.utils Documentation Examples');
  
  // Bun.utils documentation URLs
  const utilsURLs = {
    utilsMain: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'overview'),
    fileSystem: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'file-system'),
    validation: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'validation'),
    conversion: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'conversion')
  };
  
  console.info('📚 Bun.utils Documentation URLs:');
  Object.entries(utilsURLs).forEach(([key, url]) => {
    console.info(`   ${key}: ${url}`);
  });
  
  // Bun.utils function examples
  console.info('\n💡 Bun.utils Function Examples:');
  
  const utilsExamples = [
    {
      name: 'isTypedArray',
      code: `import { isTypedArray } from 'bun';
const arr = new Uint8Array([1, 2, 3]);
console.info(isTypedArray(arr)); // true`,
      url: docsURLBuilder.buildUtilsDocumentationURL('isTypedArray')
    },
    {
      name: 'readFile (async)',
      code: `import { readFile } from 'bun';
const content = await readFile('package.json', 'utf-8');`,
      url: docsURLBuilder.buildUtilsDocumentationURL('readFile')
    },
    {
      name: 'writeFile (async)',
      code: `import { writeFile } from 'bun';
await writeFile('output.txt', 'Hello, Bun!');`,
      url: docsURLBuilder.buildUtilsDocumentationURL('writeFile')
    }
  ];
  
  utilsExamples.forEach(example => {
    console.info(`\n   🔹 ${example.name}:`);
    console.info(`      📖 Docs: ${example.url}`);
    console.info(`      💻 Example:\n      ${example.code.split('\n').join('\n      ')}`);
  });
  
  logSection('3. Comprehensive URL Validation Examples');
  
  // Test various URL types for validation
  const testURLs = [
    // CLI URLs
    'https://bun.sh/docs/cli/run',
    'https://bun.com/reference/cli',
    'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
    
    // Utils URLs
    'https://bun.sh/docs/api/utils#isTypedArray',
    'https://bun.sh/docs/api/utils#readFile',
    
    // TypedArray URLs
    'https://bun.sh/docs/runtime/binary-data#typedarray',
    'https://bun.com/reference/api/binary-data#typedarray',
    
    // Fetch URLs
    'https://bun.sh/docs/runtime/networking/fetch',
    'https://bun.com/reference/api/fetch#timeout',
    
    // RSS URLs
    'https://bun.com/rss.xml',
    'https://bun.sh/rss.xml',
    
    // Text fragment URLs
    'https://bun.com/reference#:~:text=node%3Azlib',
    'https://bun.com/reference#:~:text=Bun%20API%20Reference',
    
    // GitHub commit URLs
    'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
    'https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun.d.ts'
  ];
  
  console.info('🔍 URL Validation Test Results:');
  
  for (const url of testURLs) {
    const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(url);
    const isGitHub = EnhancedDocumentationURLValidator.parseGitHubURL(url);
    const hasTextFragment = EnhancedDocumentationURLValidator.extractTextFragment(url);
    
    console.info(`\n   🔗 URL: ${url}`);
    console.info(`      ✅ Valid: ${validation.isValid ? 'Yes' : 'No'}`);
    
    if (validation.isValid) {
      console.info(`      🏷️  Provider: ${validation.provider || 'Unknown'}`);
      console.info(`      📁 Type: ${validation.type || 'Unknown'}`);
      if (validation.fragment) {
        console.info(`      🔖 Fragment: ${validation.fragment}`);
      }
    }
    
    if (isGitHub.isValid) {
      console.info(`      🐙 GitHub Type: ${isGitHub.type}`);
      if (isGitHub.commitHash) {
        console.info(`      🔐 Commit: ${isGitHub.commitHash.slice(0, 8)}...`);
      }
    }
    
    if (hasTextFragment.hasTextFragment) {
      console.info(`      📝 Text Fragment: "${hasTextFragment.decodedText}"`);
    }
  }
  
  logSection('4. CLI Command Builder Examples');
  
  // Build CLI documentation URLs with fragments
  const cliFragments = docsURLBuilder.getCLIFragmentURLs();
  
  console.info('🔨 CLI Command Documentation with Fragments:');
  Object.entries(cliFragments).forEach(([key, url]) => {
    console.info(`   ${key}: ${url}`);
  });
  
  // Generate CLI command examples with validation
  console.info('\n🚀 CLI Command Generation:');
  
  const commandExamples = [
    docsURLBuilder.buildCLICommandExample('run', { script: 'dev', watch: true }),
    docsURLBuilder.buildCLICommandExample('test', { watch: true, timeout: 5000 }),
    docsURLBuilder.buildCLICommandExample('build', { 
      entry: './src/index.ts',
      outdir: './dist',
      target: 'browser',
      minify: true
    }),
    docsURLBuilder.buildCLICommandExample('add', { 
      package: 'zod',
      version: 'latest',
      dev: true
    })
  ];
  
  commandExamples.forEach((cmd, i) => {
    console.info(`   ${i + 1}. ${cmd}`);
    
    // Validate the command
    const validation = EnhancedDocumentationURLValidator.validateCLICommand(cmd);
    if (validation.isValid) {
      console.info(`      ✅ Valid command`);
      console.info(`      🔧 Command: ${validation.command}`);
      console.info(`      🎯 Arguments: ${validation.args?.join(', ') || 'None'}`);
      console.info(`      🏷️  Options: ${JSON.stringify(validation.options)}`);
    }
  });
  
  logSection('5. Bun.utils Validation Examples');
  
  // Test Bun.utils validation functions
  console.info('🧪 Bun.utils Validation Function Tests:');
  
  const validationTests = [
    {
      name: 'isTypedArray',
      testValue: new Uint8Array([1, 2, 3]),
      expected: true,
      docs: docsURLBuilder.buildUtilsDocumentationURL('isTypedArray')
    },
    {
      name: 'isBuffer',
      testValue: Buffer.from('hello'),
      expected: true,
      docs: docsURLBuilder.buildUtilsDocumentationURL('isBuffer')
    },
    {
      name: 'isString',
      testValue: 'Hello, Bun!',
      expected: true,
      docs: docsURLBuilder.buildUtilsDocumentationURL('isString')
    },
    {
      name: 'isArray',
      testValue: [1, 2, 3],
      expected: true,
      docs: docsURLBuilder.buildUtilsDocumentationURL('isArray')
    }
  ];
  
  // In a real scenario, we'd import and use the actual Bun.utils
  // For demonstration, we'll show the pattern
  validationTests.forEach(test => {
    console.info(`\n   🔹 ${test.name}:`);
    console.info(`      📖 Docs: ${test.docs}`);
    console.info(`      🧪 Test: ${test.name}(${JSON.stringify(test.testValue)})`);
    console.info(`      ✅ Expected: ${test.expected}`);
    console.info(`      💡 Example: import { ${test.name} } from 'bun';`);
  });
  
  logSection('6. Integration: CLI + Utils + Documentation');
  
  // Show how CLI, utils, and documentation work together
  console.info('🔄 Integrated Workflow Example:');
  
  const integratedExample = {
    scenario: 'Create a new Bun project, add dependencies, and validate configuration',
    steps: [
      {
        step: 1,
        action: 'Initialize project',
        command: 'bun init',
        docs: docsURLBuilder.buildCLIDocumentationURL('init', 'examples')
      },
      {
        step: 2,
        action: 'Add TypeScript and validation library',
        command: 'bun add typescript zod @types/node',
        docs: docsURLBuilder.buildCLIDocumentationURL('add', 'dependencies')
      },
      {
        step: 3,
        action: 'Create and validate configuration file',
        utils: `import { readFile, writeFile, isObject } from 'bun';
const config = { name: 'my-app', version: '1.0.0' };
if (isObject(config)) {
  await writeFile('bun.config.json', JSON.stringify(config, null, 2));
}`,
        docs: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'file-system')
      },
      {
        step: 4,
        action: 'Run development server',
        command: 'bun run dev --hot',
        docs: docsURLBuilder.buildCLIDocumentationURL('run', 'hot-reload')
      }
    ]
  };
  
  console.info(`\n   📋 Scenario: ${integratedExample.scenario}`);
  integratedExample.steps.forEach(step => {
    console.info(`\n   🔸 Step ${step.step}: ${step.action}`);
    if (step.command) {
      console.info(`      💻 Command: ${step.command}`);
    }
    if (step.utils) {
      console.info(`      🛠️  Utils: ${step.utils.split('\n').join('\n               ')}`);
    }
    console.info(`      📚 Docs: ${step.docs}`);
  });
  
  logSection('7. Quick Reference Cheatsheet');
  
  // Generate a quick reference cheatsheet
  console.info('📋 Bun CLI & Utils Quick Reference:');
  
  const cheatsheet = docsURLBuilder.getCheatsheetURLs();
  
  console.info('\n   🔗 Documentation Portals:');
  console.info(`      📘 CLI Docs: ${cheatsheet.cli.main}`);
  console.info(`      🛠️  Utils Docs: ${cheatsheet.utils.main}`);
  console.info(`      🔗 API Reference: ${cheatsheet.api.main}`);
  
  console.info('\n   🚀 Essential Commands:');
  cheatsheet.cli.commands.forEach((cmd: any) => {
    console.info(`      ${cmd.name}: ${cmd.example} → ${cmd.docs}`);
  });
  
  console.info('\n   🛠️  Essential Utils:');
  cheatsheet.utils.functions.forEach((fn: any) => {
    console.info(`      ${fn.name}: ${fn.example} → ${fn.docs}`);
  });
  
  console.info('\n   🔍 Validation Helpers:');
  cheatsheet.utils.validation.forEach((val: any) => {
    console.info(`      ${val.name}(${val.test}) → ${val.result}`);
  });
  
  logSection('8. Advanced: GitHub Integration for CLI & Utils');
  
  // Show GitHub source integration
  console.info('🔗 GitHub Source Integration:');
  
  const githubSources = {
    cliSource: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types/src/cli',
    utilsSource: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types/src/utils',
    specificCommit: docsURLBuilder.getExampleCommitURL(),
    
    // Raw source files
    rawCLITypes: docsURLBuilder.buildGitHubRawURL(
      'main',
      'packages/bun-types/src/cli.d.ts'
    ),
    rawUtilsTypes: docsURLBuilder.buildGitHubRawURL(
      'main',
      'packages/bun-types/src/utils.d.ts'
    )
  };
  
  console.info('\n   🐙 CLI Type Definitions:');
  console.info(`      📁 Source: ${githubSources.cliSource}`);
  console.info(`      📄 Raw Types: ${githubSources.rawCLITypes}`);
  
  console.info('\n   🛠️  Utils Type Definitions:');
  console.info(`      📁 Source: ${githubSources.utilsSource}`);
  console.info(`      📄 Raw Types: ${githubSources.rawUtilsTypes}`);
  
  console.info('\n   🔐 Specific Commit Example:');
  console.info(`      🔗 URL: ${githubSources.specificCommit}`);
  
  // Parse the commit URL
  const commitInfo = EnhancedDocumentationURLValidator.parseGitHubURL(githubSources.specificCommit);
  if (commitInfo.isValid) {
    console.info(`      🏷️  Type: ${commitInfo.type}`);
    console.info(`      🔐 Commit: ${commitInfo.commitHash?.slice(0, 8)}...`);
    console.info(`      📁 Path: ${commitInfo.path}`);
  }
  
  logSection('9. Validation Summary Report');
  
  // Generate a validation summary
  const validationSummary = {
    totalURLsTested: testURLs.length,
    validURLs: testURLs.filter(url => 
      EnhancedDocumentationURLValidator.validateBunDocumentationURL(url).isValid
    ).length,
    gitHubURLs: testURLs.filter(url => 
      EnhancedDocumentationURLValidator.parseGitHubURL(url).isValid
    ).length,
    textFragmentURLs: testURLs.filter(url => 
      EnhancedDocumentationURLValidator.extractTextFragment(url).hasTextFragment
    ).length,
    typedArrayURLs: testURLs.filter(url => 
      url.includes('typedarray') || url.includes('binary-data')
    ).length
  };
  
  console.info('📊 Validation Summary:');
  console.info(`   Total URLs Tested: ${validationSummary.totalURLsTested}`);
  console.info(`   ✅ Valid URLs: ${validationSummary.validURLs}`);
  console.info(`   🐙 GitHub URLs: ${validationSummary.gitHubURLs}`);
  console.info(`   📝 Text Fragment URLs: ${validationSummary.textFragmentURLs}`);
  console.info(`   🔢 TypedArray URLs: ${validationSummary.typedArrayURLs}`);
  
  // Calculate percentages
  const percentValid = (validationSummary.validURLs / validationSummary.totalURLsTested * 100).toFixed(1);
  console.info(`   📈 Success Rate: ${percentValid}%`);
  
  logSection('10. Practical Usage Example');
  
  // Show a complete practical example
  console.info('🚀 Complete Example: CLI + Utils + Documentation');
  
  const completeExample = `
// Import Bun utilities
import { readFile, writeFile, isTypedArray, toBuffer } from 'bun';
import { spawn } from 'bun';

// Example 1: Read configuration and validate
const config = await readFile('bun.config.json', 'utf-8');
const parsedConfig = JSON.parse(config);

// Example 2: Process binary data
const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
if (isTypedArray(binaryData)) {
  const buffer = toBuffer(binaryData);
  await writeFile('output.bin', buffer);
}

// Example 3: Spawn CLI process
const process = spawn(['bun', 'run', 'test'], {
  stdout: 'pipe',
  stderr: 'pipe'
});

// Documentation references
const docs = {
  readFile: '${docsURLBuilder.buildUtilsDocumentationURL('readFile')}',
  isTypedArray: '${docsURLBuilder.buildUtilsDocumentationURL('isTypedArray')}',
  spawn: '${docsURLBuilder.buildUtilsDocumentationURL('spawn')}',
  cliTest: '${docsURLBuilder.buildCLIDocumentationURL('test', 'options')}'
};

console.info('📚 Documentation:', docs);`;
  
  console.info('\n💻 Code Example:');
  console.info(completeExample);
  
  console.info('\n📚 Documentation URLs Used:');
  const urls = completeExample.match(/https:\/\/[^\s'"]+/g);
  urls?.forEach(url => {
    const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(url);
    console.info(`   ${validation.isValid ? '✅' : '❌'} ${url}`);
    if (validation.provider) {
      console.info(`     🏷️  ${validation.provider} - ${validation.type}`);
    }
  });
}

// Run all examples
runComprehensiveExamples().catch(console.error);
