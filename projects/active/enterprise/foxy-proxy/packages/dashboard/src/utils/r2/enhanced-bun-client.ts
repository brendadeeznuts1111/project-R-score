// import { S3Client } from 'bun';
import type { R2Config, UploadResult, FileMetadata, R2FileInfo } from "./base";
import { R2Client } from "./base";

// Enhanced BunFile interface with our schema
export interface EnhancedBunFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  key: string;
  bucket: string;
  etag?: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;

  // Bun native methods
  exists(): Promise<boolean>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  stream(): ReadableStream<Uint8Array> & AsyncIterable<Uint8Array>;
  json<T = unknown>(): Promise<T>;
  blob(): Promise<Blob>;
}

// File processing options
export interface FileProcessingOptions {
  generateChecksum?: boolean;
  extractMetadata?: boolean;
  compress?: boolean;
  optimize?: boolean;
  thumbnail?: boolean;
  validateIntegrity?: boolean;
}

// Schema definition for our file metadata
export interface FileSchema {
  // Core file information
  id: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastAccessed: string;

  // File classification
  category: "image" | "document" | "video" | "audio" | "archive" | "code" | "data" | "other";
  type: string; // file extension
  encoding?: string;

  // Storage information
  bucket: string;
  region?: string;
  storageClass?: "standard" | "infrequent-access" | "archive";

  // Content analysis
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    subject?: string;
    keywords?: string[];

    // Image metadata
    dimensions?: { width: number; height: number };
    format?: string;
    colorSpace?: string;
    hasAlpha?: boolean;

    // Document metadata
    pageCount?: number;
    wordCount?: number;

    // Media metadata
    duration?: number;
    bitrate?: number;
    framerate?: number;

    // Code metadata
    codeLanguage?: string;
    linesOfCode?: number;
    dependencies?: string[];
  };

  // Processing information
  processing: {
    status: "pending" | "processing" | "completed" | "failed";
    steps: string[];
    errors?: string[];
    warnings?: string[];

    // Optimization info
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: number;

    // Thumbnail info
    hasThumbnail?: boolean;
    thumbnailKey?: string;

    // Validation info
    isValid?: boolean;
    validationErrors?: string[];
  };

  // Access control
  access: {
    isPublic: boolean;
    allowedUsers?: string[];
    allowedRoles?: string[];
    expiresAt?: string;
    downloadLimit?: number;
    downloadCount?: number;
  };

  // Version information
  version: {
    current: number;
    history: Array<{
      version: number;
      size: number;
      checksum: string;
      createdAt: string;
      changes?: string;
    }>;
  };
}

/**
 * Enhanced Bun R2 client with schema support
 * NOTE: This is a placeholder for browser compatibility.
 * Use server-side implementations for actual Bun native features.
 */
export class EnhancedBunR2Client extends R2Client {
  private client: any | null;
  private publicBaseUrl: string;
  private schemaVersion = "1.0";

  constructor(config: R2Config) {
    super(config);
    this.client = null;
    this.publicBaseUrl =
      config.publicUrl || `https://pub-${config.accountId}.r2.dev/${config.bucketName}`;
  }

  private ensureClient(): any {
    this.ensureConfigured();
    if (!this.client) {
      throw new Error("R2 client not initialized (requires native Bun environment)");
    }
    return this.client;
  }

  // Enhanced upload with schema processing
  async uploadFileWithSchema(
    file: File,
    key?: string,
    options: FileProcessingOptions = {}
  ): Promise<{ result: UploadResult; schema: FileSchema }> {
    const fileKey = key || `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    try {
      const client = this.ensureClient();

      // Generate file schema
      const schema = await this.generateFileSchema(file, fileKey, options);

      // Add metadata to upload
      const uploadOptions: { type: string; metadata: Record<string, string> } = {
        type: file.type,
        metadata: {
          schema: JSON.stringify(schema),
          schemaVersion: this.schemaVersion,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      };

      const result = await client.write(fileKey, file, uploadOptions);

      return {
        result: {
          key: fileKey,
          url: `${this.publicBaseUrl}/${fileKey}`,
          etag: result.toString()
        },
        schema
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file with schema: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Generate comprehensive file schema
  private async generateFileSchema(
    file: File,
    key: string,
    options: FileProcessingOptions
  ): Promise<FileSchema> {
    const now = new Date().toISOString();
    const checksum = await this.generateChecksum(file);
    const category = this.categorizeFile(file);

    const schema: FileSchema = {
      id: this.generateId(),
      key,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      checksum,

      createdAt: now,
      updatedAt: now,
      lastAccessed: now,

      category,
      type: file.name.split(".").pop()?.toLowerCase() || "unknown",

      bucket: this.config.bucketName,

      metadata: await this.extractMetadata(file, category),

      processing: {
        status: "completed",
        steps: ["upload", "metadata-extraction", "checksum-generation"]
      },

      access: {
        isPublic: true
      },

      version: {
        current: 1,
        history: [
          {
            version: 1,
            size: file.size,
            checksum,
            createdAt: now
          }
        ]
      }
    };

    // Add processing steps based on options
    if (options.generateChecksum) {
      schema.processing.steps.push("checksum-validation");
    }

    if (options.extractMetadata) {
      schema.processing.steps.push("metadata-extraction");
    }

    if (options.compress) {
      schema.processing.steps.push("compression");
    }

    if (options.optimize) {
      schema.processing.steps.push("optimization");
    }

    if (options.thumbnail && category === "image") {
      schema.processing.steps.push("thumbnail-generation");
    }

    return schema;
  }

  // Extract file metadata based on type
  private async extractMetadata(file: File, category: string): Promise<FileSchema["metadata"]> {
    const metadata: FileSchema["metadata"] = {};

    try {
      switch (category) {
        case "image":
          return await this.extractImageMetadata(file);
        case "document":
          return await this.extractDocumentMetadata(file);
        case "code":
          return await this.extractCodeMetadata(file);
        default:
          return metadata;
      }
    } catch (error) {
      console.warn("Failed to extract metadata:", error);
      return metadata;
    }
  }

  // Extract image metadata
  private async extractImageMetadata(file: File): Promise<FileSchema["metadata"]> {
    const metadata: FileSchema["metadata"] = {};

    try {
      // Create object URL to read image
      const url = URL.createObjectURL(file);
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      metadata.dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight
      };

      // Determine format from MIME type
      if (file.type.includes("jpeg")) {
        metadata.format = "JPEG";
      } else if (file.type.includes("png")) {
        metadata.format = "PNG";
      } else if (file.type.includes("webp")) {
        metadata.format = "WebP";
      } else if (file.type.includes("gif")) {
        metadata.format = "GIF";
      } else if (file.type.includes("svg")) {
        metadata.format = "SVG";
      }

      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn("Failed to extract image metadata:", error);
    }

    return metadata;
  }

  // Extract document metadata
  private async extractDocumentMetadata(file: File): Promise<FileSchema["metadata"]> {
    const metadata: FileSchema["metadata"] = {};

    try {
      if (file.type === "application/pdf") {
        // For PDF, we'd need a PDF library - this is a placeholder
        metadata.format = "PDF";
      } else if (file.type.includes("text")) {
        // For text files, we can analyze content
        const text = await file.text();
        metadata.wordCount = text.split(/\s+/).length;
      }
    } catch (error) {
      console.warn("Failed to extract document metadata:", error);
    }

    return metadata;
  }

  // Extract code metadata
  private async extractCodeMetadata(file: File): Promise<FileSchema["metadata"]> {
    const metadata: FileSchema["metadata"] = {};

    try {
      const content = await file.text();
      metadata.linesOfCode = content.split("\n").length;

      // Determine language from file extension
      const extension = file.name.split(".").pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        js: "JavaScript",
        ts: "TypeScript",
        jsx: "React JSX",
        tsx: "React TSX",
        py: "Python",
        java: "Java",
        cpp: "C++",
        c: "C",
        go: "Go",
        rs: "Rust",
        php: "PHP",
        rb: "Ruby",
        swift: "Swift",
        kt: "Kotlin",
        scala: "Scala",
        cs: "C#",
        vb: "VB.NET",
        sql: "SQL",
        html: "HTML",
        css: "CSS",
        scss: "SCSS",
        sass: "Sass",
        less: "Less",
        xml: "XML",
        json: "JSON",
        yaml: "YAML",
        yml: "YAML",
        toml: "TOML",
        ini: "INI",
        sh: "Shell",
        bash: "Bash",
        zsh: "Zsh",
        fish: "Fish",
        ps1: "PowerShell",
        bat: "Batch",
        cmd: "Command",
        dockerfile: "Dockerfile",
        makefile: "Makefile",
        r: "R",
        m: "MATLAB",
        pl: "Perl",
        lua: "Lua",
        dart: "Dart",
        elm: "Elm",
        hs: "Haskell",
        ml: "OCaml",
        fs: "F#",
        clj: "Clojure",
        groovy: "Groovy"
      };

      if (extension && languageMap[extension]) {
        metadata.codeLanguage = languageMap[extension];
      }

      // Extract dependencies (simple regex-based approach)
      const importRegex = /(?:import|require|from)\s+['"]([^'"]+)['"]/g;
      const dependencies: string[] = [];
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }
      metadata.dependencies = [...new Set(dependencies)];
    } catch (error) {
      console.warn("Failed to extract code metadata:", error);
    }

    return metadata;
  }

  // Categorize file based on MIME type and extension
  private categorizeFile(file: File): FileSchema["category"] {
    const mimeType = file.type.toLowerCase();
    const extension = file.name.split(".").pop()?.toLowerCase() || "";

    if (mimeType.startsWith("image/")) {
      return "image";
    }
    if (mimeType.startsWith("video/")) {
      return "video";
    }
    if (mimeType.startsWith("audio/")) {
      return "audio";
    }

    const documentTypes = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];
    if (documentTypes.includes(extension)) {
      return "document";
    }

    const archiveTypes = ["zip", "rar", "7z", "tar", "gz", "bz2"];
    if (archiveTypes.includes(extension)) {
      return "archive";
    }

    const codeTypes = [
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "cpp",
      "c",
      "go",
      "rs",
      "php",
      "rb",
      "swift",
      "kt",
      "scala",
      "cs",
      "vb",
      "sql",
      "html",
      "css",
      "scss",
      "sass",
      "less",
      "xml",
      "json",
      "yaml",
      "yml",
      "toml",
      "ini",
      "sh",
      "bash",
      "zsh",
      "fish",
      "ps1",
      "bat",
      "cmd",
      "dockerfile",
      "makefile",
      "r",
      "m",
      "pl",
      "lua",
      "dart",
      "elm",
      "hs",
      "ml",
      "fs",
      "clj",
      "groovy"
    ];
    if (codeTypes.includes(extension)) {
      return "code";
    }

    if (mimeType.startsWith("text/")) {
      return "data";
    }

    return "other";
  }

  // Generate checksum for file integrity
  private async generateChecksum(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (error) {
      console.warn("Failed to generate checksum:", error);
      return Date.now().toString(36);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get file schema from metadata
  async getFileSchema(key: string): Promise<FileSchema | null> {
    try {
      const client = this.ensureClient();
      const file = client.file(key);
      const exists = await file.exists();

      if (!exists) {
        return null;
      }

      // In a real implementation, you'd retrieve metadata from R2
      // For now, return a basic schema
      return {
        id: this.generateId(),
        key,
        originalName: key.split("/").pop() || key,
        mimeType: "application/octet-stream",
        size: 0,
        checksum: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        category: "other",
        type: "unknown",
        bucket: this.config.bucketName,
        metadata: {},
        processing: {
          status: "completed",
          steps: []
        },
        access: {
          isPublic: true
        },
        version: {
          current: 1,
          history: []
        }
      };
    } catch (error) {
      console.warn("Failed to get file schema:", error);
      return null;
    }
  }

  // Enhanced file info with schema
  async getFileInfoWithSchema(
    key: string
  ): Promise<{ info: R2FileInfo; schema: FileSchema | null }> {
    try {
      const client = this.ensureClient();
      const response = await client.list({
        prefix: key
      });

      const file = response.contents?.find((obj: any) => obj.key === key);
      if (!file) {
        throw new Error("File not found");
      }

      const info: R2FileInfo = {
        key: file.key!,
        size: file.size,
        lastModified: file.lastModified ? new Date(file.lastModified) : undefined
      };

      const schema = await this.getFileSchema(key);

      return { info, schema };
    } catch (error) {
      throw new Error(
        `Failed to get file info with schema: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Create enhanced BunFile wrapper
  async createEnhancedBunFile(key: string): Promise<EnhancedBunFile | null> {
    try {
      const client = this.ensureClient();
      const file = client.file(key);
      const exists = await file.exists();

      if (!exists) {
        return null;
      }

      const schema = await this.getFileSchema(key);

      return {
        name: key.split("/").pop() || key,
        size: schema?.size || 0,
        type: schema?.mimeType || "application/octet-stream",
        lastModified: schema ? new Date(schema.updatedAt).getTime() : Date.now(),
        key,
        bucket: this.config.bucketName,
        checksum: schema?.checksum,
        metadata: schema?.metadata,
        tags: schema?.access.allowedUsers
          ? { users: schema.access.allowedUsers.join(",") }
          : undefined,

        // Bun native methods
        exists: () => file.exists(),
        text: () => file.text(),
        arrayBuffer: () => file.arrayBuffer(),
        stream: () => file.stream() as ReadableStream<Uint8Array> & AsyncIterable<Uint8Array>,
        json: async () => JSON.parse(await file.text()),
        blob: async () => new Blob([await file.arrayBuffer()], { type: schema?.mimeType })
      };
    } catch (error) {
      console.warn("Failed to create enhanced BunFile:", error);
      return null;
    }
  }

  // Process file with options
  async processFile(key: string, options: FileProcessingOptions): Promise<FileSchema> {
    const schema = await this.getFileSchema(key);
    if (!schema) {
      throw new Error("File not found");
    }

    // Update processing status
    schema.processing.status = "processing";
    schema.processing.steps.push("user-processing");

    try {
      if (options.generateChecksum) {
        schema.processing.steps.push("checksum-validation");
        schema.processing.status = "completed";
      }

      if (options.extractMetadata) {
        schema.processing.steps.push("metadata-extraction");
      }

      if (options.compress) {
        schema.processing.steps.push("compression");
        // Compression logic would go here
      }

      if (options.optimize) {
        schema.processing.steps.push("optimization");
        // Optimization logic would go here
      }

      schema.processing.status = "completed";
      schema.updatedAt = new Date().toISOString();

      return schema;
    } catch (error) {
      schema.processing.status = "failed";
      schema.processing.errors = [error instanceof Error ? error.message : "Unknown error"];
      throw error;
    }
  }

  // Standard R2 operations (inherited from base class)
  async uploadFile(file: File, key?: string): Promise<UploadResult> {
    const fileKey = key || `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    try {
      const client = this.ensureClient();
      const result = await client.write(fileKey, file);

      return {
        key: fileKey,
        url: `${this.publicBaseUrl}/${fileKey}`,
        etag: result.toString()
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async uploadData(
    data: Buffer | string,
    key: string,
    contentType: string = "application/octet-stream"
  ): Promise<UploadResult> {
    try {
      const client = this.ensureClient();
      const result = await client.write(key, data, {
        type: contentType
      });

      return {
        key,
        url: `${this.publicBaseUrl}/${key}`,
        etag: result.toString()
      };
    } catch (error) {
      throw new Error(
        `Failed to upload data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const client = this.ensureClient();
      await client.delete(key);
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async listFiles(prefix?: string): Promise<R2FileInfo[]> {
    try {
      const client = this.ensureClient();
      const response = await client.list({
        prefix: prefix || ""
      });

      return (
        response.contents?.map((obj: any) => ({
          key: obj.key!,
          size: obj.size,
          lastModified: obj.lastModified ? new Date(obj.lastModified) : undefined
        })) || []
      );
    } catch (error) {
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const client = this.ensureClient();
      const response = await client.file(key).exists();
      return response;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const client = this.ensureClient();
      const file = client.file(key);
      const exists = await file.exists();

      if (!exists) {
        return null;
      }

      return {
        name: key,
        size: 0, // Bun S3Client doesn't expose size without downloading
        type: "application/octet-stream",
        uploadedAt: new Date().toISOString()
      };
    } catch {
      return null;
    }
  }

  async getUploadUrl(key: string): Promise<string> {
    return `${this.publicBaseUrl}/${key}`;
  }

  async getDownloadUrl(key: string): Promise<string> {
    return `${this.publicBaseUrl}/${key}`;
  }
}

// Export enhanced client instance
export const enhancedBunR2Client = new EnhancedBunR2Client({
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID || "",
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || "",
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || "",
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || "foxy-proxy-storage",
  publicUrl: import.meta.env.VITE_R2_PUBLIC_URL
});

// Helper functions
export const uploadWithSchema = (file: File, key?: string, options?: FileProcessingOptions) =>
  enhancedBunR2Client.uploadFileWithSchema(file, key, options);

export const getEnhancedBunFile = (key: string) => enhancedBunR2Client.createEnhancedBunFile(key);

export const getFileSchema = (key: string) => enhancedBunR2Client.getFileSchema(key);

export const processFile = (key: string, options: FileProcessingOptions) =>
  enhancedBunR2Client.processFile(key, options);
