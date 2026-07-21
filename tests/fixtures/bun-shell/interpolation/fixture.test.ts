/**
 * Bun.$ interpolates tagged-template variables safely.
 * Agents often fall back to execSync with manual string concat.
 *
 * @see https://bun.com/docs/runtime/shell#escape-escape-strings
 * @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
 */
import { afterAll, describe, expect, test } from 'bun:test';

const TMP = `${Bun.env.TMPDIR ?? '/tmp'}/bun-shell-interp-${crypto.randomUUID()}`;

afterAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet();
});

describe('bun-shell interpolation', () => {
  test('${path} with spaces is interpolated safely', async () => {
    const dir = `${TMP}/spaces`;
    await Bun.$`mkdir -p ${dir}`.quiet();
    const fileWithSpaces = `${dir}/my file.txt`;
    await Bun.write(fileWithSpaces, 'hello');

    const result = await Bun.$`cat ${fileWithSpaces}`.quiet();
    expect(result.stdout.toString().trim()).toBe('hello');
  });

  test('path metacharacters are a single argument (not shell-expanded)', async () => {
    const dir = `${TMP}/inject`;
    await Bun.$`mkdir -p ${dir}`.quiet();
    const tricky = `${dir}/file; rm -rf x`;
    // Create via shell so the name is a single argv (Bun.write may reject ';')
    await Bun.$`printf 'safe' > ${tricky}`.quiet();

    const result = await Bun.$`cat ${tricky}`.quiet();
    expect(result.stdout.toString().trim()).toBe('safe');
  });
});
