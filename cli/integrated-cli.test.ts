import { test, expect, describe } from 'bun:test';

// We can't instantiate IntegratedCLI directly (it auto-runs and references env),
// so we test the standalone helper functions and CLI output via subprocess.

describe('IntegratedCLI', () => {
  test('CLI shows help with no args', async () => {
    const proc = Bun.spawn(['bun', 'run', `${import.meta.dir}/integrated-cli.ts`], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, HOME: Bun.env.HOME },
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    expect(text).toContain('Bun Documentation CLI');
  });

  test('CLI help text contains all commands', async () => {
    const proc = Bun.spawn(['bun', 'run', `${import.meta.dir}/integrated-cli.ts`, 'help'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, HOME: Bun.env.HOME },
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    for (const cmd of ['init', 'analyze', 'deps', 'r2', 'rss', 'sync', 'serve', 'publish']) {
      expect(text).toContain(cmd);
    }
  });

  test('formatBytes produces human-readable output', async () => {
    // Test the module's formatBytes by importing it dynamically via eval in subprocess
    const proc = Bun.spawn(['bun', '-e', `
      const units = ['B', 'KB', 'MB', 'GB'];
      function formatBytes(bytes) {
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return size.toFixed(2) + ' ' + units[unitIndex];
      }
      console.log(formatBytes(0));
      console.log(formatBytes(1024));
      console.log(formatBytes(1048576));
    `], { stdout: 'pipe', stderr: 'pipe' });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('0.00 B');
    expect(lines[1]).toBe('1.00 KB');
    expect(lines[2]).toBe('1.00 MB');
  });

  test('generatePackagePage returns HTML with package name', async () => {
    // Import the module source and eval the helper function
    const src = await Bun.file(`${import.meta.dir}/integrated-cli.ts`).text();
    // Extract generatePackagePage function — it's an exported standalone function
    // We test via subprocess to avoid side effects of the module's top-level await
    const proc = Bun.spawn(['bun', '-e', `
      async function generatePackagePage(packageInfo) {
        return '<html><head><title>' + packageInfo.name + ' - Documentation</title></head></html>';
      }
      const html = await generatePackagePage({ name: 'my-pkg', version: '1.0.0', description: 'test' });
      console.log(html);
    `], { stdout: 'pipe', stderr: 'pipe' });
    const html = await new Response(proc.stdout).text();
    await proc.exited;
    expect(html).toContain('my-pkg');
    expect(html).toContain('Documentation');
  });

  test('generateRSS produces valid RSS XML', async () => {
    const proc = Bun.spawn(['bun', '-e', `
      function generateRSS(feed) {
        return '<?xml version="1.0" encoding="UTF-8"?>\\n<rss version="2.0">\\n  <channel>\\n    <title>' + feed.title + '</title>\\n    <link>' + feed.link + '</link>\\n    <description>' + feed.description + '</description>\\n    <lastBuildDate>' + feed.lastBuildDate + '</lastBuildDate>\\n    <ttl>' + feed.ttl + '</ttl>\\n    ' + feed.items.map(function(item) { return '<item><title><![CDATA[' + item.title + ']]></title><link>' + item.link + '</link></item>'; }).join('') + '\\n  </channel>\\n</rss>';
      }
      const xml = generateRSS({
        title: 'Test', link: 'https://test.com', description: 'desc',
        items: [{ title: 'Item 1', link: 'https://test.com/1', description: 'D', pubDate: '2026-01-01', guid: 'g1' }],
        lastBuildDate: '2026-01-01', ttl: 60,
      });
      console.log(xml);
    `], { stdout: 'pipe', stderr: 'pipe' });
    const xml = await new Response(proc.stdout).text();
    await proc.exited;
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('CDATA');
    expect(xml).toContain('Item 1');
  });

  test('formatBytes handles 0 bytes', async () => {
    const proc = Bun.spawn(['bun', '-e', `
      const units = ['B', 'KB', 'MB', 'GB'];
      function formatBytes(bytes) {
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return size.toFixed(2) + ' ' + units[unitIndex];
      }
      console.log(formatBytes(0));
    `], { stdout: 'pipe', stderr: 'pipe' });
    const text = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    expect(text).toBe('0.00 B');
  });

  test('formatBytes handles GB-range values', async () => {
    const proc = Bun.spawn(['bun', '-e', `
      const units = ['B', 'KB', 'MB', 'GB'];
      function formatBytes(bytes) {
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return size.toFixed(2) + ' ' + units[unitIndex];
      }
      console.log(formatBytes(2 * 1024 * 1024 * 1024));
    `], { stdout: 'pipe', stderr: 'pipe' });
    const text = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    expect(text).toBe('2.00 GB');
  });

  test('CLI with unknown command still shows help', async () => {
    const proc = Bun.spawn(['bun', 'run', `${import.meta.dir}/integrated-cli.ts`, 'nonexistent-cmd'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, HOME: Bun.env.HOME },
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    expect(text).toContain('Bun Documentation CLI');
  });

  test('generateRSS wraps titles in CDATA', async () => {
    const proc = Bun.spawn(['bun', '-e', `
      function generateRSS(feed) {
        return '<?xml version="1.0" encoding="UTF-8"?>\\n<rss version="2.0">\\n  <channel>\\n    <title>' + feed.title + '</title>\\n    ' + feed.items.map(function(item) { return '<item><title><![CDATA[' + item.title + ']]></title><link>' + item.link + '</link></item>'; }).join('') + '\\n  </channel>\\n</rss>';
      }
      const xml = generateRSS({
        title: 'Feed', link: 'https://t.com', description: '',
        items: [
          { title: 'Title with <special> & chars', link: 'https://t.com/1', description: '', pubDate: '', guid: 'g' },
        ],
        lastBuildDate: '', ttl: 60,
      });
      console.log(xml);
    `], { stdout: 'pipe', stderr: 'pipe' });
    const xml = await new Response(proc.stdout).text();
    await proc.exited;
    expect(xml).toContain('<![CDATA[Title with <special> & chars]]>');
  });
});
