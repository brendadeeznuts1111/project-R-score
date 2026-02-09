#!/usr/bin/env bun
/**
 * Repository Badge Generator
 * Creates bright HSL color badges for README
 */

interface BadgeConfig {
  label: string;
  message: string;
  color: string;
  labelColor?: string;
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge';
}

const badges: BadgeConfig[] = [
  {
    label: 'Runtime',
    message: 'Bun',
    color: 'hsl(280,100%,60%)',
    labelColor: 'hsl(280,80%,40%)',
    style: 'for-the-badge'
  },
  {
    label: 'Language',
    message: 'TypeScript',
    color: 'hsl(210,100%,55%)',
    labelColor: 'hsl(210,80%,35%)',
    style: 'for-the-badge'
  },
  {
    label: 'Features',
    message: 'Real-time',
    color: 'hsl(150,100%,45%)',
    labelColor: 'hsl(150,80%,30%)',
    style: 'for-the-badge'
  },
  {
    label: 'Protocol',
    message: 'WebSocket',
    color: 'hsl(320,100%,65%)',
    labelColor: 'hsl(320,80%,45%)',
    style: 'for-the-badge'
  },
  {
    label: 'Security',
    message: 'Hardened',
    color: 'hsl(0,100%,60%)',
    labelColor: 'hsl(0,80%,40%)',
    style: 'for-the-badge'
  },
  {
    label: 'Database',
    message: 'Vectorize',
    color: 'hsl(120,100%,50%)',
    labelColor: 'hsl(120,80%,35%)',
    style: 'for-the-badge'
  },
  {
    label: 'Version',
    message: 'v1.3.8',
    color: 'hsl(45,100%,55%)',
    labelColor: 'hsl(45,80%,35%)',
    style: 'for-the-badge'
  },
  {
    label: 'Status',
    message: 'Production',
    color: 'hsl(260,100%,70%)',
    labelColor: 'hsl(260,80%,50%)',
    style: 'for-the-badge'
  }
];

function generateBadgeUrl(badge: BadgeConfig): string {
  const params = new URLSearchParams({
    label: badge.label,
    message: badge.message,
    color: badge.color.replace(/[hsl()%]/g, '').replace(/,/g, '-'),
    labelColor: (badge.labelColor || '555').replace(/[hsl()%]/g, '').replace(/,/g, '-'),
    style: badge.style || 'flat'
  });
  
  // Use shields.io with custom colors
  const colorHex = hslToHex(badge.color);
  const labelColorHex = hslToHex(badge.labelColor || 'hsl(0,0%,33%)');
  
  return `https://img.shields.io/badge/${encodeURIComponent(badge.label)}-${encodeURIComponent(badge.message)}-${colorHex}?style=${badge.style}&labelColor=${labelColorHex}`;
}

function hslToHex(hsl: string): string {
  // Parse HSL values
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return 'blue';
  
  let [_, h, s, l] = match.map(Number);
  s /= 100;
  l /= 100;
  
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Generate badge markdown
console.log('## 🎨 Repository Badges\n');
console.log('<div align="center">\n');
badges.forEach(badge => {
  console.log(`  <img src="${generateBadgeUrl(badge)}" alt="${badge.label}: ${badge.message}" />`);
});
console.log('</div>\n');

// Generate topic tags
console.log('## 🏷️ Topics\n');
const topics = [
  { name: 'bun-runtime', color: 'hsl(280,100%,60%)', icon: '⚡' },
  { name: 'typescript', color: 'hsl(210,100%,55%)', icon: '🔷' },
  { name: 'real-time', color: 'hsl(150,100%,45%)', icon: '🔄' },
  { name: 'websocket', color: 'hsl(320,100%,65%)', icon: '🔌' },
  { name: 'payment-gateway', color: 'hsl(45,100%,55%)', icon: '💳' },
  { name: 'security', color: 'hsl(0,100%,60%)', icon: '🔒' },
  { name: 'analytics', color: 'hsl(180,100%,50%)', icon: '📊' },
  { name: 'dashboard', color: 'hsl(260,100%,70%)', icon: '📈' },
  { name: 'mcp', color: 'hsl(30,100%,55%)', icon: '🤖' },
  { name: 'vectorize', color: 'hsl(120,100%,50%)', icon: '🔍' }
];

console.log('<div align="center">\n');
topics.forEach(topic => {
  const hexColor = hslToHex(topic.color);
  console.log(`  <img src="https://img.shields.io/badge/${topic.icon}%20${topic.name.replace(/-/g, '_')}-${hexColor}?style=for-the-badge&logoColor=white" alt="${topic.name}" />`);
});
console.log('</div>');
