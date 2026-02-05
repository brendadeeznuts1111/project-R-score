import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

import { uploadToR2, deleteFromR2, getR2DownloadUrl } from "../utils/r2";
import { DateUtils } from "../utils/date-utils";
import type { R2Client } from "../utils/r2";

interface FileUploadProps {
  onFileUploaded?: (file: { key: string; url: string; name: string }) => void;
  onFileDeleted?: (key: string) => void;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
  showFileList?: boolean;
  bucket?: R2Client;
}

interface UploadedFile {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: "uploading" | "completed" | "error";
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  onFileDeleted,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ["image/*", "application/pdf", "text/*", ".json", ".csv"],
  className = "",
  showFileList = true,
  bucket
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size must be less than ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }

    const isValidType = acceptedTypes.some((type) => {
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.slice(0, -2));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `File type not accepted. Allowed types: ${acceptedTypes.join(", ")}`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    const key = `uploads/${DateUtils.fileTimestamp()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const newFile: UploadedFile = {
      key,
      url: "",
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: DateUtils.now().format("ISO"),
      status: "uploading"
    };

    setFiles((prev) => [...prev, newFile]);

    try {
      const result = bucket ? await bucket.uploadFile(file, key) : await uploadToR2(file, key);

      const updatedFile = {
        ...newFile,
        url: result.url,
        status: "completed" as const
      };

      setFiles((prev) => prev.map((f) => (f.key === key ? updatedFile : f)));
      onFileUploaded?.(updatedFile);
    } catch (error) {
      const errorFile = {
        ...newFile,
        status: "error" as const
      };
      setFiles((prev) => prev.map((f) => (f.key === key ? errorFile : f)));
      console.error("Upload failed:", error);
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) {
      return;
    }

    Array.from(selectedFiles).forEach((file) => {
      uploadFile(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const deleteFile = async (key: string) => {
    try {
      if (bucket) {
        await bucket.deleteFile(key);
      } else {
        await deleteFromR2(key);
      }

      setFiles((prev) => prev.filter((f) => f.key !== key));
      onFileDeleted?.(key);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const downloadFile = async (file: UploadedFile) => {
    try {
      const url = bucket ? await bucket.getDownloadUrl(file.key) : await getR2DownloadUrl(file.key);

      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">Drop files here or click to upload</p>
        <p className="text-sm text-gray-500 mb-4">
          Maximum file size: {(maxFileSize / 1024 / 1024).toFixed(1)}MB
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Select Files
        </button>
      </div>

      {/* File List */}
      {showFileList && files.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-lg font-medium text-gray-700 mb-3">Uploaded Files</h3>
          {files.map((file) => (
            <div
              key={file.key}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)} •{" "}
                    {DateUtils.from(file.uploadedAt).format("DISPLAY_DATETIME")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {getStatusIcon(file.status)}

                {file.status === "completed" && (
                  <>
                    <button
                      onClick={() => downloadFile(file)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFile(file.key)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                {file.status === "error" && (
                  <button
                    onClick={() => deleteFile(file.key)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
