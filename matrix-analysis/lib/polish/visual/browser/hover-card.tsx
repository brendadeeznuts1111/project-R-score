// lib/polish/visual/browser/hover-card.tsx - Interactive 3D Hover Card
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useState, useCallback, type ReactNode, type FC, type CSSProperties } from "react";
import { hoverCardStyles, injectPolishStyles } from "./styles.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HoverCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  glareOpacity?: number;
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HoverCard Component
// ─────────────────────────────────────────────────────────────────────────────

export const HoverCard: FC<HoverCardProps> = ({
  children,
  className,
  style,
  maxTilt = 10,
  perspective = 1000,
  scale = 1.02,
  glareOpacity = 0.15,
  disabled = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState("");
  const [glarePosition, setGlarePosition] = useState({ x: "50%", y: "50%" });

  // Inject styles on mount
  if (typeof document !== "undefined") {
    injectPolishStyles();
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      // Calculate rotation based on mouse position
      const rotateX = (mouseY / (rect.height / 2)) * -maxTilt;
      const rotateY = (mouseX / (rect.width / 2)) * maxTilt;

      setTransform(
        `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`
      );

      // Update glare position
      const glareX = ((e.clientX - rect.left) / rect.width) * 100;
      const glareY = ((e.clientY - rect.top) / rect.height) * 100;
      setGlarePosition({ x: `${glareX}%`, y: `${glareY}%` });
    },
    [disabled, maxTilt, perspective, scale]
  );

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setIsHovered(true);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTransform("");
    setGlarePosition({ x: "50%", y: "50%" });
  }, []);

  const cardStyle: CSSProperties = {
    ...hoverCardStyles.card,
    ...style,
    transform: isHovered ? transform : "",
    boxShadow: isHovered
      ? "0 20px 40px rgba(0, 0, 0, 0.4)"
      : "var(--polish-shadow)",
  };

  const overlayStyle: CSSProperties = {
    ...hoverCardStyles.overlay,
    opacity: isHovered ? glareOpacity : 0,
    background: `radial-gradient(circle at ${glarePosition.x} ${glarePosition.y}, rgba(255,255,255,0.2) 0%, transparent 50%)`,
  };

  return (
    <div
      ref={cardRef}
      className={className}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div style={overlayStyle} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook for Custom Implementations
// ─────────────────────────────────────────────────────────────────────────────

export interface UseHoverCardReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isHovered: boolean;
}

export function useHoverCard(options: Omit<HoverCardProps, "children"> = {}): UseHoverCardReturn {
  const { maxTilt = 10, perspective = 1000, scale = 1.02, disabled = false } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState("");

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const rotateX = (mouseY / (rect.height / 2)) * -maxTilt;
      const rotateY = (mouseX / (rect.width / 2)) * maxTilt;

      setTransform(
        `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`
      );
    },
    [disabled, maxTilt, perspective, scale]
  );

  const onMouseEnter = useCallback(() => {
    if (!disabled) setIsHovered(true);
  }, [disabled]);

  const onMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTransform("");
  }, []);

  const style: CSSProperties = {
    transition: "transform 250ms ease, box-shadow 250ms ease",
    transformStyle: "preserve-3d",
    transform: isHovered ? transform : "",
  };

  return { ref, style, onMouseMove, onMouseEnter, onMouseLeave, isHovered };
}

export default HoverCard;
