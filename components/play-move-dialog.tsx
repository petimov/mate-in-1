"use client";

import {
  Chessboard,
  type PieceDropHandlerArgs,
  type PieceHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import { Chess } from "chess.js";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { X } from "lucide-react";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import { boardSquareStyles, mergeSquareStyles } from "@/lib/board-appearance";
import { Button } from "@/components/ui/button";
import {
  applyUci,
  dropToUci,
  isSideToMove,
  isValidFen,
  legalDests,
  orientationFromFen,
  pieceTypeAt,
  uciToSan,
} from "@/lib/chess";
import { cn } from "@/lib/utils";

const LAST_MOVE = { backgroundColor: "rgba(155, 199, 0, 0.41)" };
const SELECTED = { backgroundColor: "rgba(20, 85, 30, 0.5)" };

type PlayMoveDialogProps = {
  fen: string;
  open: boolean;
  title?: string;
  onClose: () => void;
  onPick: (uci: string) => void;
};

export function PlayMoveDialog({
  fen,
  open,
  title = "Zahrát tah",
  onClose,
  onPick,
}: PlayMoveDialogProps) {
  const [mounted, setMounted] = useState(false);
  const valid = isValidFen(fen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Zavřít"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[96vh] w-[min(28rem,calc(96vw-1.5rem))] flex-col overflow-auto rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        {valid ? (
          <PlayMoveBoard key={fen} fen={fen} onPick={onPick} onClose={onClose} />
        ) : (
          <p className="text-sm text-amber-400">Nejdřív platný FEN.</p>
        )}
      </div>
    </div>
  );
}

function PlayMoveBoard({
  fen,
  onPick,
  onClose,
}: {
  fen: string;
  onPick: (uci: string) => void;
  onClose: () => void;
}) {
  const gameRef = useRef<Chess | null>(null);
  if (gameRef.current === null) {
    gameRef.current = new Chess(fen);
  }

  const [position, setPosition] = useState(fen);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [uci, setUci] = useState("");
  const { board, pieces } = useBoardAppearance();
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  useEffect(() => {
    gameRef.current = new Chess(fen);
    setPosition(fen);
    setSelected(null);
    setLastMove(null);
    setUci("");
  }, [fen]);

  const orientation = useMemo(() => orientationFromFen(fen), [fen]);

  const dests = useMemo(() => {
    if (!selected || uci) return [];
    return legalDests(gameRef.current!, selected);
  }, [selected, uci, position]);

  const tryMove = useCallback((from: string, to: string, pieceType: string) => {
    if (uci) return false;
    if (from === to) return false;
    const game = gameRef.current!;
    const moveUci = dropToUci(from, to, pieceType, "");
    if (!applyUci(game, moveUci)) return false;
    setSelected(null);
    selectedRef.current = null;
    setLastMove({ from, to });
    setPosition(game.fen());
    setUci(moveUci);
    return true;
  }, [uci]);

  const handleSquare = useCallback(
    (square: string) => {
      if (uci) return;
      const game = gameRef.current!;
      const from = selectedRef.current;
      if (from) {
        if (square === from) return;
        const canMove = legalDests(game, from).some((dest) => dest.square === square);
        if (canMove) {
          tryMove(from, square, pieceTypeAt(game, from));
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
    },
    [tryMove, uci],
  );

  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare) return false;
      return tryMove(sourceSquare, targetSquare, piece.pieceType);
    },
    [tryMove],
  );

  const destLookup = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const dest of dests) map.set(dest.square, dest.capture);
    return map;
  }, [dests]);

  const squareStyles = useMemo(() => {
    const extra: Record<string, CSSProperties> = {};
    if (lastMove) {
      extra[lastMove.from] = LAST_MOVE;
      extra[lastMove.to] = LAST_MOVE;
    }
    if (selected && !uci) extra[selected] = SELECTED;
    return mergeSquareStyles(board, extra);
  }, [board, lastMove, selected, uci]);

  const squareRenderer = useCallback(
    ({
      square,
      children,
    }: SquareHandlerArgs & { children?: React.ReactNode }) => {
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
        </div>
      );
    },
    [destLookup, squareStyles],
  );

  const boardId = `admin-play-move-${useId()}`;

  const options = useMemo(
    () => ({
      id: boardId,
      position,
      boardOrientation: orientation,
      allowDragging: !uci,
      showAnimations: true,
      animationDurationInMs: 250,
      pieces,
      squareStyles,
      squareRenderer,
      onPieceDrop,
      onSquareClick: ({ square }: SquareHandlerArgs) => handleSquare(square),
      onPieceClick: ({ square }: PieceHandlerArgs) => {
        if (square) handleSquare(square);
      },
      ...boardSquareStyles(board),
      dropSquareStyle: {
        backgroundColor: "rgba(20, 85, 30, 0.22)",
      },
      draggingPieceStyle: {
        transform: "scale(1)",
        zIndex: 100,
      },
      boardStyle: {
        width: "100%",
        overflow: "hidden" as const,
      },
    }),
    [
      board,
      boardId,
      handleSquare,
      onPieceDrop,
      orientation,
      pieces,
      position,
      squareRenderer,
      squareStyles,
      uci,
    ],
  );

  function reset() {
    gameRef.current = new Chess(fen);
    setPosition(fen);
    setSelected(null);
    setLastMove(null);
    setUci("");
  }

  const san = uci ? uciToSan(fen, uci) : "";

  return (
    <div className="flex w-full flex-col">
      <BoardFrame orientation={orientation} className="aspect-square w-full">
        <div
          className="h-full w-full"
          data-turn={position.split(/\s+/)[1] === "b" ? "b" : "w"}
          data-locked={uci ? "true" : undefined}
        >
          <Chessboard options={options} />
        </div>
      </BoardFrame>
      <p className="mt-3 shrink-0 text-sm text-muted-foreground">
        {uci
          ? `${san} · ${uci}`
          : "Klikni figurku a pole, nebo táhni."}
      </p>
      <div className="mt-3 flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          disabled={!uci}
          onClick={() => {
            onPick(uci);
            onClose();
          }}
        >
          Použít tah
        </Button>
        <Button type="button" variant="outline" onClick={reset} disabled={!uci}>
          Znovu
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Zavřít
        </Button>
      </div>
    </div>
  );
}
