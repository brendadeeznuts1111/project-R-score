export function formatMoneyFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatTimestamp(value?: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function formatRelativeDay(value?: string | null): string {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function truncateMiddle(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export function toTitleCase(value: string): string {
  return value
    .replaceAll(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
