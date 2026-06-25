import { create } from "zustand";
import type { MessageMeta } from "../lib/gmailClient";
import { aggregate, type ScanAggregates } from "../lib/sizeEstimator";

export type ScanStatus =
  | "idle"
  | "listing"
  | "scanning"
  | "done"
  | "cancelled"
  | "error";

interface ScanState {
  status: ScanStatus;
  query: string; // query used for the current scan ("" = whole mailbox)
  scanned: number; // messages whose metadata we've fetched
  total: number; // Gmail's estimate of matching messages
  cap: number; // max messages this scan will fetch
  messages: MessageMeta[];
  aggregates: ScanAggregates | null;
  error: string | null;

  reset: () => void;
  setStatus: (s: ScanStatus, error?: string | null) => void;
  setTotals: (total: number, cap: number, query: string) => void;
  setProgress: (scanned: number) => void;
  setResult: (messages: MessageMeta[], aggregates: ScanAggregates) => void;
  /** Drop messages that were trashed/deleted and re-aggregate the dashboard. */
  removeMessages: (ids: string[]) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  status: "idle",
  query: "",
  scanned: 0,
  total: 0,
  cap: 0,
  messages: [],
  aggregates: null,
  error: null,

  reset: () =>
    set({
      status: "idle",
      scanned: 0,
      total: 0,
      cap: 0,
      messages: [],
      aggregates: null,
      error: null,
    }),

  setStatus: (status, error = null) => set({ status, error }),
  setTotals: (total, cap, query) => set({ total, cap, query }),
  setProgress: (scanned) => set({ scanned }),
  setResult: (messages, aggregates) =>
    set({ messages, aggregates, status: "done" }),

  removeMessages: (ids) =>
    set((prev) => {
      if (!prev.messages.length) return prev;
      const drop = new Set(ids);
      const remaining = prev.messages.filter((m) => !drop.has(m.id));
      return {
        messages: remaining,
        aggregates: aggregate(remaining),
      };
    }),
}));
