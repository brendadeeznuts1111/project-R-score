import React, { useState, useCallback } from "react";
import { useFileStore } from "../stores/fileStore";
import { Palette } from "../utils/colors";
import type { Config } from "../config/types";

interface FileAnalyzerProps {
  config?: Config;
}

export function FileAnalyzer({ config }: FileAnalyzerProps = {}) {
  const [dragActive, setDragActive] = useState(false);
  const { addFile, files } = useFileStore();
  const uploadProgress = (import.meta.hot?.data.progress ?? 0) as number;

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    for (const file of droppedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("http://localhost:3005/api/files/analyze", { method: "POST", body: formData });
        const analysis = await response.json();
        addFile({ id: crypto.randomUUID(), name: file.name, ...analysis.data });
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
  }, [addFile]);

  if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.dispose(() => {
      import.meta.hot.data.progress = uploadProgress;
    });
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragActive ? Palette.frontend.stroke : Palette.frontend.primary}`,
        background: dragActive ? Palette.frontend.gradient : "transparent",
        padding: "2rem",
        transition: "all 0.3s ease",
      }}
    >
      <h2 style={{ color: Palette.frontend.primary }}>Drop files here to analyze</h2>
      <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
        {files.map((file) => (
          <div key={file.id} style={{ padding: "1rem", border: `1px solid ${Palette.frontend.stroke}`, background: Palette.frontend.gradient }}>
            <h3>{file.name}</h3>
            <p>Format: {file.signature}</p>
            <p>Hash: {file.hash}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
