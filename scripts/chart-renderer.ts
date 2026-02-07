#!/usr/bin/env bun

/**
 * Chart Renderer - SVG-based Chart Rendering with Bun.color Theming
 * 
 * Line charts, heatmaps, bar charts with real-time dashboard endpoints
 * Uses Bun.color for theming and SVG for rendering (no Canvas dependency)
 */

import { writeFileSync } from 'fs';

// Chart types and interfaces
interface ChartData {
  type: 'line' | 'bar' | 'heatmap' | 'pie';
  data: number[] | number[][];
  labels?: string[];
  title?: string;
  width?: number;
  height?: number;
  format: 'svg' | 'json';
  theme?: ChartTheme;
}

interface ChartTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  grid: string;
  colors: string[];
}

// Default theme using Bun.color
const DEFAULT_THEME: ChartTheme = {
  primary: '#3b82f6',    // Blue
  secondary: '#22c55e',  // Green
  accent: '#f59e0b',     // Amber
  background: '#ffffff', // White
  text: '#1f2937',       // Gray-800
  grid: '#e5e7eb',       // Gray-200
  colors: [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ]
};

// Color utilities using Bun.color
class ColorUtils {
  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    try {
      // Simple hex parsing as fallback
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        return {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        };
      }
      
      // Fallback colors
      const fallbackColors: Record<string, { r: number; g: number; b: number }> = {
        '#3b82f6': { r: 59, g: 130, b: 246 },
        '#22c55e': { r: 34, g: 197, b: 94 },
        '#f59e0b': { r: 245, g: 158, b: 11 },
        '#ef4444': { r: 239, g: 68, b: 68 },
        '#dc2626': { r: 220, g: 38, b: 38 }
      };
      
      return fallbackColors[hex] || { r: 0, g: 0, b: 0 };
    } catch (error) {
      return { r: 0, g: 0, b: 0 };
    }
  }
  
  static interpolate(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// SVG Chart Renderer
class SVGChartRenderer {
  private width: number;
  private height: number;
  private theme: ChartTheme;
  
  constructor(width: number = 800, height: number = 400, theme: ChartTheme = DEFAULT_THEME) {
    this.width = width;
    this.height = height;
    this.theme = theme;
  }
  
  renderLineChart(data: number[], title?: string): string {
    if (data.length === 0) return this.emptyChart();
    
    const padding = 60;
    const chartWidth = this.width - padding * 2;
    const chartHeight = this.height - padding * 2;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
    
    const circles = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      return `<circle cx="${x}" cy="${y}" r="4" fill="${this.theme.primary}"/>`;
    }).join('');
    
    const valueLabels = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      return `<text x="${x}" y="${y - 10}" text-anchor="middle" fill="${this.theme.text}" font-size="12">${value}</text>`;
    }).join('');
    
    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${this.width}" height="${this.height}" fill="${this.theme.background}"/>
  ${title ? `<text x="${this.width/2}" y="15" text-anchor="middle" fill="${this.theme.text}" font-size="16" font-weight="bold">${title}</text>` : ''}
  ${this.renderGrid()}
  ${this.renderAxes()}
  <polyline points="${points}" fill="none" stroke="${this.theme.primary}" stroke-width="3"/>
  ${circles}
  ${valueLabels}
</svg>`;
  }
  
  renderBarChart(data: number[], labels?: string[], title?: string): string {
    if (data.length === 0) return this.emptyChart();
    
    const padding = 60;
    const chartWidth = this.width - padding * 2;
    const chartHeight = this.height - padding * 2;
    
    const maxValue = Math.max(...data);
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;
    
    const bars = data.map((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = padding + chartHeight - barHeight;
      
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${this.theme.colors[index % this.theme.colors.length]}"/>`;
    }).join('');
    
    const valueLabels = data.map((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2;
      const y = padding + chartHeight - barHeight - 5;
      
      return `<text x="${x}" y="${y}" text-anchor="middle" fill="${this.theme.text}" font-size="12">${value}</text>`;
    }).join('');
    
    const xLabels = labels ? labels.map((label, index) => {
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2 + barWidth / 2;
      return `<text x="${x}" y="${this.height - 25}" text-anchor="middle" fill="${this.theme.text}" font-size="12">${label}</text>`;
    }).join('') : '';
    
    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${this.width}" height="${this.height}" fill="${this.theme.background}"/>
  ${title ? `<text x="${this.width/2}" y="15" text-anchor="middle" fill="${this.theme.text}" font-size="16" font-weight="bold">${title}</text>` : ''}
  ${this.renderGrid()}
  ${this.renderAxes()}
  ${bars}
  ${valueLabels}
  ${xLabels}
</svg>`;
  }
  
  renderHeatmap(data: number[][], title?: string): string {
    if (data.length === 0 || data[0].length === 0) return this.emptyChart();
    
    const padding = 60;
    const chartWidth = this.width - padding * 2;
    const chartHeight = this.height - padding * 2;
    
    const rows = data.length;
    const cols = data[0].length;
    const cellWidth = chartWidth / cols;
    const cellHeight = chartHeight / rows;
    
    const flatData = data.flat();
    const minValue = Math.min(...flatData);
    const maxValue = Math.max(...flatData);
    const range = maxValue - minValue || 1;
    
    const cells = data.map((row, rowIndex) => {
      return row.map((value, colIndex) => {
        const x = padding + colIndex * cellWidth;
        const y = padding + rowIndex * cellHeight;
        const normalized = (value - minValue) / range;
        
        let color: string;
        if (normalized < 0.25) {
          color = ColorUtils.interpolate(this.theme.primary, this.theme.secondary, normalized * 4);
        } else if (normalized < 0.5) {
          color = ColorUtils.interpolate(this.theme.secondary, this.theme.accent, (normalized - 0.25) * 4);
        } else if (normalized < 0.75) {
          color = ColorUtils.interpolate(this.theme.accent, '#ef4444', (normalized - 0.5) * 4);
        } else {
          color = ColorUtils.interpolate('#ef4444', '#dc2626', (normalized - 0.75) * 4);
        }
        
        const textValue = rows <= 10 && cols <= 10 ? 
          `<text x="${x + cellWidth/2}" y="${y + cellHeight/2 + 3}" text-anchor="middle" fill="${normalized > 0.5 ? '#ffffff' : this.theme.text}" font-size="10">${value.toFixed(2)}</text>` : '';
        
        return `<rect x="${x}" y="${y}" width="${cellWidth - 1}" height="${cellHeight - 1}" fill="${color}"/>${textValue}`;
      }).join('');
    }).join('');
    
    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${this.width}" height="${this.height}" fill="${this.theme.background}"/>
  ${title ? `<text x="${this.width/2}" y="15" text-anchor="middle" fill="${this.theme.text}" font-size="16" font-weight="bold">${title}</text>` : ''}
  ${cells}
</svg>`;
  }
  
  renderPieChart(data: number[], labels?: string[], title?: string): string {
    if (data.length === 0) return this.emptyChart();
    
    const centerX = this.width / 2;
    const centerY = this.height / 2 + 10;
    const radius = Math.min(this.width, this.height) / 3;
    
    const total = data.reduce((sum, value) => sum + value, 0);
    let currentAngle = -Math.PI / 2;
    
    const slices = data.map((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      const endAngle = currentAngle + sliceAngle;
      
      const x1 = centerX + Math.cos(currentAngle) * radius;
      const y1 = centerY + Math.sin(currentAngle) * radius;
      const x2 = centerX + Math.cos(endAngle) * radius;
      const y2 = centerY + Math.sin(endAngle) * radius;
      
      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      
      const slice = `<path d="${path}" fill="${this.theme.colors[index % this.theme.colors.length]}"/>`;
      
      // Add labels if provided
      let label = '';
      if (labels && labels[index]) {
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        const percentage = ((value / total) * 100).toFixed(1) + '%';
        
        label = `<text x="${labelX}" y="${labelY}" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">${labels[index]}</text>
                 <text x="${labelX}" y="${labelY + 15}" text-anchor="middle" fill="#ffffff" font-size="10">${percentage}</text>`;
      }
      
      currentAngle = endAngle;
      return slice + label;
    }).join('');
    
    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${this.width}" height="${this.height}" fill="${this.theme.background}"/>
  ${title ? `<text x="${this.width/2}" y="15" text-anchor="middle" fill="${this.theme.text}" font-size="16" font-weight="bold">${title}</text>` : ''}
  ${slices}
</svg>`;
  }
  
  private renderGrid(): string {
    const padding = 60;
    const chartWidth = this.width - padding * 2;
    const chartHeight = this.height - padding * 2;
    
    let grid = '';
    
    // Vertical lines
    for (let x = padding; x <= this.width - padding; x += 50) {
      grid += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${this.height - padding}" stroke="${this.theme.grid}" stroke-width="1"/>`;
    }
    
    // Horizontal lines
    for (let y = padding; y <= this.height - padding; y += 30) {
      grid += `<line x1="${padding}" y1="${y}" x2="${this.width - padding}" y2="${y}" stroke="${this.theme.grid}" stroke-width="1"/>`;
    }
    
    return grid;
  }
  
  private renderAxes(): string {
    const padding = 60;
    
    return `<line x1="${padding}" y1="${this.height - padding}" x2="${this.width - padding}" y2="${this.height - padding}" stroke="${this.theme.text}" stroke-width="2"/>
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${this.height - padding}" stroke="${this.theme.text}" stroke-width="2"/>`;
  }
  
  private emptyChart(): string {
    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${this.width}" height="${this.height}" fill="${this.theme.background}"/>
  <text x="${this.width/2}" y="${this.height/2}" text-anchor="middle" fill="${this.theme.text}" font-size="14">No data available</text>
</svg>`;
  }
}

// Main chart rendering function
export async function renderChart(config: ChartData): Promise<string> {
  const { type, data, labels, title, width = 800, height = 400, format, theme = DEFAULT_THEME } = config;
  
  try {
    const renderer = new SVGChartRenderer(width, height, theme);
    
    switch (type) {
      case 'line':
        return renderer.renderLineChart(data as number[], title);
      case 'bar':
        return renderer.renderBarChart(data as number[], labels, title);
      case 'heatmap':
        return renderer.renderHeatmap(data as number[][], title);
      case 'pie':
        return renderer.renderPieChart(data as number[], labels, title);
      default:
        throw new Error(`Unsupported chart type: ${type}`);
    }
  } catch (error) {
    console.error('Chart rendering error:', error);
    throw error;
  }
}

// CLI Interface
if (import.meta.main) {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  async function runCommand() {
    try {
      switch (command) {
        case 'line': {
          const data = args[0]?.split(',').map(Number) || [98, 106, 95, 102, 108];
          const result = await renderChart({
            type: 'line',
            data,
            title: 'Performance Metrics',
            format: 'svg'
          });
          
          writeFileSync('chart.svg', result);
          console.log('✅ Line chart saved to chart.svg');
          break;
        }
        
        case 'bar': {
          const labelsIndex = args.indexOf('--labels');
          const dataIndex = args.indexOf('--data');
          
          const labels = labelsIndex !== -1 ? args[labelsIndex + 1]?.split(',') : undefined;
          const data = dataIndex !== -1 ? args[dataIndex + 1]?.split(',').map(Number) : [45, 78, 32, 89];
          
          const result = await renderChart({
            type: 'bar',
            data,
            labels,
            title: 'Resource Usage',
            format: 'svg'
          });
          
          writeFileSync('chart.svg', result);
          console.log('✅ Bar chart saved to chart.svg');
          break;
        }
        
        case 'heatmap': {
          const data = args[0]?.split(',').map(Number) || [0.8, 0.95, 0.7, 0.88];
          const gridData = [data.slice(0, 2), data.slice(2, 4)];
          
          const result = await renderChart({
            type: 'heatmap',
            data: gridData,
            title: 'GFM Score Heatmap',
            format: 'svg'
          });
          
          console.log(result);
          break;
        }
        
        case 'serve': {
          const port = parseInt(args[0]) || 8082;
          
          console.log(`📊 Chart server starting on port ${port}`);
          
          const server = (globalThis as any).Bun.serve({
            port,
            async fetch(req) {
              const url = new URL(req.url);
              
              if (url.pathname === '/chart') {
                const type = url.searchParams.get('type') || 'line';
                const dataParam = url.searchParams.get('data');
                const title = url.searchParams.get('title');
                
                let data: number[] = [50, 75, 100];
                if (dataParam) {
                  data = dataParam.split(',').map(Number);
                }
                
                try {
                  const result = await renderChart({
                    type: type as any,
                    data,
                    title: title || undefined,
                    format: 'svg'
                  });
                  
                  return new Response(result, {
                    headers: { 'Content-Type': 'image/svg+xml' }
                  });
                } catch (error) {
                  return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
              }
              
              // Demo page
              if (url.pathname === '/') {
                return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Chart Renderer</title>
  <style>
    body { font-family: system-ui; padding: 20px; background: #f8f9fa; }
    .chart-container { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .controls { margin: 10px 0; }
    input, select, button { margin: 5px; padding: 8px; }
    svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h1>📊 Chart Renderer</h1>
  
  <div class="chart-container">
    <h2>Line Chart</h2>
    <div class="controls">
      <input type="text" id="lineData" placeholder="Data (comma-separated)" value="98,106,95,102,108">
      <button onclick="updateLineChart()">Update</button>
    </div>
    <div id="lineChart"></div>
  </div>
  
  <div class="chart-container">
    <h2>Bar Chart</h2>
    <div class="controls">
      <input type="text" id="barData" placeholder="Data" value="45,78,32,89">
      <input type="text" id="barLabels" placeholder="Labels" value="CPU,Memory,Disk,Network">
      <button onclick="updateBarChart()">Update</button>
    </div>
    <div id="barChart"></div>
  </div>
  
  <div class="chart-container">
    <h2>Heatmap</h2>
    <div class="controls">
      <input type="text" id="heatmapData" placeholder="Data (4 values)" value="0.8,0.95,0.7,0.88">
      <button onclick="updateHeatmap()">Update</button>
    </div>
    <div id="heatmapContainer"></div>
  </div>
  
  <script>
    async function updateLineChart() {
      const data = document.getElementById('lineData').value;
      const response = await fetch('/chart?type=line&data=' + encodeURIComponent(data));
      const svg = await response.text();
      document.getElementById('lineChart').innerHTML = svg;
    }
    
    async function updateBarChart() {
      const data = document.getElementById('barData').value;
      const labels = document.getElementById('barLabels').value;
      const response = await fetch('/chart?type=bar&data=' + encodeURIComponent(data) + '&labels=' + encodeURIComponent(labels));
      const svg = await response.text();
      document.getElementById('barChart').innerHTML = svg;
    }
    
    async function updateHeatmap() {
      const data = document.getElementById('heatmapData').value;
      const response = await fetch('/chart?type=heatmap&data=' + encodeURIComponent(data));
      const svg = await response.text();
      document.getElementById('heatmapContainer').innerHTML = svg;
    }
    
    // Initialize charts
    updateLineChart();
    updateBarChart();
    updateHeatmap();
  </script>
</body>
</html>`, {
                  headers: { 'Content-Type': 'text/html' }
                });
              }
              
              return new Response('Chart API v1.0', {
                headers: { 'Content-Type': 'text/plain' }
              });
            }
          });
          
          console.log(`🚀 Chart server running on http://localhost:${port}`);
          console.log(`   GET /chart?type=line&data=1,2,3 - Generate chart`);
          console.log(`   GET / - Interactive demo`);
          
          // Keep server running
          await new Promise(() => {});
          break;
        }
        
        default:
          console.log('📊 Chart Renderer Commands:');
          console.log('  line [data] - Generate line chart');
          console.log('  bar --labels "x,y,z" --data "1,2,3" - Generate bar chart');
          console.log('  heatmap [data] - Generate heatmap (SVG)');
          console.log('  serve [port] - Start chart server');
          break;
      }
    } catch (error) {
      console.error('❌ Command failed:', error);
      process.exit(1);
    }
  }
  
  runCommand();
}

export { SVGChartRenderer, ColorUtils, DEFAULT_THEME };
