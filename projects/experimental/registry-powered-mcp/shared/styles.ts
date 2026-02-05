/**
 * CSS Class Name Utilities
 * Provides consistent, maintainable class names for React components
 */

// Glass morphism effects
export const glassPanel = "glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden";

// Button variants
export const buttonVariants = {
  primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all",
  secondary: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all",
  success: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all",
  danger: "bg-rose-600 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all",
};

// Text styles
export const textStyles = {
  heading: "text-3xl font-black text-slate-900 dark:text-white tracking-tighter italic",
  subheading: "text-xl font-black text-slate-900 dark:text-white",
  label: "text-[10px] font-black uppercase tracking-widest",
  labelSmall: "text-[10px] font-mono",
  body: "text-slate-500 text-sm max-w-xl",
  bodySmall: "text-[10px] font-mono",
};

// Layout utilities
export const layout = {
  container: "space-y-6 animate-in fade-in duration-700",
  flexRow: "flex flex-col md:flex-row items-center justify-between gap-8",
  flexCol: "flex flex-col gap-4",
  gridCols2: "grid grid-cols-1 lg:grid-cols-2 gap-6",
  centerContent: "flex items-center justify-center",
};

// Status indicators
export const statusColors = {
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-rose-500",
  info: "text-indigo-500",
  neutral: "text-slate-400",
};

// Size utilities
export const sizes = {
  icon: {
    small: "size-4",
    medium: "size-5",
    large: "size-6",
  },
  padding: {
    small: "p-2",
    medium: "p-4",
    large: "p-6",
    xl: "p-8",
  },
  margin: {
    small: "m-2",
    medium: "m-4",
  },
};

// Animation utilities
export const animations = {
  fadeIn: "animate-in fade-in duration-700",
  slideIn: "animate-in slide-in-from-bottom duration-500",
  scaleIn: "animate-in zoom-in duration-300",
};

// Border utilities
export const borders = {
  default: "border border-slate-200 dark:border-slate-800",
  glass: "border border-slate-200 dark:border-slate-800",
  success: "border border-emerald-500/20",
  warning: "border border-amber-500/20",
  error: "border border-rose-500/20",
  info: "border border-indigo-500/20",
};

// Background utilities
export const backgrounds = {
  glass: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
  glassLight: "bg-white/50 dark:bg-slate-900/50",
  success: "bg-emerald-500/5",
  warning: "bg-amber-500/5",
  error: "bg-rose-500/5",
  info: "bg-indigo-500/5",
};

// Common component classes
export const components = {
  card: `${glassPanel} ${backgrounds.glass}`,
  badge: "px-3 py-1 rounded-full text-xs font-medium",
  input: "w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-4 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold",
  table: "w-full text-left border-collapse",
  tableHeader: "bg-slate-100/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-black tracking-[0.2em] border-b border-slate-200 dark:border-slate-800",
  tableRow: "hover:bg-indigo-500/5 transition-colors group",
  tableCell: "px-6 py-4",
};

// Utility functions for combining classes
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const combine = (...classes: string[]): string => {
  return classes.join(' ');
};

// Semantic class builders
export const buildButtonClass = (variant: keyof typeof buttonVariants, size: 'sm' | 'md' | 'lg' = 'md', additional = ''): string => {
  const base = "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap";
  const variantClass = buttonVariants[variant];
  return cn(base, variantClass, additional);
};

export const buildCardClass = (variant: 'default' | 'success' | 'warning' | 'error' | 'info' = 'default', additional = ''): string => {
  const base = "glass-panel p-6 rounded-2xl shadow-xl";
  let variantClass = '';

  switch (variant) {
    case 'success':
      variantClass = `${borders.success} ${backgrounds.success}`;
      break;
    case 'warning':
      variantClass = `${borders.warning} ${backgrounds.warning}`;
      break;
    case 'error':
      variantClass = `${borders.error} ${backgrounds.error}`;
      break;
    case 'info':
      variantClass = `${borders.info} ${backgrounds.info}`;
      break;
    default:
      variantClass = `${borders.glass} ${backgrounds.glass}`;
  }

  return cn(base, variantClass, additional);
};