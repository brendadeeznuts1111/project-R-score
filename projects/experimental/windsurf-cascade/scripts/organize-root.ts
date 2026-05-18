import { $ } from "bun";
import { mkdir, readdir, rename, stat } from "fs/promises";
import { dirname, join } from "path";

const ROOT = ".";
const ARTIFACTS = "artifacts";
const TESTS_CONFIG = "tests/config";
const TESTS_UTILS = "tests/utils";

async function ensureDir(dir: string) {
    try {
        await mkdir(dir, { recursive: true });
    } catch {
    console.error('Unhandled error:', error);
  }
}

async function isDir(path: string) {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

async function moveMatchingFiles() {
    await ensureDir(ARTIFACTS);
    await ensureDir(TESTS_CONFIG);
    await ensureDir(TESTS_UTILS);

    const files = await readdir(ROOT);
    for (const file of files) {
        const fullPath = join(ROOT, file);
        if (await isDir(fullPath)) continue;

        const lower = file.toLowerCase();
        if (lower.endsWith('.md') && (
            lower.includes('complete') || lower.includes('demo') || lower.includes('phase_') ||
            lower.includes('bail') || lower.includes('coverage') || lower.includes('ci_') ||
            lower.includes('performance') || lower.includes('test_') || lower.includes('bun_')
        )) {
            const dest = join(ARTIFACTS, file);
            await rename(fullPath, dest);
            console.info(`✅ Moved MD artifact: ${file} -> ${ARTIFACTS}/`);
        } else if (lower.startsWith('bun') && (lower.includes('fig') || lower.includes('test')) && lower.endsWith('.toml')) {
            const dest = join(TESTS_CONFIG, file);
            await rename(fullPath, dest);
            console.info(`✅ Moved config: ${file} -> ${TESTS_CONFIG}/`);
        } else if (['test-setup.ts', 'global-mocks.ts', 'global-setup.ts'].includes(file)) {
            const dest = join(TESTS_UTILS, file);
            await rename(fullPath, dest);
            console.info(`✅ Moved util: ${file} -> ${TESTS_UTILS}/`);
        }
    }

    console.info('\n🎉 Organization complete!');
    console.info('Running bun install to sync workspaces...');
    await $`bun install`;
    console.info('✅ Root organization finished!');
}

moveMatchingFiles().catch(console.error);
