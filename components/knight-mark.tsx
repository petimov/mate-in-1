import { lichessPieceUrl } from "@/lib/board-appearance";
import { cn } from "@/lib/utils";

export function KnightMark({ className }: { className?: string }) {
  return (
    <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-[#399393]",
          className,
        )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lichessPieceUrl("cburnett", "wN")}
        alt=""
        className="size-[78%] brightness-0 invert"
        draggable={false}
      />
    </span>
  );
}
