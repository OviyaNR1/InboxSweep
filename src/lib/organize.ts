// Rules-based Drive folder categorizer for one-click auto-organize.
// Maps each top-level folder to one of a small set of tidy categories by
// keyword. Conservative by design: anything it can't confidently place is left
// alone rather than moved somewhere wrong.

import type { DriveFolder, DriveFile } from "./driveClient";

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
  { key: "documents", label: "Documents", emoji: "📄" },
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

// MIME fragments that mark a file as a "document" for the catch-all bucket.
const DOC_MIME = ["pdf", "word", "document", "spreadsheet", "presentation", "excel", "powerpoint", "csv", "text"];

/** Categorize a loose file by type + filename. Photos/videos go to Photos. */
export function categorizeFile(name: string, mimeType: string): string | null {
  if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) return "photos";
  const n = name.trim().toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => n.includes(k))) return rule.key;
  }
  // Catch-all: any remaining document (PDF, Word, sheet…) goes to Documents,
  // so nothing recognizable is left loose in the root.
  const mt = mimeType.toLowerCase();
  if (DOC_MIME.some((m) => mt.includes(m))) return "documents";
  return null;
}

export interface OrganizePlan {
  groups: Array<{ category: Category; folders: DriveFolder[]; files: DriveFile[] }>;
  movesCount: number;
  skipped: number;
}

/**
 * Build a move plan from the user's top-level folders AND loose files sitting
 * directly in My Drive root. Nested folders and files already inside folders
 * are left untouched.
 */
export function buildPlan(
  folders: DriveFolder[],
  files: DriveFile[],
  rootId: string
): OrganizePlan {
  const folderByKey = new Map<string, DriveFolder[]>();
  const fileByKey = new Map<string, DriveFile[]>();
  let skipped = 0;

  const atRoot = (parents: string[]) =>
    parents.includes(rootId) || parents.includes("root");

  for (const f of folders) {
    if (!atRoot(f.parents)) continue;
    const key = categorizeFolder(f.name);
    if (!key) {
      skipped++;
      continue;
    }
    (folderByKey.get(key) ?? folderByKey.set(key, []).get(key)!).push(f);
  }

  for (const file of files) {
    if (!atRoot(file.parents)) continue; // only loose root files
    const key = categorizeFile(file.name, file.mimeType);
    if (!key) {
      skipped++;
      continue;
    }
    (fileByKey.get(key) ?? fileByKey.set(key, []).get(key)!).push(file);
  }

  const groups = CATEGORIES.map((category) => ({
    category,
    folders: folderByKey.get(category.key) ?? [],
    files: fileByKey.get(category.key) ?? [],
  })).filter((g) => g.folders.length > 0 || g.files.length > 0);

  const movesCount = groups.reduce((s, g) => s + g.folders.length + g.files.length, 0);
  return { groups, movesCount, skipped };
}
