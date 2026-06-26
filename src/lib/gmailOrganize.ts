// Recipes for the Gmail Organize tab: which label to create and the Gmail
// search that decides what goes in it. Emails can carry multiple labels, so
// overlapping queries are fine.

export interface LabelRecipe {
  key: string;
  name: string; // the Gmail label name to create
  emoji: string;
  query: string; // Gmail search syntax
  /** Whether "skip the inbox" (archive) is a sensible default for this group. */
  archiveByDefault: boolean;
}

export const LABEL_RECIPES: LabelRecipe[] = [
  {
    key: "finance",
    name: "Finance",
    emoji: "🏦",
    query: 'bank OR statement OR invoice OR payslip OR salary OR tax OR "net banking"',
    archiveByDefault: false,
  },
  {
    key: "receipts",
    name: "Receipts & Orders",
    emoji: "🧾",
    query: 'receipt OR "order confirmation" OR "your order" OR "payment received"',
    archiveByDefault: false,
  },
  {
    key: "travel",
    name: "Travel",
    emoji: "✈️",
    query: 'flight OR itinerary OR "boarding pass" OR hotel OR reservation OR booking',
    archiveByDefault: false,
  },
  {
    key: "shopping",
    name: "Shopping & Promos",
    emoji: "🛍️",
    query: "category:promotions",
    archiveByDefault: true,
  },
  {
    key: "social",
    name: "Social",
    emoji: "💬",
    query: "category:social",
    archiveByDefault: true,
  },
  {
    key: "newsletters",
    name: "Newsletters",
    emoji: "📰",
    query: "category:updates (newsletter OR unsubscribe OR digest)",
    archiveByDefault: false,
  },
];
