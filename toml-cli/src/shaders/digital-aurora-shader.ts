import * as THREE from 'three';
import { WebGLRendererConfig } from '@/core/webgl-renderer';

export class DigitalAuroraShader {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private config: WebGLRendererConfig;
  private startTime = performance.now();
  private mouse = new THREE.Vector2(0.5, 0.5);
  private scrollVelocity = 0;
  private resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
  private complexEffectsEnabled = true;
  
  constructor(config: WebGLRendererConfig) {
    this.config = config;
    this.material = this.createMaterial();
    this.mesh = this.createMesh();
  }
  
  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: this.mouse },
        uScrollVelocity: { value: 0 },
        uResolution: { value: this.resolution },
        uBreath: { value: 1.0 },
        uComplexEffects: { value: this.complexEffectsEnabled ? 1.0 : 0.0 }
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
  }
  
  private getVertexShader(): string {
    return `
      attribute vec3 position;
      attribute vec2 uv;
      
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
  }
  
  private getFragmentShader(): string {
    const precision = this.getPrecisionQualifier();
    
    return `
      ${precision}
      
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uScrollVelocity;
      uniform vec2 uResolution;
      uniform float uBreath;
      uniform float uComplexEffects;
      
      varying vec2 vUv;
      
      // Color palette
      const vec3 cyberCyan = vec3(0.0, 0.941, 1.0);
      const vec3 deepPurple = vec3(0.475, 0.157, 0.792);
      const vec3 neonMagenta = vec3(1.0, 0.0, 0.502);
      const vec3 voidBlack = vec3(0.0, 0.0, 0.0);
      
      // Noise functions
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
      }
      
      // Fractal Brownian Motion
      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(st * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        
        return value;
      }
      
      // Voronoi pattern for organic shapes
      vec2 voronoi(vec2 st) {
        vec2 n_st = st * 5.0;
        vec2 i_st = floor(n_st);
        vec2 f_st = fract(n_st);
        
        float minDist = 8.0;
        vec2 minPoint = vec2(0.0);
        
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = random(i_st + neighbor);
            
            // Animate points
            point = 0.5 + 0.5 * sin(uTime * 0.5 + 6.2831 * point);
            
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);
            
            if (dist < minDist) {
              minDist = dist;
              minPoint = point;
            }
          }
        }
        
        return vec2(minDist, minPoint.x + minPoint.y);
      }
      
      void main() {
        vec2 st = vUv;
        
        // Mouse influence with falloff
        vec2 mouseInfluence = (uMouse - 0.5) * 2.0;
        float mouseDist = distance(st, uMouse);
        float mouseEffect = smoothstep(0.7, 0.0, mouseDist) * 0.6;
        
        // Scroll velocity affects wave frequency
        float scrollEffect = uScrollVelocity * 0.001;
        
        // 20-second breathing cycle (0.314 = 2π/20)
        float breathEffect = sin(uTime * 0.314) * 0.2 + 0.8;
        
        // Base gradient from void black to deep purple
        vec3 baseColor = mix(voidBlack, deepPurple, st.y * 0.5 + 0.5);
        
        // Complex effects (can be disabled for performance)
        if (uComplexEffects > 0.5) {
          // Wave interference patterns
          float wave1 = sin(st.x * 8.0 + uTime * 0.5 + scrollEffect) * 
                       cos(st.y * 6.0 + uTime * 0.3);
          float wave2 = sin(st.x * 12.0 - uTime * 0.7 + mouseEffect) * 
                       cos(st.y * 10.0 - uTime * 0.4);
          float wave3 = fbm(st * 5.0 + uTime * 0.2) * 0.5;
          
          float combinedWaves = (wave1 + wave2 + wave3) / 2.5;
          
          // Voronoi patterns for organic feel
          vec2 voronoiPattern = voronoi(st + uTime * 0.1);
          
          // Color mixing based on wave patterns and mouse
          baseColor = mix(baseColor, cyberCyan, 
                         smoothstep(-1.0, 1.0, combinedWaves) * 0.3);
          baseColor = mix(baseColor, neonMagenta, 
                         smoothstep(0.0, 1.0, mouseEffect) * voronoiPattern.x);
          
          // Add noise for texture
          baseColor += noise(st * 10.0 + uTime * 0.1) * 0.05;
        }
        
        // Apply breathing effect
        baseColor *= breathEffect * uBreath;
        
        // Subtle vignette
        float vignette = 1.0 - distance(st, vec2(0.5)) * 0.3;
        baseColor *= vignette;
        
        // Ensure color values are valid
        baseColor = clamp(baseColor, 0.0, 1.0);
        
        gl_FragColor = vec4(baseColor, 1.0);
      }
    `;
  }
  
  private getPrecisionQualifier(): string {
    switch (this.config.precision) {
      case 'highp':
        return 'precision highp float;';
      case 'mediump':
        return 'precision mediump float;';
      case 'lowp':
        return 'precision lowp float;';
      default:
        return 'precision highp float;';
    }
  }
  
  private createMesh(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2, 2);
    return new THREE.Mesh(geometry, this.material);
  }
  
  public update(timestamp: number = 0): void {
    const elapsedTime = (timestamp - this.startTime) / 1000;
    
    this.material.uniforms.uTime.value = elapsedTime;
    this.material.uniforms.uMouse.value = this.mouse;
    this.material.uniforms.uScrollVelocity.value = this.scrollVelocity;
    this.material.uniforms.uBreath.value = this.getBreathValue(elapsedTime);
    
    // Dampen scroll velocity
    this.scrollVelocity *= 0.95;
  }
  
  private getBreathValue(time: number): number {
    // 20-second breathing cycle
    return Math.sin(time * 0.314) * 0.2 + 0.8;
  }
  
  public setMouse(x: number, y: number): void {
    this.mouse.set(x / window.innerWidth, 1 - (y / window.innerHeight));
  }
  
  public setScrollVelocity(velocity: number): void {
    this.scrollVelocity = velocity;
  }
  
  public setResolution(width: number, height: number): void {
    this.resolution.set(width, height);
    this.material.uniforms.uResolution.value = this.resolution;
  }
  
  public disableComplexEffects(): void {
    this.complexEffectsEnabled = false;
    this.material.uniforms.uComplexEffects.value = 0.0;
  }
  
  public enableComplexEffects(): void {
    this.complexEffectsEnabled = true;
    this.material.uniforms.uComplexEffects.value = 1.0;
  }
  
  public recompile(config: WebGLRendererConfig): void {
    this.config = config;
    
    // Create new material with updated precision
    const oldMaterial = this.material;
    this.material = this.createMaterial();
    
    // Replace material on mesh
    this.mesh.material = this.material;
    
    // Dispose old material
    oldMaterial.dispose();
  }
  
  public getMesh(): THREE.Mesh {
    return this.mesh;
  }
  
  public getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }
  
  public destroy(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}