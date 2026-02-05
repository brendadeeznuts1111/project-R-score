import * as THREE from 'three';
import { WebGLRendererConfig } from '@/core/webgl-renderer';

export class WireframeShader {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private config: WebGLRendererConfig;
  private startTime = performance.now();
  
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
        uColor: { value: new THREE.Color(0x00f0ff) },
        uOpacity: { value: 0.7 }
      },
      wireframe: true,
      transparent: true
    });
  }
  
  private getVertexShader(): string {
    const precision = this.getPrecisionQualifier();
    
    return `
      ${precision}
      
      attribute vec3 position;
      attribute vec3 center;
      
      varying vec3 vPosition;
      varying vec3 vCenter;
      
      void main() {
        vPosition = position;
        vCenter = center;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }
  
  private getFragmentShader(): string {
    const precision = this.getPrecisionQualifier();
    
    return `
      ${precision}
      
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      
      varying vec3 vPosition;
      varying vec3 vCenter;
      
      float edgeFactorTri() {
        vec3 d = fwidth(vPosition);
        vec3 a3 = smoothstep(vec3(0.0), d * 1.5, vPosition);
        return min(min(a3.x, a3.y), a3.z);
      }
      
      void main() {
        float edge = edgeFactorTri();
        
        // Pulsing glow effect
        float pulse = sin(uTime * 2.0) * 0.3 + 0.7;
        
        vec3 finalColor = uColor * pulse;
        float finalOpacity = uOpacity * edge;
        
        gl_FragColor = vec4(finalColor, finalOpacity);
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
    const geometry = new THREE.IcosahedronGeometry(0.5, 1);
    return new THREE.Mesh(geometry, this.material);
  }
  
  public update(timestamp: number = 0): void {
    const elapsedTime = (timestamp - this.startTime) / 1000;
    this.material.uniforms.uTime.value = elapsedTime;
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