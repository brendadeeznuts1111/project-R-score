import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { Observer } from 'gsap/Observer';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ReducedMotionManager } from '@/accessibility/reduced-motion-manager';
import { PerformanceMonitor } from '@/performance/performance-monitor';
import { GlobalStateManager } from '@/state/global-state-manager';

export interface AnimationConfig {
  duration: number;
  ease: string;
  stagger?: number | gsap.TweenVars['stagger'];
  delay?: number;
  onComplete?: () => void;
  onUpdate?: () => void;
}

export class AnimationEngine {
  private static instance: AnimationEngine;
  private isInitialized = false;
  private isReducedMotion: boolean;
  private activeAnimations = new Set<gsap.core.Animation>();
  private animationQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  
  // Performance tracking
  private animationStartTimes = new Map<string, number>();
  private animationMetrics = new Map<string, { duration: number; jank: number }>();
  
  private constructor() {
    this.isReducedMotion = ReducedMotionManager.getIsReducedMotion();
    this.init();
  }
  
  static getInstance(): AnimationEngine {
    if (!AnimationEngine.instance) {
      AnimationEngine.instance = new AnimationEngine();
    }
    return AnimationEngine.instance;
  }
  
  private init(): void {
    if (this.isInitialized) return;
    
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger, Flip, Observer, MotionPathPlugin);
    
    // Configure GSAP for performance
    gsap.config({
      nullTargetWarn: false,
      trialWarn: false,
      autoSleep: 60
    });
    
    // Set reduced motion if needed
    if (this.isReducedMotion) {
      gsap.globalTimeline.timeScale(0.1);
    }
    
    // Monitor animation performance
    this.setupPerformanceMonitoring();
    
    this.isInitialized = true;
    console.log('AnimationEngine initialized');
  }
  
  private setupPerformanceMonitoring(): void {
    // Hook into GSAP's update cycle
    const originalUpdate = gsap.updateRoot;
    gsap.updateRoot = (time: number) => {
      const startTime = performance.now();
      originalUpdate.call(gsap, time);
      const duration = performance.now() - startTime;
      
      if (duration > 16.67) { // Frame budget exceeded
        PerformanceMonitor.getInstance().recordJank();
      }
    };
  }
  
  // Easing presets
  public get cyberSnap(): string {
    return 'cubic-bezier(0.16, 1, 0.3, 1)';
  }
  
  public get dataFlow(): string {
    return 'cubic-bezier(0.4, 0, 0.2, 1)';
  }
  
  public get quantumSpring(): string {
    return 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
  }
  
  // Queue system for batched animations
  public queueAnimation(animationFn: () => void): void {
    this.animationQueue.push(animationFn);
    
    if (!this.isProcessingQueue) {
      this.processAnimationQueue();
    }
  }
  
  private async processAnimationQueue(): Promise<void> {
    this.isProcessingQueue = true;
    
    while (this.animationQueue.length > 0) {
      const animationFn = this.animationQueue.shift();
      if (animationFn) {
        animationFn();
        
        // Small delay to prevent blocking main thread
        if (this.animationQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  // Hero section animations
  public animateHeroTitle(element: HTMLElement, config: Partial<AnimationConfig> = {}): gsap.core.Timeline {
    const timeline = gsap.timeline({
      onComplete: config.onComplete,
      onUpdate: config.onUpdate
    });
    
    // Split text into characters
    const chars = this.splitTextIntoChars(element);
    
    // Initial state
    gsap.set(chars, {
      opacity: 0,
      y: 50,
      rotationX: -90,
      transformOrigin: 'center center'
    });
    
    // Animate each character
    timeline.to(chars, {
      opacity: 1,
      y: 0,
      rotationX: 0,
      duration: config.duration || 1.2,
      stagger: config.stagger || {
        amount: 0.4,
        from: 'random'
      },
      ease: config.ease || this.cyberSnap,
      onUpdate: () => {
        this.trackAnimationProgress('hero-title', timeline);
      }
    });
    
    this.activeAnimations.add(timeline);
    return timeline;
  }
  
  // Magnetic text effect
  public createMagneticText(element: HTMLElement, options: {
    force?: number;
    damping?: number;
    stiffness?: number;
  } = {}): { destroy: () => void } {
    const force = options.force || 50;
    const damping = options.damping || 0.8;
    const stiffness = options.stiffness || 0.2;
    
    if (this.isReducedMotion) {
      return { destroy: () => {} };
    }
    
    const chars = element.querySelectorAll('.char');
    const charStates = new Map<Element, { x: number; y: number; vx: number; vy: number }>();
    
    // Initialize char states
    chars.forEach(char => {
      charStates.set(char, { x: 0, y: 0, vx: 0, vy: 0 });
    });
    
    const observer = Observer.create({
      target: window,
      type: 'pointer',
      onMove: (self) => {
        const mouseX = self.x;
        const mouseY = self.y;
        
        chars.forEach((char) => {
          const rect = char.getBoundingClientRect();
          const charCenterX = rect.left + rect.width / 2;
          const charCenterY = rect.top + rect.height / 2;
          
          const deltaX = mouseX - charCenterX;
          const deltaY = mouseY - charCenterY;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          const state = charStates.get(char)!;
          
          if (distance < force) {
            const forceMultiplier = 1 - (distance / force);
            const targetX = (deltaX / distance) * forceMultiplier * 10;
            const targetY = (deltaY / distance) * forceMultiplier * 10;
            
            // Spring physics
            state.vx += (targetX - state.x) * stiffness;
            state.vy += (targetY - state.y) * stiffness;
            state.vx *= damping;
            state.vy *= damping;
            state.x += state.vx;
            state.y += state.vy;
          } else {
            // Return to rest position
            state.vx += (-state.x) * stiffness;
            state.vy += (-state.y) * stiffness;
            state.vx *= damping;
            state.vy *= damping;
            state.x += state.vx;
            state.y += state.vy;
          }
          
          // Apply transform
          gsap.set(char, {
            x: -state.x,
            y: -state.y,
            force3D: true
          });
        });
      }
    });
    
    return {
      destroy: () => {
        observer.kill();
        charStates.clear();
      }
    };
  }
  
  // 3D product gyroscope
  public createGyroscope(element: HTMLElement, options: {
    maxTilt?: number;
    damping?: number;
    levitationAmount?: number;
    levitationSpeed?: number;
  } = {}): { update: (mouseX: number, mouseY: number) => void; destroy: () => void } {
    const maxTilt = options.maxTilt || 15;
    const damping = options.damping || 0.1;
    const levitationAmount = options.levitationAmount || 15;
    const levitationSpeed = options.levitationSpeed || 3;
    
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;
    
    // Continuous levitation
    const levitationTimeline = gsap.to(element, {
      y: levitationAmount,
      duration: levitationSpeed,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
    
    // Smooth rotation update
    const updateRotation = () => {
      currentRotationX += (targetRotationX - currentRotationX) * damping;
      currentRotationY += (targetRotationY - currentRotationY) * damping;
      
      gsap.set(element, {
        rotationX: currentRotationX,
        rotationY: currentRotationY,
        transformPerspective: 1000,
        force3D: true
      });
    };
    
    gsap.ticker.add(updateRotation);
    
    return {
      update: (mouseX: number, mouseY: number) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        targetRotationY = (mouseX - centerX) / centerX * maxTilt;
        targetRotationX = (mouseY - centerY) / centerY * -maxTilt;
      },
      destroy: () => {
        levitationTimeline.kill();
        gsap.ticker.remove(updateRotation);
      }
    };
  }
  
  // Horizontal velocity stream
  public createVelocityStream(track: HTMLElement, cards: HTMLElement[], options: {
    scrollSpeed?: number;
    maxSkew?: number;
    hoverScale?: number;
  } = {}): { destroy: () => void } {
    const scrollSpeed = options.scrollSpeed || 1;
    const maxSkew = options.maxSkew || 5;
    const hoverScale = options.hoverScale || 1.15;
    
    if (this.isReducedMotion) {
      gsap.set(track, { x: '-66%' });
      return { destroy: () => {} };
    }
    
    // ScrollTrigger for horizontal translation
    const scrollTrigger = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      pin: true,
      scrub: scrollSpeed,
      onUpdate: (self) => {
        const progress = self.progress;
        gsap.set(track, { x: `${-66 * progress}%` });
        
        // Velocity-based skew
        const velocity = Math.abs(self.getVelocity() / 1000);
        const skew = Math.min(velocity * maxSkew, maxSkew);
        
        cards.forEach(card => {
          gsap.to(card, {
            skewX: -skew,
            duration: 0.2,
            ease: 'power2.out'
          });
        });
      }
    });
    
    // Card hover FLIP animations
    const hoverHandlers = cards.map(card => {
      const enterHandler = () => {
        const state = Flip.getState(card);
        
        // Apply expanded state
        gsap.set(card, {
          scale: hoverScale,
          zIndex: 100,
          boxShadow: '0px 20px 60px rgba(0, 240, 255, 0.5)'
        });
        
        Flip.from(state, {
          duration: 0.3,
          ease: 'power2.inOut',
          onComplete: () => {
            this.trackAnimationCompletion('card-hover', performance.now());
          }
        });
      };
      
      const leaveHandler = () => {
        const state = Flip.getState(card);
        
        // Reset state
        gsap.set(card, {
          scale: 1,
          zIndex: 'auto',
          boxShadow: '0px 0px 0px rgba(0, 240, 255, 0)'
        });
        
        Flip.from(state, {
          duration: 0.3,
          ease: 'power2.inOut'
        });
      };
      
      card.addEventListener('mouseenter', enterHandler);
      card.addEventListener('mouseleave', leaveHandler);
      
      return { card, enterHandler, leaveHandler };
    });
    
    return {
      destroy: () => {
        scrollTrigger.kill();
        hoverHandlers.forEach(({ card, enterHandler, leaveHandler }) => {
          card.removeEventListener('mouseenter', enterHandler);
          card.removeEventListener('mouseleave', leaveHandler);
        });
      }
    };
  }
  
  // Orbital voice cloud
  public createOrbitalCloud(container: HTMLElement, cards: HTMLElement[], options: {
    radius?: number;
    rotationSpeed?: number;
    inertiaDamping?: number;
  } = {}): { destroy: () => void } {
    const radius = options.radius || 600;
    const rotationSpeed = options.rotationSpeed || 60;
    const inertiaDamping = options.inertiaDamping || 0.95;
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Position cards in circle
    cards.forEach((card, index) => {
      const angle = (index / cards.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius - card.offsetWidth / 2;
      const y = centerY + Math.sin(angle) * radius - card.offsetHeight / 2;
      
      gsap.set(card, {
        x,
        y,
        rotation: -angle * 180 / Math.PI
      });
    });
    
    // Auto rotation
    const autoRotation = gsap.to(container, {
      rotation: 360,
      duration: rotationSpeed,
      repeat: -1,
      ease: 'none'
    });
    
    // Drag interaction
    let isDragging = false;
    let startAngle = 0;
    let currentRotation = 0;
    let velocity = 0;
    
    const observer = Observer.create({
      target: container,
      type: 'pointer',
      onDragStart: (self) => {
        isDragging = true;
        autoRotation.kill();
        
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        startAngle = Math.atan2(self.y - centerY, self.x - centerX) * 180 / Math.PI;
      },
      onDrag: (self) => {
        if (!isDragging) return;
        
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(self.y - centerY, self.x - centerX) * 180 / Math.PI;
        const deltaAngle = currentAngle - startAngle;
        
        currentRotation += deltaAngle;
        velocity = deltaAngle;
        
        gsap.set(container, { rotation: currentRotation });
        
        startAngle = currentAngle;
      },
      onDragEnd: () => {
        isDragging = false;
        
        // Inertia
        const applyInertia = () => {
          velocity *= inertiaDamping;
          currentRotation += velocity;
          
          gsap.set(container, { rotation: currentRotation });
          
          if (Math.abs(velocity) > 0.1) {
            requestAnimationFrame(applyInertia);
          } else {
            // Return to slow rotation
            gsap.to(container, {
              rotation: currentRotation + 360,
              duration: rotationSpeed,
              repeat: -1,
              ease: 'none'
            });
          }
        };
        
        applyInertia();
      }
    });
    
    return {
      destroy: () => {
        autoRotation.kill();
        observer.kill();
      }
    };
  }
  
  // Helper methods
  private splitTextIntoChars(element: HTMLElement): HTMLElement[] {
    const text = element.textContent || '';
    element.innerHTML = '';
    
    return text.split('').map(char => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.className = 'char';
      span.style.display = 'inline-block';
      element.appendChild(span);
      return span;
    });
  }
  
  private trackAnimationProgress(id: string, timeline: gsap.core.Timeline): void {
    const startTime = this.animationStartTimes.get(id) || performance.now();
    
    if (!this.animationStartTimes.has(id)) {
      this.animationStartTimes.set(id, startTime);
    }
    
    const progress = timeline.progress();
    
    if (progress === 1) {
      const duration = performance.now() - startTime;
      const expectedDuration = timeline.duration() * 1000;
      const jank = Math.max(0, duration - expectedDuration);
      
      this.animationMetrics.set(id, { duration, jank });
      this.animationStartTimes.delete(id);
      
      // Log performance issue if jank detected
      if (jank > 16.67) { // More than one frame
        PerformanceMonitor.getInstance().recordJank();
      }
    }
  }
  
  private trackAnimationCompletion(id: string, endTime: number): void {
    const startTime = this.animationStartTimes.get(id);
    if (startTime) {
      const duration = endTime - startTime;
      this.animationMetrics.set(id, { duration, jank: 0 });
      this.animationStartTimes.delete(id);
    }
  }
  
  // Cleanup
  public destroy(): void {
    this.activeAnimations.forEach(animation => animation.kill());
    this.activeAnimations.clear();
    this.animationQueue = [];
    this.animationMetrics.clear();
    this.animationStartTimes.clear();
  }
  
  // Metrics
  public getAnimationMetrics(): Map<string, { duration: number; jank: number }> {
    return new Map(this.animationMetrics);
  }
  
  public getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }
}

// Singleton export
export const animationEngine = AnimationEngine.getInstance();