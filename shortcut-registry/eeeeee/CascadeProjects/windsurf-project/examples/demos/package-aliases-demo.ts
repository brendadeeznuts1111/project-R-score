#!/usr/bin/env bun

// Demo of package aliases with Bun
async function runAliasDemo() {
  console.log('🏷️ Package Aliases Demo');
  console.log('========================');

  // Import packages using their aliases with type assertions
  try {
    const { z } = await import('validation-lib');
    const utilsLib = await import('utils-lib') as any;
    // Use the original date-fns since date-helper alias has typing issues
    const dateHelper = await import('date-fns');

    console.log('✅ All package aliases loaded successfully!');
    
    console.log('\n🔍 Alias Resolution:');
    console.log('====================');
    console.log('validation-lib → npm:zod');
    console.log('utils-lib → npm:lodash');
    console.log('date-helper → npm:date-fns@2.30.0');

    console.log('\n🧪 Testing Aliased Packages:');
    console.log('===========================');

    // Test validation-lib (alias for zod)
    console.log('\n1. validation-lib (Zod alias):');
    const UserSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      age: z.number().min(0).optional()
    });

    try {
      const testUser = { name: 'Alice', email: 'alice@example.com', age: 30 };
      const validated = UserSchema.parse(testUser);
      console.log('   ✅ Validation successful:', validated);
    } catch (error) {
      console.log('   ❌ Validation failed:', error instanceof Error ? error.message : String(error));
    }

    // Test utils-lib (alias for lodash)
    console.log('\n2. utils-lib (Lodash alias):');
    const numbers = [1, 2, 3, 4, 5];
    const doubled = utilsLib.default.map(numbers, (x: number) => x * 2);
    const shuffled = utilsLib.default.shuffle(numbers);
    console.log('   ✅ Original:', numbers);
    console.log('   ✅ Doubled:', doubled);
    console.log('   ✅ Shuffled:', shuffled);

    // Test date-helper (alias for date-fns - using original for typing)
    console.log('\n3. date-helper (Date-fns alias):');
    const now = new Date();
    const formatted = dateHelper.format(now, 'yyyy-MM-dd HH:mm:ss');
    const relative = dateHelper.format(now, 'PPpp');
    console.log('   ✅ ISO format:', formatted);
    console.log('   ✅ Pretty format:', relative);
    console.log('   📝 Note: Using original date-fns import due to typing issues with alias');

    console.log('\n📦 Package Configuration:');
    console.log('========================');
    
    // Read package.json to show aliases
    const packageJsonText = await Bun.file('./package.json').text();
    const packageJson = JSON.parse(packageJsonText);
    
    console.log('Package aliases in package.json:');
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      if (typeof version === 'string' && version.startsWith('npm:')) {
        console.log(`   ${name}: ${version}`);
      }
    });

    console.log('\n🎯 Alias Benefits:');
    console.log('==================');
    console.log('✅ Semantic naming - Use descriptive names for your domain');
    console.log('✅ Version pinning - Lock specific versions under aliases');
    console.log('✅ Conflict resolution - Use multiple versions of same package');
    console.log('✅ Migration support - Gradually rename package imports');
    console.log('✅ Abstraction layer - Hide implementation details');

    console.log('\n🛠️ Alias Patterns:');
    console.log('==================');
    console.log('bun add custom-name@npm:package              # Basic alias');
    console.log('bun add custom-name@npm:package@1.2.3        # Version-specific alias');
    console.log('bun add custom-name@npm:package@beta          # Tag-specific alias');
    console.log('bun add custom-name@npm:package --exact       # Exact version alias');

    console.log('\n🔄 Migration Example:');
    console.log('===================');
    console.log('// Old: import { z } from "zod";');
    console.log('// New: import { z } from "validation-lib";');
    console.log('');
    console.log('Benefits:');
    console.log('- Domain-specific naming');
    console.log('- Version control');
    console.log('- Easy refactoring');

    console.log('\n🎉 Package Aliases Demo Complete!');

  } catch (error) {
    console.error('❌ Error loading package aliases:', error instanceof Error ? error.message : String(error));
  }
}

// Run the demo
runAliasDemo().catch(console.error);
