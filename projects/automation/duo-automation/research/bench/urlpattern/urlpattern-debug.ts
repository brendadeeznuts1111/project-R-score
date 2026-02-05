#!/usr/bin/env bun
// urlpattern-debug.ts - Debug URLPattern matching

async function debugURLPattern() {
  const { URLPattern } = globalThis as any;
  
  console.log('🔍 **Debugging URLPattern Matching** 🔍');
  
  // Test different pattern formats
  const patterns = {
    withSlash: new URLPattern({ pathname: '/apple-ids/:userId.json' }),
    withWildcard: new URLPattern({ pathname: '*/apple-ids/:userId.json' }),
    exact: new URLPattern({ pathname: 'apple-ids/:userId.json' })
  };
  
  const testPaths = [
    'apple-ids/demo-user.json',
    '/apple-ids/demo-user.json',
    { pathname: 'apple-ids/demo-user.json' },
    { pathname: '/apple-ids/demo-user.json' }
  ];
  
  Object.entries(patterns).forEach(([patternName, pattern]) => {
    console.log(`\n📋 Pattern: ${patternName} - ${pattern.pathname}`);
    
    testPaths.forEach((testPath, index) => {
      let matches = false;
      let result = null;
      
      try {
        if (typeof testPath === 'string') {
          matches = pattern.test(testPath);
          result = matches ? pattern.exec(testPath) : null;
        } else {
          matches = pattern.test(testPath);
          result = matches ? pattern.exec(testPath) : null;
        }
        
        console.log(`  Test ${index + 1}: ${matches ? '✅' : '❌'} ${JSON.stringify(testPath)}`);
        if (result) {
          console.log(`    Groups: ${JSON.stringify(result.pathname.groups)}`);
        }
      } catch (error: any) {
        console.log(`  Test ${index + 1}: ❌ Error - ${error.message}`);
      }
    });
  });
}

debugURLPattern();
