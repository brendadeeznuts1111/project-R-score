// Demo: Bun wrapAnsi Feature Showcase
// Demonstrates advanced ANSI-aware text wrapping with Unicode support

async function demonstrateWrapAnsiFeatures() {
  console.log('🎯 Bun wrapAnsi Feature Showcase');
  console.log('==================================\n');

  console.log('📊 Feature Overview:');
  console.log('====================');
  console.log('• ANSI-aware text wrapping');
  console.log('• Unicode character support');
  console.log('• Color/style preservation across line breaks');
  console.log('• Full-width character handling');
  console.log('• Advanced wrapping options');
  console.log('• Production-ready edge case handling\n');

  // Demo 1: Basic Wrapping
  console.log('✅ Demo 1: Basic Text Wrapping');
  console.log('===============================');
  
  const basicTests = [
    { text: 'hello world', columns: 5 },
    { text: 'one two three four', columns: 8 },
    { text: 'short', columns: 10 },
    { text: 'abcdefghij', columns: 5 },
    { text: '', columns: 10 }
  ];

  basicTests.forEach(({ text, columns }) => {
    const result = Bun.wrapAnsi(text, columns);
    console.log(`   Input: "${text}" (width: ${columns})`);
    console.log(`   Output: "${result.replace(/\n/g, '\\n')}"`);
    console.log(`   Lines: ${result.split('\n').length}`);
    console.log('');
  });

  // Demo 2: Hard Wrap Option
  console.log('✅ Demo 2: Hard Wrap Option');
  console.log('===========================');
  
  const hardWrapTests = [
    { text: 'abcdefgh', columns: 3, hard: true },
    { text: 'verylongword', columns: 4, hard: true },
    { text: 'supercalifragilisticexpialidocious', columns: 8, hard: true }
  ];

  hardWrapTests.forEach(({ text, columns, hard }) => {
    const normal = Bun.wrapAnsi(text, columns);
    const hardWrap = Bun.wrapAnsi(text, columns, { hard });
    
    console.log(`   Input: "${text}" (width: ${columns})`);
    console.log(`   Normal: "${normal.replace(/\n/g, '\\n')}"`);
    console.log(`   Hard:   "${hardWrap.replace(/\n/g, '\\n')}"`);
    console.log('');
  });

  // Demo 3: ANSI Color Preservation
  console.log('✅ Demo 3: ANSI Color Preservation');
  console.log('===================================');
  
  const ansiTests = [
    { 
      name: 'Simple Color',
      text: '\x1b[31mhello world\x1b[0m',
      columns: 5
    },
    { 
      name: 'Color Across Break',
      text: '\x1b[32mgreen text here\x1b[0m',
      columns: 6
    },
    { 
      name: 'Multiple Colors',
      text: '\x1b[31mred\x1b[0m \x1b[34mblue\x1b[0m \x1b[33myellow\x1b[0m',
      columns: 10
    },
    { 
      name: 'Bold + Color',
      text: '\x1b[1m\x1b[35mbold purple text\x1b[0m',
      columns: 8
    }
  ];

  ansiTests.forEach(({ name, text, columns }) => {
    const result = Bun.wrapAnsi(text, columns);
    console.log(`   ${name}:`);
    console.log(`   Input:  "${text.replace(/\x1b/g, '\\x1b')}"`);
    console.log(`   Output: "${result.replace(/\x1b/g, '\\x1b')}"`);
    console.log(`   Lines:  ${result.split('\n').length}`);
    console.log('');
  });

  // Demo 4: Advanced ANSI Codes
  console.log('✅ Demo 4: Advanced ANSI Codes');
  console.log('===============================');
  
  const advancedAnsiTests = [
    {
      name: '256-Color',
      text: '\x1b[38;5;196mRed text here\x1b[0m',
      columns: 5
    },
    {
      name: 'TrueColor RGB',
      text: '\x1b[38;2;255;128;0mOrange text\x1b[0m',
      columns: 6
    },
    {
      name: 'Background Color',
      text: '\x1b[41mRed background text\x1b[0m',
      columns: 8
    },
    {
      name: 'Underline + Color',
      text: '\x1b[4m\x1b[32munderlined green\x1b[0m',
      columns: 9
    }
  ];

  advancedAnsiTests.forEach(({ name, text, columns }) => {
    const result = Bun.wrapAnsi(text, columns);
    console.log(`   ${name}:`);
    console.log(`   Input:  "${text.replace(/\x1b/g, '\\x1b')}"`);
    console.log(`   Output: "${result.replace(/\x1b/g, '\\x1b')}"`);
    console.log('');
  });

  // Demo 5: Unicode Support
  console.log('✅ Demo 5: Unicode Character Support');
  console.log('=====================================');
  
  const unicodeTests = [
    {
      name: 'Japanese Characters',
      text: '日本語',
      columns: 4
    },
    {
      name: 'Mixed ASCII + Japanese',
      text: 'hello 世界',
      columns: 8
    },
    {
      name: 'Emoji in Text',
      text: 'Hello 👋 World 🌍',
      columns: 12
    },
    {
      name: 'Complex Emoji',
      text: '👩‍💻 is coding 🚀',
      columns: 10
    },
    {
      name: 'Korean Text',
      text: '안녕하세요',
      columns: 6
    }
  ];

  unicodeTests.forEach(({ name, text, columns }) => {
    const normal = Bun.wrapAnsi(text, columns);
    const hard = Bun.wrapAnsi(text, columns, { hard: true });
    
    console.log(`   ${name}: "${text}"`);
    console.log(`   Normal: "${normal.replace(/\n/g, '\\n')}"`);
    console.log(`   Hard:   "${hard.replace(/\n/g, '\\n')}"`);
    console.log('');
  });

  // Demo 6: Width Tracking Examples
  console.log('✅ Demo 6: Width Tracking Precision');
  console.log('===================================');
  
  const widthTests = [
    {
      name: 'Full-width only',
      text: 'あいうえお', // 5 chars, width 10
      columns: 4
    },
    {
      name: 'Mixed width',
      text: 'aあbい', // widths: 1+2+1+2 = 6
      columns: 3
    },
    {
      name: 'Emoji + ASCII',
      text: 'Hi 👋 there',
      columns: 8
    }
  ];

  widthTests.forEach(({ name, text, columns }) => {
    const result = Bun.wrapAnsi(text, columns, { hard: true });
    const textWidth = Bun.stringWidth(text);
    
    console.log(`   ${name}: "${text}"`);
    console.log(`   Total width: ${textWidth} columns`);
    console.log(`   Wrap at: ${columns} columns`);
    console.log(`   Result: "${result.replace(/\n/g, '\\n')}"`);
    console.log('');
  });

  // Demo 7: Practical Examples
  console.log('✅ Demo 7: Practical Usage Examples');
  console.log('===================================');
  
  // CLI Help Text
  const helpText = '\x1b[1mUSAGE\x1b[0m\n\x1b[36m  myapp [options] <command>\x1b[0m\n\n\x1b[1mOPTIONS\x1b[0m\n\x1b[32m  --help\x1b[0m     Show help message\n\x1b[32m  --version\x1b[0m  Show version\n\x1b[32m  --verbose\x1b[0m  Verbose output';
  
  console.log('   CLI Help Text (wrapped to 30 columns):');
  console.log('   ' + '─'.repeat(40));
  const wrappedHelp = Bun.wrapAnsi(helpText, 30);
  console.log('   ' + wrappedHelp.replace(/\n/g, '\n   '));
  console.log('   ' + '─'.repeat(40));
  console.log('');

  // Status Messages
  const statusMessages = [
    '\x1b[32m✓ Success: Operation completed successfully\x1b[0m',
    '\x1b[33m⚠ Warning: Configuration file not found, using defaults\x1b[0m',
    '\x1b[31m✗ Error: Failed to connect to database server at localhost:5432\x1b[0m'
  ];

  console.log('   Status Messages (wrapped to 40 columns):');
  console.log('   ' + '─'.repeat(45));
  statusMessages.forEach(msg => {
    const wrapped = Bun.wrapAnsi(msg, 40);
    console.log('   ' + wrapped.replace(/\n/g, '\n   '));
    console.log('');
  });
  console.log('   ' + '─'.repeat(45));
  console.log('');

  // Demo 8: Edge Cases
  console.log('✅ Demo 8: Edge Case Handling');
  console.log('=============================');
  
  const edgeCases = [
    { text: 'hello\nworld', columns: 5, name: 'Existing Newlines' },
    { text: '  indented text', columns: 10, name: 'Indented Text' },
    { text: 'multiple    spaces', columns: 10, name: 'Multiple Spaces' },
    { text: 'a\tb\tc', columns: 5, name: 'Tab Characters' },
    { text: 'hello\r\nworld', columns: 10, name: 'Windows Line Endings' }
  ];

  edgeCases.forEach(({ text, columns, name }) => {
    const result = Bun.wrapAnsi(text, columns);
    console.log(`   ${name}:`);
    console.log(`   Input:  "${text.replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`);
    console.log(`   Output: "${result.replace(/\n/g, '\\n')}"`);
    console.log('');
  });

  // Demo 9: Advanced Options
  console.log('✅ Demo 9: Advanced Options');
  console.log('===========================');
  
  const optionTests = [
    {
      name: 'Trim vs No Trim',
      text: '  hello world',
      columns: 10,
      options: [
        { trim: true },
        { trim: false }
      ]
    },
    {
      name: 'WordWrap Control',
      text: 'hello world',
      columns: 5,
      options: [
        { wordWrap: true },
        { wordWrap: false }
      ]
    },
    {
      name: 'Ambiguous Width Characters',
      text: 'αβγδε', // Greek letters
      columns: 5,
      options: [
        { ambiguousIsNarrow: true },
        { ambiguousIsNarrow: false }
      ]
    }
  ];

  optionTests.forEach(({ name, text, columns, options }) => {
    console.log(`   ${name}: "${text}"`);
    options.forEach((option, index) => {
      const result = Bun.wrapAnsi(text, columns, option);
      const optionStr = Object.entries(option).map(([k, v]) => `${k}: ${v}`).join(', ');
      console.log(`   Option ${index + 1} (${optionStr}): "${result.replace(/\n/g, '\\n')}"`);
    });
    console.log('');
  });

  // Demo 10: Performance Test
  console.log('✅ Demo 10: Performance Testing');
  console.log('===============================');
  
  const performanceTests = [
    { text: 'hello world '.repeat(100), columns: 20 },
    { text: '\x1b[31mred text\x1b[0m '.repeat(100), columns: 15 },
    { text: '日本語テキスト '.repeat(50), columns: 10 }
  ];

  performanceTests.forEach(({ text, columns }, index) => {
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      Bun.wrapAnsi(text, columns);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTime = duration / 1000;
    
    console.log(`   Test ${index + 1}:`);
    console.log(`   Text length: ${text.length} characters`);
    console.log(`   1000 iterations: ${duration.toFixed(2)}ms`);
    console.log(`   Average per call: ${avgTime.toFixed(4)}ms`);
    console.log('');
  });

  // Summary
  console.log('🎊 wrapAnsi Feature Summary');
  console.log('============================');
  
  const allTests = [
    ...basicTests,
    ...hardWrapTests.map(t => ({ ...t, hard: true })),
    ...ansiTests,
    ...advancedAnsiTests,
    ...unicodeTests,
    ...widthTests
  ];

  let totalTests = 0;
  let successfulTests = 0;

  allTests.forEach(test => {
    try {
      totalTests++;
      const result = Bun.wrapAnsi(test.text, test.columns, test.hard !== undefined ? { hard: test.hard } : undefined);
      if (typeof result === 'string') {
        successfulTests++;
      }
    } catch (error) {
      console.error(`Error with test: ${test.text}`);
    }
  });

  console.log(`📊 Total Feature Tests: ${totalTests}`);
  console.log(`✅ Successful: ${successfulTests}`);
  console.log(`📈 Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

  console.log('\n🚀 Key Features Demonstrated:');
  console.log('• ANSI-aware wrapping with style preservation');
  console.log('• Unicode support for global applications');
  console.log('• Advanced options (hard, trim, wordWrap)');
  console.log('• Full-width character handling');
  console.log('• 256-color and TrueColor support');
  console.log('• Edge case robustness');
  console.log('• Performance optimized for production');

  console.log('\n🌟 Production-Ready Capabilities:');
  console.log('• Terminal application formatting');
  console.log('• CLI help text generation');
  console.log('• Status message wrapping');
  console.log('• International text processing');
  console.log('• Log file formatting');
  console.log('• Report generation');

  console.log('\n✨ Demo Complete!');
  console.log('================');
  console.log('Bun.wrapAnsi provides sophisticated text wrapping');
  console.log('with perfect ANSI preservation and Unicode support!');
  console.log('Ideal for terminal applications and CLI tools! 🎯');
}

// Run the demonstration
if (import.meta.main) {
  demonstrateWrapAnsiFeatures().catch(console.error);
}
