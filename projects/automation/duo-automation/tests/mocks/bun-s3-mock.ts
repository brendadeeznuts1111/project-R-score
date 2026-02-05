
export const mockS3 = {
  write: async (key: string, data: Uint8Array, options: any) => {
    // Mock successful upload
    console.log(`Mock S3 upload: ${key}`, options);
    return Promise.resolve();
  }
};