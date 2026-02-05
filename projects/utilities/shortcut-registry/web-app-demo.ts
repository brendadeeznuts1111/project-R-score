/**
 * Web App Demo Script
 *
 * Demonstrates programmatic interaction with the ShortcutRegistry Web Manager
 * Shows how to use the REST API to manage shortcuts from code
 */

const BASE_URL = 'http://localhost:8080';

async function demoWebApp() {
  console.log('🎹 ShortcutRegistry Web App Demo');
  console.log('==================================\n');

  try {
    // 1. Get current shortcuts
    console.log('1. 📋 Fetching current shortcuts...');
    const shortcutsResponse = await fetch(`${BASE_URL}/api/shortcuts`);
    const shortcuts = await shortcutsResponse.json();
    console.log(`   Found ${shortcuts.length} shortcuts\n`);

    // 2. Add a custom shortcut
    console.log('2. ➕ Adding a custom shortcut...');
    const customShortcut = {
      id: 'demo.custom',
      action: 'demo-action',
      description: 'Demo Custom Shortcut',
      category: 'general',
      default: {
        primary: 'Ctrl+Shift+D',
        macOS: 'Cmd+Shift+D'
      },
      enabled: true,
      scope: 'global'
    };

    const addResponse = await fetch(`${BASE_URL}/api/shortcuts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customShortcut)
    });

    if (addResponse.ok) {
      console.log('   ✅ Custom shortcut added successfully\n');
    }

    // 3. Check for conflicts
    console.log('3. ⚠️ Checking for conflicts...');
    const conflictsResponse = await fetch(`${BASE_URL}/api/conflicts`);
    const conflicts = await conflictsResponse.json();
    console.log(`   Found ${conflicts.length} conflicts\n`);

    // 4. Get usage statistics
    console.log('4. 📊 Getting usage statistics...');
    const statsResponse = await fetch(`${BASE_URL}/api/stats/usage`);
    const stats = await statsResponse.json();
    console.log(`   Top shortcut: ${stats[0]?.description || 'None'} (${stats[0]?.usageCount || 0} uses)\n`);

    // 5. Create a new profile
    console.log('5. 👤 Creating a new profile...');
    const newProfile = {
      name: 'Demo Profile',
      description: 'Profile created via API demo',
      basedOn: 'professional'
    };

    const profileResponse = await fetch(`${BASE_URL}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile)
    });

    if (profileResponse.ok) {
      console.log('   ✅ Profile created successfully\n');
    }

    // 6. Seed database with test data
    console.log('6. 🌱 Seeding database with test data...');
    const seedResponse = await fetch(`${BASE_URL}/api/shortcuts`, {
      headers: {
        'X-Seed-Data': 'true',
        'X-Seed-Mode': 'test'
      }
    });

    const seedResult = await seedResponse.json();
    if (seedResult.success) {
      console.log('   ✅ Database seeded successfully\n');
    }

    // 7. Get updated shortcuts count
    console.log('7. 🔄 Getting updated shortcuts count...');
    const updatedResponse = await fetch(`${BASE_URL}/api/shortcuts`);
    const updatedShortcuts = await updatedResponse.json();
    console.log(`   Now have ${updatedShortcuts.length} shortcuts\n`);

    console.log('🎉 Web App Demo Complete!');
    console.log('\n📱 Open http://localhost:8080 in your browser to see the web interface!');
    console.log('🔗 API Documentation: Check WEB-APP-README.md');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\n💡 Make sure the web app is running: bun run web-app.ts');
  }
}

// Run the demo
if (import.meta.main) {
  demoWebApp();
}