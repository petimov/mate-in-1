"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, type CSSProperties } from "react";
import type { SquareHandlerArgs } from "react-chessboard";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import { boardSquareStyles, mergeSquareStyles } from "@/lib/board-appearance";
import { isValidFen } from "@/lib/chess";
import { cn } from "@/lib/utils";

const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  { ssr: false },
);

type FenPreviewBoardProps = {
  fen: string;
  className?: string;
  selectedSquares?: string[];
  onToggleSquare?: (square: string) => void;
};

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MARKED: CSSProperties = { backgroundColor: "rgba(212, 160, 23, 0.55)" };

export function FenPreviewBoard({
  fen,
  className,
  selectedSquares = [],
  onToggleSquare,
}: FenPreviewBoardProps) {
  const valid = isValidFen(fen);
  const position = valid ? fen : START_FEN;
  const { board, pieces } = useBoardAppearance();

  const squareStyles = useMemo(() => {
    const extra: Record<string, CSSProperties> = {};
    for (const square of selectedSquares) extra[square] = MARKED;
    return mergeSquareStyles(board, extra);
  }, [board, selectedSquares]);

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      onToggleSquare?.(square);
    },
    [onToggleSquare],
  );

  const options = useMemo(
    () => ({
      id: `fen-preview-${position}`,
      position,
      pieces,
      allowDragging: false,
      showNotation: false,
      squareStyles,
      onSquareClick: onToggleSquare ? onSquareClick : undefined,
      boardStyle: {
        width: "100%",
        overflow: "hidden" as const,
      },
      ...boardSquareStyles(board),
    }),
    [
      board.dark,
      board.light,
      onSquareClick,
      onToggleSquare,
      pieces,
      position,
      squareStyles,
    ],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <BoardFrame className="aspect-square w-full">
        <Chessboard key={`${position}-${board.id}`} options={options} />
      </BoardFrame>
      {!valid ? (
        <p className="text-xs text-amber-400">Neplatný FEN — výchozí postavení.</p>
      ) : null}
    </div>
  );
}
