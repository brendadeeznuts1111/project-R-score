/**
 * Upload Panel Component
 *
 * React component for file uploads with drag-and-drop support,
 * real-time progress tracking, and WebSocket updates.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, CloudUpload, FileCheck, XCircle, Trash2, AlertCircle } from 'lucide-react';

interface UploadProgress {
  uploadId: string;
  filename: string;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;
  status: 'initiated' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  error?: string;
  url?: string;
}

interface UploadPanelProps {
  apiBaseUrl?: string;
  wsUrl?: string;
  onUploadComplete?: (result: UploadProgress) => void;
  onUploadError?: (error: string) => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  apiBaseUrl = '/api',
  wsUrl = `ws://${window.location.host}`,
  onUploadComplete,
  onUploadError,
}) => {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📊 Upload Panel WebSocket connected');
        setIsConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'dashboard' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'upload-progress') {
            const progress: UploadProgress = message.data;
            setUploads(prev => new Map(prev).set(progress.uploadId, progress));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Upload Panel WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('📊 Upload Panel WebSocket disconnected');
        setIsConnected(false);
      };

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
    }
  }, [wsUrl]);

  // Poll for upload status updates (fallback if WebSocket fails)
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(async () => {
      const activeUploads = Array.from(uploads.values()).filter(
        u => u.status === 'initiated' || u.status === 'uploading'
      );

      for (const upload of activeUploads) {
        try {
          const response = await fetch(`${apiBaseUrl}/upload/status/${upload.uploadId}`);
          if (response.ok) {
            const progress: UploadProgress = await response.json();
            setUploads(prev => new Map(prev).set(progress.uploadId, progress));

            // Trigger completion callback
            if (progress.status === 'completed' && onUploadComplete) {
              onUploadComplete(progress);
            }
          }
        } catch (error) {
          console.error('Failed to fetch upload status:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, uploads, apiBaseUrl, onUploadComplete]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await uploadFile(file);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await uploadFile(file);
    }
    // Reset input
    e.target.value = '';
  }, []);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);
    formData.append('contentType', file.type);

    try {
      const response = await fetch(`${apiBaseUrl}/upload/initiate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      // Add to uploads list
      setUploads(prev => new Map(prev).set(result.uploadId, {
        uploadId: result.uploadId,
        filename: result.filename,
        totalBytes: result.size,
        uploadedBytes: 0,
        progress: 0,
        status: 'initiated',
        startedAt: Date.now(),
        url: result.url,
      }));

      // Poll for initial status
      pollUploadStatus(result.uploadId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Upload failed:', errorMessage);

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    }
  };

  const pollUploadStatus = async (uploadId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/upload/status/${uploadId}`);
        if (response.ok) {
          const progress: UploadProgress = await response.json();
          setUploads(prev => new Map(prev).set(uploadId, progress));

          if (progress.status === 'completed' && onUploadComplete) {
            onUploadComplete(progress);
          } else if (progress.status === 'initiated' || progress.status === 'uploading') {
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(poll, 1000);
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll upload status:', error);
      }
    };

    poll();
  };

  const cancelUpload = async (uploadId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/upload/cancel/${uploadId}`, {
        method: 'POST',
      });

      if (response.ok) {
        setUploads(prev => {
          const newMap = new Map(prev);
          const upload = newMap.get(uploadId);
          if (upload) {
            newMap.set(uploadId, { ...upload, status: 'cancelled' });
          }
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to cancel upload:', error);
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <FileCheck className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Upload className="w-5 h-5 text-blue-500 animate-pulse" />;
    }
  };

  const activeUploads = Array.from(uploads.values()).filter(
    u => u.status === 'initiated' || u.status === 'uploading'
  );
  const completedUploads = Array.from(uploads.values()).filter(
    u => u.status === 'completed' || u.status === 'failed' || u.status === 'cancelled'
  );

  return (
    <div className="upload-panel p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CloudUpload className="w-6 h-6" />
          File Upload
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-gray-600">
            {isConnected ? 'Connected' : 'Polling'}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`upload-zone border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drag & drop files here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer transition-colors"
        >
          Select Files
        </label>
      </div>

      {/* Active uploads */}
      {activeUploads.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">
            Active Uploads ({activeUploads.length})
          </h3>
          <div className="space-y-3">
            {activeUploads.map(upload => (
              <div
                key={upload.uploadId}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(upload.status)}
                    <span className="font-medium truncate">{upload.filename}</span>
                  </div>
                  <button
                    onClick={() => cancelUpload(upload.uploadId)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Cancel upload"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatBytes(upload.uploadedBytes)} / {formatBytes(upload.totalBytes)}</span>
                  <span>{upload.progress.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed uploads */}
      {completedUploads.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              Completed ({completedUploads.length})
            </h3>
            <button
              onClick={() => setUploads(new Map())}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {completedUploads.map(upload => (
              <div
                key={upload.uploadId}
                className={`border rounded-lg p-3 flex items-center justify-between ${
                  upload.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(upload.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{upload.filename}</p>
                    {upload.status === 'failed' && upload.error && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {upload.error}
                      </p>
                    )}
                    {upload.status === 'completed' && (
                      <p className="text-sm text-gray-500">
                        {formatBytes(upload.totalBytes)} • {formatDuration(upload.completedAt! - upload.startedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeUpload(upload.uploadId)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Remove from list"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
