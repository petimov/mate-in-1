"use client";

import {
  PARAM_COLORS,
  PARAM_DISTANCES,
  PARAM_FLAG_KEYS,
  PARAM_FLAG_LABEL,
  PARAM_KING_LABEL,
  PARAM_KINGS,
  PARAM_MODE_LABEL,
  PARAM_MODES,
  PARAM_PIECE_LABEL,
  PARAM_PIECES,
  PARAM_ROLE_LABEL,
  PARAM_ROLES,
  countArrowPieces,
  countPiecesOnFen,
  difficultyVars,
  evalDifficultyFormula,
  type ParamFlagKey,
  type PuzzleParams,
} from "@/lib/puzzle-params";
import { cn } from "@/lib/utils";

type Props = {
  value: PuzzleParams;
  onChange: (next: PuzzleParams) => void;
  fen?: string;
  wrongCount?: number;
  markup?: { after?: { arrows?: unknown } } | null;
  difficultyFormula?: string;
  className?: string;
  compact?: boolean;
  showComputed?: boolean;
  showLateFlags?: boolean;
};

function ParamRing({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm text-muted-foreground",
        active ? "ring-1 ring-foreground/25" : "hover:bg-foreground/5",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  labels,
  onPick,
}: {
  label: string;
  options: readonly T[];
  value?: T;
  labels?: Record<T, string>;
  onPick: (next: T | undefined) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-0.5">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="inline-flex flex-wrap">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <ParamRing
              key={opt}
              active={active}
              title={labels?.[opt] ?? opt}
              onClick={() => onPick(active ? undefined : opt)}
            >
              {opt === "C" ? "Č" : opt}
            </ParamRing>
          );
        })}
      </span>
    </div>
  );
}

export function PuzzleParamsEditor({
  value,
  onChange,
  fen = "",
  wrongCount = 0,
  markup,
  difficultyFormula,
  className,
  compact = false,
  showComputed = true,
  showLateFlags = true,
}: Props) {
  const arrowPieces = countArrowPieces(markup);
  const q = fen ? countPiecesOnFen(fen) : 0;
  const vars = difficultyVars({
    fen,
    arrowPieces,
    wrongCount,
    flags: value.flags,
  });
  const difficulty = evalDifficultyFormula(
    difficultyFormula ?? "",
    vars,
  );

  function setField<K extends keyof PuzzleParams>(
    key: K,
    next: PuzzleParams[K] | undefined,
  ) {
    const copy: PuzzleParams = { ...value };
    if (next === undefined || next === null) delete copy[key];
    else copy[key] = next;
    onChange(copy);
  }

  function toggleFlag(key: ParamFlagKey) {
    const flags = { ...(value.flags ?? {}) };
    if (flags[key]) delete flags[key];
    else flags[key] = true;
    const next: PuzzleParams = { ...value };
    if (Object.keys(flags).length) next.flags = flags;
    else delete next.flags;
    onChange(next);
  }

  const earlyFlags = PARAM_FLAG_KEYS.filter((k) =>
    ["U", "B", "P", "Z"].includes(k),
  );
  const lateFlags = PARAM_FLAG_KEYS.filter((k) =>
    ["V", "O", "L", "CH"].includes(k),
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <ChipGroup
        label="Figura"
        options={PARAM_PIECES}
        value={value.piece}
        labels={PARAM_PIECE_LABEL}
        onPick={(piece) => setField("piece", piece)}
      />
      <ChipGroup
        label="Barva"
        options={PARAM_COLORS}
        value={value.color}
        onPick={(color) => setField("color", color)}
      />
      <ChipGroup
        label="Král"
        options={PARAM_KINGS}
        value={value.king}
        labels={PARAM_KING_LABEL}
        onPick={(king) => setField("king", king)}
      />
      <ChipGroup
        label="Role"
        options={PARAM_ROLES}
        value={value.role}
        labels={PARAM_ROLE_LABEL}
        onPick={(role) => setField("role", role)}
      />
      <ChipGroup
        label="Typ"
        options={PARAM_MODES}
        value={value.mode}
        labels={PARAM_MODE_LABEL}
        onPick={(mode) => setField("mode", mode)}
      />
      <ChipGroup
        label="Vzdál."
        options={PARAM_DISTANCES}
        value={value.distance}
        onPick={(distance) => setField("distance", distance)}
      />

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
          Flagy
        </span>
        {earlyFlags.map((key) => (
          <FlagChip
            key={key}
            flag={key}
            active={Boolean(value.flags?.[key])}
            onToggle={() => toggleFlag(key)}
          />
        ))}
        {showLateFlags
          ? lateFlags.map((key) => (
              <FlagChip
                key={key}
                flag={key}
                active={Boolean(value.flags?.[key])}
                onToggle={() => toggleFlag(key)}
              />
            ))
          : null}
      </div>

      {showComputed ? (
        <div
          className={cn(
            "grid gap-1 text-[11px] text-muted-foreground",
            compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2",
          )}
        >
          <span title="Q · počet figur na šachovnici">
            Figur <strong className="text-foreground">{q}</strong>
          </span>
          <span title="R · figury ze šipek po tahu">
            Ze šipek <strong className="text-foreground">{arrowPieces}</strong>
          </span>
          <span title="S · počet špatných tahů">
            Špatných <strong className="text-foreground">{wrongCount}</strong>
          </span>
          <span title="T · koeficient obtížnosti">
            Obtížnost <strong className="text-foreground">{difficulty}</strong>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function FlagChip({
  flag,
  active,
  onToggle,
}: {
  flag: ParamFlagKey;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <ParamRing
      active={active}
      title={PARAM_FLAG_LABEL[flag]}
      onClick={onToggle}
    >
      {flag}
    </ParamRing>
  );
}

export function ParamsBadgeInline({ params }: { params?: PuzzleParams }) {
  if (!params) return null;
  const bits = [
    params.piece,
    params.color === "C" ? "Č" : params.color,
    params.king,
    params.role,
    params.mode,
    params.distance,
  ].filter(Boolean);
  if (!bits.length) return null;
  return (
    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
      {bits.join("·")}
    </span>
  );
}
