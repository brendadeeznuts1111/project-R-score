import * as THREE from 'three';
import { gsap } from 'gsap';
import { NetworkNode, TensionIntegrationProps, FuelType, FuelPayload, tensionToHSL } from './types';

export class TensionIntegration {
  private scene: THREE.Scene;
  private points: THREE.Points;
  private connections: THREE.LineSegments;
  private nodes: NetworkNode[];
  private nodeMeshes: THREE.Mesh[];
  private uniforms: {
    uTime: { value: number };
    uVolume: { value: number };
  };
  private setSystemTension: (tension: number) => void;
  public wsConnection: WebSocket | null = null;
  public isConnected: boolean = false;
  private componentMapping: Map<string, any> = new Map();
  private currentSystemTension: number = 0.1; // Store current tension value

  constructor(props: TensionIntegrationProps) {
    this.scene = props.scene;
    this.points = props.points;
    this.connections = props.connections;
    this.nodes = props.nodes;
    this.nodeMeshes = props.nodeMeshes;
    this.uniforms = props.uniforms;
    this.setSystemTension = props.setSystemTension;
    
    this.init();
  }

  private async init() {
    try {
      await this.connectToTensionEngine();
      this.setupComponentMapping();
      this.setupEventListeners();
      this.startTensionSync();
      
      console.log('🔗 Tension Engine Integration Active');
    } catch (error) {
      console.warn('⚠️ Tension Engine unavailable, using fallback mode');
      this.startFallbackMode();
    }
  }

  private async connectToTensionEngine(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = 'ws://localhost:3003';
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('🔌 Connected to Tension Engine');
        this.isConnected = true;
        resolve();
      };
      
      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleTensionUpdate(data);
      };
      
      this.wsConnection.onerror = (error) => {
        console.warn('WebSocket connection failed:', error);
        reject(error);
      };
      
      this.wsConnection.onclose = () => {
        console.log('🔌 Tension Engine connection closed');
        this.isConnected = false;
        setTimeout(() => this.connectToTensionEngine(), 5000);
      };
      
      setTimeout(() => reject(new Error('Connection timeout')), 3000);
    });
  }

  private setupComponentMapping() {
    this.componentMapping.set('WR-001', {
      type: 'scene',
      element: this.scene,
      updateMethod: 'updateSceneTension'
    });
    
    this.componentMapping.set('WR-002', {
      type: 'particles',
      element: this.points,
      updateMethod: 'updateParticleTension'
    });
    
    this.componentMapping.set('NV-001', {
      type: 'nodes',
      element: this.nodes,
      updateMethod: 'updateNodeTension'
    });
    
    this.componentMapping.set('NV-002', {
      type: 'connections',
      element: this.connections,
      updateMethod: 'updateConnectionTension'
    });
    
    this.componentMapping.set('UI-001', {
      type: 'ui-cards',
      element: document.querySelectorAll('[data-token="UI_CARD"]'),
      updateMethod: 'updateUITension'
    });
    
    this.componentMapping.set('DP-001', {
      type: 'data-stream',
      element: this.uniforms,
      updateMethod: 'updateDataTension'
    });
    
    this.componentMapping.set('WR-003', {
      type: 'shaders',
      element: this.uniforms,
      updateMethod: 'updateShaderTension'
    });
    
    this.componentMapping.set('UI-002', {
      type: 'raycaster',
      element: null,
      updateMethod: 'updateRaycasterTension'
    });
  }

  private setupEventListeners() {
    // Listen for user interactions and inject fuel
    document.addEventListener('mousemove', (e) => {
      if (this.isConnected) {
        this.injectFuel('PROCESS_OUTPUT', {
          x: e.clientX,
          y: e.clientY,
          type: 'mouse_move'
        });
      }
    });

    window.addEventListener('scroll', () => {
      if (this.isConnected) {
        this.injectFuel('HIGH_RES_TIME', {
          scrollY: window.scrollY,
          type: 'scroll_event'
        });
      }
    });

    document.querySelectorAll('[data-token="UI_CARD"]').forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (this.isConnected) {
          this.injectFuel('HTTP_TRAFFIC', {
            action: 'ui_hover',
            element: card.tagName
          });
        }
      });
    });
  }

  private handleTensionUpdate(data: any) {
    switch (data.type) {
      case 'visual_update':
        this.updateComponentVisual(data.componentId, data.tension, data.hsl);
        break;
      case 'tension_update':
        this.handleFuelInjection(data.fuelType, data.value);
        break;
      case 'initial_state':
        data.matrix.forEach((comp: any) => {
          this.updateComponentVisual(comp.id, comp.tension, comp.hsl);
        });
        break;
    }
  }

  private updateComponentVisual(componentId: string, tension: number, hsl: string) {
    const mapping = this.componentMapping.get(componentId);
    if (!mapping) return;

    switch (mapping.updateMethod) {
      case 'updateSceneTension':
        this.updateSceneTension(tension, hsl);
        break;
      case 'updateParticleTension':
        this.updateParticleTension(tension, hsl);
        break;
      case 'updateNodeTension':
        this.updateNodeTension(tension, hsl);
        break;
      case 'updateConnectionTension':
        this.updateConnectionTension(tension, hsl);
        break;
      case 'updateUITension':
        this.updateUITension(tension, hsl);
        break;
      case 'updateDataTension':
        this.updateDataTension(tension, hsl);
        break;
      case 'updateShaderTension':
        this.updateShaderTension(tension, hsl);
        break;
      case 'updateRaycasterTension':
        this.updateRaycasterTension(tension, hsl);
        break;
    }
  }

  private updateSceneTension(_tension: number, hsl: string) {
    if (this.scene.background) {
      const color = new THREE.Color();
      color.setHSL(
        parseFloat(hsl.split(',')[0]) / 360,
        parseFloat(hsl.split(',')[1]) / 100,
        Math.max(0.05, parseFloat(hsl.split(',')[2]) / 100 * 0.2)
      );
      this.scene.background = color;
    }
  }

  private updateParticleTension(_tension: number, hsl: string) {
    if (this.points && this.points.geometry.attributes.color) {
      const color = new THREE.Color();
      color.setHSL(
        parseFloat(hsl.split(',')[0]) / 360,
        parseFloat(hsl.split(',')[1]) / 100,
        parseFloat(hsl.split(',')[2]) / 100
      );
      
      const colorAttr = this.points.geometry.attributes.color;
      for (let i = 0; i < colorAttr.count; i++) {
        colorAttr.setXYZ(i, color.r, color.g, color.b);
      }
      colorAttr.needsUpdate = true;
    }
  }

  private updateNodeTension(tension: number, _hsl: string) {
    this.nodes.forEach(node => {
      node.updateTension(tension);
    });
    
    this.nodeMeshes.forEach(mesh => {
      if (mesh.userData.nodeRef) {
        (mesh.material as THREE.MeshBasicMaterial).color.copy((mesh.userData.nodeRef as NetworkNode).color);
      }
    });
  }

  private updateConnectionTension(tension: number, hsl: string) {
    if (this.connections && (this.connections.material as THREE.LineBasicMaterial)) {
      const color = new THREE.Color();
      color.setHSL(
        parseFloat(hsl.split(',')[0]) / 360,
        parseFloat(hsl.split(',')[1]) / 100,
        parseFloat(hsl.split(',')[2]) / 100
      );
      
      (this.connections.material as THREE.LineBasicMaterial).color = color;
      (this.connections.material as THREE.LineBasicMaterial).opacity = 0.2 + (tension * 0.6);
    }
  }

  private updateUITension(_tension: number, hsl: string) {
    document.querySelectorAll('[data-token="UI_CARD"], [data-token="MATRIX_BUTTON"]').forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.borderColor = hsl;
      htmlEl.style.boxShadow = `0 8px 32px 0 hsla(${hsl}, 0.3)`;
      
      const title = htmlEl.querySelector('h3, h1, h2');
      if (title) {
        (title as HTMLElement).style.borderColor = hsl;
      }
    });
  }

  private updateDataTension(tension: number, _hsl: string) {
    this.uniforms.uVolume.value = tension;
    this.currentSystemTension = tension; // Store current tension
    this.setSystemTension(tension);
  }

  private updateShaderTension(_tension: number, _hsl: string) {
    // Update shader time based on tension
    // This would be updated in the animation loop
  }

  private updateRaycasterTension(_tension: number, _hsl: string) {
    // Update raycaster sensitivity based on tension
    // Implementation would depend on raycaster setup
  }

  public injectFuel(fuelType: FuelType, payload: FuelPayload) {
    if (this.isConnected && this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        action: 'inject_fuel',
        fuelType,
        payload
      }));
    }
  }

  public injectFuelDirect(fuelType: FuelType, _payload: FuelPayload) {
    // Fallback fuel injection with visual effects
    const fuelEffects: Record<FuelType, () => void> = {
      'FPS_STREAM': () => {
        this.uniforms.uVolume.value = Math.min(1, this.uniforms.uVolume.value + 0.2);
        if (this.points) {
          // Animate particle rotation
          const currentRotation = this.points.rotation.x;
          gsap.to(this.points.rotation, {
            x: currentRotation + Math.PI / 4,
            duration: 1,
            ease: "power2.out"
          });
        }
      },
      'DATA_HASH': () => {
        if (this.connections) {
          gsap.to((this.connections.material as THREE.LineBasicMaterial), {
            opacity: 0.8,
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
        }
      },
      'DATABASE': () => {
        this.nodes.forEach(node => {
          node.updateTension(Math.min(1, node.tension + 0.3));
        });
        this.updateSystemColors();
      },
      'LIVE_QUERY': () => {
        if (this.nodeMeshes.length > 0) {
          const randomMesh = this.nodeMeshes[Math.floor(Math.random() * this.nodeMeshes.length)];
          gsap.to(randomMesh.scale, {
            x: 1.5, y: 1.5, z: 1.5,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
        }
      },
      'HTTP_TRAFFIC': () => {
        document.querySelectorAll('.glass-card').forEach(card => {
          gsap.to(card, {
            borderColor: '#22c55e',
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
        });
      },
      'FS_EVENTS': () => {
        const newTension = Math.min(1, this.currentSystemTension + 0.2);
        this.currentSystemTension = newTension; // Store current tension
        this.setSystemTension(newTension);
        this.uniforms.uVolume.value = newTension;
      },
      'HIGH_RES_TIME': () => {
        const timeMultiplier = 1.5;
        if (this.points) {
          gsap.to(this.points.rotation, {
            y: this.points.rotation.y + Math.PI * timeMultiplier,
            duration: 2,
            ease: "power2.out"
          });
        }
      },
      'PROCESS_OUTPUT': () => {
        // Create visual pulse effect
        const pulseGeometry = new THREE.SphereGeometry(20, 16, 16);
        const pulseMaterial = new THREE.MeshBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.3
        });
        const pulseMesh = new THREE.Mesh(pulseGeometry, pulseMaterial);
        this.scene.add(pulseMesh);
        
        gsap.to(pulseMaterial, {
          opacity: 0,
          duration: 1,
          ease: "power2.out",
          onComplete: () => {
            this.scene.remove(pulseMesh);
          }
        });
      }
    };

    const effect = fuelEffects[fuelType];
    if (effect) {
      effect();
      console.log(`⚡ Direct fuel injection: ${fuelType}`);
    }
  }

  private handleFuelInjection(fuelType: string, value: number) {
    // React to fuel injections with visual feedback
    switch (fuelType) {
      case 'FPS_STREAM':
        if (this.points) {
          const speedMultiplier = 0.5 + (value * 2);
          this.points.rotation.x *= speedMultiplier;
        }
        break;
        
      case 'DATA_HASH':
        if (this.connections) {
          gsap.to((this.connections.material as THREE.LineBasicMaterial), {
            opacity: 0.8,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
          });
        }
        break;
        
      case 'HTTP_TRAFFIC':
        this.updateUITension(value, `180,100%,${50 + value * 30}%`);
        break;
    }
  }

  private startTensionSync() {
    if (this.isConnected && this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        action: 'start_engine'
      }));
      
      setTimeout(() => {
        this.injectFuel('HIGH_RES_TIME', { timestamp: Date.now() });
        this.injectFuel('FPS_STREAM', { fps: 60 });
      }, 1000);
    }
  }

  private startFallbackMode() {
    console.log('🔄 Starting fallback tension simulation');
    
    setInterval(() => {
      const mockTension = 0.1 + Math.random() * 0.8;
      const mockHSL = `180,100%,${50 + mockTension * 30}%`;
      
      this.updateParticleTension(mockTension, mockHSL);
      this.updateConnectionTension(mockTension, mockHSL);
      this.updateUITension(mockTension, mockHSL);
      
      this.currentSystemTension = mockTension; // Store current tension
      this.setSystemTension(mockTension);
      this.updateSystemColors();
    }, 2000);
  }

  private updateSystemColors() {
    const visualTension = Math.min(1, this.currentSystemTension * 1.125);
    const visualHSL = tensionToHSL(visualTension, 1.0);
    const visualHSLA = tensionToHSL(visualTension, 0.2);
    
    // Update DOM elements with UI_CARD token for HSL reactivity
    document.querySelectorAll('[data-token="UI_CARD"], [data-token="MATRIX_BUTTON"]').forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.borderColor = visualHSL;
      htmlEl.style.boxShadow = `0 8px 32px 0 ${visualHSLA}`;
      
      const title = htmlEl.querySelector('h3, h1, h2');
      if (title) {
        (title as HTMLElement).style.borderColor = tensionToHSL(visualTension, 0.5);
      }
    });

    // Update Node colors
    this.nodeMeshes.forEach(mesh => {
      if (mesh.userData.nodeRef) {
        (mesh.material as THREE.MeshBasicMaterial).color.copy((mesh.userData.nodeRef as NetworkNode).color);
      }
    });

    // Update Connection colors
    if (this.connections && this.connections.geometry.attributes.color) {
      const colorAttr = this.connections.geometry.attributes.color;
      const connColor = new THREE.Color(visualHSL);
      for (let i = 0; i < colorAttr.count; i++) {
        colorAttr.setXYZ(i, connColor.r, connColor.g, connColor.b);
      }
      colorAttr.needsUpdate = true;
    }

    // Feedback Damping for Particle Lattice
    if (this.points && this.points.geometry.attributes.color) {
      const backgroundTension = visualTension * 0.55;
      const color = new THREE.Color(tensionToHSL(backgroundTension, 1.0));
      const colorAttr = this.points.geometry.attributes.color;
      for (let i = 0; i < colorAttr.count; i++) {
        colorAttr.setXYZ(i, color.r, color.g, color.b);
      }
      colorAttr.needsUpdate = true;
    }
  }
}

export default TensionIntegration;
