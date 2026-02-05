#!/usr/bin/env bun

import { 
  docsURLBuilder,
  EnhancedDocumentationURLValidator,
  getBunReferenceURL,
  getBunReferenceWithTextFragment,
  getGitHubBunTypesCommitURL,
  exampleCommit,
  getAllCriticalURLs
} from '../lib/documentation';
import { DocumentationProvider, DocumentationCategory } from '../lib/documentation/constants/domains.ts';

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
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${title}`);
  console.log('='.repeat(60));
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
  
  console.log('📚 CLI Documentation URLs:');
  Object.entries(cliURLs).forEach(([key, url]) => {
    console.log(`   ${key}: ${url}`);
  });
  
  // CLI command validation
  console.log('\n🔍 CLI Command Validation:');
  const cliCommands = [
    'bun run dev',
    'bun test --watch',
    'bun build ./src/index.ts --outdir ./dist --target=browser',
    'bun add zod@latest',
    'bunx create-react-app my-app'
  ];
  
  cliCommands.forEach((cmd, i) => {
    const isValid = EnhancedDocumentationURLValidator.isValidCLICommand(cmd);
    console.log(`   ${i + 1}. ${isValid ? '✅' : '❌'} ${cmd}`);
  });
  
  logSection('2. Bun.utils Documentation Examples');
  
  // Bun.utils documentation URLs
  const utilsURLs = {
    utilsMain: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'overview'),
    fileSystem: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'file-system'),
    validation: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'validation'),
    conversion: docsURLBuilder.buildUtilsDocumentationURL(undefined, 'conversion')
  };
  
  console.log('📚 Bun.utils Documentation URLs:');
  Object.entries(utilsURLs).forEach(([key, url]) => {
    console.log(`   ${key}: ${url}`);
  });
  
  // Bun.utils function examples
  console.log('\n💡 Bun.utils Function Examples:');
  
  const utilsExamples = [
    {
      name: 'isTypedArray',
      code: `import { isTypedArray } from 'bun';
const arr = new Uint8Array([1, 2, 3]);
console.log(isTypedArray(arr)); // true`,
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
    console.log(`\n   🔹 ${example.name}:`);
    console.log(`      📖 Docs: ${example.url}`);
    console.log(`      💻 Example:\n      ${example.code.split('\n').join('\n      ')}`);
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
    'https://bun.sh/feed.xml',
    
    // Text fragment URLs
    'https://bun.com/reference#:~:text=node%3Azlib',
    'https://bun.com/reference#:~:text=Bun%20API%20Reference',
    
    // GitHub commit URLs
    'https://github.com/oven-sh/bun/tree/af76296637931381e9509c204c5f1af9cc174534/packages/bun-types',
    'https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun.d.ts'
  ];
  
  console.log('🔍 URL Validation Test Results:');
  
  for (const url of testURLs) {
    const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(url);
    const isGitHub = EnhancedDocumentationURLValidator.parseGitHubURL(url);
    const hasTextFragment = EnhancedDocumentationURLValidator.extractTextFragment(url);
    
    console.log(`\n   🔗 URL: ${url}`);
    console.log(`      ✅ Valid: ${validation.isValid ? 'Yes' : 'No'}`);
    
    if (validation.isValid) {
      console.log(`      🏷️  Provider: ${validation.provider || 'Unknown'}`);
      console.log(`      📁 Type: ${validation.type || 'Unknown'}`);
      if (validation.fragment) {
        console.log(`      🔖 Fragment: ${validation.fragment}`);
      }
    }
    
    if (isGitHub.isValid) {
      console.log(`      🐙 GitHub Type: ${isGitHub.type}`);
      if (isGitHub.commitHash) {
        console.log(`      🔐 Commit: ${isGitHub.commitHash.slice(0, 8)}...`);
      }
    }
    
    if (hasTextFragment.hasTextFragment) {
      console.log(`      📝 Text Fragment: "${hasTextFragment.decodedText}"`);
    }
  }
  
  logSection('4. CLI Command Builder Examples');
  
  // Build CLI documentation URLs with fragments
  const cliFragments = docsURLBuilder.getCLIFragmentURLs();
  
  console.log('🔨 CLI Command Documentation with Fragments:');
  Object.entries(cliFragments).forEach(([key, url]) => {
    console.log(`   ${key}: ${url}`);
  });
  
  // Generate CLI command examples with validation
  console.log('\n🚀 CLI Command Generation:');
  
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
    console.log(`   ${i + 1}. ${cmd}`);
    
    // Validate the command
    const validation = EnhancedDocumentationURLValidator.validateCLICommand(cmd);
    if (validation.isValid) {
      console.log(`      ✅ Valid command`);
      console.log(`      🔧 Command: ${validation.command}`);
      console.log(`      🎯 Arguments: ${validation.args?.join(', ') || 'None'}`);
      console.log(`      🏷️  Options: ${JSON.stringify(validation.options)}`);
    }
  });
  
  logSection('5. Bun.utils Validation Examples');
  
  // Test Bun.utils validation functions
  console.log('🧪 Bun.utils Validation Function Tests:');
  
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
    console.log(`\n   🔹 ${test.name}:`);
    console.log(`      📖 Docs: ${test.docs}`);
    console.log(`      🧪 Test: ${test.name}(${JSON.stringify(test.testValue)})`);
    console.log(`      ✅ Expected: ${test.expected}`);
    console.log(`      💡 Example: import { ${test.name} } from 'bun';`);
  });
  
  logSection('6. Integration: CLI + Utils + Documentation');
  
  // Show how CLI, utils, and documentation work together
  console.log('🔄 Integrated Workflow Example:');
  
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
  
  console.log(`\n   📋 Scenario: ${integratedExample.scenario}`);
  integratedExample.steps.forEach(step => {
    console.log(`\n   🔸 Step ${step.step}: ${step.action}`);
    if (step.command) {
      console.log(`      💻 Command: ${step.command}`);
    }
    if (step.utils) {
      console.log(`      🛠️  Utils: ${step.utils.split('\n').join('\n               ')}`);
    }
    console.log(`      📚 Docs: ${step.docs}`);
  });
  
  logSection('7. Quick Reference Cheatsheet');
  
  // Generate a quick reference cheatsheet
  console.log('📋 Bun CLI & Utils Quick Reference:');
  
  const cheatsheet = docsURLBuilder.getCheatsheetURLs();
  
  console.log('\n   🔗 Documentation Portals:');
  console.log(`      📘 CLI Docs: ${cheatsheet.cli.main}`);
  console.log(`      🛠️  Utils Docs: ${cheatsheet.utils.main}`);
  console.log(`      🔗 API Reference: ${cheatsheet.api.main}`);
  
  console.log('\n   🚀 Essential Commands:');
  cheatsheet.cli.commands.forEach((cmd: any) => {
    console.log(`      ${cmd.name}: ${cmd.example} → ${cmd.docs}`);
  });
  
  console.log('\n   🛠️  Essential Utils:');
  cheatsheet.utils.functions.forEach((fn: any) => {
    console.log(`      ${fn.name}: ${fn.example} → ${fn.docs}`);
  });
  
  console.log('\n   🔍 Validation Helpers:');
  cheatsheet.utils.validation.forEach((val: any) => {
    console.log(`      ${val.name}(${val.test}) → ${val.result}`);
  });
  
  logSection('8. Advanced: GitHub Integration for CLI & Utils');
  
  // Show GitHub source integration
  console.log('🔗 GitHub Source Integration:');
  
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
  
  console.log('\n   🐙 CLI Type Definitions:');
  console.log(`      📁 Source: ${githubSources.cliSource}`);
  console.log(`      📄 Raw Types: ${githubSources.rawCLITypes}`);
  
  console.log('\n   🛠️  Utils Type Definitions:');
  console.log(`      📁 Source: ${githubSources.utilsSource}`);
  console.log(`      📄 Raw Types: ${githubSources.rawUtilsTypes}`);
  
  console.log('\n   🔐 Specific Commit Example:');
  console.log(`      🔗 URL: ${githubSources.specificCommit}`);
  
  // Parse the commit URL
  const commitInfo = EnhancedDocumentationURLValidator.parseGitHubURL(githubSources.specificCommit);
  if (commitInfo.isValid) {
    console.log(`      🏷️  Type: ${commitInfo.type}`);
    console.log(`      🔐 Commit: ${commitInfo.commitHash?.slice(0, 8)}...`);
    console.log(`      📁 Path: ${commitInfo.path}`);
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
  
  console.log('📊 Validation Summary:');
  console.log(`   Total URLs Tested: ${validationSummary.totalURLsTested}`);
  console.log(`   ✅ Valid URLs: ${validationSummary.validURLs}`);
  console.log(`   🐙 GitHub URLs: ${validationSummary.gitHubURLs}`);
  console.log(`   📝 Text Fragment URLs: ${validationSummary.textFragmentURLs}`);
  console.log(`   🔢 TypedArray URLs: ${validationSummary.typedArrayURLs}`);
  
  // Calculate percentages
  const percentValid = (validationSummary.validURLs / validationSummary.totalURLsTested * 100).toFixed(1);
  console.log(`   📈 Success Rate: ${percentValid}%`);
  
  logSection('10. Practical Usage Example');
  
  // Show a complete practical example
  console.log('🚀 Complete Example: CLI + Utils + Documentation');
  
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

console.log('📚 Documentation:', docs);`;
  
  console.log('\n💻 Code Example:');
  console.log(completeExample);
  
  console.log('\n📚 Documentation URLs Used:');
  const urls = completeExample.match(/https:\/\/[^\s'"]+/g);
  urls?.forEach(url => {
    const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(url);
    console.log(`   ${validation.isValid ? '✅' : '❌'} ${url}`);
    if (validation.provider) {
      console.log(`     🏷️  ${validation.provider} - ${validation.type}`);
    }
  });
}

// Run all examples
runComprehensiveExamples().catch(console.error);
