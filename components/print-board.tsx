import { fenSquares } from "@/lib/fen-board";
import { cn } from "@/lib/utils";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

type PrintBoardProps = {
  fen: string;
  className?: string;
};

export function PrintBoard({ fen, className }: PrintBoardProps) {
  const squares = fenSquares(fen);

  return (
    <div className={cn("inline-block", className)}>
      <div className="grid grid-cols-[auto_repeat(8,1.7rem)_auto] grid-rows-[auto_repeat(8,1.7rem)_auto] text-center text-[11px] leading-none print:grid-cols-[auto_repeat(8,1.55rem)_auto] print:grid-rows-[auto_repeat(8,1.55rem)_auto]">
        <span />
        {FILES.map((file) => (
          <span key={`top-${file}`} className="pb-0.5 text-zinc-500 print:text-zinc-600">
            {file}
          </span>
        ))}
        <span />
        {Array.from({ length: 8 }, (_, rankIndex) => {
          const rank = 8 - rankIndex;
          return (
            <div key={`rank-${rank}`} className="contents">
              <span className="pr-1 text-zinc-500 print:text-zinc-600">{rank}</span>
              {squares.slice(rankIndex * 8, rankIndex * 8 + 8).map((square) => (
                <span
                  key={square.square}
                  className={cn(
                    "flex items-center justify-center border border-zinc-400 text-lg print:text-base",
                    square.light ? "bg-[#f0d9b5] text-zinc-900" : "bg-[#b58863] text-zinc-950",
                  )}
                >
                  {square.glyph}
                </span>
              ))}
              <span className="pl-1 text-zinc-500 print:text-zinc-600">{rank}</span>
            </div>
          );
        })}
        <span />
        {FILES.map((file) => (
          <span key={`bot-${file}`} className="pt-0.5 text-zinc-500 print:text-zinc-600">
            {file}
          </span>
        ))}
        <span />
      </div>
    </div>
  );
}
