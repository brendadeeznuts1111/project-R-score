import { expect, test } from 'bun:test';
import { scanner } from '../src/index.ts';

//////////////////////////////////////////////////////////////////
// Fire22 Enterprise Security Scanner Tests
//
// These tests validate the security scanner's ability to:
// - Detect known malicious packages
// - Identify vulnerable package versions
// - Flag license compliance issues
// - Catch typosquatting attempts
// - Handle safe packages correctly
// - Process multiple packages with mixed security status
//////////////////////////////////////////////////////////////////

test('Scanner should block known malicious packages', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'malicious-lib',
        version: '1.0.0',
        requestedRange: '^1.0.0',
        tarball: 'https://registry.npmjs.org/malicious-lib/-/malicious-lib-1.0.0.tgz',
      },
    ],
  });

  expect(advisories.length).toBeGreaterThan(0);
  const advisory = advisories[0]!;
  expect(advisory).toBeDefined();

  expect(advisory).toMatchObject({
    level: 'fatal',
    package: 'malicious-lib',
    url: expect.any(String),
    description: expect.any(String),
  });
});

test('Scanner should warn about vulnerable package versions', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'old-package',
        version: '1.5.0',
        requestedRange: '^1.0.0',
        tarball: 'https://registry.npmjs.org/old-package/-/old-package-1.5.0.tgz',
      },
    ],
  });

  expect(advisories.length).toBeGreaterThan(0);
  const advisory = advisories[0]!;
  expect(advisory.level).toBe('fatal'); // High severity vulnerability
  expect(advisory.package).toBe('old-package');
});

test('Scanner should flag license compliance issues', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'gpl-only-package',
        version: '1.0.0',
        requestedRange: '^1.0.0',
        tarball: 'https://registry.npmjs.org/gpl-only-package/-/gpl-only-package-1.0.0.tgz',
      },
    ],
  });

  expect(advisories.length).toBeGreaterThan(0);
  const advisory = advisories[0]!;
  expect(advisory.level).toBe('warn'); // License issues are warnings
  expect(advisory.package).toBe('gpl-only-package');
});

test('Scanner should detect typosquatting attempts', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'expresss', // Note: double 's'
        version: '4.18.0',
        requestedRange: '^4.0.0',
        tarball: 'https://registry.npmjs.org/expresss/-/expresss-4.18.0.tgz',
      },
    ],
  });

  expect(advisories.length).toBeGreaterThan(0);
  const advisory = advisories[0]!;
  expect(advisory.level).toBe('warn'); // Typosquatting is a warning
  expect(advisory.package).toBe('expresss');
  expect(advisory.description).toContain('typosquatting');
});

test('Scanner should block untrusted registries', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'suspicious-package',
        version: '1.0.0',
        requestedRange: '^1.0.0',
        tarball: 'https://malicious-registry.com/suspicious-package/-/suspicious-package-1.0.0.tgz',
      },
    ],
  });

  expect(advisories.length).toBeGreaterThan(0);
  const advisory = advisories[0]!;
  expect(advisory.level).toBe('fatal'); // Untrusted registry is critical
  expect(advisory.description).toContain('untrusted registry');
});

test('Safe packages should return no advisories', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'lodash',
        version: '4.17.21',
        requestedRange: '^4.17.0',
        tarball: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
      },
      {
        name: 'axios',
        version: '1.6.0',
        requestedRange: '^1.0.0',
        tarball: 'https://registry.npmjs.org/axios/-/axios-1.6.0.tgz',
      },
    ],
  });

  expect(advisories.length).toBe(0);
});

test('Should handle multiple packages with mixed security status', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'malicious-lib', // Should be blocked
        version: '1.0.0',
        requestedRange: '^1.0.0',
        tarball: 'https://registry.npmjs.org/malicious-lib/-/malicious-lib-1.0.0.tgz',
      },
      {
        name: 'lodash', // Should be safe
        version: '4.17.21',
        requestedRange: '^4.17.0',
        tarball: 'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz',
      },
      {
        name: 'expresss', // Should trigger typosquatting warning
        version: '4.18.0',
        requestedRange: '^4.0.0',
        tarball: 'https://registry.npmjs.org/expresss/-/expresss-4.18.0.tgz',
      },
    ],
  });

  // Should have advisories for malicious-lib and expresss
  expect(advisories.length).toBe(2);

  const maliciousAdvisory = advisories.find(a => a.package === 'malicious-lib');
  const typosquatAdvisory = advisories.find(a => a.package === 'expresss');

  expect(maliciousAdvisory?.level).toBe('fatal');
  expect(typosquatAdvisory?.level).toBe('warn');
});

test('Should differentiate between vulnerable and safe versions', async () => {
  // Test vulnerable version
  const vulnerableAdvisories = await scanner.scan({
    packages: [
      {
        name: 'old-package',
        version: '1.5.0', // Within vulnerable range
        requestedRange: '^1.0.0',
        tarball: 'https://registry.npmjs.org/old-package/-/old-package-1.5.0.tgz',
      },
    ],
  });

  // Test safe version
  const safeAdvisories = await scanner.scan({
    packages: [
      {
        name: 'old-package',
        version: '2.1.0', // Outside vulnerable range
        requestedRange: '^2.0.0',
        tarball: 'https://registry.npmjs.org/old-package/-/old-package-2.1.0.tgz',
      },
    ],
  });

  expect(vulnerableAdvisories.length).toBeGreaterThan(0);
  expect(safeAdvisories.length).toBe(0);
});

test('Should handle scoped packages correctly', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: '@fire22/core',
        version: '1.0.0',
        requestedRange: '^1.0.0',
        tarball: 'https://registry.npmjs.org/@fire22/core/-/core-1.0.0.tgz',
      },
      {
        name: '@types/node',
        version: '20.0.0',
        requestedRange: '^20.0.0',
        tarball: 'https://registry.npmjs.org/@types/node/-/node-20.0.0.tgz',
      },
    ],
  });

  // Scoped packages should be processed normally
  expect(advisories.length).toBe(0); // Both should be safe
});

test('Empty package list should return no advisories', async () => {
  const advisories = await scanner.scan({ packages: [] });
  expect(advisories.length).toBe(0);
});

test('Scanner should handle protestware detection', async () => {
  const advisories = await scanner.scan({
    packages: [
      {
        name: 'colors',
        version: '1.4.1', // Known protestware version
        requestedRange: '^1.4.0',
        tarball: 'https://registry.npmjs.org/colors/-/colors-1.4.1.tgz',
      },
    ],
  });

  expect(advisories.length).toBeGreaterThan(0);
  const advisory = advisories[0]!;
  expect(advisory.level).toBe('fatal'); // Protestware should be fatal
  expect(advisory.description).toContain('protestware');
});
