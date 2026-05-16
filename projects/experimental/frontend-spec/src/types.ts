import * as THREE from 'three';

// Network Node class
export class NetworkNode {
  id: string;
  position: THREE.Vector3;
  active: boolean;
  tension: number;
  color: THREE.Color;

  constructor(id: string, position: THREE.Vector3) {
    this.id = id;
    this.position = position;
    this.active = false;
    this.tension = 0.0;
    this.color = new THREE.Color();
  }

  updateTension(val: number) {
    this.tension = Math.max(0, Math.min(1, val));
    this.color.set(tensionToHSL(this.tension, 1.0));
  }
}

// Component interface
export interface Component {
  id: string;
  type: string;
  domain: string;
  scope: string;
  function: string;
  tension: number;
  ref: string;
  fuelType?: string;
  currentHSL?: string;
}

// Tension integration interface
export interface TensionIntegrationProps {
  scene: THREE.Scene;
  points: THREE.Points;
  connections: THREE.LineSegments;
  nodes: NetworkNode[];
  nodeMeshes: THREE.Mesh[];
  uniforms: {
    uTime: { value: number };
    uVolume: { value: number };
  };
  setSystemTension: (tension: number) => void;
}

// Fuel types
export type FuelType = 
  | 'FPS_STREAM'
  | 'DATA_HASH'
  | 'DATABASE'
  | 'LIVE_QUERY'
  | 'HTTP_TRAFFIC'
  | 'FS_EVENTS'
  | 'HIGH_RES_TIME'
  | 'PROCESS_OUTPUT';

// Fuel payload interface
export interface FuelPayload {
  source?: string;
  key?: string;
  timestamp?: number;
  [key: string]: any;
}

// Tension engine interface
export interface TensionEngine {
  start(): void;
  stop(): void;
  injectFuel(fuelType: FuelType, payload: FuelPayload): void;
  getTensionMatrix(): Component[];
  getPerformanceMetrics(): PerformanceMetrics;
}

// Performance metrics interface
export interface PerformanceMetrics {
  proxyRequests: number;
  connectionReused: number;
  averageLatency: number;
  connectionPoolSize: number;
  proxyEnabled: boolean;
  features: {
    proxySupport: boolean;
    connectionPooling: boolean;
    performanceLogging: boolean;
    webglAcceleration: boolean;
  };
}

// WebSocket message interface
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Utility function for HSL color conversion
export function tensionToHSL(tension: number, alpha: number = 1.0): string {
  // Map tension (0-1) to hue (240-0, blue to red)
  const hue = 240 - (tension * 240);
  const saturation = 70 + (tension * 30); // 70-100%
  const lightness = 50 - (tension * 20); // 50-30%
  
  if (alpha < 1.0) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// System matrix data
export const SYSTEM_MATRIX: Component[] = [
  { id: 'WR-001', type: 'THREE.Scene', domain: 'WEBGL_RENDERING', scope: 'SCENE', function: 'Background', tension: 0.0, ref: '#REF:BACKGROUND,AURORA_SHADER' },
  { id: 'WR-002', type: 'ParticleSystem', domain: 'WEBGL_RENDERING', scope: 'SCENE', function: 'Particle_Lattice', tension: 0.5, ref: '#REF:PARTICLES,VERTEX_SHADER' },
  { id: 'NV-001', type: 'NetworkNode', domain: 'NETWORK_VISUALIZATION', scope: 'SCENE', function: 'Neural_Node', tension: 0.8, ref: '#REF:NETWORK,HUB_NODES' },
  { id: 'NV-002', type: 'ConnectionLine', domain: 'NETWORK_VISUALIZATION', scope: 'SCENE', function: 'Data_Conduit', tension: 0.9, ref: '#REF:CONNECTIONS,LINE_MESH' },
  { id: 'UI-001', type: 'GlassCard', domain: 'USER_INTERFACE', scope: 'UI', function: 'Interface_Panel', tension: 0.3, ref: '#REF:RAY_CAST,MAGNETIC_ZONE' },
  { id: 'DP-001', type: 'DataStream', domain: 'DATA_PROCESSING', scope: 'DATA', function: 'Volume_Stream', tension: 0.6, ref: '#REF:API_ENDPOINT,VISUAL_OUTPUT' },
  { id: 'WR-003', type: 'ShaderUniform', domain: 'WEBGL_RENDERING', scope: 'SHADER', function: 'Time_Variable', tension: 0.9, ref: '#REF:JAVASCRIPT,GPU_SHADER' },
  { id: 'UI-002', type: 'Raycaster', domain: 'USER_INTERFACE', scope: 'INTERACTION', function: 'Mouse_Tracker', tension: 0.7, ref: '#REF:MOUSE,3D_ROTATION' }
];

export default NetworkNode;
