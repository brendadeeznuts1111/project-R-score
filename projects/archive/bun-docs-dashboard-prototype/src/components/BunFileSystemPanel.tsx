import { useState } from 'react';
import { File, Folder, Search, Download, Upload, Trash2, Plus, Code } from 'lucide-react';
import { useBunFileSystem } from '../hooks/useBunFileSystem';

export default function BunFileSystemPanel() {
  const { 
    fileSystem, 
    isLoading, 
    currentPath, 
    setCurrentPath, 
    readFile, 
    writeFile, 
    createDirectory 
  } = useBunFileSystem();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFileClick = async (item: any) => {
    if (item.type === 'directory') {
      setCurrentPath(item.path);
    } else {
      setSelectedFile(item.path);
      const content = await readFile(item.path);
      setFileContent(content);
    }
  };

  const handleSaveFile = async () => {
    if (selectedFile && fileContent) {
      await writeFile(selectedFile, fileContent);
      setIsEditing(false);
    }
  };

  const handleCreateFile = async () => {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      await writeFile(`${currentPath}/${fileName}`, '// New file created with Bun');
      // Refresh file system
    }
  };

  const handleCreateDirectory = async () => {
    const dirName = prompt('Enter directory name:');
    if (dirName) {
      await createDirectory(`${currentPath}/${dirName}`);
      // Refresh file system
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <File className="w-5 h-5 text-cloudflare-orange animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bun File System</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <File className="w-5 h-5 text-cloudflare-orange" />
          <span>Bun File System</span>
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleCreateFile}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Create File"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleCreateDirectory}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Create Directory"
          >
            <Folder className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Path */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current Path:</div>
        <div className="flex items-center space-x-2 text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
          <Code className="w-4 h-4" />
          <span>{currentPath}</span>
        </div>
      </div>

      {/* File List */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Files & Directories:</div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {fileSystem.map((item, index) => (
            <div
              key={index}
              onClick={() => handleFileClick(item)}
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                selectedFile === item.path 
                  ? 'bg-cloudflare-orange text-white' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                {item.type === 'directory' ? (
                  <Folder className="w-4 h-4" />
                ) : (
                  <File className="w-4 h-4" />
                )}
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.size && formatFileSize(item.size)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File Content Editor */}
      {selectedFile && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedFile.split('/').pop()}
            </span>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveFile}
                    className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fileContent);
                    }}
                    className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                  >
                    Copy
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            disabled={!isEditing}
            className={`w-full h-32 p-2 text-xs font-mono border rounded-md resize-none ${
              isEditing 
                ? 'bg-white dark:bg-gray-900 border-cloudflare-orange' 
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          />
        </div>
      )}

      {/* Bun Features */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="font-medium mb-2">Bun File System Features:</div>
          <ul className="space-y-1">
            <li>• Built-in file system API</li>
            <li>• Fast file I/O operations</li>
            <li>• Cross-platform compatibility</li>
            <li>• Native file watching</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
