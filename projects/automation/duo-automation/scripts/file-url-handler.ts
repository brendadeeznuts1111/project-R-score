// scripts/file-url-handler.ts

export class FileURLHandler {
  // Convert between file:// URLs and paths
  static normalizePath(pathOrURL: string): string {
    if (pathOrURL.startsWith('file://')) {
      return Bun.fileURLToPath(pathOrURL);
    }
    return pathOrURL;
  }

  // Create file:// URL for secure file access
  static createFileURL(path: string): string {
    return Bun.pathToFileURL(path).href;
  }

  // Secure file operations with URL validation
  static async readSecureFile(fileURL: string): Promise<string> {
    const path = this.normalizePath(fileURL);
    
    // Validate path is within project
    if (!path.startsWith(process.cwd())) {
      throw new Error(`❌ Access denied: ${path} is outside project scope`);
    }
    
    const file = Bun.file(path);
    if (!(await file.exists())) {
      throw new Error(`❌ File not found: ${path}`);
    }
    return await file.text();
  }
}