#!/usr/bin/env bun
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

class CheatsheetCore {
  constructor() {
    this.cheatsheets = this.loadCheatsheets();
  }

  loadCheatsheets() {
    const cheatsheets = {};
    const sheetsDir = join(process.cwd(), 'cheatsheets');
    
    try {
      const files = [
        'cli.json',
        'bun-api.json', 
        'typescript.json',
        'patterns.json'
      ];
      
      for (const file of files) {
        const filePath = join(sheetsDir, file);
        if (existsSync(filePath)) {
          const name = file.replace('.json', '');
          cheatsheets[name] = JSON.parse(readFileSync(filePath, 'utf8'));
        }
      }
    } catch (error) {
      console.error('Error loading cheatsheets:', error.message);
    }
    
    return cheatsheets;
  }

  search(query, category = 'all') {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    for (const [catName, cheatsheet] of Object.entries(this.cheatsheets)) {
      if (category !== 'all' && category !== catName) continue;
      
      for (const [sectionName, section] of Object.entries(cheatsheet)) {
        if (section.commands) {
          for (const [cmdName, cmd] of Object.entries(section.commands)) {
            if (cmdName.toLowerCase().includes(searchTerm) || 
                cmd.toLowerCase().includes(searchTerm)) {
              results.push({
                category: catName,
                section: sectionName,
                name: cmdName,
                command: cmd,
                type: 'cli'
              });
            }
          }
        }
        
        if (section.examples) {
          for (const example of section.examples) {
            if (example.name.toLowerCase().includes(searchTerm) ||
                example.code.toLowerCase().includes(searchTerm)) {
              results.push({
                category: catName,
                section: sectionName,
                name: example.name,
                code: example.code,
                type: 'code'
              });
            }
          }
        }
      }
    }
    
    return results.slice(0, 20); // Limit results
  }

  getRandomTip() {
    const allTips = [];
    
    for (const cheatsheet of Object.values(this.cheatsheets)) {
      for (const section of Object.values(cheatsheet)) {
        if (section.commands) {
          for (const [name, cmd] of Object.entries(section.commands)) {
            allTips.push({ type: 'command', name, content: cmd });
          }
        }
        if (section.examples) {
          for (const example of section.examples) {
            allTips.push({ type: 'example', name: example.name, content: example.code });
          }
        }
      }
    }
    
    if (allTips.length === 0) {
      return { type: 'fallback', name: 'No tips available', content: 'Try running bun --help' };
    }
    
    return allTips[Math.floor(Math.random() * allTips.length)];
  }

  displayResults(results) {
    if (results.length === 0) {
      console.log('🔍 No results found');
      return;
    }
    
    console.log(`📚 Found ${results.length} results:`);
    console.log('='.repeat(60));
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. [${result.category.toUpperCase()}] ${result.name}`);
      console.log(`   Section: ${result.section}`);
      
      if (result.type === 'cli') {
        console.log(`   $ ${result.command}`);
      } else {
        console.log(`   📝 ${result.code.substring(0, 100)}...`);
      }
    });
  }
}

// CLI Interface
if (import.meta.main) {
  const cheatsheet = new CheatsheetCore();
  const args = Bun.argv.slice(2);
  
  const command = args[0];
  
  switch (command) {
    case 'search':
      const query = args.slice(1).join(' ');
      if (query) {
        const results = cheatsheet.search(query);
        cheatsheet.displayResults(results);
      } else {
        console.log('Usage: bun run cheatsheet search <query>');
      }
      break;
      
    case 'tip':
      const tip = cheatsheet.getRandomTip();
      console.log('💡 Cheatsheet Tip of the Moment:');
      console.log('='.repeat(50));
      console.log(`📌 ${tip.name}`);
      console.log('\n' + (tip.type === 'command' ? `$ ${tip.content}` : tip.content));
      break;
      
    case 'list':
      console.log('📚 Available Cheatsheets:');
      Object.keys(cheatsheet.cheatsheets).forEach(cat => {
        console.log(`  • ${cat}`);
      });
      break;
      
    default:
      console.log('Bun Cheatsheet System');
      console.log('=====================');
      console.log('Commands:');
      console.log('  search <query>   - Search cheatsheets');
      console.log('  tip              - Get random tip');
      console.log('  list             - List all cheatsheets');
      break;
  }
}

export { CheatsheetCore };
