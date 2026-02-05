/**
 * Global test setup — loaded before tests via bunfig.toml preload
 * @see https://bun.com/docs/test/configuration#preload-scripts
 */
import { beforeAll, afterAll } from "bun:test";

// Debug CWD information
console.log(`[DEBUG] Test runner CWD: ${process.cwd()}`);
console.log(`[DEBUG] Import meta dir: ${import.meta.dir}`);
console.log(`[DEBUG] __filename: ${__filename}`);
console.log(`[DEBUG] __dirname: ${__dirname}`);

// Try to get project root
const projectRoot = import.meta.dir ? import.meta.dir.split('/tests')[0] : 'unknown';
console.log(`[DEBUG] Project root guess: ${projectRoot}`);

beforeAll(() => {
	process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
});

afterAll(() => {
	// Teardown if needed
});
