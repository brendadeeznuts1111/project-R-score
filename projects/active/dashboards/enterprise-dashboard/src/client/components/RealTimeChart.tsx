import { useEffect, useRef, useState } from "react";
import type { TimelinePoint } from "../../types";

interface RealTimeChartProps {
  data: TimelinePoint[];
}

export function RealTimeChart({ data }: RealTimeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(true);

  // Listen for theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    // Use MutationObserver to detect class changes on html element
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data?.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas with theme-appropriate background
    ctx.fillStyle = isDark ? "#1f2937" : "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Find max values for scaling
    const maxRequests = Math.max(...data.map((d) => d.requests), 1);
    const maxLatency = Math.max(...data.map((d) => d.latency), 1);

    // Draw grid
    ctx.strokeStyle = isDark ? "#374151" : "#e5e7eb";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw requests line (green)
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - (point.requests / maxRequests) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw latency line (blue)
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - (point.latency / maxLatency) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw error dots (red)
    ctx.fillStyle = "#ef4444";
    data.forEach((point, i) => {
      if (point.errors > 0) {
        const x = padding + (i / (data.length - 1)) * chartWidth;
        ctx.beginPath();
        ctx.arc(x, padding + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Legend
    ctx.font = "12px system-ui";
    ctx.fillStyle = "#22c55e";
    ctx.fillText("\u25CF Requests", padding, height - 10);
    ctx.fillStyle = "#3b82f6";
    ctx.fillText("\u25CF Latency", padding + 80, height - 10);
    ctx.fillStyle = "#ef4444";
    ctx.fillText("\u25CF Errors", padding + 160, height - 10);
  }, [data, isDark]);

  return (
    <div className="chart-container rounded-lg p-4 bg-white shadow dark:bg-gray-800 dark:shadow-none">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Real-Time Metrics</h3>
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        className="w-full rounded"
      />
    </div>
  );
}
