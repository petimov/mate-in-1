"use client";

import { memo } from "react";
import Link from "next/link";
import { Dices } from "lucide-react";

import { Button } from "@/components/ui/button";
import { puzzleKind } from "@/lib/puzzles";
import type { Puzzle, PuzzleKind } from "@/lib/types";
import { cn } from "@/lib/utils";

type PuzzleSidebarProps = {
  puzzles: Puzzle[];
  index: number;
  filter: PuzzleKind | "all";
  onFilter: (filter: PuzzleKind | "all") => void;
  onSelect: (index: number) => void;
  onShuffle: () => void;
  shuffleLocked?: boolean;
  title?: string;
  backHref?: string;
  backLabel?: string;
  doneCount?: number;
  sessionTotal?: number;
};

const FILTERS: { id: PuzzleKind | "all"; label: string }[] = [
  { id: "all", label: "Vše" },
  { id: "move", label: "Tah" },
  { id: "squares", label: "Pole" },
];

export const PuzzleSidebar = memo(function PuzzleSidebar({
  puzzles,
  index,
  filter,
  onFilter,
  onSelect,
  onShuffle,
  shuffleLocked = false,
  title = "Úlohy",
  backHref,
  backLabel,
  doneCount,
  sessionTotal,
}: PuzzleSidebarProps) {
  const total = sessionTotal && sessionTotal > 0 ? sessionTotal : Math.max(puzzles.length, 1);
  const completed = doneCount ?? 0;
  const progress = (completed / total) * 100;

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border/60 bg-panel">
      <div className="flex gap-1 border-b border-border/60 px-3 pt-3">
        <span className="rounded-t-md bg-muted px-3 py-2 text-sm font-medium text-primary">
          Úlohy
        </span>
      </div>
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>

      <div className="border-b border-border/60 p-4">
        {backHref ? (
          <Link
            href={backHref}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← {backLabel ?? "Kapitoly"}
          </Link>
        ) : (
          <p className="text-xs uppercase tracking-[0.16em] text-amber-500/80">
            Škola
          </p>
        )}
        <h2 className="mt-1 text-base font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {puzzles.length === 0
            ? "Hotovo na dnes"
            : `${completed}/${total} · zbývá ${puzzles.length}`}
        </p>
        <div className="mt-3 flex gap-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilter(item.id)}
              className={cn(
                "rounded-md px-2 py-1 text-xs",
                filter === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground/5 text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {puzzles.map((puzzle, puzzleIndex) => (
          <button
            key={puzzle.id}
            type="button"
            onClick={() => onSelect(puzzleIndex)}
            className={cn(
              "mb-1 w-full rounded-md px-3 py-2 text-left text-sm",
              puzzleIndex === index
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <span className="block truncate">{puzzle.title}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {puzzleKind(puzzle) === "squares" ? "Označ pole" : "Zahraj tah"}
            </span>
          </button>
        ))}
      </div>

      <div className="border-t border-border/60 p-3">
        {shuffleLocked ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Výklad poprvé. Naše pořadí.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onShuffle}
          >
            <Dices className="size-4" />
            Náhodná
          </Button>
        )}
      </div>
    </aside>
  );
});
