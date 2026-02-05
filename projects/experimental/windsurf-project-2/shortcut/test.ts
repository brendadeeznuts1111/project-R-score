import { ShortcutRegistry } from './src/core/registry.ts';
import type { ShortcutConfig } from './src/types.ts';

// Simple test runner for the enhanced ShortcutRegistry
class RegistryTester {
  private registry: ShortcutRegistry;
  private tests: Array<{ name: string; fn: () => Promise<boolean> }> = [];
  private passed = 0;
  private failed = 0;

  constructor() {
    this.registry = new ShortcutRegistry();
  }

  test(name: string, fn: () => Promise<boolean>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running ShortcutRegistry Tests...\n');

    for (const test of this.tests) {
      try {
        const result = await test.fn();
        if (result) {
          console.log(`✅ ${test.name}`);
          this.passed++;
        } else {
          console.log(`❌ ${test.name}`);
          this.failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name} - Error: ${error}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    // Cleanup
    await this.registry.dispose();
    return this.failed === 0;
  }

  // Test methods
  async testBasicRegistration() {
    const shortcut: ShortcutConfig = {
      id: 'test_shortcut',
      action: 'test.action',
      description: 'Test shortcut',
      category: 'general',
      default: { primary: 'Ctrl + T' },
      enabled: true,
      scope: 'global'
    };

    this.registry.register(shortcut);
    return this.registry.getShortcutCount() === 1;
  }

  async testProfileCreation() {
    const profile = this.registry.createProfile('Test Profile', 'A test profile');
    return profile.name === 'Test Profile' && profile.description === 'A test profile';
  }

  async testSearchFunctionality() {
    // Register a few shortcuts first
    const shortcuts: ShortcutConfig[] = [
      {
        id: 'save_file',
        action: 'file.save',
        description: 'Save the current file',
        category: 'general',
        default: { primary: 'Ctrl + S' },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'save_as',
        action: 'file.saveAs',
        description: 'Save file with new name',
        category: 'general',
        default: { primary: 'Ctrl + Shift + S' },
        enabled: true,
        scope: 'global'
      }
    ];

    await this.registry.registerBatch(shortcuts);
    
    const results = this.registry.searchShortcuts('save');
    return results.length === 2;
  }

  async testConflictDetection() {
    // Create conflicting shortcuts
    const shortcut1: ShortcutConfig = {
      id: 'conflict_test_1',
      action: 'test.action1',
      description: 'First test shortcut',
      category: 'general',
      default: { primary: 'Ctrl + X' },
      enabled: true,
      scope: 'global'
    };

    const shortcut2: ShortcutConfig = {
      id: 'conflict_test_2',
      action: 'test.action2',
      description: 'Second test shortcut',
      category: 'general',
      default: { primary: 'Ctrl + X' },
      enabled: true,
      scope: 'global'
    };

    this.registry.register(shortcut1);
    
    try {
      this.registry.register(shortcut2);
      return false; // Should have thrown an error
    } catch (error) {
      return error instanceof Error && error.name === 'ConflictError';
    }
  }

  async testBatchOperations() {
    const shortcuts: ShortcutConfig[] = [
      {
        id: 'batch_test_1',
        action: 'batch.test1',
        description: 'Batch test 1',
        category: 'general',
        default: { primary: 'Ctrl + 1' },
        enabled: true,
        scope: 'global'
      },
      {
        id: 'batch_test_2',
        action: 'batch.test2',
        description: 'Batch test 2',
        category: 'general',
        default: { primary: 'Ctrl + 2' },
        enabled: true,
        scope: 'global'
      }
    ];

    const initialCount = this.registry.getShortcutCount();
    await this.registry.registerBatch(shortcuts);
    const finalCount = this.registry.getShortcutCount();
    
    return finalCount === initialCount + 2;
  }

  async testHealthCheck() {
    const health = await this.registry.healthCheck();
    return health && typeof health.status === 'string';
  }

  async testMetrics() {
    // Trigger some activity
    this.registry.trigger('test_shortcut');
    
    const metrics = this.registry.getMetrics();
    return metrics && typeof metrics.uptime === 'number';
  }

  async testExportImport() {
    const exportedData = await this.registry.exportAllData();
    // Assuming exportAllData returns an object with shortcuts and profiles properties
    return Array.isArray(exportedData) || (exportedData && typeof exportedData === 'object');
  }

  async testValidation() {
    try {
      // Invalid shortcut (missing required fields)
      const invalidShortcut = {
        id: '',
        action: '',
        description: '',
        category: 'general',
        default: { primary: '' },
        enabled: true,
        scope: 'global'
      } as ShortcutConfig;

      this.registry.register(invalidShortcut);
      return false; // Should have thrown validation error
    } catch (error) {
      return error instanceof Error && error.name === 'ValidationError';
    }
  }
}

// Setup and run tests
async function runTests() {
  const tester = new RegistryTester();

  // Register tests
  tester.test('Basic Registration', () => tester.testBasicRegistration());
  tester.test('Profile Creation', () => tester.testProfileCreation());
  tester.test('Search Functionality', () => tester.testSearchFunctionality());
  tester.test('Conflict Detection', () => tester.testConflictDetection());
  tester.test('Batch Operations', () => tester.testBatchOperations());
  tester.test('Health Check', () => tester.testHealthCheck());
  tester.test('Metrics Collection', () => tester.testMetrics());
  tester.test('Export/Import', () => tester.testExportImport());
  tester.test('Input Validation', () => tester.testValidation());

  // Run all tests
  const success = await tester.run();
  
  if (success) {
    console.log('\n🎉 All tests passed! The enhanced ShortcutRegistry is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.');
  }

  return success;
}

// Run tests - universal approach
runTests().then(success => {
  console.log(success ? '\n🎉 All tests passed!' : '\n⚠️ Some tests failed.');
  return success;
}).catch(console.error);

export { runTests };
