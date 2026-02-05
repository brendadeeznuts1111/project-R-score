
import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  color = '#3b82f6', 
  width = 120, 
  height = 40 
}) => {
  const id = useMemo(() => `spark-grad-${Math.random().toString(36).substr(2, 9)}`, []);
  
  const { points, areaPoints } = useMemo(() => {
    if (data.length < 2) return { points: '', areaPoints: '' };
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    // Add small padding to range to prevent sticking to edges
    const range = (max - min || 1) * 1.1;
    const offset = min - (max - min) * 0.05;
    
    const coords = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - offset) / range) * height;
      return { x, y };
    });

    const linePath = coords.map(p => `${p.x},${p.y}`).join(' ');
    // Area path goes from bottom-left, through data points, to bottom-right, then closes the loop
    const areaPath = `0,${height} ${linePath} ${width},${height}`;
    
    return { points: linePath, areaPoints: areaPath };
  }, [data, width, height]);

  return (
    <svg 
      width={width} 
      height={height} 
      className="overflow-visible select-none pointer-events-none" 
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area Fill */}
      <polygon
        points={areaPoints}
        fill={`url(#${id})`}
        className="transition-all duration-500 ease-in-out"
      />
      
      {/* Trend Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-500 ease-in-out"
      />
    </svg>
  );
};
