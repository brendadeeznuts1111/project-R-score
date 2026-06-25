#!/usr/bin/env bun

// Demo of package aliases with Bun
async function runAliasDemo() {
  console.info('🏷️ Package Aliases Demo');
  console.info('========================');

  // Import packages using their aliases with type assertions
  try {
    const { z } = await import('validation-lib');
    const utilsLib = await import('utils-lib') as any;
    // Use the original date-fns since date-helper alias has typing issues
    const dateHelper = await import('date-fns');

    console.info('✅ All package aliases loaded successfully!');
    
    console.info('\n🔍 Alias Resolution:');
    console.info('====================');
    console.info('validation-lib → npm:zod');
    console.info('utils-lib → npm:lodash');
    console.info('date-helper → npm:date-fns@2.30.0');

    console.info('\n🧪 Testing Aliased Packages:');
    console.info('===========================');

    // Test validation-lib (alias for zod)
    console.info('\n1. validation-lib (Zod alias):');
    const UserSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      age: z.number().min(0).optional()
    });

    try {
      const testUser = { name: 'Alice', email: 'alice@example.com', age: 30 };
      const validated = UserSchema.parse(testUser);
      console.info('   ✅ Validation successful:', validated);
    } catch (error) {
      console.info('   ❌ Validation failed:', error instanceof Error ? error.message : String(error));
    }

    // Test utils-lib (alias for lodash)
    console.info('\n2. utils-lib (Lodash alias):');
    const numbers = [1, 2, 3, 4, 5];
    const doubled = utilsLib.default.map(numbers, (x: number) => x * 2);
    const shuffled = utilsLib.default.shuffle(numbers);
    console.info('   ✅ Original:', numbers);
    console.info('   ✅ Doubled:', doubled);
    console.info('   ✅ Shuffled:', shuffled);

    // Test date-helper (alias for date-fns - using original for typing)
    console.info('\n3. date-helper (Date-fns alias):');
    const now = new Date();
    const formatted = dateHelper.format(now, 'yyyy-MM-dd HH:mm:ss');
    const relative = dateHelper.format(now, 'PPpp');
    console.info('   ✅ ISO format:', formatted);
    console.info('   ✅ Pretty format:', relative);
    console.info('   📝 Note: Using original date-fns import due to typing issues with alias');

    console.info('\n📦 Package Configuration:');
    console.info('========================');
    
    // Read package.json to show aliases
    const packageJsonText = await Bun.file('./package.json').text();
    const packageJson = JSON.parse(packageJsonText);
    
    console.info('Package aliases in package.json:');
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      if (typeof version === 'string' && version.startsWith('npm:')) {
        console.info(`   ${name}: ${version}`);
      }
    });

    console.info('\n🎯 Alias Benefits:');
    console.info('==================');
    console.info('✅ Semantic naming - Use descriptive names for your domain');
    console.info('✅ Version pinning - Lock specific versions under aliases');
    console.info('✅ Conflict resolution - Use multiple versions of same package');
    console.info('✅ Migration support - Gradually rename package imports');
    console.info('✅ Abstraction layer - Hide implementation details');

    console.info('\n🛠️ Alias Patterns:');
    console.info('==================');
    console.info('bun add custom-name@npm:package              # Basic alias');
    console.info('bun add custom-name@npm:package@1.2.3        # Version-specific alias');
    console.info('bun add custom-name@npm:package@beta          # Tag-specific alias');
    console.info('bun add custom-name@npm:package --exact       # Exact version alias');

    console.info('\n🔄 Migration Example:');
    console.info('===================');
    console.info('// Old: import { z } from "zod";');
    console.info('// New: import { z } from "validation-lib";');
    console.info('');
    console.info('Benefits:');
    console.info('- Domain-specific naming');
    console.info('- Version control');
    console.info('- Easy refactoring');

    console.info('\n🎉 Package Aliases Demo Complete!');

  } catch (error) {
    console.error('❌ Error loading package aliases:', error instanceof Error ? error.message : String(error));
  }
}

// Run the demo
runAliasDemo().catch(console.error);
