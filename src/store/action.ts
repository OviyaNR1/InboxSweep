import { create } from "zustand";

export type ActionType = "trash" | "archive" | "delete";

export interface UndoInfo {
  ids: string[];
  type: Exclude<ActionType, "delete">; // permanent delete is not undoable
  count: number;
}

interface ActionState {
  running: boolean;
  type: ActionType | null;
  processed: number;
  total: number;
  failed: number;
  /** Set after a reversible action completes; powers the Undo banner. */
  undo: UndoInfo | null;

  begin: (type: ActionType, total: number) => void;
  setProgress: (processed: number, failed: number) => void;
  finish: (undo: UndoInfo | null) => void;
  clearUndo: () => void;
}

export const useActionStore = create<ActionState>((set) => ({
  running: false,
  type: null,
  processed: 0,
  total: 0,
  failed: 0,
  undo: null,

  begin: (type, total) =>
    set({ running: true, type, total, processed: 0, failed: 0, undo: null }),
  setProgress: (processed, failed) => set({ processed, failed }),
  finish: (undo) => set({ running: false, undo }),
  clearUndo: () => set({ undo: null }),
}));
