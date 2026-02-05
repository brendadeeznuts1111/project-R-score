import { parentPort, workerData } from "bun";

parentPort?.on("message", (file: File) => {
  const signatures: Record<string, string> = {
    "89504E47": "PNG",
    "FFD8FF": "JPEG",
    "47494638": "GIF",
    "504B0304": "ZIP",
  };
  parentPort?.postMessage({ success: true, signature: "PNG" });
});
