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
  PieceHandlerArgs,
  PieceRenderObject,
  SquareHandlerArgs,
} from "react-chessboard";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import type { SetupTool } from "@/components/markup-palette";
import { boardSquareStyles, mergeSquareStyles } from "@/lib/board-appearance";
import {
  applyUci,
  dropToUci,
  isSideToMove,
  isValidFen,
  legalDests,
  pieceTypeAt,
} from "@/lib/chess";
import { Chess } from "chess.js";
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
  orientation?: "white" | "black";
  playMode?: boolean;
  moveLocked?: boolean;
  onPlayMove?: (uci: string) => void;
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
  orientation = "white",
  playMode = false,
  moveLocked = false,
  onPlayMove,
}: PositionSetupBoardProps) {
  const { board, pieces } = useBoardAppearance();
  const rootRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState<number | null>(null);
  const [spare, setSpare] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;
  const [arrowFrom, setArrowFrom] = useState<string | null>(null);
  const arrowFromRef = useRef<string | null>(null);
  const skipClickRef = useRef(false);
  arrowFromRef.current = arrowFrom;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sync = () => {
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const gutter = 2.5 * rem;
      let chrome = 0;
      for (const el of root.querySelectorAll("[data-setup-chrome]")) {
        chrome += (el as HTMLElement).offsetHeight;
      }
      const raw = Math.min(
        root.clientWidth,
        Math.max(0, root.clientHeight - chrome),
      );
      const inner = Math.max(64, Math.floor((raw - gutter) / 8) * 8);
      setBoardPx(inner + gutter);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const displayFen = fen.trim() || EMPTY_SETUP_FEN;
  const turn = fenTurn(displayFen);
  const valid = isValidFen(displayFen);
  const layer = markup;
  const canMarkup = Boolean(onMarkupChange && !spare);
  const canPlay = playMode && !moveLocked && Boolean(onPlayMove);

  useEffect(() => {
    setSelected(null);
    selectedRef.current = null;
    setSpare(null);
  }, [displayFen, playMode]);

  const dests = useMemo(() => {
    if (!canPlay || !selected || !valid) return [];
    const game = new Chess(displayFen);
    return legalDests(game, selected);
  }, [canPlay, displayFen, selected, valid]);

  const destLookup = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const dest of dests) map.set(dest.square, dest.capture);
    return map;
  }, [dests]);

  const tryLegal = useCallback(
    (from: string, to: string, pieceType: string) => {
      if (!canPlay || !onPlayMove) return false;
      if (from === to) return false;
      const game = new Chess(displayFen);
      const uci = dropToUci(from, to, pieceType, "");
      if (!applyUci(game, uci)) return false;
      onPlayMove(uci);
      setSelected(null);
      selectedRef.current = null;
      return true;
    },
    [canPlay, displayFen, onPlayMove],
  );

  const squareStyles = useMemo(() => {
    const extra: Record<string, CSSProperties> = {
      ...markupFillStyles(layer),
    };
    for (const square of selectedSquares) extra[square] = MARKED;
    if (arrowFrom) {
      extra[arrowFrom] = { backgroundColor: "rgba(20, 85, 30, 0.35)" };
    }
    if (selected) {
      extra[selected] = { backgroundColor: "rgba(20, 85, 30, 0.5)" };
    }
    return mergeSquareStyles(board, extra);
  }, [arrowFrom, board, layer, selected, selectedSquares]);

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

  const applyPointMarkup = useCallback(
    (square: string) => {
      if (!layer || !onMarkupChange) return;
      const next = cloneBoardMarkup(layer);
      if (tool === "color") {
        next.colors = toggleBrushOnSquare(next.colors, square, brush);
      } else {
        next.circles = toggleBrushOnSquare(next.circles, square, brush);
      }
      onMarkupChange(next);
    },
    [brush, layer, onMarkupChange, tool],
  );

  const handleSquare = useCallback(
    (square: string) => {
      if (skipClickRef.current) {
        skipClickRef.current = false;
        return;
      }
      if (playMode) {
        if (moveLocked) return;
        const game = new Chess(displayFen);
        const from = selectedRef.current;
        if (from) {
          if (square === from) return;
          if (legalDests(game, from).some((dest) => dest.square === square)) {
            tryLegal(from, square, pieceTypeAt(game, from));
            return;
          }
          if (isSideToMove(game, square)) {
            setSelected(square);
            return;
          }
          setSelected(null);
          return;
        }
        if (isSideToMove(game, square)) setSelected(square);
        return;
      }
      if (spare) {
        onChange(setFenPiece(displayFen, square, spare));
        return;
      }
      onToggleSquare?.(square);
    },
    [displayFen, moveLocked, onChange, onToggleSquare, playMode, spare, tryLegal],
  );

  const onSquareRightClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (skipClickRef.current) {
        skipClickRef.current = false;
        return;
      }
      if (canMarkup) {
        applyPointMarkup(square);
        return;
      }
      onChange(setFenPiece(displayFen, square, null));
    },
    [applyPointMarkup, canMarkup, displayFen, onChange],
  );

  const onSquareMouseDown = useCallback(
    ({ square }: SquareHandlerArgs, event: MouseEvent) => {
      if (event.button !== 2 || !canMarkup) return;
      arrowFromRef.current = square;
      setArrowFrom(square);
    },
    [canMarkup],
  );

  const onSquareMouseUp = useCallback(
    ({ square }: SquareHandlerArgs, event: MouseEvent) => {
      if (event.button !== 2 || !canMarkup) return;
      const from = arrowFromRef.current;
      if (from && from !== square) {
        skipClickRef.current = true;
        addArrow(from, square);
        return;
      }
      arrowFromRef.current = null;
      setArrowFrom(null);
    },
    [addArrow, canMarkup],
  );

  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (playMode) {
        if (!targetSquare) return false;
        return tryLegal(sourceSquare, targetSquare, piece.pieceType);
      }
      if (!targetSquare) {
        if (sourceSquare) onChange(setFenPiece(displayFen, sourceSquare, null));
        return true;
      }
      if (!sourceSquare) return false;
      onChange(moveFenPiece(displayFen, sourceSquare, targetSquare));
      return true;
    },
    [displayFen, onChange, playMode, tryLegal],
  );

  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: SquareHandlerArgs & { children?: ReactNode }) => {
      const circle = markupCircleColor(square, layer);
      const capture = destLookup.get(square);
      return (
        <div
          className={cn(
            "relative h-full w-full",
            capture !== undefined && "cb-legal",
          )}
          style={squareStyles[square]}
        >
          {children}
          {capture === false ? <span className="cb-dest" /> : null}
          {capture === true ? <span className="cb-capture" /> : null}
          {circle ? (
            <span
              className="cb-circle"
              style={{ ["--cb-circle" as string]: circle }}
            />
          ) : null}
        </div>
      );
    },
    [destLookup, layer, squareStyles],
  );

  const options = useMemo(
    () => ({
      id: boardId,
      position: displayFen,
      boardOrientation: orientation,
      pieces,
      allowDragging: playMode ? canPlay : !spare,
      allowDragOffBoard: !playMode,
      allowDrawingArrows: false,
      showAnimations: false,
      arrows: [],
      arrowOptions: MARKUP_ARROW_OPTIONS,
      squareStyles,
      squareRenderer,
      onSquareClick: ({ square }: SquareHandlerArgs) => handleSquare(square),
      onSquareRightClick,
      onSquareMouseDown,
      onSquareMouseUp,
      onPieceDrop,
      onPieceClick: ({ square }: PieceHandlerArgs) => {
        if (square) handleSquare(square);
      },
      boardStyle: { width: "100%", overflow: "visible" as const },
      ...boardSquareStyles(board),
    }),
    [
      board,
      boardId,
      displayFen,
      orientation,
      layer,
      spare,
      canPlay,
      playMode,
      onPieceDrop,
      handleSquare,
      onSquareMouseDown,
      onSquareMouseUp,
      onSquareRightClick,
      pieces,
      squareRenderer,
      squareStyles,
    ],
  );

  return (
    <div
      ref={rootRef}
      className={cn("flex min-h-0 flex-col gap-0", className)}
    >
      {playMode ? null : (
      <div data-setup-chrome>
        <PieceTray
          pieces={pieces}
          types={orientation === "black" ? WHITE_TRAY : BLACK_TRAY}
          selected={spare}
          onSelect={setSpare}
        />
      </div>
      )}
      <div
        className="relative shrink-0 overflow-visible"
        onContextMenu={(event) => event.preventDefault()}
        style={
          boardPx
            ? { width: boardPx, height: boardPx }
            : { height: "100%", aspectRatio: "1", maxWidth: "100%" }
        }
      >
          <BoardFrame
            orientation={orientation}
            fen={displayFen}
            arrows={toChessboardArrows(layer)}
            className="h-full w-full"
          >
            <Chessboard key={`${board.id}-${boardId}-${orientation}`} options={options} />
          </BoardFrame>
      </div>
      {playMode ? null : (
      <div
        data-setup-chrome
        className="relative flex shrink-0 items-center justify-center"
      >
        <div className="absolute left-0 flex items-center gap-0.5">
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
        <PieceTray
          pieces={pieces}
          types={orientation === "black" ? BLACK_TRAY : WHITE_TRAY}
          selected={spare}
          onSelect={setSpare}
        />
      </div>
      )}
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
  className,
}: {
  pieces: PieceRenderObject;
  types: readonly string[];
  selected: string | null;
  onSelect: (type: string | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center gap-1 leading-none", className)}>
      {types.map((type) => {
        const Piece = pieces[type];
        const active = selected === type;
        return (
          <button
            key={type}
            type="button"
            title={type}
            className={cn(
              "size-8 rounded p-0.5 hover:bg-foreground/10",
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
