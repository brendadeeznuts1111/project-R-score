// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test/snapshots — toMatchSnapshot / -u
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
/**
 * Partner CLI stdout/stderr contract on the pinned Bun runtime.
 *
 * Intentional updates are file-scoped:
 *   bun test tests/partner-cli-snapshots.test.ts -u
 */
import { describe, expect, test } from 'bun:test';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');

const PARTNER_CLI_CASES = [
  {
    name: 'dashboard-plan',
    args: ['scripts/validate-partner-dashboard-plan.ts'],
  },
  {
    name: 'dashboard-unregistered-concepts',
    args: ['scripts/validate-partner-dashboard-plan.ts', '--unregistered'],
  },
  {
    name: 'surface-inventory',
    args: ['scripts/validate-partner-surface-inventory.ts'],
  },
  {
    name: 'portal-integration',
    args: ['scripts/validate-partner-integration.ts'],
  },
] as const;

type PartnerCliCase = (typeof PARTNER_CLI_CASES)[number];

type PartnerCliResult = {
  name: PartnerCliCase['name'];
  args: string[];
  exitCode: number;
  stdout: string[];
  stderr: string[];
};

function stableLines(value: string): string[] {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(Boolean);
}

function spawnPartnerCli(testCase: PartnerCliCase): Bun.ReadableSubprocess {
  return Bun.spawn(bunSpawnArgs([...testCase.args]), {
    cwd: ROOT,
    env: {
      ...Bun.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });
}

async function runPartnerCli(testCase: PartnerCliCase): Promise<PartnerCliResult> {
  const process = spawnPartnerCli(testCase);
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    process.stdout.text(),
    process.stderr.text(),
  ]);
  return {
    name: testCase.name,
    args: [...testCase.args],
    exitCode,
    stdout: stableLines(stdout),
    stderr: stableLines(stderr),
  };
}

describe('partner CLI Bun.spawn snapshot contract', () => {
  test('captures stable validator output and exact runtime provenance', async () => {
    const commands = await Promise.all(PARTNER_CLI_CASES.map(runPartnerCli));

    for (const command of commands) {
      expect(command.exitCode).toBe(0);
      expect(command.stdout.length).toBeGreaterThan(0);
      expect(command.stderr).toEqual([]);
    }

    expect({
      runtime: {
        version: Bun.version,
        revision: Bun.revision,
      },
      commands,
    }).toMatchSnapshot('pinned Bun partner CLI output');
  });
});
