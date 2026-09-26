import type { ReactNode } from "react";

import { sideToMoveDot } from "@/lib/chess";
import { cn } from "@/lib/utils";

const RANKS_WHITE = ["8", "7", "6", "5", "4", "3", "2", "1"];
const FILES_WHITE = ["a", "b", "c", "d", "e", "f", "g", "h"];

type BoardFrameProps = {
  orientation?: "white" | "black";
  fen?: string;
  turn?: "w" | "b";
  className?: string;
  children: ReactNode;
};

export function BoardFrame({
  orientation = "white",
  fen,
  turn,
  className,
  children,
}: BoardFrameProps) {
  const dot = fen ? sideToMoveDot(fen) : (turn ?? null);
  const ranks =
    orientation === "black" ? [...RANKS_WHITE].reverse() : RANKS_WHITE;
  const files =
    orientation === "black" ? [...FILES_WHITE].reverse() : FILES_WHITE;

  return (
    <div className={cn("board-frame", className)}>
      <span className="board-frame-pad" aria-hidden />
      <span className="board-frame-pad" aria-hidden />
      <span className="board-frame-pad" aria-hidden />
      <div className="board-frame-ranks" aria-hidden>
        {ranks.map((rank) => (
          <span key={rank}>{rank}</span>
        ))}
      </div>
      <div className="board-frame-board">{children}</div>
      <span className="board-frame-pad" aria-hidden />
      <span className="board-frame-pad" aria-hidden />
      <div className="board-frame-files" aria-hidden>
        {files.map((file) => (
          <span key={file}>{file}</span>
        ))}
      </div>
      <span
        className={cn(
          "board-frame-turn",
          dot === "b" ? "is-black" : dot === "w" ? "is-white" : "",
        )}
        title={
          dot === "b" ? "Černý na tahu" : dot === "w" ? "Bílý na tahu" : undefined
        }
        aria-hidden
      />
    </div>
  );
}
