/**
 * FormattedOutput JSX Component
 *
 * Renders formatted CLI output using JSX
 */

// Bun has built-in JSX support - no React import needed

interface OutputProps {
  title?: string;
  status?: "success" | "error" | "warning" | "info";
  children: any; // Using any since we're not using React types
}

interface TableProps {
  headers: string[];
  rows: any[][]; // Using any since we're not using React types
  maxWidth?: number;
}

interface BadgeProps {
  children: any; // Using any since we're not using React types
  variant?: "success" | "error" | "warning" | "info";
}

const colors = {
  reset: "\x1b[0m",
  success: "\x1b[32m",
  error: "\x1b[31m",
  warning: "\x1b[33m",
  info: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const icons = {
  success: "✅",
  error: "❌",
  warning: "⚠️ ",
  info: "ℹ️ ",
};

export function Output({ title, status = "info", children }: OutputProps) {
  const color = colors[status];
  const icon = icons[status];

  return (
    <div>
      {title && (
        <div>
          {color}{bold(title)}{colors.reset}
        </div>
      )}
      <div>
        {icon} {children}
      </div>
    </div>
  );
}

export function Badge({ children, variant = "info" }: BadgeProps) {
  const color = colors[variant];
  return (
    <span>
      {color}{children}{colors.reset}
    </span>
  );
}

export function Table({ headers, rows, maxWidth = 80 }: TableProps) {
  // Calculate column widths
  const widths = headers.map((_, i) =>
    Math.max(
      headers[i].length,
      ...rows.map((row) => String(row[i] ?? "").length)
    )
  );

  // Truncate if needed
  const truncate = (text: string, width: number) => {
    const str = String(text);
    return str.length > width ? str.slice(0, width - 1) + "…" : str;
  };

  // Render header
  const headerRow = (
    <div>
      {colors.bold}
      {headers.map((h, i) => truncate(h, widths[i]).padEnd(widths[i] + 2)).join("|")}
      {colors.reset}
    </div>
  );

  // Render separator
  const separator = (
    <div>
      {widths.map((w) => "─".repeat(w + 2)).join("+")}
    </div>
  );

  // Render rows
  const tableRows = rows.map((row, i) => (
    <div key={i}>
      {row.map((cell, i) => truncate(String(cell ?? ""), widths[i]).padEnd(widths[i] + 2)).join(
        "|"
      )}
    </div>
  ));

  return (
    <div>
      {headerRow}
      {separator}
      {tableRows}
    </div>
  );
}

export function Progress({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;

  return (
    <div>
      {label && `${label} `}
      {colors.success}{"█".repeat(filled)}{colors.dim}{"░".repeat(empty)}{colors.reset} {percentage.toFixed(0)}%
    </div>
  );
}

export function Spinner({ active = true, text }: { active?: boolean; text?: string }) {
  if (!active) return <span>{text}</span>;

  return (
    <span>
      {colors.info}⟳{colors.reset} {text}
    </span>
  );
}

// Utility functions
export function bold(text: string): string {
  return `${colors.bold}${text}${colors.reset}`;
}

export function dim(text: string): string {
  return `${colors.dim}${text}${colors.reset}`;
}

export function success(text: string): string {
  return `${colors.success}${text}${colors.reset}`;
}

export function error(text: string): string {
  return `${colors.error}${text}${colors.reset}`;
}

export function warning(text: string): string {
  return `${colors.warning}${text}${colors.reset}`;
}

export function info(text: string): string {
  return `${colors.info}${text}${colors.reset}`;
}
