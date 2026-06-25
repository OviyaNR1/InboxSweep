import { useState } from "react";
import { File as FileIcon } from "lucide-react";
import type { DriveFile } from "../lib/driveClient";

/** File preview: Drive thumbnail with an icon fallback. */
export default function Thumb({
  file,
  size = "md",
}: {
  file: Pick<DriveFile, "thumbnailLink">;
  size?: "sm" | "md";
}) {
  const [broken, setBroken] = useState(false);
  const box = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  if (file.thumbnailLink && !broken) {
    return (
      <img
        src={file.thumbnailLink}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${box} shrink-0 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
      />
    );
  }
  return (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800`}
    >
      <FileIcon className={icon} />
    </span>
  );
}
