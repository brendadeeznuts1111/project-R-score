import { readFileSync, writeFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { EnhancedFrontMatter, StrictConsciousnessFrontMatter } from '../schemas/front-matter-enhanced';
import { ConsciousLedger } from './conscious-ledger';
import { ResourceAwareMCP } from '../mcp/resource-aware';
import { driftMonitor } from './drift-monitor';

export class EnhancedFrontMatterOrganizer {
    static readonly VAULT_PATH = join(process.cwd(), 'Odds-mono-map');

    static async organizeFile(filePath: string, strict = false): Promise<void> {
        try {
            const content = readFileSync(filePath, 'utf8');
            const { frontMatter, body } = this.extractFrontMatter(content);

            // **Choose schema based on strict mode**
            const Schema = strict ? StrictConsciousnessFrontMatter : EnhancedFrontMatter;
            const result = Schema.safeParse(frontMatter);

            if (!result.success || strict) {
                console.log(`⚠️  Front matter validation failed for ${filePath} (strict mode: ${strict})`);
                if (!result.success) {
                    console.log(`   Errors: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`);
                }

                // **Auto-fix** missing fields
                const fixed = await this.autoFixFrontMatter(frontMatter, strict);
                const validated = Schema.parse(fixed);

                // **Rewrite** file with valid front matter
                const newContent = this.serializeFrontMatter(validated, body);
                writeFileSync(filePath, newContent);

                console.log(`✅ Organized: ${filePath}`);
            } else {
                console.log(`✅ Already valid: ${filePath}`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error);
        }
    }

    static extractFrontMatter(content: string): {
        frontMatter: Record<string, any>;
        body: string;
    } {
        const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

        if (!match) {
            return { frontMatter: {}, body: content };
        }

        const [_, fm, body] = match;
        const frontMatter = fm.split('\n').reduce((acc, line) => {
            const [key, ...value] = line.split(':');
            if (key && value.length) {
                const val = value.join(':').trim();
                // Handle YAML arrays and objects
                if (val.startsWith('[') && val.endsWith(']')) {
                    acc[key.trim()] = val.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
                } else if (val.startsWith('{') && val.endsWith('}')) {
                    try {
                        acc[key.trim()] = JSON.parse(val);
                    } catch {
                        acc[key.trim()] = val;
                    }
                } else if (!isNaN(Number(val)) && val !== '') {
                    // Convert numeric strings to numbers
                    acc[key.trim()] = Number(val);
                } else if (val === 'true' || val === 'false') {
                    // Convert boolean strings
                    acc[key.trim()] = val === 'true';
                } else {
                    acc[key.trim()] = val;
                }
            }
            return acc;
        }, {} as Record<string, any>);

        return { frontMatter, body };
    }

    static serializeFrontMatter(frontMatter: any, body: string): string {
        const yaml = Object.entries(frontMatter)
            .map(([k, v]) => {
                if (Array.isArray(v)) {
                    return `${k}: [${v.map(item => `"${item}"`).join(', ')}]`;
                } else if (typeof v === 'object' && v !== null) {
                    return `${k}: ${JSON.stringify(v)}`;
                } else if (typeof v === 'number') {
                    return `${k}: ${v}`;
                } else if (typeof v === 'boolean') {
                    return `${k}: ${v}`;
                } else if (typeof v === 'string' && v.includes(' ')) {
                    return `${k}: "${v}"`;
                } else {
                    return `${k}: ${v}`;
                }
            })
            .join('\n');

        return `---\n${yaml}\n---\n${body}`;
    }

    static async autoFixFrontMatter(
        existing: Record<string, any>,
        strict = false
    ): Promise<Record<string, any>> {
        // Update resource awareness
        ResourceAwareMCP.updatePressureScore();

        const base: Record<string, any> = {
            ...existing,
            // **Auto-populate** runtime metrics
            drift: existing.drift ?? driftMonitor.getRunningAverage(),
            pressure: existing.pressure ?? ResourceAwareMCP.getPressureScore(),
            mode: existing.mode ?? (process.env.FORGE_CONSCIOUSNESS || 'adaptive'),

            // **Auto-generate** ID if missing (only in strict mode)
            ...(strict && { id: existing.id ?? crypto.randomUUID() }),
            timestamp: existing.timestamp ?? new Date().toISOString(),

            // **Default** classification
            type: existing.type ?? 'daily-note',
            status: existing.status ?? 'draft',
            priority: existing.priority ?? 'medium',
            tags: existing.tags ?? [],
        };

        // Handle tags conversion
        if (typeof existing.tags === 'string') {
            base.tags = existing.tags.split(',').map((t: string) => t.trim());
        } else if (!Array.isArray(existing.tags)) {
            base.tags = [];
        } else {
            base.tags = existing.tags;
        }

        return base;
    }

    static async organizeVault(strict = false): Promise<void> {
        const mode = strict ? 'strict' : 'enhanced';
        console.log(`🔍 Organizing vault at: ${this.VAULT_PATH} (${mode} mode)`);

        const files = await this.findMarkdownFiles(this.VAULT_PATH);
        console.log(`📁 Found ${files.length} markdown files`);

        let processed = 0;
        let fixed = 0;

        for (const file of files) {
            const content = readFileSync(file, 'utf8');
            const { frontMatter } = this.extractFrontMatter(content);
            const Schema = strict ? StrictConsciousnessFrontMatter : EnhancedFrontMatter;
            const result = Schema.safeParse(frontMatter);

            if (!result.success) {
                await this.organizeFile(file, strict);
                fixed++;
            }
            processed++;

            if (processed % 10 === 0) {
                console.log(`📊 Progress: ${processed}/${files.length} files processed`);
            }
        }

        ConsciousLedger.log({
            type: 'front_matter_organized',
            filesProcessed: files.length,
            filesFixed: fixed,
            mode,
        });

        console.log(`✅ Vault organization complete!`);
        console.log(`   Total files: ${files.length}`);
        console.log(`   Files fixed: ${fixed}`);
        console.log(`   Files already valid: ${processed - fixed}`);
        console.log(`   Mode: ${mode}`);
    }

    static async findMarkdownFiles(dir: string): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = await readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dir, entry.name);

                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    files.push(...await this.findMarkdownFiles(fullPath));
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.warn(`⚠️  Could not read directory ${dir}:`, error);
        }

        return files;
    }
}

// CLI usage
if (import.meta.main) {
    const command = process.argv[2];
    const file = process.argv[3];
    const strict = process.argv.includes('--strict');

    if (command === 'validate' && file) {
        const content = readFileSync(file, 'utf8');
        const { frontMatter } = EnhancedFrontMatterOrganizer.extractFrontMatter(content);
        const Schema = strict ? StrictConsciousnessFrontMatter : EnhancedFrontMatter;
        const result = Schema.safeParse(frontMatter);

        console.log(`${result.success ? '✅' : '❌'} ${file} is ${result.success ? 'valid' : 'invalid'}`);
        if (!result.success) {
            console.log(`   Errors: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`);
        }
    } else if (command === 'organize' && file) {
        await EnhancedFrontMatterOrganizer.organizeFile(file, strict);
    } else if (command === 'vault') {
        await EnhancedFrontMatterOrganizer.organizeVault(strict);
    } else {
        console.log(`
Usage:
  bun run src/cli/organize-enhanced.ts <command> [file] [options]

Commands:
  validate <file>    Validate front matter of a single file
  organize <file>    Organize front matter of a single file
  vault              Organize entire vault

Options:
  --strict           Use strict consciousness schema (default: enhanced compatibility)

Examples:
  bun run src/cli/organize-enhanced.ts validate "Odds-mono-map/00 - Dashboard.md"
  bun run src/cli/organize-enhanced.ts organize "Odds-mono-map/00 - Dashboard.md"
  bun run src/cli/organize-enhanced.ts vault
  bun run src/cli/organize-enhanced.ts vault --strict
    `);
    }
}
