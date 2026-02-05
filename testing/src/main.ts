import { UploadEngine } from "./upload-engine";
import { UploadProgressUI } from "./ui/upload-progress";
import { feature } from "bun:bundle";

async function runDemo() {
  console.log("Starting Feature-Flagged Upload System...");
  
  if (feature("PREMIUM")) {
    console.log("🌟 Premium Features Enabled");
  }

  const engine = new UploadEngine();
  const ui = new UploadProgressUI();

  // Simulated files
  const files = [
    { name: "quarterly-report.pdf", progress: 0.5, status: "uploading" as const },
    { name: "family-photo👨‍👩‍👧.jpg", progress: 1.0, status: "complete" as const },
    { name: "presentation📊.pptx", progress: 0.1, status: "queued" as const },
  ];

  ui.render(files);

  // Demonstrate build-time exclusion
  if (feature("DEBUG")) {
    console.log("[DEBUG] Engine initialized:", !!engine);
  }
}

runDemo().catch(console.error);
