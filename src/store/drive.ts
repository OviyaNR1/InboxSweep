import { create } from "zustand";
import type { DriveFile, DriveFolder, StorageQuota } from "../lib/driveClient";

export type DriveStatus = "idle" | "scanning" | "done" | "error";

interface DriveState {
  status: DriveStatus;
  scanned: number;
  files: DriveFile[];
  folders: DriveFolder[];
  quota: StorageQuota | null;
  error: string | null;

  reset: () => void;
  setStatus: (s: DriveStatus, error?: string | null) => void;
  setProgress: (scanned: number) => void;
  setResult: (files: DriveFile[], folders: DriveFolder[], quota: StorageQuota | null) => void;
  removeFiles: (ids: string[]) => void;
}

export const useDriveStore = create<DriveState>((set) => ({
  status: "idle",
  scanned: 0,
  files: [],
  folders: [],
  quota: null,
  error: null,

  reset: () => set({ status: "idle", scanned: 0, files: [], folders: [], quota: null, error: null }),
  setStatus: (status, error = null) => set({ status, error }),
  setProgress: (scanned) => set({ scanned }),
  setResult: (files, folders, quota) => set({ files, folders, quota, status: "done" }),
  removeFiles: (ids) =>
    set((prev) => {
      const drop = new Set(ids);
      return { files: prev.files.filter((f) => !drop.has(f.id)) };
    }),
}));
