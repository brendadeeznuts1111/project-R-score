// master-matrix.ts - ULTIMATE MERGE + GEN
import { writeFileSync } from 'fs';

const SOURCES = {
  PERF: await Bun.file('docs/maintenance/perf-dashboard.md').text(),
  CONSTS: await Bun.file('docs/api/CONSTANTS_MATRIX.md').text(),
  URLS: await Bun.file('docs/api/URL_MATRIX.md').text(),
  CHANGELOG: await Bun.file('docs/changelogs/DUOPLUS_UPDATE_20251231.md').text()
};

const master: unknown[] = [];

// Parse & merge logic
Object.entries(SOURCES).forEach(([source, content]) => {
  // Regex parse tables → rows → push to master
  // We match rows that start with | and look like table rows, skipping headers and separators
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.startsWith('|') && !line.includes('---') && !line.toLowerCase().includes('category')) {
      // Split by | and clean up
      const cells = line.split('|').map(s => s.trim()).filter(s => s !== '');
      if (cells.length >= 6) {
        master.push({
            Category: cells[0] || source,
            SubCat: cells[1],
            ID: cells[2],
            Value: cells[3],
            Location: cells[4],
            Impact: cells[5],
            BunFix: cells[6] || ''
        });
      } else {
        master.push({ Category: source, Data: line });
      }
    }
  });
});

// Dedupe
const uniqueMaster = Array.from(new Set(master.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));

// Generate Markdown Table
let md = `# MASTER_MATRIX.md\n\n`;
md += `| Category | SubCat | ID/Pattern | Value/Title | Locations/Changes | Impact | Bun Fix/Script |\n`;
md += `|----------|--------|------------|-------------|-------------------|--------|---------------|\n`;

uniqueMaster.forEach(row => {
    if (row.SubCat) {
        md += `| ${row.Category} | ${row.SubCat} | ${row.ID} | ${row.Value} | ${row.Location} | ${row.Impact} | ${row.BunFix} |\n`;
    } else {
        // Fallback for non-standard rows
        md += `| ${row.Category} | | | | ${row.Data} | | |\n`;
    }
});

md += `\n**Total: ${uniqueMaster.length}**\n`;

await Bun.write('docs/MASTER_MATRIX.md', md);
console.log(`✨ MASTER_MATRIX.md → ${uniqueMaster.length} entries!`);
console.log(uniqueMaster.slice(0, 5));
