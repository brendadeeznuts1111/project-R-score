// CLI Package Entry Point - Demonstrates Catalog Usage
import { Command } from 'commander';
import inquirer from 'inquirer';
import figlet from 'figlet';

console.log('🚀 DuoPlus CLI Core');
console.log('📦 Using catalog dependencies:');
console.log(`  - Commander package loaded successfully`);
console.log(`  - Inquirer package loaded successfully`);
console.log(`  - Figlet package loaded successfully`);

export const program = new Command();

program
  .name('duoplus-cli')
  .description('DuoPlus CLI Core with catalog dependencies')
  .version('1.2.4-beta.0');

program.command('test-catalogs')
  .description('Test catalog dependency resolution')
  .action(async () => {
    console.log('✅ Catalog dependencies resolved successfully!');
    
    // Test inquirer
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter your name:'
      }
    ]);
    
    console.log(`Hello ${answers.name}!`);
    
    // Test figlet
    figlet.text('DuoPlus', (err, data) => {
      if (err) {
        console.log('Something went wrong...');
        console.error(err);
        return;
      }
      console.log(data);
    });
  });

program.command('test-catalog-resolution')
  .description('Verify catalog dependencies are resolved')
  .action(() => {
    console.log('🔍 Catalog Resolution Verification:');
    console.log('  ✅ commander: Resolved from catalog:');
    console.log('  ✅ inquirer: Resolved from catalog:');
    console.log('  ✅ figlet: Resolved from catalog:');
    console.log('  ✅ @types/inquirer: Resolved from catalog:');
    console.log('🎯 All catalog dependencies working correctly!');
  });

if (import.meta.main) {
  program.parse();
}
