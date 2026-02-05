import React, { useState } from "react";

import { enhancedADBManager } from "../utils/duoplus/enhanced-adb";
import type { DuoPlusPhone } from "../utils/duoplus/duoplus";

interface ADBCommandPanelProps {
  phones: DuoPlusPhone[];
  selectedPhone: DuoPlusPhone | null;
  onPhoneSelect: (phone: DuoPlusPhone) => void;
}

interface CommandHistory {
  id: string;
  phoneId: string;
  command: string;
  output: string;
  timestamp: Date;
  success: boolean;
}

export const ADBCommandPanel: React.FC<ADBCommandPanelProps> = ({
  phones,
  selectedPhone,
  onPhoneSelect
}) => {
  const [customCommand, setCustomCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick" | "file" | "apps" | "custom">("quick");

  const executeCommand = async (command: string, description?: string) => {
    if (!selectedPhone) {
      return;
    }

    setLoading(true);
    try {
      const response = await enhancedADBManager.executeCommand(selectedPhone.id, command);

      const historyItem: CommandHistory = {
        id: Date.now().toString(),
        phoneId: selectedPhone.id,
        command: description || command,
        output: response.output || "Command executed successfully",
        timestamp: new Date(),
        success: response.success !== false
      };

      setCommandHistory((prev) => [historyItem, ...prev.slice(0, 49)]); // Keep last 50
    } catch (error) {
      const historyItem: CommandHistory = {
        id: Date.now().toString(),
        phoneId: selectedPhone.id,
        command: description || command,
        output: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
        success: false
      };
      setCommandHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
    } finally {
      setLoading(false);
    }
  };

  const QuickCommandsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Quick Commands</h3>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => void executeCommand("getprop ro.product.model", "Get Device Model")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!selectedPhone}
        >
          Device Info
        </button>

        <button
          onClick={() => void executeCommand("wm size", "Get Screen Resolution")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!selectedPhone}
        >
          Screen Size
        </button>

        <button
          onClick={() => void executeCommand("logcat -c", "Clear System Logs")}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          disabled={!selectedPhone}
        >
          Clear Logs
        </button>

        <button
          onClick={() =>
            void executeCommand("screencap -p > /sdcard/screenshot.png", "Take Screenshot")
          }
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={!selectedPhone}
        >
          Screenshot
        </button>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Accessibility Services</h4>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={async () => {
              if (!selectedPhone) {
                return;
              }
              try {
                const services = await enhancedADBManager.getAccessibilityServices(
                  selectedPhone.id
                );
                alert(`Current accessibility services:\n${services || "None"}`);
              } catch (error) {
                alert(`Error: ${error}`);
              }
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={!selectedPhone}
          >
            Get Services
          </button>

          <button
            onClick={() => {
              if (!selectedPhone) {
                return;
              }
              enhancedADBManager
                .setupAutoJsAccessibility(selectedPhone.id)
                .then(() => alert("AutoJs accessibility enabled"))
                .catch((error: unknown) => alert(`Error: ${error}`));
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={!selectedPhone}
          >
            Enable AutoJs
          </button>
        </div>
      </div>
    </div>
  );

  const FileTransferTab = () => {
    const [downloadUrl, setDownloadUrl] = useState("");
    const [uploadFile, setUploadFile] = useState("");

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">File Transfer</h3>

        <div className="border rounded p-4">
          <h4 className="font-medium mb-2">Download from URL</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://example.com/file.apk"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                if (downloadUrl && selectedPhone) {
                  void executeCommand(
                    `wget --no-check-certificate -O /sdcard/download.apk ${downloadUrl} > /dev/null 2>&1 &`,
                    `Download: ${downloadUrl}`
                  );
                  setDownloadUrl("");
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!selectedPhone || !downloadUrl}
            >
              Download
            </button>
          </div>
        </div>

        <div className="border rounded p-4">
          <h4 className="font-medium mb-2">Upload to Relay Station</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="/sdcard/file.txt"
              value={uploadFile}
              onChange={(e) => setUploadFile(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                if (uploadFile && selectedPhone) {
                  void executeCommand(
                    `curl -F "file=@${uploadFile}" https://temp.sh/upload > /sdcard/upload.log 2>&1 &`,
                    `Upload: ${uploadFile}`
                  );
                  setUploadFile("");
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={!selectedPhone || !uploadFile}
            >
              Upload
            </button>
          </div>
        </div>

        <div className="border rounded p-4">
          <h4 className="font-medium mb-2">Check Upload Progress</h4>
          <button
            onClick={() => void executeCommand("cat /sdcard/upload.log", "Upload Progress")}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            disabled={!selectedPhone}
          >
            Check Progress
          </button>
        </div>
      </div>
    );
  };

  const AppManagementTab = () => {
    const [packageName, setPackageName] = useState("");
    const [apkPath, setApkPath] = useState("");

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Application Management</h3>

        <div className="border rounded p-4">
          <h4 className="font-medium mb-2">Package Operations</h4>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() =>
                void executeCommand('pm list packages -3 | cut -d ":" -f 2', "List Installed Apps")
              }
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!selectedPhone}
            >
              List Apps
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="com.example.app"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-sm"
              />
              <button
                onClick={() => {
                  if (packageName && selectedPhone) {
                    void executeCommand(`pm uninstall ${packageName}`, `Uninstall: ${packageName}`);
                    setPackageName("");
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                disabled={!selectedPhone || !packageName}
              >
                Uninstall
              </button>
            </div>
          </div>
        </div>

        <div className="border rounded p-4">
          <h4 className="font-medium mb-2">Install APK</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="/sdcard/app.apk"
              value={apkPath}
              onChange={(e) => setApkPath(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                if (apkPath && selectedPhone) {
                  void executeCommand(`pm install ${apkPath}`, `Install: ${apkPath}`);
                  setApkPath("");
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={!selectedPhone || !apkPath}
            >
              Install
            </button>
          </div>
        </div>

        <div className="border rounded p-4">
          <h4 className="font-medium mb-2">App Control</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="com.example.app"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                if (packageName && selectedPhone) {
                  void executeCommand(`am force-stop ${packageName}`, `Stop: ${packageName}`);
                }
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              disabled={!selectedPhone || !packageName}
            >
              Stop
            </button>
            <button
              onClick={() => {
                if (packageName && selectedPhone) {
                  void executeCommand(`pm clear ${packageName}`, `Clear Data: ${packageName}`);
                }
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              disabled={!selectedPhone || !packageName}
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CustomCommandTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Custom Command</h3>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter ADB command..."
          value={customCommand}
          onChange={(e) => setCustomCommand(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && customCommand && selectedPhone) {
              void executeCommand(customCommand);
              setCustomCommand("");
            }
          }}
          className="flex-1 px-3 py-2 border rounded font-mono text-sm"
        />
        <button
          onClick={() => {
            if (customCommand && selectedPhone) {
              void executeCommand(customCommand);
              setCustomCommand("");
            }
          }}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          disabled={!selectedPhone || !customCommand}
        >
          Execute
        </button>
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <h4 className="font-medium mb-2">Common Commands:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
          <code className="bg-gray-200 px-2 py-1 rounded">getprop</code>
          <code className="bg-gray-200 px-2 py-1 rounded">pm list packages</code>
          <code className="bg-gray-200 px-2 py-1 rounded">input keyevent 3</code>
          <code className="bg-gray-200 px-2 py-1 rounded">input tap 500 500</code>
          <code className="bg-gray-200 px-2 py-1 rounded">am start -n com.app/.Activity</code>
          <code className="bg-gray-200 px-2 py-1 rounded">settings get global</code>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ADB Command Center</h2>

        <select
          value={selectedPhone?.id || ""}
          onChange={(e) => {
            const phone = phones.find((p) => p.id === e.target.value);
            if (phone) {
              onPhoneSelect(phone);
            }
          }}
          className="px-4 py-2 border rounded"
        >
          <option value="">Select Phone</option>
          {phones.map((phone) => (
            <option key={phone.id} value={phone.id}>
              {phone.name || phone.id}
            </option>
          ))}
        </select>
      </div>

      {selectedPhone ? (
        <>
          <div className="flex space-x-1 mb-6 border-b">
            {[
              { id: "quick", label: "Quick Commands" },
              { id: "file", label: "File Transfer" },
              { id: "apps", label: "App Management" },
              { id: "custom", label: "Custom Command" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "quick" | "file" | "apps" | "custom")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            {activeTab === "quick" && <QuickCommandsTab />}
            {activeTab === "file" && <FileTransferTab />}
            {activeTab === "apps" && <AppManagementTab />}
            {activeTab === "custom" && <CustomCommandTab />}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Command History</h3>

            {commandHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No commands executed yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {commandHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded border ${
                      item.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.command}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.timestamp.toLocaleTimeString()} - Phone: {item.phoneId}
                        </div>
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          item.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.success ? "Success" : "Error"}
                      </div>
                    </div>

                    {item.output && (
                      <div className="mt-2 text-sm font-mono bg-gray-100 p-2 rounded">
                        {item.output}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Please select a phone to start executing ADB commands
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Executing command...</p>
          </div>
        </div>
      )}
    </div>
  );
};
