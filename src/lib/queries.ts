// Gmail query-syntax helpers and the predefined "cleanup recipes".
// Reference: https://support.google.com/mail/answer/7190

export interface CleanupRecipe {
  id: string;
  title: string;
  description: string;
  query: string;
  tone: "promo" | "size" | "social" | "old" | "newsletter";
}

/** One-click cleanup recipes shown on the dashboard (Milestone 5 runs them). */
export const RECIPES: CleanupRecipe[] = [
  {
    id: "promos-1y",
    title: "Promotions older than 1 year",
    description: "Old marketing and deal emails you'll never reopen.",
    query: "category:promotions older_than:1y",
    tone: "promo",
  },
  {
    id: "large-10m",
    title: "Emails larger than 10 MB",
    description: "The biggest single space hogs in your mailbox.",
    query: "larger:10M",
    tone: "size",
  },
  {
    id: "unread-newsletters-6m",
    title: "Unread newsletters older than 6 months",
    description: "Subscriptions you signed up for but stopped reading.",
    query: "is:unread (category:promotions OR category:updates) older_than:6m",
    tone: "newsletter",
  },
  {
    id: "social-1y",
    title: "Social notifications older than 1 year",
    description: "Likes, follows, and friend updates from over a year ago.",
    query: "category:social older_than:1y",
    tone: "social",
  },
  {
    id: "old-5y",
    title: "Anything older than 5 years",
    description: "Ancient mail that's almost certainly safe to clear.",
    query: "older_than:5y",
    tone: "old",
  },
  {
    id: "big-attachments",
    title: "Big attachments (over 5 MB)",
    description: "Messages carrying large files and images.",
    query: "has:attachment larger:5M",
    tone: "size",
  },
];

/** Helper chips for the free-text search box. */
export const SEARCH_CHIPS: { label: string; insert: string }[] = [
  { label: "older_than:1y", insert: "older_than:1y" },
  { label: "larger:10M", insert: "larger:10M" },
  { label: "has:attachment", insert: "has:attachment" },
  { label: "category:promotions", insert: "category:promotions" },
  { label: "is:unread", insert: "is:unread" },
  { label: "from:", insert: "from:" },
];

/** Build a `from:` query for a given sender email. */
export function senderQuery(email: string): string {
  return `from:${email}`;
}
