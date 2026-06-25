import { useState } from "react";
import { File as FileIcon } from "lucide-react";
import type { DriveFile } from "../lib/driveClient";

/** File preview: Drive thumbnail with an icon fallback. */
export default function Thumb({
  file,
  size = "md",
  cover = false,
}: {
  file: Pick<DriveFile, "thumbnailLink">;
  size?: "sm" | "md";
  cover?: boolean; // fill the parent (for card covers)
}) {
  const [broken, setBroken] = useState(false);
  const hasThumb = file.thumbnailLink && !broken;

  if (cover) {
    return hasThumb ? (
      <img
        src={file.thumbnailLink}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-900">
        <FileIcon className="h-8 w-8" />
      </div>
    );
  }

  const box = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return hasThumb ? (
    <img
      src={file.thumbnailLink}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={`${box} shrink-0 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
    />
  ) : (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800`}
    >
      <FileIcon className={icon} />
    </span>
  );
}
