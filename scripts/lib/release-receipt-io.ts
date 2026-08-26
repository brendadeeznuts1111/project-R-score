// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write

export async function writeReleaseReceipt(path: string, receipt: object): Promise<void> {
  await Bun.write(path, `${JSON.stringify(receipt, null, 2)}\n`);
}
