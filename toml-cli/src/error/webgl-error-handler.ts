export interface WebGLError {
  type: 'context_lost' | 'shader_compilation' | 'texture_load' | 'geometry';
  message: string;
  stack?: string;
  recoveryPossible: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class WebGLErrorHandler {
  private static instance: WebGLErrorHandler;
  private errorHistory: WebGLError[] = [];
  private maxRetryAttempts = 3;
  private currentRetryCount = 0;
  private isRecoveryMode = false;
  
  // Error thresholds
  private readonly ERROR_THRESHOLDS = {
    contextLoss: 2, // Max context losses before fallback
    shaderErrors: 5, // Max shader errors before fallback
    textureErrors: 10, // Max texture errors before fallback
    totalErrors: 15 // Max total errors before fallback
  };
  
  private constructor() {
    this.setupGlobalErrorHandling();
  }
  
  static getInstance(): WebGLErrorHandler {
    if (!WebGLErrorHandler.instance) {
      WebGLErrorHandler.instance = new WebGLErrorHandler();
    }
    return WebGLErrorHandler.instance;
  }
  
  private setupGlobalErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      if (this.isWebGLError(event)) {
        this.handleError({
          type: this.categorizeError(event),
          message: event.message,
          stack: event.error?.stack,
          recoveryPossible: this.isRecoveryPossible(event),
          severity: this.assessSeverity(event)
        });
      }
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isWebGLPromiseRejection(event)) {
        this.handleError({
          type: 'texture_load',
          message: event.reason?.message || 'Texture loading failed',
          recoveryPossible: true,
          severity: 'medium'
        });
      }
    });
    
    // WebGL context loss
    const canvas = document.getElementById('webgl-canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        this.handleContextLoss();
      });
      
      canvas.addEventListener('webglcontextrestored', () => {
        this.handleContextRestore();
      });
    }
  }
  
  private isWebGLError(event: ErrorEvent): boolean {
    const webGLKeywords = ['webgl', 'shader', 'texture', 'gl.', 'THREE.'];
    return webGLKeywords.some(keyword => 
      event.message.toLowerCase().includes(keyword) ||
      event.filename?.toLowerCase().includes(keyword) ||
      event.error?.stack?.toLowerCase().includes(keyword)
    );
  }
  
  private isWebGLPromiseRejection(event: PromiseRejectionEvent): boolean {
    return event.reason?.message?.includes('texture') ||
           event.reason?.message?.includes('image') ||
           event.reason?.message?.includes('load');
  }
  
  private categorizeError(event: ErrorEvent): WebGLError['type'] {
    const message = event.message.toLowerCase();
    
    if (message.includes('shader')) return 'shader_compilation';
    if (message.includes('texture')) return 'texture_load';
    if (message.includes('geometry') || message.includes('buffer')) return 'geometry';
    if (message.includes('context')) return 'context_lost';
    
    return 'shader_compilation'; // Default
  }
  
  private isRecoveryPossible(error: ErrorEvent): boolean {
    const type = this.categorizeError(error);
    
    switch (type) {
      case 'context_lost':
        return this.currentRetryCount < this.maxRetryAttempts;
      case 'shader_compilation':
        return true; // Can fallback to simpler shaders
      case 'texture_load':
        return true; // Can use placeholder textures
      case 'geometry':
        return false; // Usually critical
      default:
        return false;
    }
  }
  
  private assessSeverity(event: ErrorEvent): WebGLError['severity'] {
    const type = this.categorizeError(event);
    
    switch (type) {
      case 'context_lost':
        return 'critical';
      case 'shader_compilation':
        return 'high';
      case 'texture_load':
        return 'medium';
      case 'geometry':
        return 'critical';
      default:
        return 'low';
    }
  }
  
  public handleError(error: WebGLError): void {
    console.error(`[WebGL Error] ${error.type}: ${error.message}`, error);
    
    // Add to history
    this.errorHistory.push({
      ...error,
      timestamp: Date.now()
    });
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }
    
    // Attempt recovery if possible
    if (error.recoveryPossible) {
      this.attemptRecovery(error);
    } else {
      this.triggerFallback(error);
    }
    
    // Report to monitoring
    this.reportError(error);
    
    // Check if we should disable WebGL entirely
    this.checkErrorThresholds();
  }
  
  private handleContextLoss(): void {
    const error: WebGLError = {
      type: 'context_lost',
      message: 'WebGL context lost',
      recoveryPossible: true,
      severity: 'critical'
    };
    
    this.handleError(error);
  }
  
  private handleContextRestore(): void {
    console.log('WebGL context restored');
    this.isRecoveryMode = false;
    this.currentRetryCount = 0;
    
    // Reinitialize WebGL
    WebGLRenderer.getInstance().restoreContext();
  }
  
  public handleInitializationError(error: any): void {
    const webGLError: WebGLError = {
      type: 'context_lost',
      message: `WebGL initialization failed: ${error.message}`,
      recoveryPossible: false,
      severity: 'critical'
    };
    
    this.handleError(webGLError);
  }
  
  private attemptRecovery(error: WebGLError): void {
    console.log(`Attempting recovery for ${error.type}`);
    
    switch (error.type) {
      case 'context_lost':
        this.recoverContextLoss();
        break;
      case 'shader_compilation':
        this.recoverShaderError();
        break;
      case 'texture_load':
        this.recoverTextureError();
        break;
      default:
        console.warn(`No recovery strategy for ${error.type}`);
    }
  }
  
  private recoverContextLoss(): void {
    this.isRecoveryMode = true;
    this.currentRetryCount++;
    
    if (this.currentRetryCount > this.maxRetryAttempts) {
      this.triggerFallback({
        type: 'context_lost',
        message: 'Max retry attempts exceeded',
        recoveryPossible: false,
        severity: 'critical'
      });
      return;
    }
    
    // Wait for context restoration
    setTimeout(() => {
      if (this.isRecoveryMode) {
        // Force context restoration
        const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
        if (canvas) {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl && gl.isContextLost()) {
            // Try to restore by creating new context
            this.recreateContext();
          }
        }
      }
    }, 1000);
  }
  
  private recoverShaderError(): void {
    // Reduce shader complexity
    const shader = window.__DIGITAL_AURORA_SHADER__;
    if (shader) {
      shader.disableComplexEffects();
    }
    
    // Recompile with lower precision
    WebGLRenderer.getInstance().reduceShaderPrecision();
  }
  
  private recoverTextureError(): void {
    // Use placeholder textures
    TextureManager.usePlaceholders();
    
    // Retry loading with lower resolution
    TextureManager.retryLoading({ maxResolution: 512 });
  }
  
  private triggerFallback(error: WebGLError): void {
    console.error('Triggering fallback due to:', error);
    
    // Disable WebGL
    WebGLRenderer.getInstance().destroy();
    
    // Switch to CSS animations
    AnimationEngine.getInstance().switchToCSSFallback();
    
    // Show user notification
    this.showErrorNotification(error);
    
    // Update global state
    GlobalStateManager.getInstance().update({
      webgl: { isSupported: false, version: null, contextLost: true }
    });
  }
  
  private recreateContext(): void {
    // Destroy old renderer
    WebGLRenderer.getInstance().destroy();
    
    // Create new canvas
    const oldCanvas = document.getElementById('webgl-canvas');
    oldCanvas?.remove();
    
    // Reinitialize
    setTimeout(() => {
      WebGLRenderer.getInstance().init();
    }, 100);
  }
  
  private checkErrorThresholds(): void {
    const recentErrors = this.errorHistory.filter(
      error => Date.now() - error.timestamp < 60000 // Last minute
    );
    
    const contextLosses = recentErrors.filter(e => e.type === 'context_lost').length;
    const shaderErrors = recentErrors.filter(e => e.type === 'shader_compilation').length;
    const textureErrors = recentErrors.filter(e => e.type === 'texture_load').length;
    const totalErrors = recentErrors.length;
    
    if (contextLosses >= this.ERROR_THRESHOLDS.contextLoss ||
        shaderErrors >= this.ERROR_THRESHOLDS.shaderErrors ||
        textureErrors >= this.ERROR_THRESHOLDS.textureErrors ||
        totalErrors >= this.ERROR_THRESHOLDS.totalErrors) {
      
      console.error('Error thresholds exceeded, disabling WebGL');
      this.triggerFallback({
        type: 'context_lost',
        message: 'Error thresholds exceeded',
        recoveryPossible: false,
        severity: 'critical'
      });
    }
  }
  
  private showErrorNotification(error: WebGLError): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${error.severity === 'critical' ? '#ff0080' : '#ffaa00'};
      color: white;
      padding: 16px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 300px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.4;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <strong>Performance Issue Detected</strong>
      <p>${this.getUserFriendlyMessage(error)}</p>
      <button onclick="this.parentElement.remove()" style="
        background: none;
        border: none;
        color: white;
        float: right;
        font-size: 18px;
        cursor: pointer;
        margin-top: -20px;
        margin-right: -12px;
      ">×</button>
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 8000);
  }
  
  private getUserFriendlyMessage(error: WebGLError): string {
    switch (error.type) {
      case 'context_lost':
        return 'WebGL graphics failed. Switching to simplified view.';
      case 'shader_compilation':
        return 'Advanced graphics effects disabled for performance.';
      case 'texture_load':
        return 'Some images failed to load. Using placeholders.';
      case 'geometry':
        return '3D models failed to load. Using simplified view.';
      default:
        return 'Graphics performance issue detected.';
    }
  }
  
  private reportError(error: WebGLError): void {
    // Send to Sentry
    if (window.Sentry) {
      window.Sentry.captureException(new Error(error.message), {
        tags: {
          type: error.type,
          severity: error.severity,
          recovery_possible: error.recoveryPossible
        },
        extra: {
          stack: error.stack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        }
      });
    }
    
    // Send to custom monitoring
    fetch('https://monitoring.quantumnavigator.io/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...error,
        timestamp: Date.now(),
        sessionId: GlobalStateManager.getInstance().getState().user.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href
      }),
      keepalive: true
    }).catch(() => {
      // Fail silently
    });
  }
  
  public getErrorHistory(): WebGLError[] {
    return [...this.errorHistory];
  }
  
  public getErrorCount(type?: WebGLError['type']): number {
    if (type) {
      return this.errorHistory.filter(e => e.type === type).length;
    }
    return this.errorHistory.length;
  }
  
  public isInRecoveryMode(): boolean {
    return this.isRecoveryMode;
  }
  
  public reset(): void {
    this.errorHistory = [];
    this.currentRetryCount = 0;
    this.isRecoveryMode = false;
  }
}

// Global error handler
window.__WEBGL_ERROR_HANDLER__ = WebGLErrorHandler.getInstance();