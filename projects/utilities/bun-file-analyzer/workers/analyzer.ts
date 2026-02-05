/// <reference lib="webworker" />

self.onmessage = (event: MessageEvent) => {
  const file = event.data;
  const signatures: Record<string, string> = {
    "89504E47": "PNG",
    "FFD8FF": "JPEG",
    "47494638": "GIF",
    "504B0304": "ZIP",
  };

  // Simple file type detection
  const result = {
    name: file.name || "unknown",
    type: signatures[file.type] || "Unknown",
    size: file.size || 0,
  };

  self.postMessage(result);
};
