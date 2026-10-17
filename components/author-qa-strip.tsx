"use client";

import type { AuthorQaTrack } from "@/lib/puzzle-params";
import { cn } from "@/lib/utils";

type Props = {
  track?: AuthorQaTrack;
  hasContent: boolean;
  onChange: (next: AuthorQaTrack) => void;
  className?: string;
};

export function AuthorQaStrip({
  track,
  hasContent,
  onChange,
  className,
}: Props) {
  const passes = track?.passes ?? 0;
  const none = Boolean(track?.none);
  const done = Boolean(track?.done);
  const showNic = none || !hasContent;

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        title={
          none
            ? "Zrušit úmyslné nic"
            : "Nic — zkontrolováno, nic sem nepatří (smaže obsah)"
        }
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] text-muted-foreground",
          none
            ? "ring-1 ring-foreground/30 text-foreground"
            : showNic
              ? "hover:bg-foreground/5"
              : "opacity-50 hover:bg-foreground/5 hover:opacity-100",
        )}
        onClick={() => {
          if (none) {
            onChange({ passes, done: done || undefined });
            return;
          }
          onChange({
            passes,
            none: true,
            done: done || undefined,
          });
        }}
      >
        nic
      </button>
      <button
        type="button"
        title={`Průchody: ${passes} (0 = program). Klik = +1.`}
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-mono text-[11px] text-muted-foreground hover:bg-foreground/5",
          passes > 0 && "text-foreground",
        )}
        onClick={() =>
          onChange({
            passes: passes + 1,
            none: none || undefined,
            done: done || undefined,
          })
        }
      >
        {passes}
      </button>
      <button
        type="button"
        title={done ? "Zrušit hotovo" : "Hotovo — finální, při kontrole přeskočit"}
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] text-muted-foreground",
          done
            ? "ring-1 ring-[#81b64c]/60 text-foreground"
            : "hover:bg-foreground/5",
        )}
        onClick={() =>
          onChange({
            passes,
            none: none || undefined,
            done: done ? undefined : true,
          })
        }
      >
        ✓
      </button>
    </span>
  );
}
