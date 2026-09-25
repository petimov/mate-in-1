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
import type { SquareHandlerArgs } from "react-chessboard";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import { boardSquareStyles, mergeSquareStyles } from "@/lib/board-appearance";
import { Button } from "@/components/ui/button";
import { fenAfterUci, isValidFen, normalizeUci, orientationFromFen } from "@/lib/chess";
import { X } from "lucide-react";
import {
  BRUSH_HEX,
  MONTESSORI_BRUSHES,
  MARKUP_ARROW_OPTIONS,
  cloneBoardMarkup,
  emptyBoardMarkup,
  markupCircleColor,
  markupFillStyles,
  markupSummary,
  toChessboardArrows,
  toggleBrushOnSquare,
  upsertArrow,
  type BoardMarkup,
  type Brush,
  type MarkupPhase,
  type MarkupTool,
  type PuzzleMarkup,
} from "@/lib/markup";
import { cn } from "@/lib/utils";

const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  { ssr: false },
);

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SOLUTION: CSSProperties = { backgroundColor: "rgba(212, 160, 23, 0.55)" };

const LAST_MOVE: CSSProperties = { backgroundColor: "rgba(155, 199, 0, 0.41)" };

type BoardMode = "solution" | "markup";

type MarkupEditorProps = {
  fen: string;
  move?: string;
  kind: "move" | "squares";
  selectedSquares?: string[];
  onToggleSquare?: (square: string) => void;
  markup: PuzzleMarkup;
  onChange: (markup: PuzzleMarkup) => void;
  open: boolean;
  onClose: () => void;
};

const TOOLS: { id: MarkupTool; label: string }[] = [
  { id: "color", label: "Barva" },
  { id: "circle", label: "Kroužek" },
  { id: "arrow", label: "Šipka" },
];

export function MarkupEditor({
  fen,
  move,
  kind,
  selectedSquares = [],
  onToggleSquare,
  markup,
  onChange,
  open,
  onClose,
}: MarkupEditorProps) {
  const valid = isValidFen(fen);
  const startFen = valid ? fen : START_FEN;
  const uci = kind === "move" ? normalizeUci(move ?? "") : "";
  const after = useMemo(() => {
    if (!uci) return null;
    const nextFen = fenAfterUci(startFen, uci);
    if (!nextFen) return null;
    return {
      fen: nextFen,
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
    };
  }, [startFen, uci]);
  const orientation = orientationFromFen(startFen);
  const { board, pieces } = useBoardAppearance();
  const [mode, setMode] = useState<BoardMode>(
    kind === "squares" ? "solution" : "markup",
  );
  const [phase, setPhase] = useState<MarkupPhase>("before");
  const [tool, setTool] = useState<MarkupTool>("color");
  const [brush, setBrush] = useState<Brush>("green");
  const [arrowFrom, setArrowFrom] = useState<string | null>(null);
  const arrowFromRef = useRef<string | null>(null);
  const skipClickRef = useRef(false);
  arrowFromRef.current = arrowFrom;

  const boardMode: BoardMode = kind === "squares" ? mode : "markup";
  const layer = phase === "before" ? markup.before : markup.after;
  const displayFen = phase === "after" && after ? after.fen : startFen;

  useEffect(() => {
    setMode(kind === "squares" ? "solution" : "markup");
  }, [kind, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    arrowFromRef.current = null;
    setArrowFrom(null);
  }, [phase, tool, boardMode]);

  const updateLayer = useCallback(
    (nextLayer: BoardMarkup) => {
      onChange({
        ...markup,
        [phase]: nextLayer,
      });
    },
    [markup, onChange, phase],
  );

  const squareStyles = useMemo(() => {
    const extra: Record<string, CSSProperties> = {};
    if (phase === "after" && after) {
      extra[after.from] = LAST_MOVE;
      extra[after.to] = LAST_MOVE;
    }
    Object.assign(
      extra,
      markupFillStyles(boardMode === "markup" ? layer : undefined),
    );
    if (boardMode === "solution") {
      for (const square of selectedSquares) extra[square] = SOLUTION;
    }
    if (arrowFrom) {
      extra[arrowFrom] = { backgroundColor: "rgba(20, 85, 30, 0.5)" };
    }
    return mergeSquareStyles(board, extra);
  }, [after, arrowFrom, board, boardMode, layer, phase, selectedSquares]);

  const addArrow = useCallback(
    (from: string, to: string) => {
      const next = cloneBoardMarkup(layer);
      next.arrows = upsertArrow(next.arrows, from, to, brush);
      updateLayer(next);
      arrowFromRef.current = null;
      setArrowFrom(null);
    },
    [brush, layer, updateLayer],
  );

  const applySquare = useCallback(
    (square: string) => {
      if (boardMode === "solution") {
        onToggleSquare?.(square);
        return;
      }
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
      updateLayer(next);
    },
    [
      addArrow,
      arrowFrom,
      boardMode,
      brush,
      layer,
      onToggleSquare,
      tool,
      updateLayer,
    ],
  );

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (skipClickRef.current) {
        skipClickRef.current = false;
        return;
      }
      applySquare(square);
    },
    [applySquare],
  );

  const onSquareMouseDown = useCallback(
    ({ square }: SquareHandlerArgs, event: MouseEvent) => {
      if (event.button !== 0) return;
      if (boardMode !== "markup" || tool !== "arrow") return;
      arrowFromRef.current = square;
      setArrowFrom(square);
    },
    [boardMode, tool],
  );

  const onSquareMouseUp = useCallback(
    ({ square }: SquareHandlerArgs, event: MouseEvent) => {
      if (event.button !== 0) return;
      if (boardMode !== "markup" || tool !== "arrow") return;
      const from = arrowFromRef.current;
      if (!from || from === square) return;
      skipClickRef.current = true;
      addArrow(from, square);
    },
    [addArrow, boardMode, tool],
  );

  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: SquareHandlerArgs & { children?: ReactNode }) => {
      const circle =
        boardMode === "markup" ? markupCircleColor(square, layer) : undefined;
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
    [boardMode, layer, squareStyles],
  );

  const options = useMemo(
    () => ({
      id: "admin-markup-board",
      position: displayFen,
      boardOrientation: orientation,
      pieces,
      allowDragging: false,
      allowDrawingArrows: false,
      showAnimations: true,
      animationDurationInMs: 220,
      arrows: boardMode === "markup" ? toChessboardArrows(layer) : [],
      arrowOptions: MARKUP_ARROW_OPTIONS,
      squareStyles,
      squareRenderer,
      onSquareClick,
      onSquareMouseDown,
      onSquareMouseUp,
      boardStyle: {
        width: "100%",
        overflow: "visible",
      },
      ...boardSquareStyles(board),
    }),
    [
      board,
      boardMode,
      displayFen,
      layer,
      onSquareClick,
      onSquareMouseDown,
      onSquareMouseUp,
      orientation,
      pieces,
      squareRenderer,
      squareStyles,
    ],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Zavřít"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-[96vh] w-max max-w-[96vw] flex-col rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {kind === "squares" ? "Pole a značky" : "Značky na šachovnici"}
          </h2>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div
            className="aspect-square size-[min(calc(96vw-16rem),calc(96vh-6.5rem))] overflow-visible rounded-xl"
            onContextMenu={(event) => event.preventDefault()}
          >
            {valid ? (
              <BoardFrame orientation={orientation} className="h-full w-full">
                <Chessboard key={board.id} options={options} />
              </BoardFrame>
            ) : (
              <p className="p-6 text-sm text-amber-400">Nejdřív platný FEN.</p>
            )}
          </div>

          <aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto">
            {kind === "squares" ? (
              <div className="flex flex-wrap gap-1">
                <ModeButton
                  active={boardMode === "solution"}
                  onClick={() => setMode("solution")}
                >
                  Řešení
                </ModeButton>
                <ModeButton
                  active={boardMode === "markup"}
                  onClick={() => setMode("markup")}
                >
                  Značky
                </ModeButton>
              </div>
            ) : null}

            {boardMode === "markup" ? (
              <>
                <div className="flex flex-wrap gap-1">
                  <ModeButton
                    active={phase === "before"}
                    onClick={() => setPhase("before")}
                  >
                    Před tahem
                  </ModeButton>
                  <ModeButton
                    active={phase === "after"}
                    onClick={() => setPhase("after")}
                  >
                    Po tahu
                  </ModeButton>
                </div>
                {kind === "move" && phase === "after" && !after ? (
                  <p className="text-xs text-amber-500">
                    Nejdřív řešení v UCI, ať se tah zahraje.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1">
                  {TOOLS.map((item) => (
                    <ModeButton
                      key={item.id}
                      active={tool === item.id}
                      onClick={() => setTool(item.id)}
                    >
                      {item.label}
                    </ModeButton>
                  ))}
                </div>
                <div className="grid gap-1.5">
                  {MONTESSORI_BRUSHES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.hint}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs",
                        brush === item.id
                          ? "bg-foreground/10 ring-1 ring-foreground/30"
                          : "hover:bg-foreground/5",
                      )}
                      onClick={() => setBrush(item.id)}
                    >
                      <span
                        className="size-5 shrink-0 rounded-full border border-black/15"
                        style={{ backgroundColor: BRUSH_HEX[item.id] }}
                      />
                      <span>
                        <span className="block font-medium">{item.label}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {item.hint}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  {tool === "color"
                    ? "Klik = barva. Znovu = pryč."
                    : tool === "circle"
                      ? "Klik = kroužek. Znovu = pryč."
                      : "Klik start, klik cíl = šipka. Stejná znovu = pryč."}
                </p>
                <p className="text-xs text-muted-foreground">{markupSummary(layer)}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateLayer(emptyBoardMarkup())}
                >
                  Smazat vrstvu
                </Button>
                {phase === "after" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      onChange({
                        ...markup,
                        after: cloneBoardMarkup(markup.before),
                      })
                    }
                  >
                    Kopírovat před → po
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Klik na pole = řešení. Znovu = pryč.
              </p>
            )}

            <Button type="button" className="mt-auto" onClick={onClose}>
              Hotovo
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm",
        active ? "bg-[#81b64c] text-zinc-950" : "bg-muted text-muted-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
