import React, { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  Download,
  Trash2,
  Eye,
  Search,
  RefreshCw,
  Folder,
  File,
  HardDrive,
  Calendar,
  Hash,
  AlertCircle,
  CheckCircle,
  Zap
} from "lucide-react";

import { enhancedBunR2Client, type EnhancedBunFile, type FileSchema } from "../utils/r2";
import type { R2FileInfo } from "../utils/r2";

// Enhanced file info with our schema
interface BucketFileInfo extends R2FileInfo {
  preview?: string;
  contentType?: string;
  downloadUrl?: string;
  publicUrl?: string;
  checksum?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  schema?: FileSchema;
  enhancedFile?: EnhancedBunFile;
}

// Bucket statistics
interface BucketStats {
  totalFiles: number;
  totalSize: number;
  lastModified: Date | null;
  fileTypes: Record<string, number>;
  storageUsage: number;
  availableSpace: number;
}

interface BucketVisualizerProps {
  bucketName?: string;
  refreshInterval?: number;
  maxPreviewSize?: number;
  enableInlinePreview?: boolean;
  showAdvancedInfo?: boolean;
}

export const BucketVisualizer: React.FC<BucketVisualizerProps> = ({
  bucketName = "foxy-proxy-storage",
  refreshInterval = 30000,
  maxPreviewSize = 1024 * 1024, // 1MB
  enableInlinePreview = true,
  showAdvancedInfo = false
}) => {
  const [files, setFiles] = useState<BucketFileInfo[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<BucketFileInfo[]>([]);
  const [stats, setStats] = useState<BucketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<BucketFileInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "size" | "modified">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string>("all");

  // Load bucket contents
  const loadBucketContents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fileList = await enhancedBunR2Client.listFiles();
      const enhancedFiles: BucketFileInfo[] = [];

      for (const file of fileList) {
        try {
          // Get enhanced file info with schema
          const { info, schema } = await enhancedBunR2Client.getFileInfoWithSchema(file.key);
          const enhancedFile = await enhancedBunR2Client.createEnhancedBunFile(file.key);

          const enhancedFileInfo: BucketFileInfo = {
            ...info,
            downloadUrl: await enhancedBunR2Client.getDownloadUrl(file.key),
            publicUrl: `${import.meta.env.VITE_R2_PUBLIC_URL}/${file.key}`,
            checksum: schema?.checksum,
            schema: schema || undefined,
            enhancedFile: enhancedFile || undefined
          };

          enhancedFiles.push(enhancedFileInfo);
        } catch {
          // Fallback for files without schema
          const enhancedFileInfo: BucketFileInfo = {
            ...file,
            downloadUrl: await enhancedBunR2Client.getDownloadUrl(file.key),
            publicUrl: `${import.meta.env.VITE_R2_PUBLIC_URL}/${file.key}`,
            checksum: await generateChecksum(file.key)
          };

          enhancedFiles.push(enhancedFileInfo);
        }
      }

      setFiles(enhancedFiles);
      calculateStats(enhancedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bucket contents");
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate bucket statistics
  const calculateStats = (fileList: BucketFileInfo[]) => {
    const stats: BucketStats = {
      totalFiles: fileList.length,
      totalSize: fileList.reduce((sum, file) => sum + (file.size || 0), 0),
      lastModified:
        fileList.length > 0
          ? new Date(Math.max(...fileList.map((f) => f.lastModified?.getTime() || 0)))
          : null,
      fileTypes: {},
      storageUsage: 0,
      availableSpace: 0
    };

    // Count file types
    fileList.forEach((file) => {
      const extension = file.key.split(".").pop()?.toLowerCase() || "unknown";
      stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;
    });

    setStats(stats);
  };

  // Generate checksum for file integrity
  const generateChecksum = async (key: string): Promise<string> => {
    try {
      // In a real implementation, you'd generate an MD5/SHA hash
      // For now, return a simple hash based on key and timestamp
      const encoder = new TextEncoder();
      const data = encoder.encode(key + Date.now());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return key
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0)
        .toString(16);
    }
  };

  // Load file preview using BunFile
  const loadFilePreview = useCallback(
    async (file: BucketFileInfo) => {
      if (!enableInlinePreview) {
        return;
      }

      try {
        setPreviewLoading(true);
        setPreviewContent(null);

        // Check file size
        if (file.size && file.size > maxPreviewSize) {
          setPreviewContent(
            `File too large for preview (${(file.size / 1024 / 1024).toFixed(2)}MB)`
          );
          return;
        }

        // Use enhanced BunFile if available
        if (file.enhancedFile) {
          await loadEnhancedFilePreview(file.enhancedFile, file.schema);
          return;
        }

        // Fallback to original preview logic
        const extension = file.key.split(".").pop()?.toLowerCase();

        if (
          ["txt", "json", "md", "js", "ts", "html", "css", "xml", "csv"].includes(extension || "")
        ) {
          const response = await fetch(file.downloadUrl!);
          const content = await response.text();
          setPreviewContent(content);
        } else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
          setPreviewContent(
            `<img src="${file.downloadUrl}" alt="${file.key}" style="max-width: 100%; height: auto;" />`
          );
        } else if (["pdf"].includes(extension || "")) {
          setPreviewContent(
            `<iframe src="${file.downloadUrl}" style="width: 100%; height: 500px;" />`
          );
        } else {
          setPreviewContent("Preview not available for this file type");
        }
      } catch (err) {
        setPreviewContent(
          `Failed to load preview: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setPreviewLoading(false);
      }
    },
    [enableInlinePreview, maxPreviewSize]
  );

  // Load preview using enhanced BunFile with schema
  const loadEnhancedFilePreview = async (enhancedFile: EnhancedBunFile, schema?: FileSchema) => {
    try {
      const extension = enhancedFile.key.split(".").pop()?.toLowerCase();
      const category = schema?.category || "other";

      switch (category) {
        case "image":
          if (schema?.metadata.dimensions) {
            setPreviewContent(`
              <div class="image-preview">
                <img src="${enhancedFile.bucket ? `https://pub-${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.dev/${enhancedFile.bucket}/${enhancedFile.key}` : enhancedFile.key}" 
                     alt="${enhancedFile.name}" 
                     style="max-width: 100%; height: auto;" />
                <div class="image-info" style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                  <strong>Dimensions:</strong> ${schema.metadata.dimensions.width} × ${schema.metadata.dimensions.height}px<br/>
                  <strong>Format:</strong> ${schema.metadata.format || "Unknown"}<br/>
                  <strong>Color Space:</strong> ${schema.metadata.colorSpace || "Unknown"}<br/>
                  <strong>Has Alpha:</strong> ${schema.metadata.hasAlpha ? "Yes" : "No"}
                </div>
              </div>
            `);
          } else {
            setPreviewContent(
              `<img src="https://pub-${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.dev/${enhancedFile.bucket}/${enhancedFile.key}" alt="${enhancedFile.name}" style="max-width: 100%; height: auto;" />`
            );
          }
          break;

        case "document":
          if (schema?.metadata.pageCount) {
            setPreviewContent(`
              <div class="document-preview">
                <div class="document-info" style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
                  <strong>Format:</strong> ${schema.metadata.format || "Unknown"}<br/>
                  <strong>Page Count:</strong> ${schema.metadata.pageCount}<br/>
                  <strong>Word Count:</strong> ${schema.metadata.wordCount || "N/A"}
                </div>
              </div>
            `);
          } else {
            const content = await enhancedFile.text();
            setPreviewContent(
              `<pre class="text-preview" style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${content}</pre>`
            );
          }
          break;

        case "code":
          if (schema?.metadata.codeLanguage) {
            const content = await enhancedFile.text();
            setPreviewContent(`
              <div class="code-preview">
                <div class="code-info" style="padding: 10px; background: #f5f5f5; border-radius: 4px; margin-bottom: 10px;">
                  <strong>Language:</strong> ${schema.metadata.codeLanguage}<br/>
                  <strong>Lines of Code:</strong> ${schema.metadata.linesOfCode}<br/>
                  <strong>Dependencies:</strong> ${schema.metadata.dependencies?.join(", ") || "None"}
                </div>
                <pre class="code-content" style="background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: 'Monaco', 'Menlo', monospace; font-size: 12px; line-height: 1.4;">${content}</pre>
              </div>
            `);
          } else {
            const content = await enhancedFile.text();
            setPreviewContent(
              `<pre class="text-preview" style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${content}</pre>`
            );
          }
          break;

        default:
          // Fallback for other file types
          if (
            ["txt", "json", "md", "js", "ts", "html", "css", "xml", "csv"].includes(extension || "")
          ) {
            const content = await enhancedFile.text();
            setPreviewContent(
              `<pre class="text-preview" style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${content}</pre>`
            );
          } else if (["pdf"].includes(extension || "")) {
            setPreviewContent(
              `<iframe src="https://pub-${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.dev/${enhancedFile.bucket}/${enhancedFile.key}" style="width: 100%; height: 500px;" />`
            );
          } else {
            setPreviewContent("Preview not available for this file type");
          }
      }
    } catch (err) {
      setPreviewContent(
        `Failed to load enhanced preview: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  // Download file using BunFile
  const downloadFile = async (file: BucketFileInfo) => {
    try {
      // Create download link
      const link = document.createElement("a");
      link.href = file.downloadUrl!;
      link.download = file.key.split("/").pop() || file.key;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(`Failed to download file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Delete file
  const deleteFile = async (file: BucketFileInfo) => {
    if (!confirm(`Are you sure you want to delete "${file.key}"?`)) {
      return;
    }

    try {
      await enhancedBunR2Client.deleteFile(file.key);
      await loadBucketContents();
      if (selectedFile?.key === file.key) {
        setSelectedFile(null);
        setPreviewContent(null);
      }
    } catch (err) {
      setError(`Failed to delete file: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Filter and sort files
  useEffect(() => {
    const filtered = files.filter((file) => {
      const matchesSearch = file.key.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || file.key.endsWith(`.${filterType}`);
      return matchesSearch && matchesType;
    });

    // Sort files
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.key.localeCompare(b.key);
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case "modified":
          comparison = (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredFiles(filtered);
  }, [files, searchQuery, filterType, sortBy, sortOrder]);

  // Auto-refresh
  useEffect(() => {
    loadBucketContents();

    if (refreshInterval > 0) {
      const interval = setInterval(loadBucketContents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, loadBucketContents]);

  // Load preview when file is selected
  useEffect(() => {
    if (selectedFile) {
      loadFilePreview(selectedFile);
    }
  }, [selectedFile, loadFilePreview]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: BucketFileInfo): React.ReactNode => {
    // Use schema category if available
    if (file.schema) {
      switch (file.schema.category) {
        case "image":
          return <File className="h-4 w-4 text-green-500" />;
        case "document":
          return <File className="h-4 w-4 text-red-500" />;
        case "code":
          return <File className="h-4 w-4 text-blue-500" />;
        case "video":
          return <File className="h-4 w-4 text-purple-500" />;
        case "audio":
          return <File className="h-4 w-4 text-pink-500" />;
        case "archive":
          return <File className="h-4 w-4 text-yellow-600" />;
        case "data":
          return <File className="h-4 w-4 text-orange-500" />;
        default:
          return <File className="h-4 w-4 text-gray-500" />;
      }
    }

    // Fallback to extension-based detection
    const extension = file.key.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
      return <File className="h-4 w-4 text-green-500" />;
    } else if (["pdf", "doc", "docx"].includes(extension || "")) {
      return <File className="h-4 w-4 text-red-500" />;
    } else if (["js", "ts", "html", "css", "json", "xml"].includes(extension || "")) {
      return <File className="h-4 w-4 text-blue-500" />;
    } else if (["zip", "rar", "tar", "gz"].includes(extension || "")) {
      return <File className="h-4 w-4 text-purple-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Cloud className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">Bucket Visualizer</h2>
          <span className="text-sm text-gray-500">{bucketName}</span>
        </div>
        <button
          onClick={loadBucketContents}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Total Files</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalFiles}</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-5 w-5 text-green-500" />
              <span className="font-medium">Total Size</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatFileSize(stats.totalSize)}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span className="font-medium">Last Modified</span>
            </div>
            <div className="text-sm font-bold text-purple-600">
              {stats.lastModified ? stats.lastModified.toLocaleDateString() : "Never"}
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-5 w-5 text-orange-500" />
              <span className="font-medium">File Types</span>
            </div>
            <div className="text-sm font-bold text-orange-600">
              {Object.keys(stats.fileTypes).length} types
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Files</option>
          <option value="txt">Text Files</option>
          <option value="json">JSON Files</option>
          <option value="jpg">Images</option>
          <option value="pdf">PDF Files</option>
          <option value="js">JavaScript</option>
          <option value="css">CSS</option>
        </select>

        {/* Sort */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split("-");
            setSortBy(sort as "name" | "size" | "modified");
            setSortOrder(order as "asc" | "desc");
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="size-asc">Size (Smallest)</option>
          <option value="size-desc">Size (Largest)</option>
          <option value="modified-asc">Modified (Oldest)</option>
          <option value="modified-desc">Modified (Newest)</option>
        </select>
      </div>

      {/* File List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Files */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Files ({filteredFiles.length})
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                <span className="text-gray-500">Loading files...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Cloud className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No files found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <div
                    key={file.key}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedFile?.key === file.key ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getFileIcon(file)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-2">
                            {file.key}
                            {file.schema && (
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  file.schema.category === "image"
                                    ? "bg-green-100 text-green-700"
                                    : file.schema.category === "document"
                                      ? "bg-red-100 text-red-700"
                                      : file.schema.category === "code"
                                        ? "bg-blue-100 text-blue-700"
                                        : file.schema.category === "video"
                                          ? "bg-purple-100 text-purple-700"
                                          : file.schema.category === "audio"
                                            ? "bg-pink-100 text-pink-700"
                                            : file.schema.category === "archive"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : file.schema.category === "data"
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {file.schema.category}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-4">
                            <span>{file.size ? formatFileSize(file.size) : "Unknown size"}</span>
                            {file.lastModified && (
                              <span>{file.lastModified.toLocaleDateString()}</span>
                            )}
                            {file.schema?.processing.status === "completed" && (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Processed
                              </span>
                            )}
                            {file.enhancedFile && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <Zap className="h-3 w-3" />
                                Enhanced
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                          }}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(file);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-medium flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </h3>
          </div>

          <div className="p-4">
            {selectedFile ? (
              <div>
                {/* File Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>
                      <div className="truncate">{selectedFile.key}</div>
                    </div>
                    <div>
                      <span className="font-medium">Size:</span>
                      <div>{selectedFile.size ? formatFileSize(selectedFile.size) : "Unknown"}</div>
                    </div>
                    <div>
                      <span className="font-medium">Modified:</span>
                      <div>{selectedFile.lastModified?.toLocaleString() || "Unknown"}</div>
                    </div>
                    <div>
                      <span className="font-medium">Checksum:</span>
                      <div className="text-xs font-mono truncate">
                        {selectedFile.checksum || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Schema Information */}
                  {selectedFile.schema && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Category:</span>
                          <div className="capitalize">{selectedFile.schema.category}</div>
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>
                          <div className="uppercase">{selectedFile.schema.type}</div>
                        </div>
                        <div>
                          <span className="font-medium">MIME Type:</span>
                          <div className="text-xs">{selectedFile.schema.mimeType}</div>
                        </div>
                        <div>
                          <span className="font-medium">Processing:</span>
                          <div
                            className={`capitalize ${
                              selectedFile.schema.processing.status === "completed"
                                ? "text-green-600"
                                : selectedFile.schema.processing.status === "processing"
                                  ? "text-blue-600"
                                  : selectedFile.schema.processing.status === "failed"
                                    ? "text-red-600"
                                    : "text-gray-600"
                            }`}
                          >
                            {selectedFile.schema.processing.status}
                          </div>
                        </div>
                      </div>

                      {/* Metadata Details */}
                      {Object.keys(selectedFile.schema.metadata).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="font-medium text-sm">Metadata:</span>
                          <div className="mt-1 text-xs space-y-1">
                            {selectedFile.schema.metadata.dimensions && (
                              <div>
                                <strong>Dimensions:</strong>{" "}
                                {selectedFile.schema.metadata.dimensions.width} ×{" "}
                                {selectedFile.schema.metadata.dimensions.height}px
                              </div>
                            )}
                            {selectedFile.schema.metadata.format && (
                              <div>
                                <strong>Format:</strong> {selectedFile.schema.metadata.format}
                              </div>
                            )}
                            {selectedFile.schema.metadata.codeLanguage && (
                              <div>
                                <strong>Language:</strong>{" "}
                                {selectedFile.schema.metadata.codeLanguage}
                              </div>
                            )}
                            {selectedFile.schema.metadata.linesOfCode && (
                              <div>
                                <strong>Lines of Code:</strong>{" "}
                                {selectedFile.schema.metadata.linesOfCode}
                              </div>
                            )}
                            {selectedFile.schema.metadata.dependencies &&
                              selectedFile.schema.metadata.dependencies.length > 0 && (
                              <div>
                                <strong>Dependencies:</strong>{" "}
                                {selectedFile.schema.metadata.dependencies.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showAdvancedInfo && (
                    <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Download URL:</span>
                        <div className="text-xs font-mono truncate">{selectedFile.downloadUrl}</div>
                      </div>
                      <div>
                        <span className="font-medium">Public URL:</span>
                        <div className="text-xs font-mono truncate">{selectedFile.publicUrl}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Content */}
                <div className="border border-gray-200 rounded-lg">
                  {previewLoading ? (
                    <div className="p-8 text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                      <span className="text-gray-500">Loading preview...</span>
                    </div>
                  ) : previewContent ? (
                    <div className="p-4">
                      {previewContent.startsWith("<") ? (
                        <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                      ) : (
                        <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                          {previewContent}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Eye className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Select a file to preview</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Select a file to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BucketVisualizer;
