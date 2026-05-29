import type { AuditEvent } from "../types/app";

import { escapeHtml } from "../utils/dom";
import { formatRelativeDay, formatTimestamp, truncateMiddle } from "../utils/formatters";

export function renderBadge(label: string, tone: "default" | "success" | "warning" | "danger" | "accent" = "default"): string {
  const className = tone === "default" ? "chip" : `chip chip-${tone}`;
  return `<span class="${className}">${escapeHtml(label)}</span>`;
}

export function renderAuditRows(events: AuditEvent[]): string {
  if (events.length === 0) {
    return `<div class="summary-text">No audit events available yet.</div>`;
  }

  return events
    .map(
      (event) => `
        <article class="audit-item">
          <div class="audit-topline">
            <strong>${escapeHtml(event.title)}</strong>
            ${renderBadge(event.type, event.type === "compliance" ? "warning" : "accent")}
          </div>
          <div class="portal-meta-list">
            <div>${escapeHtml(event.description)}</div>
            <div>${escapeHtml(event.actor)} • ${escapeHtml(event.role)} • ${escapeHtml(event.division)}</div>
            <div>${escapeHtml(formatTimestamp(event.timestamp))}</div>
          </div>
        </article>
      `,
    )
    .join("");
}

export function renderExportHref(events: AuditEvent[]): string {
  const csv = [
    ["id", "type", "actor", "role", "division", "timestamp", "title", "description"].join(","),
    ...events.map((event) =>
      [
        event.id,
        event.type,
        event.actor,
        event.role,
        event.division,
        event.timestamp,
        event.title,
        event.description,
      ]
        .map((entry) => `"${String(entry).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export function renderKeyValueRows(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => `<div class="summary-item"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

export function renderTimelineEntry(title: string, body: string, timestamp: string): string {
  return `
    <article class="audit-item">
      <div class="audit-topline">
        <strong>${escapeHtml(title)}</strong>
        ${renderBadge(formatRelativeDay(timestamp))}
      </div>
      <div class="portal-meta-list">
        <div>${escapeHtml(body)}</div>
        <div>${escapeHtml(formatTimestamp(timestamp))}</div>
      </div>
    </article>
  `;
}

export function renderMaskedSecret(maskedValue: string): string {
  return `<span class="mono">${escapeHtml(truncateMiddle(maskedValue, 8, 4))}</span>`;
}
