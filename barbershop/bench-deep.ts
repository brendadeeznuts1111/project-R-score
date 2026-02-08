#!/usr/bin/env bun

/**
 * Deep benchmark for testing Progressive Disclosure CLI with visible depth differences
 */

export {}; // Make this file a module

console.log('🚀 Starting deep benchmark...');

// Create a complex nested object that will show different output at different depths
const complexData = {
  level1: {
    data: 'Level 1 data',
    level2: {
      data: 'Level 2 data',
      level3: {
        data: 'Level 3 data',
        level4: {
          data: 'Level 4 data',
          level5: {
            data: 'Level 5 data',
            level6: {
              data: 'Level 6 data - Deep!',
              level7: {
                data: 'Level 7 data - Very Deep!',
                level8: {
                  data: 'Level 8 data - Extremely Deep!',
                  final: 'This should only appear at high depths!'
                }
              }
            }
          }
        }
      }
    }
  },
  arrays: Array.from({ length: 10 }, (_, i) => ({
    id: i,
    nested: {
      deep: `Item ${i} deep data`,
      very: {
        deep: `Item ${i} very deep data`
      }
    }
  })),
  circular: { self: null as any } as any
};

// Create circular reference
complexData.circular.self = complexData.circular;

console.log('📊 Complex data structure created');
console.log('🔍 Logging the object to test depth levels:');
console.log(complexData);

console.log('\n✅ Deep benchmark completed');
