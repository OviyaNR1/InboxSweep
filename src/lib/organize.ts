// Rules-based Drive folder categorizer for one-click auto-organize.
// Maps each top-level folder to one of a small set of tidy categories by
// keyword. Conservative by design: anything it can't confidently place is left
// alone rather than moved somewhere wrong.

import type { DriveFolder } from "./driveClient";

export interface Category {
  key: string;
  label: string; // also used as the actual folder name in Drive
  emoji: string; // UI only
}

export const CATEGORIES: Category[] = [
  { key: "ids", label: "IDs & Legal", emoji: "🪪" },
  { key: "work", label: "Work & Career", emoji: "💼" },
  { key: "finance", label: "Finance", emoji: "🏦" },
  { key: "travel", label: "Travel", emoji: "✈️" },
  { key: "photos", label: "Photos & Videos", emoji: "📸" },
  { key: "personal", label: "Personal & Misc", emoji: "🏠" },
];

const LABELS = new Set(CATEGORIES.map((c) => c.label.toLowerCase()));

// First match wins, so ordering matters (ids/work checked before photos so a
// "certificate" folder lands in Work, not Photos).
const RULES: Array<{ key: string; keywords: string[] }> = [
  { key: "ids", keywords: ["address proof", "passport", "visa", "aadhar", "pan card", "voter", "wp extension", "legal"] },
  { key: "work", keywords: ["offer", "resume", "payslip", "salary", "cts", "hcl", "it declaration", "joining", "deputation", "certificate", "career"] },
  { key: "finance", keywords: ["bank", "statement", "bill", "budget", "centsible", "insurance", "tax", "expense", "invoice"] },
  { key: "travel", keywords: ["singapore", "munnar", "algonquin", "trillium", "trip", "travel", "vacation"] },
  { key: "photos", keywords: ["wedding", "marriage", "engagement", "anniversary", "photoshoot", "shoot", "baby", "babe", "shower", "album", "photo", "image", "final pics", "assessment", "ovi home", "shastipoorthi", "milon", "pics"] },
  { key: "personal", keywords: ["recipe", "sms", "contact", "backup", "laptop", "appsheet", "ai studio", "saved from chrome", "misc"] },
];

/** Decide which category a folder belongs to, or null to leave it alone. */
export function categorizeFolder(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (LABELS.has(n)) return null; // it's already a category folder
  for (const rule of RULES) {
    if (rule.keywords.some((k) => n.includes(k))) return rule.key;
  }
  return null;
}

export interface OrganizePlan {
  groups: Array<{ category: Category; folders: DriveFolder[] }>;
  movesCount: number;
  skipped: number;
}

/**
 * Build a move plan from the user's folders. Only top-level folders (directly
 * under My Drive root) are considered, so nested structures stay intact.
 */
export function buildPlan(folders: DriveFolder[], rootId: string): OrganizePlan {
  const byKey = new Map<string, DriveFolder[]>();
  let skipped = 0;

  for (const f of folders) {
    const atRoot = f.parents.includes(rootId) || f.parents.includes("root");
    if (!atRoot) continue; // leave nested folders where they are
    const key = categorizeFolder(f.name);
    if (!key) {
      skipped++;
      continue;
    }
    const arr = byKey.get(key) ?? [];
    arr.push(f);
    byKey.set(key, arr);
  }

  const groups = CATEGORIES.map((category) => ({
    category,
    folders: byKey.get(category.key) ?? [],
  })).filter((g) => g.folders.length > 0);

  const movesCount = groups.reduce((s, g) => s + g.folders.length, 0);
  return { groups, movesCount, skipped };
}
