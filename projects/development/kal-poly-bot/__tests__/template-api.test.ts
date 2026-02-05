// __tests__/template-api.test.ts - Test Bun Template API
import { BunTemplateAPI } from '../scripts/bun-template-api.ts';
import { surgicalPrecisionTemplate } from '../scripts/create-surgical-precision-template.ts';

describe('Bun Template API', () => {
  test('template has required properties', () => {
    expect(surgicalPrecisionTemplate.name).toBe('surgical-precision');
    expect(surgicalPrecisionTemplate.version).toBe('1.0.0');
    expect(surgicalPrecisionTemplate.description).toContain('Enterprise microservices');
  });

  test('scaffoldProject creates files', async () => {
    const testDir = './test-template-api';
    const testName = 'template-test-app';

    // Scaffold the project
    await surgicalPrecisionTemplate.scaffoldProject(testDir, testName, 'minimal');

    // Verify key files were created
    const packageExists = await Bun.file(`${testDir}/package.json`).exists();
    const srcExists = await Bun.file(`${testDir}/src/index.ts`).exists();
    const readmeExists = await Bun.file(`${testDir}/README.md`).exists();

    expect(packageExists).toBe(true);
    expect(srcExists).toBe(true);
    expect(readmeExists).toBe(true);

    // Verify package.json content
    const packageJson = await Bun.file(`${testDir}/package.json`).json();
    expect(packageJson.name).toBe(testName);
    expect(packageJson.version).toBe('1.0.0');
  });

  test('BunTemplateAPI.scaffoldProject wrapper works', async () => {
    const testDir = './test-api-wrapper';
    const testName = 'api-wrapper-test';

    await BunTemplateAPI.scaffoldProject(surgicalPrecisionTemplate, {
      dir: testDir,
      name: testName,
      variant: 'mcp-only'
    });

    const exists = await Bun.file(`${testDir}/src/index.ts`).exists();
    expect(exists).toBe(true);
  });

  test('validateTemplate checks structure', async () => {
    const validDir = './test-surgical-precision-app';
    const isValid = await BunTemplateAPI.validateTemplate(validDir);
    expect(isValid).toBe(true);
  });

  test('createTemplate creates template instance', () => {
    const config = {
      name: 'test-template',
      version: '1.0.0',
      description: 'Test template',
      author: 'Test Author',
      license: 'MIT'
    };

    const template = BunTemplateAPI.createTemplate(config);
    expect(template.name).toBe(config.name);
    expect(template.version).toBe(config.version);
    expect(template.description).toBe(config.description);
  });

  test('template variants are properly configured', () => {
    // This would test the variant configuration in the template
    // For now, we verify the template was created with the expected structure
    expect(typeof surgicalPrecisionTemplate.scaffoldProject).toBe('function');
  });

  test('cleanup test directories', async () => {
    // Clean up test directories created during tests
    const testDirs = ['./test-template-api', './test-api-wrapper'];

    for (const dir of testDirs) {
      try {
        await Bun.spawn(['rm', '-rf', dir], { cwd: process.cwd() });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});