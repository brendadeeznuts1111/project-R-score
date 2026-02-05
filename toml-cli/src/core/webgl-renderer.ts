import * as THREE from 'three';
import { DigitalAuroraShader } from '@/shaders/digital-aurora-shader';
import { WireframeShader } from '@/shaders/wireframe-shader';
import { GlobalStateManager } from '@/state/global-state-manager';
import { PerformanceMonitor } from '@/performance/performance-monitor';
import { WebGLErrorHandler } from '@/error/webgl-error-handler';

export interface WebGLRendererConfig {
  antialias: boolean;
  alpha: boolean;
  powerPreference: 'high-performance' | 'low-power';
  precision: 'highp' | 'mediump' | 'lowp';
  maxTextureSize: number;
  maxAnisotropy: number;
}

export class WebGLRenderer {
  private static instance: WebGLRenderer;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private config: WebGLRendererConfig;
  private isContextLost = false;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  
  // Shader instances
  private digitalAuroraShader: DigitalAuroraShader | null = null;
  private wireframeShaders: WireframeShader[] = [];
  
  // Performance tracking
  private frameCount = 0;
  private lastFPSCheck = performance.now();
  private currentFPS = 60;
  
  private constructor() {
    this.config = this.getOptimalConfig();
    this.init();
  }
  
  static getInstance(): WebGLRenderer {
    if (!WebGLRenderer.instance) {
      WebGLRenderer.instance = new WebGLRenderer();
    }
    return WebGLRenderer.instance;
  }
  
  private getOptimalConfig(): WebGLRendererConfig {
    const deviceTier = GlobalStateManager.getInstance().deviceTier;
    const isReducedMotion = GlobalStateManager.getInstance().prefersReducedMotion;
    
    switch (deviceTier) {
      case 1: // High-end
        return {
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          precision: 'highp',
          maxTextureSize: 2048,
          maxAnisotropy: 16
        };
      case 2: // Mid-range
        return {
          antialias: false,
          alpha: true,
          powerPreference: 'high-performance',
          precision: 'mediump',
          maxTextureSize: 1024,
          maxAnisotropy: 4
        };
      case 3: // Low-end
      default:
        return {
          antialias: false,
          alpha: false,
          powerPreference: 'low-power',
          precision: 'lowp',
          maxTextureSize: 512,
          maxAnisotropy: 1
        };
    }
  }
  
  private async init(): Promise<void> {
    try {
      // Create canvas
      const canvas = this.createCanvas();
      
      // Initialize Three.js renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: this.config.antialias,
        alpha: this.config.alpha,
        powerPreference: this.config.powerPreference,
        precision: this.config.precision as any
      });
      
      // Configure renderer
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x000000, 0);
      
      // Create scene and camera
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.z = 5;
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize shaders
      await this.initShaders();
      
      // Start render loop
      this.startRenderLoop();
      
      // Setup resize observer
      this.setupResizeObserver();
      
      console.log('WebGLRenderer initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize WebGLRenderer:', error);
      WebGLErrorHandler.getInstance().handleInitializationError(error);
    }
  }
  
  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.id = 'webgl-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    
    document.body.appendChild(canvas);
    return canvas;
  }
  
  private setupEventListeners(): void {
    if (!this.renderer) return;
    
    const canvas = this.renderer.domElement;
    
    // Context loss handling
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.isContextLost = true;
      this.stopRenderLoop();
      WebGLErrorHandler.getInstance().handleContextLoss();
    });
    
    canvas.addEventListener('webglcontextrestored', () => {
      this.isContextLost = false;
      this.restoreContext();
      WebGLErrorHandler.getInstance().handleContextRestore();
    });
    
    // Mouse tracking for shader effects
    canvas.addEventListener('mousemove', (event) => {
      if (this.digitalAuroraShader) {
        this.digitalAuroraShader.setMouse(event.clientX, event.clientY);
      }
    });
    
    // Scroll velocity tracking
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      const velocity = window.scrollY - lastScrollY;
      if (this.digitalAuroraShader) {
        this.digitalAuroraShader.setScrollVelocity(velocity);
      }
      lastScrollY = window.scrollY;
    });
  }
  
  private async initShaders(): Promise<void> {
    try {
      // Initialize digital aurora shader
      this.digitalAuroraShader = new DigitalAuroraShader(this.config);
      const auroraMesh = this.digitalAuroraShader.createMesh();
      this.scene?.add(auroraMesh);
      
      // Initialize wireframe shaders for icosahedrons
      for (let i = 0; i < 5; i++) {
        const wireframeShader = new WireframeShader(this.config);
        const mesh = wireframeShader.createMesh();
        
        // Position in orbital pattern
        const angle = (i / 5) * Math.PI * 2;
        mesh.position.x = Math.cos(angle) * 3;
        mesh.position.y = Math.sin(angle) * 3;
        mesh.position.z = (Math.random() - 0.5) * 2;
        
        this.scene?.add(mesh);
        this.wireframeShaders.push(wireframeShader);
      }
      
    } catch (error) {
      console.error('Failed to initialize shaders:', error);
      throw error;
    }
  }
  
  private startRenderLoop(): void {
    const render = (timestamp: number) => {
      if (this.isContextLost) return;
      
      this.animationFrameId = requestAnimationFrame(render);
      
      // Update FPS counter
      this.updateFPS();
      
      // Update shaders
      this.digitalAuroraShader?.update(timestamp);
      this.wireframeShaders.forEach(shader => shader.update(timestamp));
      
      // Rotate icosahedrons
      this.wireframeShaders.forEach((shader, index) => {
        const mesh = shader.getMesh();
        mesh.rotation.x += 0.001 * (index + 1);
        mesh.rotation.y += 0.002 * (index + 1);
      });
      
      // Render scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    
    render(0);
  }
  
  private stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  private updateFPS(): void {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= this.lastFPSCheck + 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSCheck));
      this.frameCount = 0;
      this.lastFPSCheck = currentTime;
      
      // Update performance monitor
      PerformanceMonitor.getInstance().recordFPS(this.currentFPS);
      
      // Adjust quality based on FPS
      this.adjustQualityBasedOnFPS();
    }
  }
  
  private adjustQualityBasedOnFPS(): void {
    if (this.currentFPS < 30) {
      // Reduce quality
      this.reduceQuality();
    } else if (this.currentFPS > 55 && this.config.precision !== 'highp') {
      // Can potentially increase quality
      this.increaseQuality();
    }
  }
  
  private reduceQuality(): void {
    console.warn(`Low FPS detected (${this.currentFPS}), reducing quality`);
    
    // Reduce shader precision
    if (this.config.precision === 'highp') {
      this.config.precision = 'mediump';
      this.recompileShaders();
    } else if (this.config.precision === 'mediump') {
      this.config.precision = 'lowp';
      this.recompileShaders();
    }
    
    // Reduce particle count
    ParticleSystem.getInstance().reduceCount(0.5);
    
    // Disable complex effects
    this.digitalAuroraShader?.disableComplexEffects();
  }
  
  private increaseQuality(): void {
    console.log(`High FPS detected (${this.currentFPS}), can increase quality`);
    
    // This would be called when performance is good
    // Implementation would gradually increase quality
  }
  
  private recompileShaders(): void {
    // Recompile shaders with new precision
    this.digitalAuroraShader?.recompile(this.config);
    this.wireframeShaders.forEach(shader => shader.recompile(this.config));
  }
  
  private setupResizeObserver(): void {
    if (!this.renderer) return;
    
    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        const { width, height } = entry.contentRect;
        
        // Update renderer size
        this.renderer?.setSize(width, height);
        
        // Update camera aspect ratio
        if (this.camera) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
        }
        
        // Update shader uniforms
        this.digitalAuroraShader?.setResolution(width, height);
      });
    });
    
    this.resizeObserver.observe(document.body);
  }
  
  private restoreContext(): void {
    console.log('Restoring WebGL context');
    
    // Reinitialize shaders
    this.recompileShaders();
    
    // Restart render loop
    this.startRenderLoop();
  }
  
  public getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }
  
  public getScene(): THREE.Scene | null {
    return this.scene;
  }
  
  public getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }
  
  public getDigitalAuroraShader(): DigitalAuroraShader | null {
    return this.digitalAuroraShader;
  }
  
  public getFPS(): number {
    return this.currentFPS;
  }
  
  public isContextLost(): boolean {
    return this.isContextLost;
  }
  
  public destroy(): void {
    this.stopRenderLoop();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.wireframeShaders.forEach(shader => shader.destroy());
    this.wireframeShaders = [];
    
    this.digitalAuroraShader?.destroy();
    this.digitalAuroraShader = null;
    
    this.renderer?.dispose();
    this.renderer = null;
    
    this.scene?.clear();
    this.scene = null;
    
    this.camera = null;
  }
}

// Singleton instance export
export const webGLRenderer = WebGLRenderer.getInstance();