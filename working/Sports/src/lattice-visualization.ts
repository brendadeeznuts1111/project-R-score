/**
 * Lattice Visualization Components for Sports Betting Dashboard
 * Canvas/WebGL rendering with color-mapped fractal nodes
 */

import { fdToColor, getRGBAArray, calculateIntensity, generateFDGradient } from "./color-mapping";

export interface VisualNode {
  x: number;
  y: number;
  glyph: string;
  color: string;
  rgba: [number, number, number, number];
  fd: number;
  intensity: number;
  size: number;
  connections: number[];
}

export interface LatticeConfig {
  width: number;
  height: number;
  nodeCount: number;
  connectionRadius: number;
  animationSpeed: number;
}

/**
 * Generate fractal lattice structure with self-similar patterns
 */
export function generateFractalLattice(
  config: LatticeConfig,
  fdValues: number[]
): VisualNode[] {
  const nodes: VisualNode[] = [];
  const { width, height, nodeCount, connectionRadius } = config;
  
  // Generate nodes based on FD values
  for (let i = 0; i < Math.min(nodeCount, fdValues.length); i++) {
    const fd = fdValues[i];
    
    // Position nodes in fractal pattern (Hilbert curve approximation)
    const pos = getFractalPosition(i, nodeCount, width, height);
    
    // Determine visual properties based on FD
    const color = fdToColor(fd);
    const rgba = getRGBAArray(color);
    const intensity = calculateIntensity(fd);
    const size = 8 + (intensity * 12); // Size scales with intensity
    
    // Find connections (nearby nodes within radius)
    const connections: number[] = [];
    
    nodes.push({
      x: pos.x,
      y: pos.y,
      glyph: getGlyphForFD(fd),
      color,
      rgba,
      fd,
      intensity,
      size,
      connections
    });
  }
  
  // Build connections after all nodes are created
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist < connectionRadius) {
        nodes[i].connections.push(j);
        nodes[j].connections.push(i);
      }
    }
  }
  
  return nodes;
}

/**
 * Calculate fractal position using space-filling curve
 */
function getFractalPosition(index: number, total: number, width: number, height: number) {
  // Hilbert curve approximation for fractal positioning
  const order = Math.ceil(Math.log2(Math.sqrt(total)));
  const size = Math.pow(2, order);
  
  // Convert index to 2D coordinates on Hilbert curve
  const coords = hilbertCurve(index, order);
  
  // Scale to canvas dimensions with padding
  const scale = Math.min(width, height) / (size + 2);
  const padding = scale;
  
  return {
    x: padding + coords.x * scale,
    y: padding + coords.y * scale
  };
}

/**
 * Hilbert curve coordinate calculation
 */
function hilbertCurve(n: number, order: number): { x: number; y: number } {
  let x = 0;
  let y = 0;
  
  for (let s = 1; s < (1 << order); s *= 2) {
    const rx = 1 & (n / 2);
    const ry = 1 & (n ^ rx);
    
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const temp = x;
      x = y;
      y = temp;
    }
    
    x += s * rx;
    y += s * ry;
    n /= 4;
  }
  
  return { x, y };
}

/**
 * Get glyph symbol based on FD regime
 */
export function getGlyphForFD(fd: number): string {
  if (fd > 2.7) return "⚠️⬛"; // Black swan
  if (fd > 2.3) return "🔥▲"; // High chaos
  if (fd > 1.9) return "⚡▵"; // High volatility
  if (fd > 1.5) return "📈⟳"; // Persistent
  if (fd > 1.2) return "📊▵"; // Brownian
  if (fd < 0.5) return "🔒⊟"; // Ultra-stable
  return "▵⟂ экон"; // Default
}

/**
 * Canvas renderer for lattice visualization
 */
export class LatticeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: VisualNode[] = [];
  private animationFrame: number | null = null;
  private config: LatticeConfig;

  constructor(canvas: HTMLCanvasElement, config: LatticeConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.config = config;
    
    // Set canvas size
    this.canvas.width = config.width;
    this.canvas.height = config.height;
  }

  /**
   * Render current lattice state
   */
  render(nodes: VisualNode[]) {
    this.nodes = nodes;
    const ctx = this.ctx;
    const { width, height } = this.config;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // Draw connections first (background layer)
    this.drawConnections();

    // Draw nodes
    this.drawNodes();

    // Draw FD legend
    this.drawLegend();
  }

  /**
   * Draw connections between nodes
   */
  private drawConnections() {
    const ctx = this.ctx;
    
    this.nodes.forEach(node => {
      node.connections.forEach(targetIdx => {
        const target = this.nodes[targetIdx];
        if (!target) return;

        // Calculate connection opacity based on FD intensity
        const avgIntensity = (node.intensity + target.intensity) / 2;
        const opacity = Math.min(avgIntensity * 0.6, 0.8);

        // Color based on combined FD
        const avgFD = (node.fd + target.fd) / 2;
        const connectionColor = fdToColor(avgFD);
        const [r, g, b] = getRGBAArray(connectionColor);

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = 1 + (avgIntensity * 2);
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      });
    });
  }

  /**
   * Draw nodes with glyphs and colors
   */
  private drawNodes() {
    const ctx = this.ctx;

    this.nodes.forEach(node => {
      const [r, g, b, a] = node.rgba;
      const alpha = a / 255;

      // Outer glow for high-intensity nodes
      if (node.intensity > 0.8) {
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.size * 2
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main node circle
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
      ctx.fill();

      // Border for high FD nodes
      if (node.fd > 2.0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw glyph
      ctx.fillStyle = "#ffffff";
      ctx.font = `${Math.max(8, node.size)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.glyph, node.x, node.y);

      // Draw FD value for chaotic nodes
      if (node.fd > 2.0) {
        ctx.font = "10px monospace";
        ctx.fillText(node.fd.toFixed(2), node.x, node.y + node.size + 8);
      }
    });
  }

  /**
   * Draw FD intensity legend
   */
  private drawLegend() {
    const ctx = this.ctx;
    const legendX = 10;
    const legendY = this.config.height - 120;
    const barWidth = 200;
    const barHeight = 15;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(legendX - 5, legendY - 5, barWidth + 10, 120);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText("Fractal Dimension Scale", legendX, legendY);

    // Gradient bar
    const gradient = ctx.createLinearGradient(legendX, legendY + 10, legendX + barWidth, legendY + 10);
    const colors = generateFDGradient(0.3, 2.8, 10);
    colors.forEach((color, i) => {
      const stop = i / (colors.length - 1);
      gradient.addColorStop(stop, color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY + 10, barWidth, barHeight);

    // Labels
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px monospace";
    ctx.fillText("0.3", legendX, legendY + 35);
    ctx.fillText("1.5", legendX + barWidth * 0.4, legendY + 35);
    ctx.fillText("2.3", legendX + barWidth * 0.7, legendY + 35);
    ctx.fillText("2.8", legendX + barWidth, legendY + 35);

    // Regime descriptions
    const regimes = [
      { y: legendY + 50, text: "🟢 Stable (FD < 1.2): Arbitrage", color: "#00ff00" },
      { y: legendY + 65, text: "🟡 Volatile (FD 1.5-2.3): Trends", color: "#ffff00" },
      { y: legendY + 80, text: "🔴 Chaotic (FD > 2.3): Black Swan", color: "#ff0000" }
    ];

    regimes.forEach(regime => {
      ctx.fillStyle = regime.color;
      ctx.fillRect(legendX, regime.y - 8, 8, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(regime.text, legendX + 12, regime.y);
    });
  }

  /**
   * Animate lattice with pulsing effects
   */
  animate(nodes: VisualNode[]) {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const animate = () => {
      // Add subtle pulsing to high-intensity nodes
      const time = Date.now() * 0.001;
      const animatedNodes = nodes.map(node => {
        if (node.intensity > 0.7) {
          const pulse = Math.sin(time * 2 + node.x * 0.01) * 0.2 + 1;
          return {
            ...node,
            size: node.size * pulse
          };
        }
        return node;
      });

      this.render(animatedNodes);
      this.animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Stop animation
   */
  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.config.width = width;
    this.config.height = height;
  }
}

/**
 * WebGL renderer for high-performance rendering (optional enhancement)
 */
export class WebGLLatticeRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null;
  private config: LatticeConfig;

  constructor(canvas: HTMLCanvasElement, config: LatticeConfig) {
    this.canvas = canvas;
    this.config = config;
    this.gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    
    if (this.gl) {
      this.canvas.width = config.width;
      this.canvas.height = config.height;
      this.initWebGL();
    }
  }

  private initWebGL() {
    if (!this.gl) return;
    
    // Basic WebGL setup would go here
    // For brevity, this is a placeholder for advanced rendering
    console.log("WebGL renderer initialized for high-performance lattice visualization");
  }

  /**
   * Render nodes using WebGL (placeholder for advanced implementation)
   */
  render(nodes: VisualNode[]) {
    if (!this.gl) {
      // Fallback to Canvas
      console.warn("WebGL not available, use Canvas renderer");
      return;
    }

    // WebGL rendering implementation would go here
    // This would involve:
    // 1. Creating vertex buffers for node positions
    // 2. Creating fragment shaders for color mapping
    // 3. Using instanced rendering for performance
    // 4. Implementing particle effects for high-intensity nodes
    
    console.log(`WebGL: Rendering ${nodes.length} nodes`);
  }
}

/**
 * Export visualization data for external use
 */
export function exportVisualizationData(nodes: VisualNode[]) {
  return {
    timestamp: Date.now(),
    nodes: nodes.map(n => ({
      x: n.x,
      y: n.y,
      color: n.color,
      fd: n.fd,
      intensity: n.intensity,
      glyph: n.glyph
    })),
    summary: {
      totalNodes: nodes.length,
      avgFD: nodes.reduce((sum, n) => sum + n.fd, 0) / nodes.length,
      chaoticNodes: nodes.filter(n => n.fd > 2.0).length,
      highIntensity: nodes.filter(n => n.intensity > 0.8).length
    }
  };
}
