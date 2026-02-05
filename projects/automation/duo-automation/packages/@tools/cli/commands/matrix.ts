// cli/commands/matrix.ts
import { parseMarkdownTable } from '../../utils/matrix-parser';
import { superTableCli } from '../../utils/super-table';
import { join } from 'path';

async function main() {
  const matrixPath = join(process.cwd(), 'docs/reference/MASTER_MATRIX.md');
  const data = await parseMarkdownTable(matrixPath);

  if (data.length === 0) {
    console.error('❌ No table data found in MASTER_MATRIX.md');
    process.exit(1);
  }

  // Use full columns for the matrix display
  const allCols = Object.keys(data[0]);
  
  console.log(`📂 Loaded ${data.length} entries from MASTER_MATRIX.md`);
  
  // Connect to superTableCli for filtering and table rendering
  await superTableCli(data, process.argv);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
