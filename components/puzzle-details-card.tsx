"use client";

import { memo, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { TrainerBoardToolbar } from "@/components/trainer-board-toolbar";
import { VideoEmbed } from "@/components/video-embed";
import type { LinePly } from "@/lib/chess";
import { puzzlePrompt, readShowSource, writeShowSource } from "@/lib/puzzle-copy";
import { puzzleKind } from "@/lib/puzzles";
import type { Puzzle } from "@/lib/types";
import { cn } from "@/lib/utils";

type PuzzleDetailsCardProps = {
  puzzle: Puzzle;
  plies: LinePly[];
  ply: number;
  onPly: (ply: number) => void;
  wrongNote?: string | null;
  srsNote?: string | null;
};

export const PuzzleDetailsCard = memo(function PuzzleDetailsCard({
  puzzle,
  plies,
  ply,
  onPly,
  wrongNote,
  srsNote,
}: PuzzleDetailsCardProps) {
  const isSquares = puzzleKind(puzzle) === "squares";
  const maxPly = isSquares ? 1 : plies.length;
  const currentIndex = ply - 1;
  const done = maxPly > 0 && ply >= maxPly;
  const prompt = puzzlePrompt(puzzle);
  const source = puzzle.source?.trim() || "";
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    setShowSource(readShowSource());
  }, []);

  function toggleSource() {
    const next = !showSource;
    setShowSource(next);
    writeShowSource(next);
  }

  return (
    <aside className="flex min-h-0 flex-col border-border/60 bg-panel lg:h-full lg:border-l">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-amber-500/80">
          {isSquares ? "Označ pole" : "Zahraj tah"}
        </p>
        <h2 className="mt-1 text-base font-semibold leading-snug">
          {puzzle.title}
        </h2>

        {source ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={toggleSource}
              className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              {showSource ? "Skrýt partii" : "Partie"}
            </button>
            {showSource ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {source}
              </p>
            ) : null}
          </div>
        ) : null}

        {prompt ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {prompt}
          </p>
        ) : null}

        <p className="mt-2 min-h-[1.25rem] text-sm text-muted-foreground">
          {done
            ? srsNote
              ? `Hotovo · další ${srsNote}`
              : "Hotovo"
            : isSquares
              ? "Označ všechna správná pole. Figury nehýbej."
              : null}
        </p>

        {!isSquares ? (
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out",
              done ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-4 flex items-center gap-1">
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:opacity-30"
                  disabled={ply <= 0}
                  onClick={() => onPly(0)}
                  aria-label="Začátek"
                >
                  <ChevronsLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:opacity-30"
                  disabled={ply <= 0}
                  onClick={() => onPly(ply - 1)}
                  aria-label="Předchozí tah"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:opacity-30"
                  disabled={ply >= maxPly}
                  onClick={() => onPly(ply + 1)}
                  aria-label="Další tah"
                >
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:opacity-30"
                  disabled={ply >= maxPly}
                  onClick={() => onPly(maxPly)}
                  aria-label="Konec"
                >
                  <ChevronsRight className="size-4" />
                </button>
              </div>

              <div className="mt-3 font-mono text-[15px] leading-7 text-foreground">
                {plies.map((item, index) => {
                  const showNumber =
                    item.color === "w" ||
                    index === 0 ||
                    plies[index - 1]?.number !== item.number;
                  return (
                    <span key={`${item.uci}-${index}`}>
                      {showNumber ? (
                        <span className="text-muted-foreground">
                          {item.color === "b" &&
                          (index === 0 || plies[index - 1]?.color !== "w")
                            ? `${item.number}... `
                            : `${item.number}. `}
                        </span>
                      ) : (
                        " "
                      )}
                      <button
                        type="button"
                        onClick={() => onPly(index + 1)}
                        className={cn(
                          "rounded-sm px-1 py-0.5",
                          index === currentIndex
                            ? "bg-[#81b64c] font-semibold text-zinc-950"
                            : "hover:bg-foreground/10",
                        )}
                      >
                        {item.san}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Klikni na pole. Znovu klik = zrušit. Pak Zkontrolovat.
          </p>
        )}

        {wrongNote ? (
          <div className="mt-4 rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-sm leading-relaxed text-red-800 dark:bg-red-950/40 dark:text-red-100">
            {wrongNote}
          </div>
        ) : done && puzzle.explanation?.trim() ? (
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            {puzzle.explanation.trim()}
          </p>
        ) : null}

        {puzzle.videoUrl ? (
          <div className="mt-4">
            <VideoEmbed url={puzzle.videoUrl} title={`${puzzle.title} video`} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center border-t border-border/60 px-2 py-1">
        <TrainerBoardToolbar />
      </div>
    </aside>
  );
});
