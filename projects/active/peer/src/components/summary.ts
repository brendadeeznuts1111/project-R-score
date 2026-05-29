import type { SummaryItem } from "../types/app";

import { escapeHtml } from "../utils/dom";

export function renderSummaryItems(items: SummaryItem[], empty = "Nothing to show yet."): string {
  if (items.length === 0) {
    return `<div class="summary-text">${escapeHtml(empty)}</div>`;
  }
  return items
    .map((item) => {
      const toneClass = item.tone && item.tone !== "default" ? ` summary-item-${item.tone}` : "";
      const hint = item.hint ? `<small>${escapeHtml(item.hint)}</small>` : "";
      return `<div class="summary-item${toneClass}"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong>${hint}</div>`;
    })
    .join("");
}

export function renderTextSummary(blocks: string[]): string {
  if (blocks.length === 0) {
    return `<div class="summary-text">Nothing to show yet.</div>`;
  }
  return blocks.map((block) => `<div class="summary-text">${escapeHtml(block)}</div>`).join("");
}

export function renderSkeleton(lines = 3): string {
  return `<div class="skeleton-stack">${Array.from({ length: lines })
    .map(() => `<div class="skeleton-line"></div>`)
    .join("")}</div>`;
}
