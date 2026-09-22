"use client";

import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { DrawShape } from "chessground/draw";
import type { Key } from "chessground/types";
import { Chess, type Square } from "chess.js";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import {
  flipOrientation,
  useTrainerControls,
} from "@/components/trainer-controls-provider";
import { playBoardSound } from "@/lib/board-sound";
import { applyBoardBackground, pieceSetCss } from "@/lib/cg-theme";
import {
  applyUci,
  chessgroundDests,
  dropToUci,
  orientationFromFen,
  pieceTypeAt,
} from "@/lib/chess";
import { toChessgroundShapes, type BoardMarkup } from "@/lib/markup";
import { cn } from "@/lib/utils";

import "chessground/assets/chessground.base.css";

const MOVE_ANIMATION_MS = 200;
const SNAP_BACK_MS = 520;

type ChessboardPlayerProps = {
  positionFen: string;
  orientationFen: string;
  lastMove: { from: string; to: string } | null;
  interactive: boolean;
  expectedUci: string;
  onCorrect: () => void;
  onWrong?: (uci: string) => void;
  markup?: BoardMarkup;
};

function boardPart(fen: string) {
  return fen.trim().split(/\s+/)[0] ?? "";
}

export const ChessboardPlayer = memo(function ChessboardPlayer({
  positionFen,
  orientationFen,
  lastMove: playedMove,
  interactive,
  expectedUci,
  onCorrect,
  onWrong,
  markup,
}: ChessboardPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const gameRef = useRef<Chess | null>(null);
  if (gameRef.current === null) {
    gameRef.current = new Chess(positionFen);
  }

  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const onCorrectRef = useRef(onCorrect);
  onCorrectRef.current = onCorrect;
  const onWrongRef = useRef(onWrong);
  onWrongRef.current = onWrong;
  const expectedRef = useRef(expectedUci);
  expectedRef.current = expectedUci;
  const playedMoveRef = useRef(playedMove);
  playedMoveRef.current = playedMove;

  const [incorrect, setIncorrect] = useState(false);
  const revertingRef = useRef(false);
  const snapTimer = useRef(0);
  const { board, pieceId } = useBoardAppearance();
  const { flipped } = useTrainerControls();

  const orientation = flipOrientation(
    orientationFromFen(orientationFen),
    flipped,
  );
  const canMove = interactive && !incorrect;

  const shapes = useMemo(
    () => toChessgroundShapes(markup) as DrawShape[],
    [markup],
  );
  const highlightCustom = useMemo(() => {
    const map = new Map<Key, string>();
    if (!markup) return map;
    for (const [square, brush] of Object.entries(markup.colors)) {
      map.set(square as Key, `markup-${brush}`);
    }
    return map;
  }, [markup]);

  const onUserMove = useCallback((orig: Key, dest: Key) => {
    const api = apiRef.current;
    const game = gameRef.current;
    if (!api || !game) return;
    if (!interactiveRef.current || revertingRef.current) {
      api.set({ fen: game.fen() });
      return;
    }

    const pieceType = pieceTypeAt(game, orig);
    const solution = expectedRef.current.toLowerCase();
    const uci = dropToUci(orig, dest, pieceType, solution);
    const capture = Boolean(game.get(dest as Square));

    if (uci === solution && applyUci(game, uci)) {
      playBoardSound(capture ? "capture" : "move");
      setIncorrect(false);
      api.set({
        lastMove: [orig, dest],
        turnColor: orientationFromFen(game.fen()),
        movable: { dests: new Map(), color: undefined },
        draggable: { enabled: false },
        selectable: { enabled: false },
      });
      onCorrectRef.current();
      return;
    }

    playBoardSound("wrong");
    revertingRef.current = true;
    setIncorrect(true);
    onWrongRef.current?.(uci);
    window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      const last = playedMoveRef.current;
      api.set({
        fen: game.fen(),
        lastMove: last ? [last.from as Key, last.to as Key] : undefined,
        turnColor: orientationFromFen(game.fen()),
        movable: {
          color: orientationFromFen(game.fen()),
          dests: chessgroundDests(game) as Map<Key, Key[]>,
        },
        draggable: { enabled: true },
        selectable: { enabled: true },
      });
      setIncorrect(false);
      revertingRef.current = false;
    }, SNAP_BACK_MS);
  }, []);

  const onUserMoveRef = useRef(onUserMove);
  onUserMoveRef.current = onUserMove;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const nextBoard = boardPart(positionFen);
    const currentBoard = boardPart(gameRef.current?.fen() ?? "");
    if (currentBoard !== nextBoard) {
      window.clearTimeout(snapTimer.current);
      revertingRef.current = false;
      gameRef.current = new Chess(positionFen);
      setIncorrect(false);
    }

    const game = gameRef.current!;
    const turnColor = orientationFromFen(game.fen());
    const dests = canMove
      ? (chessgroundDests(game) as Map<Key, Key[]>)
      : new Map<Key, Key[]>();
    const last: Key[] | undefined = playedMove
      ? [playedMove.from as Key, playedMove.to as Key]
      : undefined;
    const api = apiRef.current;
    const skipFen = Boolean(api && api.getFen() === nextBoard);

    const patch = {
      ...(skipFen ? {} : { fen: positionFen }),
      orientation,
      turnColor,
      lastMove: last,
      coordinates: false,
      disableContextMenu: true,
      animation: { enabled: true, duration: MOVE_ANIMATION_MS },
      highlight: { lastMove: true, check: false, custom: highlightCustom },
      movable: {
        free: false,
        color: canMove ? turnColor : undefined,
        dests,
        showDests: true,
        rookCastle: false,
        events: {
          after: (orig: Key, dest: Key) => onUserMoveRef.current(orig, dest),
        },
      },
      draggable: {
        enabled: canMove,
        distance: 3,
        autoDistance: true,
        showGhost: true,
      },
      selectable: { enabled: canMove },
      premovable: { enabled: false },
      drawable: {
        enabled: true,
        visible: true,
        defaultSnapToValidMove: false,
        autoShapes: shapes,
      },
    };

    if (!api) {
      apiRef.current = Chessground(el, { fen: positionFen, ...patch });
    } else {
      api.set(patch);
    }

    const boardEl = el.querySelector("cg-board") as HTMLElement | null;
    if (boardEl) {
      applyBoardBackground(boardEl, board);
    }
  }, [
    board,
    canMove,
    highlightCustom,
    orientation,
    playedMove,
    positionFen,
    shapes,
  ]);

  useEffect(() => {
    return () => {
      window.clearTimeout(snapTimer.current);
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  const pieceCss = useMemo(() => pieceSetCss(pieceId), [pieceId]);

  return (
    <div
      className={cn(
        "relative aspect-square w-full select-none",
        incorrect && "ring-2 ring-red-500",
      )}
      data-wrong={incorrect ? "true" : undefined}
    >
      <BoardFrame orientation={orientation} className="h-full w-full">
        <style>{pieceCss}</style>
        <div ref={wrapRef} className="cg-board-host h-full w-full" />
      </BoardFrame>
      {incorrect ? (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-6">
          <div className="flex items-center gap-2 rounded-full border border-red-400/40 bg-zinc-950/90 px-4 py-2 text-red-300 shadow-2xl backdrop-blur-sm">
            <X className="size-4" strokeWidth={3} />
            <p className="text-sm font-semibold tracking-wide">Špatně</p>
          </div>
        </div>
      ) : null}
    </div>
  );
});
