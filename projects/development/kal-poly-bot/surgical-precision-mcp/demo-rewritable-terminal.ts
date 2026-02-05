import { RewritableTerminal, StandardRewriters, StandardFilters } from './rewritable-terminal';

async function demo() {
  console.log('\n🚀 Starting RewritableTerminal Demo');
  console.log('━'.repeat(50));
  
  // 1. Basic Interactive Session with Colorization and Timestamps
  console.log('\n📝 Scenario 1: Interactive Shell with colorizer + timestamps');
  const term1 = new RewritableTerminal(['bash'], {
    rewriters: [
      StandardRewriters.colorizer,
      StandardRewriters.timestamp
    ]
  });

  await term1.spawn();
  
  // Send some commands to see the rewriting in action
  term1.write('echo "This is a success message"\n');
  term1.write('echo "This is an error message"\n');
  term1.write('echo "token=12345secret"\n'); // This won't be masked yet
  
  await new Promise(r => setTimeout(r, 500));
  
  // 2. Sensitive Data Masking demo
  console.log('\n🔒 Scenario 2: Adding Sensitive Data Masking');
  term1.addRewriter(StandardRewriters.sensitiveDataMask);
  await new Promise(r => setTimeout(r, 100)); // Brief pause to ensure rewriter is registered
  term1.write('echo "password=supersecret"\n');
  
  await new Promise(r => setTimeout(r, 500));

  // 3. Team Attribution demo
  console.log('\n👥 Scenario 3: Team Attribution (Alice)');
  const aliceTerm = new RewritableTerminal(['bash'], {
    rewriters: [
      StandardRewriters.teamAttribution('Alice'),
      StandardRewriters.colorizer
    ]
  });
  await aliceTerm.spawn();
  aliceTerm.write('echo "Alice checking in with a success status"\n');
  
  await new Promise(r => setTimeout(r, 500));

  // 4. Filtering demo
  console.log('\n🔍 Scenario 4: Severity Filtering (Errors Only)');
  const errorOnlyTerm = new RewritableTerminal(['bash'], {
    filters: [
      StandardFilters.minimumSeverity('error')
    ],
    rewriters: [
      StandardRewriters.colorizer
    ]
  });
  await errorOnlyTerm.spawn();
  errorOnlyTerm.write('echo "This info message should be hidden"\n');
  errorOnlyTerm.write('echo "This error message should be visible"\n');
  
  await new Promise(r => setTimeout(r, 1000));

  // Cleanup
  term1.close();
  aliceTerm.close();
  errorOnlyTerm.close();
  
  console.log('\n✅ Demo Complete');
  process.exit(0);
}

demo().catch(console.error);
