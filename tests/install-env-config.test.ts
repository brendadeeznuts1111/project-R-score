// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/pm/cli/install#configuring-with-environment-variables
import { describe, expect, test } from 'bun:test';
import { CANONICAL_REFS } from '../tools/bun-doc-refs.ts';
import {
  OFFICIAL_BUN_CONFIG_INSTALL_VAR_NAMES,
  probeBunConfigEnvSsot,
  probeForbiddenInstallEnv,
  probeInstallMechanismNotesSsot,
} from '../lib/verification/install-env-config.ts';
import { BUN_CONFIG_INSTALL_VARS } from '../tools/bun-install-env.ts';

describe('lib/verification/install-env-config', () => {
  test('probeBunConfigEnvSsot matches official six BUN_CONFIG_* vars', () => {
    const probe = probeBunConfigEnvSsot();
    expect(probe.ok).toBe(true);
    expect(BUN_CONFIG_INSTALL_VARS.map(v => v.name)).toEqual([
      ...OFFICIAL_BUN_CONFIG_INSTALL_VAR_NAMES,
    ]);
  });

  test('probeForbiddenInstallEnv passes when shell env clean', () => {
    expect(probeForbiddenInstallEnv().ok).toBe(true);
  });

  test('probeInstallMechanismNotesSsot covers cache and resolve behavior', () => {
    const probe = probeInstallMechanismNotesSsot();
    expect(probe.ok).toBe(true);
    expect(probe.note).toContain('5 mechanism notes');
  });

  test('canonical refs include BUN install environment variables', () => {
    expect(CANONICAL_REFS['BUN install environment variables']).toContain(
      '#configuring-with-environment-variables'
    );
    expect(CANONICAL_REFS.BUN_CONFIG_REGISTRY).toBe(
      CANONICAL_REFS['BUN install environment variables']
    );
  });
});
