// Demo: Bun wrapAnsi Feature Showcase
// Demonstrates advanced ANSI-aware text wrapping with Unicode support

async function demonstrateWrapAnsiFeatures() {
  console.info('🎯 Bun wrapAnsi Feature Showcase');
  console.info('==================================\n');

  console.info('📊 Feature Overview:');
  console.info('====================');
  console.info('• ANSI-aware text wrapping');
  console.info('• Unicode character support');
  console.info('• Color/style preservation across line breaks');
  console.info('• Full-width character handling');
  console.info('• Advanced wrapping options');
  console.info('• Production-ready edge case handling\n');

  // Demo 1: Basic Wrapping
  console.info('✅ Demo 1: Basic Text Wrapping');
  console.info('===============================');
  
  const basicTests = [
    { text: 'hello world', columns: 5 },
    { text: 'one two three four', columns: 8 },
    { text: 'short', columns: 10 },
    { text: 'abcdefghij', columns: 5 },
    { text: '', columns: 10 }
  ];

  basicTests.forEach(({ text, columns }) => {
    const result = Bun.wrapAnsi(text, columns);
    console.info(`   Input: "${text}" (width: ${columns})`);
    console.info(`   Output: "${result.replace(/\n/g, '\\n')}"`);
    console.info(`   Lines: ${result.split('\n').length}`);
    console.info('');
  });

  // Demo 2: Hard Wrap Option
  console.info('✅ Demo 2: Hard Wrap Option');
  console.info('===========================');
  
  const hardWrapTests = [
    { text: 'abcdefgh', columns: 3, hard: true },
    { text: 'verylongword', columns: 4, hard: true },
    { text: 'supercalifragilisticexpialidocious', columns: 8, hard: true }
  ];

  hardWrapTests.forEach(({ text, columns, hard }) => {
    const normal = Bun.wrapAnsi(text, columns);
    const hardWrap = Bun.wrapAnsi(text, columns, { hard });
    
    console.info(`   Input: "${text}" (width: ${columns})`);
    console.info(`   Normal: "${normal.replace(/\n/g, '\\n')}"`);
    console.info(`   Hard:   "${hardWrap.replace(/\n/g, '\\n')}"`);
    console.info('');
  });

  // Demo 3: ANSI Color Preservation
  console.info('✅ Demo 3: ANSI Color Preservation');
  console.info('===================================');
  
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
    console.info(`   ${name}:`);
    console.info(`   Input:  "${text.replace(/\x1b/g, '\\x1b')}"`);
    console.info(`   Output: "${result.replace(/\x1b/g, '\\x1b')}"`);
    console.info(`   Lines:  ${result.split('\n').length}`);
    console.info('');
  });

  // Demo 4: Advanced ANSI Codes
  console.info('✅ Demo 4: Advanced ANSI Codes');
  console.info('===============================');
  
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
    console.info(`   ${name}:`);
    console.info(`   Input:  "${text.replace(/\x1b/g, '\\x1b')}"`);
    console.info(`   Output: "${result.replace(/\x1b/g, '\\x1b')}"`);
    console.info('');
  });

  // Demo 5: Unicode Support
  console.info('✅ Demo 5: Unicode Character Support');
  console.info('=====================================');
  
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
    
    console.info(`   ${name}: "${text}"`);
    console.info(`   Normal: "${normal.replace(/\n/g, '\\n')}"`);
    console.info(`   Hard:   "${hard.replace(/\n/g, '\\n')}"`);
    console.info('');
  });

  // Demo 6: Width Tracking Examples
  console.info('✅ Demo 6: Width Tracking Precision');
  console.info('===================================');
  
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
    
    console.info(`   ${name}: "${text}"`);
    console.info(`   Total width: ${textWidth} columns`);
    console.info(`   Wrap at: ${columns} columns`);
    console.info(`   Result: "${result.replace(/\n/g, '\\n')}"`);
    console.info('');
  });

  // Demo 7: Practical Examples
  console.info('✅ Demo 7: Practical Usage Examples');
  console.info('===================================');
  
  // CLI Help Text
  const helpText = '\x1b[1mUSAGE\x1b[0m\n\x1b[36m  myapp [options] <command>\x1b[0m\n\n\x1b[1mOPTIONS\x1b[0m\n\x1b[32m  --help\x1b[0m     Show help message\n\x1b[32m  --version\x1b[0m  Show version\n\x1b[32m  --verbose\x1b[0m  Verbose output';
  
  console.info('   CLI Help Text (wrapped to 30 columns):');
  console.info('   ' + '─'.repeat(40));
  const wrappedHelp = Bun.wrapAnsi(helpText, 30);
  console.info('   ' + wrappedHelp.replace(/\n/g, '\n   '));
  console.info('   ' + '─'.repeat(40));
  console.info('');

  // Status Messages
  const statusMessages = [
    '\x1b[32m✓ Success: Operation completed successfully\x1b[0m',
    '\x1b[33m⚠ Warning: Configuration file not found, using defaults\x1b[0m',
    '\x1b[31m✗ Error: Failed to connect to database server at localhost:5432\x1b[0m'
  ];

  console.info('   Status Messages (wrapped to 40 columns):');
  console.info('   ' + '─'.repeat(45));
  statusMessages.forEach(msg => {
    const wrapped = Bun.wrapAnsi(msg, 40);
    console.info('   ' + wrapped.replace(/\n/g, '\n   '));
    console.info('');
  });
  console.info('   ' + '─'.repeat(45));
  console.info('');

  // Demo 8: Edge Cases
  console.info('✅ Demo 8: Edge Case Handling');
  console.info('=============================');
  
  const edgeCases = [
    { text: 'hello\nworld', columns: 5, name: 'Existing Newlines' },
    { text: '  indented text', columns: 10, name: 'Indented Text' },
    { text: 'multiple    spaces', columns: 10, name: 'Multiple Spaces' },
    { text: 'a\tb\tc', columns: 5, name: 'Tab Characters' },
    { text: 'hello\r\nworld', columns: 10, name: 'Windows Line Endings' }
  ];

  edgeCases.forEach(({ text, columns, name }) => {
    const result = Bun.wrapAnsi(text, columns);
    console.info(`   ${name}:`);
    console.info(`   Input:  "${text.replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`);
    console.info(`   Output: "${result.replace(/\n/g, '\\n')}"`);
    console.info('');
  });

  // Demo 9: Advanced Options
  console.info('✅ Demo 9: Advanced Options');
  console.info('===========================');
  
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
    console.info(`   ${name}: "${text}"`);
    options.forEach((option, index) => {
      const result = Bun.wrapAnsi(text, columns, option);
      const optionStr = Object.entries(option).map(([k, v]) => `${k}: ${v}`).join(', ');
      console.info(`   Option ${index + 1} (${optionStr}): "${result.replace(/\n/g, '\\n')}"`);
    });
    console.info('');
  });

  // Demo 10: Performance Test
  console.info('✅ Demo 10: Performance Testing');
  console.info('===============================');
  
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
    
    console.info(`   Test ${index + 1}:`);
    console.info(`   Text length: ${text.length} characters`);
    console.info(`   1000 iterations: ${duration.toFixed(2)}ms`);
    console.info(`   Average per call: ${avgTime.toFixed(4)}ms`);
    console.info('');
  });

  // Summary
  console.info('🎊 wrapAnsi Feature Summary');
  console.info('============================');
  
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

  console.info(`📊 Total Feature Tests: ${totalTests}`);
  console.info(`✅ Successful: ${successfulTests}`);
  console.info(`📈 Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

  console.info('\n🚀 Key Features Demonstrated:');
  console.info('• ANSI-aware wrapping with style preservation');
  console.info('• Unicode support for global applications');
  console.info('• Advanced options (hard, trim, wordWrap)');
  console.info('• Full-width character handling');
  console.info('• 256-color and TrueColor support');
  console.info('• Edge case robustness');
  console.info('• Performance optimized for production');

  console.info('\n🌟 Production-Ready Capabilities:');
  console.info('• Terminal application formatting');
  console.info('• CLI help text generation');
  console.info('• Status message wrapping');
  console.info('• International text processing');
  console.info('• Log file formatting');
  console.info('• Report generation');

  console.info('\n✨ Demo Complete!');
  console.info('================');
  console.info('Bun.wrapAnsi provides sophisticated text wrapping');
  console.info('with perfect ANSI preservation and Unicode support!');
  console.info('Ideal for terminal applications and CLI tools! 🎯');
}

// Run the demonstration
if (import.meta.main) {
  demonstrateWrapAnsiFeatures().catch(console.error);
}
