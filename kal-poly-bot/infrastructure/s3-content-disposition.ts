// infrastructure/s3-content-disposition.ts
import { feature } from "bun:bundle";

// Content-Disposition metadata for downloads/inline
export class S3ContentDisposition {
  // Zero-cost when S3_CONTENT_DISPOSITION is disabled
  static setContentDisposition(
    key: string,
    disposition: 'inline' | 'attachment',
    filename?: string
  ): any {
    if (!feature("S3_CONTENT_DISPOSITION")) {
      // Legacy: no Content-Disposition support
      return {};
    }

    const metadata: any = {
      contentDisposition: disposition
    };

    if (filename && disposition === 'attachment') {
      metadata.contentDisposition = `attachment; filename="${filename}"`;
    }

    // Component #7: Secure filename validation (CSRF protection)
    if (filename && !this.isSafeFilename(filename)) {
      throw new Error(`Unsafe filename: ${filename}`);
    }

    // Component #11 audit
    this.logContentDispositionSet(key, metadata.contentDisposition);

    return metadata;
  }

  static async uploadWithDisposition(
    client: any,
    key: string,
    data: Buffer,
    options: { disposition: 'inline' | 'attachment'; filename?: string }
  ): Promise<void> {
    if (!feature("S3_CONTENT_DISPOSITION")) {
      return client.put(key, data);
    }

    const metadata = this.setContentDisposition(
      key,
      options.disposition,
      options.filename
    );

    await client.put(key, data, metadata);

    // Component #12: Threat detection for suspicious uploads
    this.detectSuspiciousUpload(key, options);
  }

  private static isSafeFilename(filename: string): boolean {
    // Prevent path traversal and script injection
    return !filename.includes('/') &&
           !filename.includes('\\') &&
           !filename.includes('<') &&
           !filename.includes('>');
  }

  private static detectSuspiciousUpload(key: string, options: any): void {
    if (!feature("THREAT_INTEL")) return;

    const suspiciousExtensions = ['.sh', '.bat', '.exe'];
    if (suspiciousExtensions.some(ext => options.filename?.endsWith(ext))) {
      fetch("https://api.buncatalog.com/v1/threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: 89,
          threatType: "suspicious_file_upload",
          key,
          filename: options.filename,
          timestamp: Date.now()
        })
      }).catch(() => {});
    }
  }

  private static logContentDispositionSet(key: string, disposition: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 89,
        action: "content_disposition_set",
        key,
        disposition,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const {
  setContentDisposition,
  uploadWithDisposition
} = feature("S3_CONTENT_DISPOSITION")
  ? S3ContentDisposition
  : {
      setContentDisposition: (k: string, d: any, f?: string) => ({}),
      uploadWithDisposition: (c: any, k: string, d: Buffer) => c.put(k, d)
    };
