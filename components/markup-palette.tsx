"use client";

import {
  BRUSH_HEX,
  MONTESSORI_BRUSHES,
  cloneBoardMarkup,
  emptyBoardMarkup,
  type BoardMarkup,
  type Brush,
  type MarkupPhase,
  type MarkupTool,
  type PuzzleMarkup,
} from "@/lib/markup";
import { cn } from "@/lib/utils";

export type SetupTool = "piece" | MarkupTool;

type MarkupPaletteProps = {
  markup: PuzzleMarkup;
  layer: BoardMarkup;
  phase: MarkupPhase;
  tool: SetupTool;
  brush: Brush;
  kind: "move" | "squares";
  canAfter: boolean;
  onPhase: (phase: MarkupPhase) => void;
  onTool: (tool: SetupTool) => void;
  onBrush: (brush: Brush) => void;
  onChange: (markup: PuzzleMarkup) => void;
};

export function MarkupPalette({
  markup,
  layer,
  phase,
  tool,
  brush,
  kind,
  canAfter,
  onPhase,
  onTool,
  onBrush,
  onChange,
}: MarkupPaletteProps) {
  function pickBrush(next: Brush) {
    onBrush(next);
    if (tool === "piece") onTool(next === "black" ? "circle" : "arrow");
  }

  return (
    <aside className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {kind === "move" ? (
          <>
            <Chip active={phase === "before"} onClick={() => onPhase("before")}>
              Před
            </Chip>
            <Chip active={phase === "after"} onClick={() => onPhase("after")}>
              Po
            </Chip>
            {phase === "after" && !canAfter ? (
              <span className="text-[10px] text-amber-500">chybí UCI</span>
            ) : null}
          </>
        ) : null}
        <Chip active={tool === "arrow"} onClick={() => onTool("arrow")}>
          Šipka
        </Chip>
        <Chip active={tool === "circle"} onClick={() => onTool("circle")}>
          Kroužek
        </Chip>
        <Chip active={tool === "color"} onClick={() => onTool("color")}>
          Pole
        </Chip>
        <button
          type="button"
          className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
          onClick={() =>
            onChange({
              ...markup,
              [phase]: emptyBoardMarkup(),
            })
          }
        >
          Smazat
        </button>
        {phase === "after" ? (
          <button
            type="button"
            className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
            onClick={() =>
              onChange({
                ...markup,
                after: cloneBoardMarkup(markup.before),
              })
            }
          >
            Před→po
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {MONTESSORI_BRUSHES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-1 py-1.5",
              brush === item.id
                ? "bg-foreground/10 ring-1 ring-[#81b64c]"
                : "hover:bg-foreground/5",
            )}
            onClick={() => pickBrush(item.id)}
          >
            <span
              className="size-8 shrink-0 rounded-full border border-black/20 shadow-sm"
              style={{ backgroundColor: BRUSH_HEX[item.id] }}
            />
            <span className="text-[11px] leading-none">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded px-2 py-1 text-xs",
        active ? "bg-[#81b64c] text-zinc-950" : "bg-muted text-muted-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
