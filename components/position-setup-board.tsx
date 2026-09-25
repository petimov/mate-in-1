"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import type {
  PieceDropHandlerArgs,
  PieceRenderObject,
  SquareHandlerArgs,
} from "react-chessboard";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import type { SetupTool } from "@/components/markup-palette";
import { boardSquareStyles, mergeSquareStyles } from "@/lib/board-appearance";
import { isValidFen } from "@/lib/chess";
import {
  EMPTY_SETUP_FEN,
  START_SETUP_FEN,
  fenTurn,
  moveFenPiece,
  setFenPiece,
  setFenTurn,
} from "@/lib/fen-setup";
import {
  MARKUP_ARROW_OPTIONS,
  cloneBoardMarkup,
  markupCircleColor,
  markupFillStyles,
  toChessboardArrows,
  toggleBrushOnSquare,
  upsertArrow,
  type BoardMarkup,
  type Brush,
} from "@/lib/markup";
import { cn } from "@/lib/utils";

const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  { ssr: false },
);

const WHITE_TRAY = ["wK", "wQ", "wR", "wB", "wN", "wP"] as const;
const BLACK_TRAY = ["bK", "bQ", "bR", "bB", "bN", "bP"] as const;
const MARKED: CSSProperties = { backgroundColor: "rgba(212, 160, 23, 0.55)" };

type PositionSetupBoardProps = {
  fen: string;
  onChange: (fen: string) => void;
  boardId?: string;
  className?: string;
  selectedSquares?: string[];
  onToggleSquare?: (square: string) => void;
  markup?: BoardMarkup;
  onMarkupChange?: (markup: BoardMarkup) => void;
  tool?: SetupTool;
  brush?: Brush;
};

export function PositionSetupBoard({
  fen,
  onChange,
  boardId = "position-setup-board",
  className,
  selectedSquares = [],
  onToggleSquare,
  markup,
  onMarkupChange,
  tool = "piece",
  brush = "green",
}: PositionSetupBoardProps) {
  const { board, pieces } = useBoardAppearance();
  const hostRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState<number | null>(null);
  const [spare, setSpare] = useState<string | null>(null);
  const [arrowFrom, setArrowFrom] = useState<string | null>(null);
  const arrowFromRef = useRef<string | null>(null);
  const skipClickRef = useRef(false);
  arrowFromRef.current = arrowFrom;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const sync = () => {
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const gutter = 2.5 * rem;
      const raw = Math.min(host.clientWidth, host.clientHeight);
      const inner = Math.max(64, Math.floor((raw - gutter) / 8) * 8);
      setBoardPx(inner + gutter);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const displayFen = fen.trim() || EMPTY_SETUP_FEN;
  const turn = fenTurn(displayFen);
  const valid = isValidFen(displayFen);
  const layer = markup;
  const markupOn = Boolean(onMarkupChange && tool !== "piece" && !spare);

  const squareStyles = useMemo(() => {
    const extra: Record<string, CSSProperties> = {
      ...markupFillStyles(layer),
    };
    for (const square of selectedSquares) extra[square] = MARKED;
    if (arrowFrom) {
      extra[arrowFrom] = { backgroundColor: "rgba(20, 85, 30, 0.35)" };
    }
    return mergeSquareStyles(board, extra);
  }, [arrowFrom, board, layer, selectedSquares]);

  const addArrow = useCallback(
    (from: string, to: string) => {
      if (!layer || !onMarkupChange) return;
      const next = cloneBoardMarkup(layer);
      next.arrows = upsertArrow(next.arrows, from, to, brush);
      onMarkupChange(next);
      arrowFromRef.current = null;
      setArrowFrom(null);
    },
    [brush, layer, onMarkupChange],
  );

  const applyMarkup = useCallback(
    (square: string) => {
      if (!layer || !onMarkupChange) return;
      if (tool === "arrow") {
        if (!arrowFrom) {
          setArrowFrom(square);
          return;
        }
        if (arrowFrom === square) {
          setArrowFrom(null);
          return;
        }
        addArrow(arrowFrom, square);
        return;
      }
      const next = cloneBoardMarkup(layer);
      if (tool === "color") {
        next.colors = toggleBrushOnSquare(next.colors, square, brush);
      } else {
        next.circles = toggleBrushOnSquare(next.circles, square, brush);
      }
      onMarkupChange(next);
    },
    [addArrow, arrowFrom, brush, layer, onMarkupChange, tool],
  );

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (skipClickRef.current) {
        skipClickRef.current = false;
        return;
      }
      if (spare) {
        onChange(setFenPiece(displayFen, square, spare));
        return;
      }
      if (markupOn) {
        applyMarkup(square);
        return;
      }
      onToggleSquare?.(square);
    },
    [applyMarkup, displayFen, markupOn, onChange, onToggleSquare, spare],
  );

  const onSquareRightClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      onChange(setFenPiece(displayFen, square, null));
    },
    [displayFen, onChange],
  );

  const onSquareMouseDown = useCallback(
    ({ square }: SquareHandlerArgs, event: MouseEvent) => {
      if (event.button !== 0 || !markupOn || tool !== "arrow") return;
      arrowFromRef.current = square;
      setArrowFrom(square);
    },
    [markupOn, tool],
  );

  const onSquareMouseUp = useCallback(
    ({ square }: SquareHandlerArgs, event: MouseEvent) => {
      if (event.button !== 0 || !markupOn || tool !== "arrow") return;
      const from = arrowFromRef.current;
      if (!from || from === square) return;
      skipClickRef.current = true;
      addArrow(from, square);
    },
    [addArrow, markupOn, tool],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare) {
        if (sourceSquare) onChange(setFenPiece(displayFen, sourceSquare, null));
        return true;
      }
      if (!sourceSquare) return false;
      onChange(moveFenPiece(displayFen, sourceSquare, targetSquare));
      return true;
    },
    [displayFen, onChange],
  );

  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: SquareHandlerArgs & { children?: ReactNode }) => {
      const circle = markupCircleColor(square, layer);
      return (
        <div className="relative h-full w-full" style={squareStyles[square]}>
          {children}
          {circle ? (
            <span
              className="cb-circle"
              style={{ ["--cb-circle" as string]: circle }}
            />
          ) : null}
        </div>
      );
    },
    [layer, squareStyles],
  );

  const options = useMemo(
    () => ({
      id: boardId,
      position: displayFen,
      pieces,
      allowDragging: !markupOn,
      allowDragOffBoard: true,
      allowDrawingArrows: false,
      showAnimations: false,
      arrows: toChessboardArrows(layer),
      arrowOptions: MARKUP_ARROW_OPTIONS,
      squareStyles,
      squareRenderer,
      onSquareClick,
      onSquareRightClick,
      onSquareMouseDown,
      onSquareMouseUp,
      onPieceDrop,
      boardStyle: { width: "100%", overflow: "visible" as const },
      ...boardSquareStyles(board),
    }),
    [
      board,
      boardId,
      displayFen,
      layer,
      markupOn,
      onPieceDrop,
      onSquareClick,
      onSquareMouseDown,
      onSquareMouseUp,
      onSquareRightClick,
      pieces,
      squareRenderer,
      squareStyles,
    ],
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-0.5", className)}>
      <PieceTray
        pieces={pieces}
        types={BLACK_TRAY}
        selected={spare}
        onSelect={setSpare}
      />
      <div
        ref={hostRef}
        className="relative min-h-0 flex-1 overflow-visible"
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className="absolute left-0 top-0"
          style={
            boardPx
              ? { width: boardPx, height: boardPx }
              : { height: "100%", aspectRatio: "1", maxWidth: "100%" }
          }
        >
          <BoardFrame className="h-full w-full">
            <Chessboard key={`${board.id}-${boardId}`} options={options} />
          </BoardFrame>
        </div>
      </div>
      <PieceTray
        pieces={pieces}
        types={WHITE_TRAY}
        selected={spare}
        onSelect={setSpare}
      />
      <div className="flex shrink-0 flex-wrap items-center gap-0.5">
        <button
          type="button"
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px]",
            turn === "w" ? "bg-[#81b64c] text-zinc-950" : "bg-muted",
          )}
          onClick={() => onChange(setFenTurn(displayFen, "w"))}
        >
          B
        </button>
        <button
          type="button"
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px]",
            turn === "b" ? "bg-[#81b64c] text-zinc-950" : "bg-muted",
          )}
          onClick={() => onChange(setFenTurn(displayFen, "b"))}
        >
          Č
        </button>
        <button
          type="button"
          className="rounded bg-muted px-1.5 py-0.5 text-[11px]"
          onClick={() => onChange(EMPTY_SETUP_FEN)}
        >
          0
        </button>
        <button
          type="button"
          className="rounded bg-muted px-1.5 py-0.5 text-[11px]"
          onClick={() => onChange(START_SETUP_FEN)}
        >
          Start
        </button>
      </div>
      {!valid && fen.trim() ? (
        <p className="text-[10px] text-amber-500">Neplatný FEN</p>
      ) : null}
    </div>
  );
}

function PieceTray({
  pieces,
  types,
  selected,
  onSelect,
}: {
  pieces: PieceRenderObject;
  types: readonly string[];
  selected: string | null;
  onSelect: (type: string | null) => void;
}) {
  return (
    <div className="flex justify-center gap-0.5">
      {types.map((type) => {
        const Piece = pieces[type];
        const active = selected === type;
        return (
          <button
            key={type}
            type="button"
            title={type}
            className={cn(
              "size-5 rounded p-0 hover:bg-foreground/10",
              active && "bg-foreground/15 ring-1 ring-[#81b64c]",
            )}
            onClick={() => onSelect(active ? null : type)}
          >
            {Piece ? <Piece svgStyle={{ width: "100%", height: "100%" }} /> : type}
          </button>
        );
      })}
    </div>
  );
}
