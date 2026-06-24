// Storage estimation + aggregation. Gmail's API gives no exact mailbox-bytes
// figure, so we sum each message's `sizeEstimate`. Everything here is an
// ESTIMATE and the UI labels it as such.

import type { MessageMeta } from "./gmailClient";

/** Human-readable bytes, e.g. 1536 → "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / 1024 ** i;
  return `${val >= 100 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

export type CategoryKey = "promotions" | "social" | "updates" | "forums" | "personal";

const CATEGORY_LABEL: Record<string, CategoryKey> = {
  CATEGORY_PROMOTIONS: "promotions",
  CATEGORY_SOCIAL: "social",
  CATEGORY_UPDATES: "updates",
  CATEGORY_FORUMS: "forums",
  CATEGORY_PERSONAL: "personal",
};

export const CATEGORY_META: Record<CategoryKey, { label: string }> = {
  promotions: { label: "Promotions" },
  social: { label: "Social" },
  updates: { label: "Updates" },
  forums: { label: "Forums" },
  personal: { label: "Personal" },
};

export function categoryOf(m: MessageMeta): CategoryKey {
  for (const id of m.labelIds) {
    const c = CATEGORY_LABEL[id];
    if (c) return c;
  }
  return "personal";
}

export interface SenderAgg {
  email: string;
  name: string;
  count: number;
  bytes: number;
  lastDate: number;
  hasUnsubscribe: boolean;
}

export interface AgeBucket {
  key: string;
  label: string;
  count: number;
  bytes: number;
}

export interface ScanAggregates {
  scanned: number;
  totalBytes: number;
  senders: SenderAgg[]; // sorted by bytes desc
  largest: MessageMeta[]; // top N by sizeEstimate
  categories: Record<CategoryKey, { count: number; bytes: number }>;
  ageBuckets: AgeBucket[];
}

const YEAR = 365 * 24 * 60 * 60 * 1000;

/** Roll a flat list of messages up into the dashboard's aggregate views. */
export function aggregate(messages: MessageMeta[], topN = 100): ScanAggregates {
  const senderMap = new Map<string, SenderAgg>();
  const categories: ScanAggregates["categories"] = {
    promotions: { count: 0, bytes: 0 },
    social: { count: 0, bytes: 0 },
    updates: { count: 0, bytes: 0 },
    forums: { count: 0, bytes: 0 },
    personal: { count: 0, bytes: 0 },
  };
  const buckets = {
    "1y": { key: "1y", label: "Older than 1 year", count: 0, bytes: 0 },
    "2y": { key: "2y", label: "Older than 2 years", count: 0, bytes: 0 },
    "5y": { key: "5y", label: "Older than 5 years", count: 0, bytes: 0 },
  };

  let totalBytes = 0;
  const now = Date.now();

  for (const m of messages) {
    totalBytes += m.sizeEstimate;

    // Sender rollup
    const key = m.fromEmail || m.fromRaw || "(unknown)";
    const existing = senderMap.get(key);
    const hasUnsub = !!m.listUnsubscribe;
    if (existing) {
      existing.count++;
      existing.bytes += m.sizeEstimate;
      existing.lastDate = Math.max(existing.lastDate, m.date);
      existing.hasUnsubscribe = existing.hasUnsubscribe || hasUnsub;
    } else {
      senderMap.set(key, {
        email: m.fromEmail,
        name: m.fromName || m.fromEmail,
        count: 1,
        bytes: m.sizeEstimate,
        lastDate: m.date,
        hasUnsubscribe: hasUnsub,
      });
    }

    // Category rollup
    const cat = categoryOf(m);
    categories[cat].count++;
    categories[cat].bytes += m.sizeEstimate;

    // Age buckets (cumulative: a 6-year-old email counts in 1y, 2y AND 5y)
    if (m.date > 0) {
      const age = now - m.date;
      if (age > 1 * YEAR) {
        buckets["1y"].count++;
        buckets["1y"].bytes += m.sizeEstimate;
      }
      if (age > 2 * YEAR) {
        buckets["2y"].count++;
        buckets["2y"].bytes += m.sizeEstimate;
      }
      if (age > 5 * YEAR) {
        buckets["5y"].count++;
        buckets["5y"].bytes += m.sizeEstimate;
      }
    }
  }

  const senders = [...senderMap.values()].sort((a, b) => b.bytes - a.bytes).slice(0, topN);
  const largest = [...messages].sort((a, b) => b.sizeEstimate - a.sizeEstimate).slice(0, 25);

  return {
    scanned: messages.length,
    totalBytes,
    senders,
    largest,
    categories,
    ageBuckets: [buckets["1y"], buckets["2y"], buckets["5y"]],
  };
}
