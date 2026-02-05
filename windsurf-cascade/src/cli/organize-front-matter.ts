import { readFileSync, writeFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { ConsciousnessFrontMatter } from '../schemas/front-matter';
import { cache } from '../utils/bun-cache';
import { ConsciousLedger } from './conscious-ledger';
import { ResourceAwareMCP } from '../mcp/resource-aware';
import { driftMonitor } from './drift-monitor';

export class FrontMatterOrganizer {
    static readonly VAULT_PATH = join(process.env.HOME || process.cwd(), 'Odds-mono-map');

    static async organizeFile(filePath: string): Promise<void> {
        try {
            const content = readFileSync(filePath, 'utf8');
            const { frontMatter, body } = this.extractFrontMatter(content);

            // **Validate** existing front matter
            const result = ConsciousnessFrontMatter.safeParse(frontMatter);

            if (!result.success) {
                console.log(`⚠️  Front matter validation failed for ${filePath}`);
                console.log(`   Errors: ${result.error.issues.map((i: any) => i.path.join('.')).join(', ')}`);

                // **Auto-fix** missing fields
                const fixed = await this.autoFixFrontMatter(frontMatter);
                const validated = ConsciousnessFrontMatter.parse(fixed);

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
            // **No front matter** – treat entire content as body
            return { frontMatter: {}, body: content };
        }

        const [_, fm, body] = match;
        const frontMatter = fm.split('\n').reduce((acc, line) => {
            const [key, ...value] = line.split(':');
            if (key && value.length) {
                acc[key.trim()] = value.join(':').trim();
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
                } else {
                    return `${k}: ${v}`;
                }
            })
            .join('\n');

        return `---\n${yaml}\n---\n${body}`;
    }

    static async autoFixFrontMatter(
        existing: Record<string, any>
    ): Promise<Record<string, any>> {
        // Update resource awareness
        ResourceAwareMCP.updatePressureScore();

        return {
            ...existing,
            // **Auto-populate** runtime metrics
            drift: existing.drift ?? driftMonitor.getRunningAverage(),
            pressure: existing.pressure ?? ResourceAwareMCP.getPressureScore(),
            mode: existing.mode ?? (process.env.FORGE_CONSCIOUSNESS || 'adaptive'),

            // **Auto-generate** ID if missing
            id: existing.id ?? crypto.randomUUID(),
            timestamp: existing.timestamp ?? new Date().toISOString(),

            // **Default** classification
            type: existing.type ?? 'daily-note',
            status: existing.status ?? 'draft',
        };
    }

    // **Organize entire vault**
    static async organizeVault(): Promise<void> {
        console.log(`🔍 Organizing vault at: ${this.VAULT_PATH}`);

        const files = await this.findMarkdownFiles(this.VAULT_PATH);
        console.log(`📁 Found ${files.length} markdown files`);

        let processed = 0;
        let fixed = 0;

        for (const file of files) {
            const content = readFileSync(file, 'utf8');
            const { frontMatter } = this.extractFrontMatter(content);
            const result = ConsciousnessFrontMatter.safeParse(frontMatter);

            if (!result.success) {
                await this.organizeFile(file);
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
        });

        console.log(`✅ Vault organization complete!`);
        console.log(`   Total files: ${files.length}`);
        console.log(`   Files fixed: ${fixed}`);
        console.log(`   Files already valid: ${processed - fixed}`);
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

    // **Validate single file**
    static async validateFile(filePath: string): Promise<boolean> {
        try {
            const content = readFileSync(filePath, 'utf8');
            const { frontMatter } = this.extractFrontMatter(content);
            const result = ConsciousnessFrontMatter.safeParse(frontMatter);

            return result.success;
        } catch (error) {
            console.error(`❌ Error validating ${filePath}:`, error);
            return false;
        }
    }
}

// CLI usage
if (import.meta.main) {
    const command = process.argv[2];
    const file = process.argv[3];

    if (command === 'validate' && file) {
        const isValid = await FrontMatterOrganizer.validateFile(file);
        console.log(`${isValid ? '✅' : '❌'} ${file} is ${isValid ? 'valid' : 'invalid'}`);
    } else if (command === 'organize' && file) {
        await FrontMatterOrganizer.organizeFile(file);
    } else if (command === 'vault') {
        await FrontMatterOrganizer.organizeVault();
    } else {
        console.log(`
Usage:
  bun run src/cli/organize-front-matter.ts <command> [file]

Commands:
  validate <file>  Validate front matter of a single file
  organize <file>  Organize front matter of a single file
  vault            Organize entire vault

Examples:
  bun run src/cli/organize-front-matter.ts validate Odds-mono-map/00\\ -\\ Dashboard.md
  bun run src/cli/organize-front-matter.ts organize Odds-mono-map/00\\ -\\ Dashboard.md
  bun run src/cli/organize-front-matter.ts vault
    `);
    }
}
