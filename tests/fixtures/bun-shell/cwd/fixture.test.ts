/**
 * Bun.$ respects cwd option and .cwd() builder.
 * Matches cache-manager shape: mkdir -p / rm with .quiet().
 *
 * @see https://bun.com/docs/runtime/shell#changing-the-working-directory
 * @see https://bun.com/docs/runtime/shell#getting-started — .quiet()
 */
import { afterAll, describe, expect, test } from 'bun:test';

const TMP = `${Bun.env.TMPDIR ?? '/tmp'}/bun-shell-cwd-${crypto.randomUUID()}`;

afterAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet();
});

describe('bun-shell cwd', () => {
  test('cwd option changes working directory for the command', async () => {
    await Bun.$`mkdir -p ${TMP}`.quiet();
    await Bun.$`touch marker.txt`.cwd(TMP).quiet();
    expect(await Bun.file(`${TMP}/marker.txt`).exists()).toBe(true);

    const pwd = (await Bun.$`pwd`.cwd(TMP).quiet().text()).trim();
    expect(await Bun.file(`${pwd}/marker.txt`).exists()).toBe(true);
  });

  test('mkdir -p + rm -rf with .quiet() succeeds (cache-manager shape)', async () => {
    const nested = `${TMP}/a/b/c`;
    await Bun.$`mkdir -p ${nested}`.quiet();
    const dirOk = await Bun.$`test -d ${nested}`.nothrow().quiet();
    expect(dirOk.exitCode).toBe(0);

    const leaf = `${TMP}/leaf-rm`;
    await Bun.$`mkdir -p ${leaf}`.quiet();
    await Bun.$`rm -rf ${leaf}`.quiet();
    const gone = await Bun.$`test -d ${leaf}`.nothrow().quiet();
    expect(gone.exitCode).not.toBe(0);
  });

  test('.cwd() builder chains correctly', async () => {
    await Bun.$`mkdir -p ${TMP}`.quiet();
    await Bun.write(`${TMP}/from-builder.txt`, 'ok');
    const result = await Bun.$`cat from-builder.txt`.cwd(TMP).quiet();
    expect(result.stdout.toString().trim()).toBe('ok');
  });
});
