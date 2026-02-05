// lib/polish/visual/browser/confetti.tsx - Celebration Confetti Effect
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, type FC, type CSSProperties } from "react";
import { confettiStyles, injectPolishStyles } from "./styles.ts";
import type { ConfettiOptions } from "../../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Colors
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  "#f94144", // Red
  "#f3722c", // Orange
  "#f9c74f", // Yellow
  "#90be6d", // Green
  "#43aa8b", // Teal
  "#577590", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
];

// ─────────────────────────────────────────────────────────────────────────────
// Confetti Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfettiProps {
  active: boolean;
  options?: ConfettiOptions;
  onComplete?: () => void;
}

export const Confetti: FC<ConfettiProps> = ({ active, options = {}, onComplete }) => {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  const {
    particleCount = 100,
    spread = 100,
    colors = DEFAULT_COLORS,
    duration = 3000,
  } = options;

  // Inject styles on mount
  useEffect(() => {
    injectPolishStyles();
  }, []);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Generate particles
    const newParticles: ConfettiParticle[] = [];
    const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 500;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: centerX + (Math.random() - 0.5) * spread * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        rotation: Math.random() * 360,
        delay: Math.random() * 500,
      });
    }

    setParticles(newParticles);

    // Clear after duration
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, duration + 500);

    return () => clearTimeout(timer);
  }, [active, particleCount, spread, colors, duration, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div style={confettiStyles.container}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          style={{
            ...confettiStyles.particle,
            left: particle.x,
            top: -20,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            animationDelay: `${particle.delay}ms`,
            animationDuration: `${duration}ms`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// useConfetti Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseConfettiReturn {
  isActive: boolean;
  fire: (options?: ConfettiOptions) => void;
  ConfettiComponent: FC;
}

export function useConfetti(): UseConfettiReturn {
  const [isActive, setIsActive] = useState(false);
  const [options, setOptions] = useState<ConfettiOptions>({});

  const fire = useCallback((opts: ConfettiOptions = {}) => {
    setOptions(opts);
    setIsActive(true);
  }, []);

  const handleComplete = useCallback(() => {
    setIsActive(false);
  }, []);

  const ConfettiComponent: FC = () => (
    <Confetti active={isActive} options={options} onComplete={handleComplete} />
  );

  return { isActive, fire, ConfettiComponent };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas-based Confetti (Higher Performance)
// ─────────────────────────────────────────────────────────────────────────────

export function fireConfetti(options: ConfettiOptions = {}): void {
  if (typeof document === "undefined") return;

  const {
    particleCount = 100,
    spread = 100,
    colors = DEFAULT_COLORS,
    duration = 3000,
  } = options;

  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 10000;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Create particles
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
  }

  const particles: Particle[] = [];
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 3;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.random() - 0.5) * Math.PI;
    const velocity = Math.random() * 15 + 5;

    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * velocity * (spread / 100),
      vy: Math.sin(angle) * velocity - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    });
  }

  // Animation
  const startTime = Date.now();
  const gravity = 0.3;

  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      // Physics
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Draw
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate((p.rotation * Math.PI) / 180);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx!.restore();
    }

    requestAnimationFrame(animate);
  }

  animate();
}

export default Confetti;
