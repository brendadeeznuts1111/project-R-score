export function compressMessage(data: unknown): string {
  return JSON.stringify(data);
}

export function decompressMessage(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Failed to decompress message: ${error}`);
  }
}

export function validateMessageSize(data: string, maxSize: number = 1024 * 1024): boolean {
  return Buffer.byteLength(data, 'utf8') <= maxSize;
}

export function truncateMessage(data: string, maxLength: number): string {
  if (data.length <= maxLength) return data;
  return data.substring(0, maxLength - 3) + '...';
}
