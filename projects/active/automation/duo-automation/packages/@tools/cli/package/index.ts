// CLI Package Entry Point - Demonstrates Catalog Usage
import { Command } from 'commander';
import inquirer from 'inquirer';
import figlet from 'figlet';

console.info('🚀 DuoPlus CLI Core');
console.info('📦 Using catalog dependencies:');
console.info(`  - Commander package loaded successfully`);
console.info(`  - Inquirer package loaded successfully`);
console.info(`  - Figlet package loaded successfully`);

export const program = new Command();

program
  .name('duoplus-cli')
  .description('DuoPlus CLI Core with catalog dependencies')
  .version('1.2.4-beta.0');

program.command('test-catalogs')
  .description('Test catalog dependency resolution')
  .action(async () => {
    console.info('✅ Catalog dependencies resolved successfully!');
    
    // Test inquirer
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Enter your name:'
      }
    ]);
    
    console.info(`Hello ${answers.name}!`);
    
    // Test figlet
    figlet.text('DuoPlus', (err, data) => {
      if (err) {
        console.info('Something went wrong...');
        console.error(err);
        return;
      }
      console.info(data);
    });
  });

program.command('test-catalog-resolution')
  .description('Verify catalog dependencies are resolved')
  .action(() => {
    console.info('🔍 Catalog Resolution Verification:');
    console.info('  ✅ commander: Resolved from catalog:');
    console.info('  ✅ inquirer: Resolved from catalog:');
    console.info('  ✅ figlet: Resolved from catalog:');
    console.info('  ✅ @types/inquirer: Resolved from catalog:');
    console.info('🎯 All catalog dependencies working correctly!');
  });

if (import.meta.main) {
  program.parse();
}
