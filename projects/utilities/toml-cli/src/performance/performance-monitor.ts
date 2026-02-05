export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  jankCount: number;
  gpuMemory: number;
  jsHeap: number;
  drawCalls: number;
  textureCount: number;
  geometryCount: number;
}

export interface PerformanceBudget {
  maxFrameTime: number;
  minFPS: number;
  maxJankPerSecond: number;
  maxGPUMemory: number;
  maxJSHeap: number;
  maxDrawCalls: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    jankCount: 0,
    gpuMemory: 0,
    jsHeap: 0,
    drawCalls: 0,
    textureCount: 0,
    geometryCount: 0
  };
  
  private budget: PerformanceBudget = {
    maxFrameTime: 16.67,
    minFPS: 60,
    maxJankPerSecond: 5,
    maxGPUMemory: 50 * 1024 * 1024, // 50MB
    maxJSHeap: 100 * 1024 * 1024, // 100MB
    maxDrawCalls: 100
  };
  
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private jankHistory: number[] = [];
  private qualityLevel: 'high' | 'medium' | 'low' = 'high';
  
  private constructor() {
    this.startMonitoring();
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  private startMonitoring(): void {
    // FPS monitoring
    const monitorFPS = () => {
      this.frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= this.lastFrameTime + 1000) {
        this.metrics.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
        this.frameCount = 0;
        this.lastFrameTime = currentTime;
        
        // Reset jank count every second
        this.jankHistory.push(this.metrics.jankCount);
        if (this.jankHistory.length > 10) {
          this.jankHistory.shift();
        }
        this.metrics.jankCount = 0;
        
        // Check performance budget
        this.checkBudget();
      }
      
      requestAnimationFrame(monitorFPS);
    };
    
    monitorFPS();
    
    // Memory monitoring
    this.startMemoryMonitoring();
    
    // WebGL monitoring
    this.startWebGLMonitoring();
  }
  
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      setInterval(() => {
        this.metrics.jsHeap = memory.usedJSHeapSize;
        
        if (this.metrics.jsHeap > this.budget.maxJSHeap) {
          this.triggerMemoryCleanup();
        }
      }, 5000);
    }
  }
  
  private startWebGLMonitoring(): void {
    // This would be connected to WebGLRenderer
    setInterval(() => {
      this.updateWebGLMetrics();
    }, 1000);
  }
  
  private updateWebGLMetrics(): void {
    // Get WebGL context info
    const renderer = window.__WEBGL_RENDERER__;
    if (renderer) {
      const info = renderer.info;
      this.metrics.drawCalls = info.render.calls;
      this.metrics.geometryCount = info.memory.geometries;
      this.metrics.textureCount = info.memory.textures;
      
      if (this.metrics.drawCalls > this.budget.maxDrawCalls) {
        this.triggerDrawCallOptimization();
      }
    }
  }
  
  private checkBudget(): void {
    const violations: string[] = [];
    
    if (this.metrics.fps < this.budget.minFPS) {
      violations.push(`FPS: ${this.metrics.fps} < ${this.budget.minFPS}`);
    }
    
    const avgJank = this.jankHistory.reduce((a, b) => a + b, 0) / this.jankHistory.length;
    if (avgJank > this.budget.maxJankPerSecond) {
      violations.push(`Jank: ${avgJank} > ${this.budget.maxJankPerSecond}`);
    }
    
    if (this.metrics.jsHeap > this.budget.maxJSHeap) {
      violations.push(`JS Heap: ${this.formatBytes(this.metrics.jsHeap)} > ${this.formatBytes(this.budget.maxJSHeap)}`);
    }
    
    if (violations.length > 0) {
      console.warn('Performance budget violations:', violations);
      this.reduceQuality();
      
      // Send to analytics
      this.reportViolation(violations);
    }
  }
  
  private reduceQuality(): void {
    if (this.qualityLevel === 'high') {
      this.qualityLevel = 'medium';
      this.applyMediumQuality();
    } else if (this.qualityLevel === 'medium') {
      this.qualityLevel = 'low';
      this.applyLowQuality();
    }
  }
  
  private applyMediumQuality(): void {
    // Reduce particle count
    ParticleSystem.getInstance().setMaxParticles(10);
    
    // Disable complex shaders
    const shader = window.__DIGITAL_AURORA_SHADER__;
    if (shader) {
      shader.disableComplexEffects();
    }
    
    // Reduce shadow quality
    ShadowManager.setQuality('medium');
    
    // Limit animation complexity
    AnimationEngine.getInstance().getActiveAnimationCount();
  }
  
  private applyLowQuality(): void {
    // Further reduce particles
    ParticleSystem.getInstance().setMaxParticles(5);
    
    // Disable WebGL if needed
    if (this.metrics.fps < 30) {
      WebGLRenderer.getInstance().destroy();
      AnimationEngine.getInstance().switchToCSSFallback();
    }
    
    // Disable all shadows
    ShadowManager.setQuality('low');
  }
  
  private triggerMemoryCleanup(): void {
    console.warn('Memory limit exceeded, triggering cleanup');
    
    // Clear unused textures
    TextureManager.cleanupUnused();
    
    // Force garbage collection
    if (window.gc) {
      window.gc();
    }
    
    // Clear animation cache
    AnimationEngine.getInstance().clearCache();
  }
  
  private triggerDrawCallOptimization(): void {
    console.warn('Draw call limit exceeded, optimizing');
    
    // Merge geometries
    GeometryManager.mergeStaticMeshes();
    
    // Use instancing where possible
    MeshManager.enableInstancing();
  }
  
  private reportViolation(violations: string[]): void {
    // Send to monitoring service
    fetch('https://monitoring.quantumnavigator.io/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        violations,
        metrics: this.metrics,
        budget: this.budget,
        timestamp: Date.now(),
        sessionId: GlobalStateManager.getInstance().getState().user.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent
      }),
      keepalive: true
    }).catch(() => {
      // Fail silently
    });
    
    // Track in analytics
    if (window.gtag) {
      window.gtag('event', 'performance_violation', {
        violation_count: violations.length,
        quality_level: this.qualityLevel
      });
    }
  }
  
  // Public methods
  public recordJank(): void {
    this.metrics.jankCount++;
  }
  
  public recordFPS(fps: number): void {
    this.metrics.fps = fps;
    this.metrics.frameTime = 1000 / fps;
  }
  
  public recordGPUMemory(bytes: number): void {
    this.metrics.gpuMemory = bytes;
  }
  
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  public getBudget(): PerformanceBudget {
    return { ...this.budget };
  }
  
  public getQualityLevel(): 'high' | 'medium' | 'low' {
    return this.qualityLevel;
  }
  
  public isPerformanceGood(): boolean {
    return this.metrics.fps >= this.budget.minFPS &&
           this.metrics.frameTime <= this.budget.maxFrameTime;
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Global performance marker
window.__PERFORMANCE_MONITOR__ = PerformanceMonitor.getInstance();