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
    <aside className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-0.5">
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
          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
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
            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
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
      <div className="flex flex-wrap gap-x-1 gap-y-0">
        {MONTESSORI_BRUSHES.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.hint}
            className={cn(
              "flex items-center gap-0.5 rounded px-0.5 py-0 text-left text-[10px] leading-5",
              brush === item.id ? "bg-foreground/10" : "hover:bg-foreground/5",
            )}
            onClick={() => pickBrush(item.id)}
          >
            <span
              className="size-2.5 shrink-0 rounded-full border border-black/15"
              style={{ backgroundColor: BRUSH_HEX[item.id] }}
            />
            {item.label}
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
        "rounded px-1.5 py-0.5 text-[11px]",
        active ? "bg-[#81b64c] text-zinc-950" : "bg-muted text-muted-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
