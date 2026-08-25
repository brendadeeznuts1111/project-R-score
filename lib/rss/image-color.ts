// @see https://bun.com/docs/runtime/image#terminals — Bun.Image.bytes
// @released Bun.Image.bytes · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.png
// @see https://bun.com/docs/runtime/utils#bun-inflatesync — Bun.inflateSync

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

/** Read the one-pixel PNG emitted by Bun.Image for a stable average-color sample. */
function colorFromOnePixelPng(png: Uint8Array): string {
  if (png.byteLength < 8 || png[0] !== 0x89 || png[1] !== 0x50) {
    throw new Error('Bun.Image dominant-color sample was not PNG');
  }

  let colorType = -1;
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset + 12 <= png.byteLength) {
    const length = readU32(png, offset);
    const type = String.fromCharCode(
      png[offset + 4]!,
      png[offset + 5]!,
      png[offset + 6]!,
      png[offset + 7]!
    );
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') colorType = data[9] ?? -1;
    if (type === 'IDAT') idat.push(Buffer.from(data));
    offset += length + 12;
    if (type === 'IEND') break;
  }

  if (colorType !== 2 && colorType !== 6) {
    throw new Error(`Unsupported dominant-color PNG type ${colorType}`);
  }
  const row = Bun.inflateSync(Buffer.concat(idat), { windowBits: 15 });
  if (row.byteLength < 4) throw new Error('Incomplete dominant-color PNG row');
  return `#${toHex(row[1]!)}${toHex(row[2]!)}${toHex(row[3]!)}`;
}

/** Downsample an image through Bun.Image and return its average RGB color. */
export async function averageImageColor(bytes: Uint8Array, maxPixels: number): Promise<string> {
  const sample = await new Bun.Image(bytes, { maxPixels })
    .resize(1, 1, { fit: 'fill' })
    .png()
    .bytes();
  return colorFromOnePixelPng(sample);
}
