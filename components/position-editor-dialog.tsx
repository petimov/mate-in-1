"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PieceDropHandlerArgs,
  PieceRenderObject,
  SquareHandlerArgs,
} from "react-chessboard";
import { X } from "lucide-react";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import { boardSquareStyles } from "@/lib/board-appearance";
import { Button } from "@/components/ui/button";
import { isValidFen } from "@/lib/chess";
import {
  EMPTY_SETUP_FEN,
  START_SETUP_FEN,
  fenTurn,
  moveFenPiece,
  setFenPiece,
  setFenTurn,
} from "@/lib/fen-setup";
import { cn } from "@/lib/utils";

const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  { ssr: false },
);

const WHITE_TRAY = ["wK", "wQ", "wR", "wB", "wN", "wP"] as const;
const BLACK_TRAY = ["bK", "bQ", "bR", "bB", "bN", "bP"] as const;

type PositionEditorDialogProps = {
  fen: string;
  open: boolean;
  onClose: () => void;
  onChange: (fen: string) => void;
};

export function PositionEditorDialog({
  fen,
  open,
  onClose,
  onChange,
}: PositionEditorDialogProps) {
  const { board, pieces } = useBoardAppearance();
  const [draft, setDraft] = useState(fen);
  const [spare, setSpare] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(fen.trim() || EMPTY_SETUP_FEN);
    setSpare(null);
  }, [fen, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const displayFen = draft.trim() || EMPTY_SETUP_FEN;
  const turn = fenTurn(displayFen);
  const valid = isValidFen(displayFen);

  const update = useCallback(
    (next: string) => {
      setDraft(next);
      onChange(next);
    },
    [onChange],
  );

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (!spare) return;
      update(setFenPiece(displayFen, square, spare));
    },
    [displayFen, spare, update],
  );

  const onSquareRightClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      update(setFenPiece(displayFen, square, null));
    },
    [displayFen, update],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
      if (!targetSquare) {
        if (sourceSquare) update(setFenPiece(displayFen, sourceSquare, null));
        return true;
      }
      if (!sourceSquare) return false;
      update(moveFenPiece(displayFen, sourceSquare, targetSquare));
      return true;
    },
    [displayFen, update],
  );

  const options = useMemo(
    () => ({
      id: "position-editor-board",
      position: displayFen,
      pieces,
      allowDragging: true,
      allowDragOffBoard: true,
      showAnimations: false,
      onSquareClick,
      onSquareRightClick,
      onPieceDrop,
      boardStyle: { width: "100%", overflow: "hidden" as const },
      ...boardSquareStyles(board),
    }),
    [board, displayFen, onPieceDrop, onSquareClick, onSquareRightClick, pieces],
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
      <div className="relative z-10 flex max-h-[96vh] w-[min(28rem,calc(96vw-1.5rem))] flex-col overflow-auto rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Upravit pozici</h2>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <PieceTray
          pieces={pieces}
          types={BLACK_TRAY}
          selected={spare}
          onSelect={setSpare}
        />
        <div
          className="my-2 aspect-square w-full"
          onContextMenu={(event) => event.preventDefault()}
        >
          <BoardFrame className="h-full w-full">
            <Chessboard key={board.id} options={options} />
          </BoardFrame>
        </div>
        <PieceTray
          pieces={pieces}
          types={WHITE_TRAY}
          selected={spare}
          onSelect={setSpare}
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              turn === "w" ? "bg-[#81b64c] text-zinc-950" : "bg-muted",
            )}
            onClick={() => update(setFenTurn(displayFen, "w"))}
          >
            Bílý na tahu
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              turn === "b" ? "bg-[#81b64c] text-zinc-950" : "bg-muted",
            )}
            onClick={() => update(setFenTurn(displayFen, "b"))}
          >
            Černý na tahu
          </button>
          <button
            type="button"
            className="rounded-md bg-muted px-2 py-1 text-xs"
            onClick={() => update(EMPTY_SETUP_FEN)}
          >
            Prázdná
          </button>
          <button
            type="button"
            className="rounded-md bg-muted px-2 py-1 text-xs"
            onClick={() => update(START_SETUP_FEN)}
          >
            Výchozí
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Táhni figurku. Mimo šachovnici nebo pravý klik = pryč. Paleta + klik =
          nová.
        </p>
        {!valid ? (
          <p className="mt-1 text-xs text-amber-500">
            FEN zatím neplatný pro uložení — doladěte krále / tah.
          </p>
        ) : null}
        <Button type="button" className="mt-4" onClick={onClose}>
          Hotovo
        </Button>
      </div>
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
              "size-8 rounded-md p-0.5 hover:bg-foreground/10",
              active && "bg-foreground/15 ring-2 ring-[#81b64c]",
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
